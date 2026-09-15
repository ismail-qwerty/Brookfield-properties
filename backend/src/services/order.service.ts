import { supabaseAdmin } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';
import { Logger } from '../utils/logger.js';

// Marker stored in orders.property_name (otherwise unused on this table) to
// identify an order that already paid out but was left Pending because it
// pushed the wallet negative. AdminService.applyDebit looks for this marker
// to know which Pending orders are safe to auto-complete once the balance
// recovers, without touching orders that are genuinely awaiting a first
// submission.
export const NEGATIVE_BALANCE_FLAG = 'AWAITING_BALANCE_RECOVERY';

// Referral bonus: whenever a referred user earns commission on a completed
// order, their referrer is credited this fraction of that commission.
export const REFERRAL_BONUS_RATE = 0.15;

// A user's wallet balance must be at least this much to generate or submit
// a lot (not just non-negative) — keeps accounts that have drained close to
// zero from continuing to trade.
export const MINIMUM_BALANCE_TO_TRADE = 50;

export class OrderService {
  /**
   * Credit a referrer with their cut of a referred user's just-earned
   * commission. Best-effort: failures here must never roll back or block
   * the referred user's own order completion, so all errors are swallowed
   * (and logged) rather than thrown.
   */
  private static async payReferralBonus(referrerId: string, commissionEarned: number, sourceUsername: string) {
    try {
      const bonus = Number((commissionEarned * REFERRAL_BONUS_RATE).toFixed(2));
      if (bonus <= 0) return;

      const { data: wallet, error: walletError } = await supabaseAdmin
        .from('wallets')
        .select('balance, total_earned')
        .eq('user_id', referrerId)
        .single();

      if (walletError || !wallet) {
        Logger.error('Referral bonus: referrer wallet not found', { referrerId });
        return;
      }

      const newBalance = Number(wallet.balance) + bonus;
      const newTotalEarned = Number(wallet.total_earned) + bonus;

      const { error: updateError } = await supabaseAdmin
        .from('wallets')
        .update({ balance: newBalance, total_earned: newTotalEarned })
        .eq('user_id', referrerId);

      if (updateError) {
        Logger.error('Referral bonus: failed to credit referrer wallet', { referrerId, error: updateError });
        return;
      }

      // A referral bonus can pull the referrer's own balance back out of the
      // negative — mirror AdminService.adjustWalletBalance's auto-resolution
      // of any orders that were left Pending under NEGATIVE_BALANCE_FLAG.
      if (newBalance >= 0) {
        await supabaseAdmin
          .from('orders')
          .update({ status: 'Completed', property_name: null, created_at: new Date().toISOString() })
          .eq('user_id', referrerId)
          .eq('status', 'Pending')
          .eq('property_name', NEGATIVE_BALANCE_FLAG);
      }

      await supabaseAdmin.from('debits_log').insert({
        user_id: referrerId,
        amount: bonus,
        reason: `Referral bonus (15%) from ${sourceUsername}'s order commission`,
        applied_by_admin_id: null,
      });

      Logger.info('Referral bonus paid', { referrerId, bonus, sourceUsername });
    } catch (error) {
      Logger.error('Unexpected error paying referral bonus', { referrerId, error });
    }
  }

  static async generateLot(userId: string) {
    try {
      Logger.info('Starting lot generation', { userId });

      // Step 1: Fetch user
      const { data: user, error: userError } = await supabaseAdmin
        .from('users')
        .select('id, username, user_status, tier_id, total_orders')
        .eq('id', userId)
        .single();

      if (userError) {
        Logger.error('User fetch error', { userId, error: userError });
        throw new AppError(404, 'User not found');
      }

      if (!user) {
        throw new AppError(404, 'User not found');
      }

      if (user.user_status !== 'Active') {
        throw new AppError(403, 'Your account is deactivated');
      }

      // Check wallet balance - block if negative
      const { data: wallet, error: walletError } = await supabaseAdmin
        .from('wallets')
        .select('balance')
        .eq('user_id', userId)
        .single();

      if (walletError || !wallet) {
        throw new AppError(500, 'Wallet not found');
      }

      if (Number(wallet.balance) < MINIMUM_BALANCE_TO_TRADE) {
        throw new AppError(403, `A minimum balance of $${MINIMUM_BALANCE_TO_TRADE.toFixed(2)} is required to generate a lot. Please recharge your account.`);
      }

      // Step 2: Fetch membership
      const { data: membershipData, error: membershipError } = await supabaseAdmin
        .from('membership_levels')
        .select('name, order_limit, commission_rate, special_commission_rate')
        .eq('id', user.tier_id)
        .single();

      if (membershipError || !membershipData) {
        Logger.error('Membership fetch error', { tierID: user.tier_id, error: membershipError });
        throw new AppError(500, 'User membership tier not found');
      }

      const tier = membershipData;

      // Step 3: Check lifetime lot limit. order_limit is a per-cycle cap on
      // total_orders (lifetime, not daily) — an admin resets total_orders
      // back to 0 via "Reset Count" to start a user's next cycle.
      const totalOrders = user.total_orders || 0;

      if (totalOrders >= tier.order_limit) {
        throw new AppError(429, `Lot limit reached: ${totalOrders}/${tier.order_limit}.`);
      }

      // Step 3.5: Check if a special lot should be injected
      const { data: specialLotQueue } = await supabaseAdmin
        .from('user_special_lots_queue')
        .select('id, special_lot_id, lot_value, daily_commission, trigger_after_order_no')
        .eq('user_id', userId)
        .eq('status', 'Pending')
        .lt('trigger_after_order_no', user.total_orders)
        .order('trigger_after_order_no', { ascending: true })
        .limit(1);

      if (specialLotQueue && specialLotQueue.length > 0) {
        const specialQueue = specialLotQueue[0];

        // Fetch property details from properties table
        const { data: specialProperty } = await supabaseAdmin
          .from('properties')
          .select('id, name, value, image_url, lot_type')
          .eq('id', specialQueue.special_lot_id)
          .single();

        if (specialProperty) {
          const commission = (Number(specialProperty.value) * Number(tier.special_commission_rate ?? 27)) / 100;

          // Insert into orders so submitOrder can handle it normally
          const { data: newOrder, error: insertErr } = await supabaseAdmin
            .from('orders')
            .insert({
              user_id: userId,
              property_id: specialProperty.id,
              commission: commission.toFixed(2),
              status: 'Pending',
            })
            .select('id')
            .single();

          if (insertErr || !newOrder) {
            Logger.error('Failed to insert special lot order', { userId, error: insertErr });
          } else {
            // Mark queue entry so it won't trigger again
            await supabaseAdmin
              .from('user_special_lots_queue')
              .update({ status: 'Completed' })
              .eq('id', specialQueue.id);

            Logger.info('Special lot injected into order flow', { userId, orderId: newOrder.id });

            return {
              success: true,
              order: {
                id: newOrder.id,
                // Cycle-relative position, not a lifetime order count — must
                // track total_orders (which "Reset Count" zeroes) so the
                // number shown to the user actually reflects a reset instead
                // of continuing to climb from their all-time completed total.
                display_number: (user.total_orders || 0) + 1,
                property: {
                  id: specialProperty.id,
                  name: specialProperty.name,
                  title: specialProperty.name,
                  price: Number(specialProperty.value),
                  image_url: specialProperty.image_url || 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800',
                  lot_type: 'special',
                },
                commission,
                property_value: Number(specialProperty.value),
              },
            };
          }
        }
      }

      // Step 4: Fetch pending orders. This path is for NORMAL lots only —
      // special lots are only ever supposed to be surfaced via the queue
      // injection above (Step 3.5). We still filter special-lot properties
      // out here defensively: an order can be left with status='Pending'
      // after already being paid out (see submitOrder's negative-balance
      // handling), and it must never be re-servable as someone's "next lot".
      const fetchNormalPendingOrder = async () => {
        const { data, error: ordersError } = await supabaseAdmin
          .from('orders')
          .select('id, property_id, commission, properties(lot_type)')
          .eq('user_id', userId)
          .eq('status', 'Pending')
          .order('id', { ascending: true })
          .limit(20);

        if (ordersError) {
          Logger.error('Orders fetch error', { userId, error: ordersError });
          throw new AppError(500, `Failed to fetch orders: ${ordersError.message}`);
        }

        return (data || []).find((o) => {
          const prop = Array.isArray(o.properties) ? o.properties[0] : o.properties;
          return prop?.lot_type !== 'special';
        });
      };

      let selectedOrder = await fetchNormalPendingOrder();

      // If no pending orders, auto-generate the tier's default orders
      if (!selectedOrder) {
        await this.autoAssignDefaultOrders(userId, tier.order_limit);

        selectedOrder = await fetchNormalPendingOrder();

        if (!selectedOrder) {
          throw new AppError(400, 'No available properties in system. Contact admin.');
        }
      }

      // Step 5: Fetch property details
      const { data: property, error: propertyError } = await supabaseAdmin
        .from('properties')
        .select('id, name, value, price, image_url, lot_type')
        .eq('id', selectedOrder.property_id)
        .single();

      if (propertyError) {
        Logger.error('Property fetch error', { propertyId: selectedOrder.property_id, error: propertyError });
        throw new AppError(404, 'Property not found');
      }

      // Return property details WITHOUT completing the order
      const propertyData = property || {
        id: selectedOrder.property_id,
        name: 'Property Listing',
        value: 0,
        price: 0,
        image_url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800',
        lot_type: 'normal',
      };

      const propertyTitle = propertyData.name || 'Property Listing';
      // Always from the member's current tier, so a tier change applies to the
      // next lot even though pending orders were pre-created at the old rate.
      const commissionEarned = (Number(propertyData.value || propertyData.price || 0) * Number(tier.commission_rate)) / 100;

      Logger.info('Lot fetched successfully (pending submission)', { userId, orderId: selectedOrder.id });

      return {
        success: true,
        order: {
          id: selectedOrder.id,
          // Cycle-relative position (see the special-lot branch above for
          // why this must be total_orders, not a lifetime completed count).
          display_number: (user.total_orders || 0) + 1,
          property: {
            id: propertyData.id,
            name: propertyData.name,
            title: propertyTitle,
            price: Number(propertyData.price || propertyData.value || 0),
            image_url: propertyData.image_url || 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800',
            lot_type: propertyData.lot_type || 'normal',
          },
          commission: commissionEarned,
          property_value: Number(propertyData.value || propertyData.price || 0),
        },
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      Logger.error('Unexpected error in generateLot', { userId, error });
      throw new AppError(500, 'Unexpected error occurred');
    }
  }

  /**
   * Submit and complete a pending order
   */
  static async submitOrder(userId: string, orderId: string, review?: string) {
    try {
      Logger.info('Submitting order', { userId, orderId });

      // Fetch order with property details
      const { data: order, error: orderError } = await supabaseAdmin
        .from('orders')
        .select(`
          id, 
          user_id, 
          property_id, 
          commission, 
          status,
          properties (
            id,
            name,
            price,
            value,
            lot_type
          )
        `)
        .eq('id', orderId)
        .eq('user_id', userId)
        .single();

      if (orderError || !order) {
        throw new AppError(404, 'Order not found');
      }

      if (order.status !== 'Pending') {
        throw new AppError(400, 'Order already completed');
      }

      // Get user and tier info
      const { data: user, error: userError } = await supabaseAdmin
        .from('users')
        .select('id, username, tier_id, total_orders, referrer_id')
        .eq('id', userId)
        .single();

      if (userError || !user) {
        throw new AppError(404, 'User not found');
      }

      const { data: tier } = await supabaseAdmin
        .from('membership_levels')
        .select('order_limit, commission_rate, special_commission_rate')
        .eq('id', user.tier_id)
        .single();

      // Check lifetime lot limit again (see the matching check in
      // generateLot for why this is total_orders, not a daily count).
      if ((user.total_orders || 0) >= (tier?.order_limit || 27)) {
        throw new AppError(429, 'Lot limit reached');
      }

      // Determine if this is a special lot
      const property = Array.isArray(order.properties) ? order.properties[0] : order.properties;
      const isSpecialLot = property?.lot_type === 'special';
      const propertyPrice = Number(property?.price || property?.value || 0);
      
      // Calculate commission based on lot type
      let commissionEarned: number;
      let walletDeduction = 0;
      
      if (isSpecialLot) {
        // Special lot: tier's special commission %, deduct property price
        commissionEarned = (propertyPrice * Number(tier?.special_commission_rate ?? 27)) / 100;
        walletDeduction = propertyPrice;
        Logger.info('Processing special lot', { propertyPrice, commission: commissionEarned, deduction: walletDeduction });
      } else {
        // Normal lot: Use tier commission rate (default 0.9%)
        const commissionRate = Number(tier?.commission_rate || 0.9);
        commissionEarned = (propertyPrice * commissionRate) / 100;
        Logger.info('Processing normal lot', { propertyPrice, commissionRate, commission: commissionEarned });
      }

      // Update order to Completed. There is no separate `completed_at` column,
      // and "today" stats/limits below filter on `created_at` — orders are
      // batch-pre-created well before a user actually completes them, so we
      // stamp `created_at` with the real completion time here or a lot
      // finished today would never count as "today's" activity.
      const { error: updateOrderError } = await supabaseAdmin
        .from('orders')
        .update({ status: 'Completed', commission: commissionEarned.toFixed(2), created_at: new Date().toISOString() })
        .eq('id', orderId)
        .eq('status', 'Pending');

      if (updateOrderError) {
        throw new AppError(500, 'Failed to complete order');
      }

      // Update wallet
      const { data: wallet, error: walletError } = await supabaseAdmin
        .from('wallets')
        .select('balance, total_earned')
        .eq('user_id', userId)
        .single();

      if (walletError || !wallet) {
        await supabaseAdmin.from('orders').update({ status: 'Pending' }).eq('id', orderId);
        throw new AppError(500, 'Wallet not found');
      }

      // Block submission if balance has dropped below the minimum required to trade
      if (Number(wallet.balance) < MINIMUM_BALANCE_TO_TRADE) {
        await supabaseAdmin.from('orders').update({ status: 'Pending' }).eq('id', orderId);
        throw new AppError(403, `A minimum balance of $${MINIMUM_BALANCE_TO_TRADE.toFixed(2)} is required to submit a lot. Please recharge your account.`);
      }

      // Calculate new balance
      // For normal lots: balance + commission
      // For special lots: balance - propertyPrice + commission (net: balance - 73% of price)
      // This is allowed to go negative — e.g. price 10000, balance 5000,
      // commission 2700 -> new balance -2300. The transaction still goes
      // through; it's just flagged (see below) rather than blocked.
      const netChange = isSpecialLot ? (commissionEarned - walletDeduction) : commissionEarned;
      const newBalance = Number(wallet.balance) + netChange;
      const newTotalEarned = Number(wallet.total_earned) + commissionEarned;
      const wentNegative = newBalance < 0;

      if (wentNegative) {
        // Flag the order that pushed the balance negative as Pending so it
        // shows under the Pending tab in History. This is safe from being
        // re-served as the user's "next lot" (which would let this
        // already-paid-out order be submitted again) because the special-lot
        // property fetch above explicitly excludes lot_type='special' from
        // that generic pending-order pool. The marker lets AdminService
        // auto-complete this specific order once the balance recovers.
        await supabaseAdmin
          .from('orders')
          .update({ status: 'Pending', property_name: NEGATIVE_BALANCE_FLAG })
          .eq('id', orderId);
      }

      const { error: updateWalletError } = await supabaseAdmin
        .from('wallets')
        .update({ 
          balance: newBalance,
          total_earned: newTotalEarned 
        })
        .eq('user_id', userId);

      if (updateWalletError) {
        await supabaseAdmin.from('orders').update({ status: 'Pending' }).eq('id', orderId);
        throw new AppError(500, 'Failed to update wallet');
      }

      // Update user total orders
      await supabaseAdmin
        .from('users')
        .update({ total_orders: (user.total_orders || 0) + 1 })
        .eq('id', userId);

      // Pay the referrer their 15% cut of the commission just earned, if any.
      if (user.referrer_id) {
        await this.payReferralBonus(user.referrer_id, commissionEarned, user.username);
      }

      Logger.info('Order submitted successfully', {
        userId,
        orderId,
        isSpecialLot,
        commission: commissionEarned,
        deduction: walletDeduction,
        netChange,
        newBalance,
        wentNegative,
      });

      return {
        success: true,
        commission: commissionEarned,
        deduction: walletDeduction,
        net_change: netChange,
        went_negative: wentNegative,
        new_balance: newBalance,
        is_special_lot: isSpecialLot,
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      Logger.error('Unexpected error in submitOrder', { userId, orderId, error });
      throw new AppError(500, 'Failed to submit order');
    }
  }

  /**
   * Get user's order history with filters
   */
  static async getOrderHistory(
    userId: string,
    status?: 'Pending' | 'Completed' | 'Undone',
    page: number = 1,
    limit: number = 10
  ) {
    try {
      const offset = (page - 1) * limit;

      let query = supabaseAdmin
        .from('orders')
        .select(
          `
          id,
          commission,
          status,
          created_at,
          properties (
            id,
            name,
            description,
            image_url,
            value
          )
        `,
          { count: 'exact' }
        )
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (status) {
        query = query.eq('status', status);
      }

      const { data: orders, count, error } = await query;

      if (error) {
        Logger.error('Failed to fetch order history', { userId, error });
        throw new AppError(500, 'Failed to fetch order history');
      }

      return {
        orders: orders || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
        },
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      Logger.error('Unexpected error in getOrderHistory', { userId, error });
      throw new AppError(500, 'Failed to fetch order history');
    }
  }

  /**
   * Get user's daily task statistics
   */
  static async getDailyStats(userId: string) {
    try {
      // Get user tier info
      const { data: user, error: userError } = await supabaseAdmin
        .from('users')
        .select(
          `
          id,
          total_orders,
          membership_levels (
            name,
            order_limit,
            commission_rate
          )
        `
        )
        .eq('id', userId)
        .single();

      if (userError || !user) {
        throw new AppError(404, 'User not found');
      }

      // Extract membership from array
      const tier = Array.isArray(user.membership_levels) ? user.membership_levels[0] : user.membership_levels;

      // Count today's completed orders
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString();

      // Commission is earned (and already paid into the wallet) the moment
      // an order is submitted, even if it got left `Pending` under
      // NEGATIVE_BALANCE_FLAG because it pushed the balance negative — so
      // those still count as "today's earnings" too, not just orders that
      // ended up `Completed`.
      const { data: todayOrders, count: todayCount } = await supabaseAdmin
        .from('orders')
        .select('commission', { count: 'exact' })
        .eq('user_id', userId)
        .or(`status.eq.Completed,and(status.eq.Pending,property_name.eq.${NEGATIVE_BALANCE_FLAG})`)
        .gte('created_at', todayISO);

      const todayEarnings = todayOrders?.reduce(
        (sum, order) => sum + Number(order.commission),
        0
      ) || 0;

      // Count pending orders
      const { count: pendingCount } = await supabaseAdmin
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'Pending');

      return {
        daily: {
          completed: todayCount || 0,
          // order_limit is a lifetime cap on total_orders, not a daily one
          // (see OrderService.generateLot) — "remaining" reflects that.
          remaining: tier.order_limit - (user.total_orders || 0),
          limit: tier.order_limit,
          earnings: todayEarnings,
        },
        pending_tasks: pendingCount || 0,
        total_lifetime_orders: user.total_orders,
        tier: {
          name: tier.name,
          commission_rate: tier.commission_rate,
        },
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      Logger.error('Unexpected error in getDailyStats', { userId, error });
      throw new AppError(500, 'Failed to fetch daily statistics');
    }
  }

  /**
   * Auto-assign default orders to a user from active properties
   */
  private static async autoAssignDefaultOrders(userId: string, orderLimit: number) {
    try {
      Logger.info('Starting auto-assignment of default orders', { userId, orderLimit });

      // Fetch active properties (try both is_active and status fields)
      let query = supabaseAdmin
        .from('properties')
        .select('id, value');

      // Try to filter by is_active first, if that fails try status
      const { data: properties, error: propError } = await query.limit(50);

      if (propError) {
        Logger.error('Properties fetch error', { error: propError });
        throw new AppError(400, `Failed to fetch properties: ${propError.message}`);
      }

      if (!properties || properties.length === 0) {
        Logger.error('No properties found in database');
        throw new AppError(400, 'No properties available in system. Please add properties first.');
      }

      Logger.info('Found properties', { count: properties.length });

      // Get user's tier commission rate
      const { data: user } = await supabaseAdmin
        .from('users')
        .select('tier_id')
        .eq('id', userId)
        .single();

      const { data: tier } = await supabaseAdmin
        .from('membership_levels')
        .select('commission_rate')
        .eq('id', user?.tier_id || 1)
        .single();

      const commissionRate = tier?.commission_rate || 0.9;
      Logger.info('Using commission rate', { commissionRate });

      // Create orders cycling through properties
      const ordersToCreate = [];
      for (let i = 0; i < orderLimit; i++) {
        const property = properties[i % properties.length];
        const propertyValue = Number(property.value || 0);
        const commission = (propertyValue * commissionRate) / 100;

        ordersToCreate.push({
          user_id: userId,
          property_id: property.id,
          commission: commission,
          status: 'Pending',
        });
      }

      Logger.info('Attempting to insert orders', { count: ordersToCreate.length });

      const { error: insertError, data: insertedData } = await supabaseAdmin
        .from('orders')
        .insert(ordersToCreate)
        .select();

      if (insertError) {
        Logger.error('Failed to auto-assign orders', { userId, error: insertError, message: insertError.message, details: insertError.details });
        throw new AppError(500, `Failed to create default orders: ${insertError.message}`);
      }

      Logger.info('Auto-assigned default orders successfully', { userId, count: insertedData?.length || orderLimit });
    } catch (error) {
      Logger.error('Error in autoAssignDefaultOrders', { userId, error: error instanceof Error ? error.message : error });
      throw error;
    }
  }
}
