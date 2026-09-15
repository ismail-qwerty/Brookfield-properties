import { supabaseAdmin } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';
import { Logger } from '../utils/logger.js';
import { NEGATIVE_BALANCE_FLAG } from './order.service.js';

export class AdminService {
  /**
   * Adjust a user's wallet balance by a signed amount: positive adds,
   * negative subtracts. "Reward" (total_earned) moves in lockstep, the same
   * way it already does for organic commission credits in
   * OrderService.submitOrder. If this brings the balance back to zero or
   * above, any orders that already paid out but were left Pending pending
   * recovery (see NEGATIVE_BALANCE_FLAG in OrderService.submitOrder) are
   * auto-completed.
   *
   * Both applyDebit and updateUser's balance_adjustment go through this
   * single implementation so the two admin tools that can change a
   * balance can't drift into different sign conventions or side effects
   * again — that mismatch is exactly what caused confusion before.
   */
  private static async adjustWalletBalance(userId: string, amount: number) {
    const { data: wallet, error: walletError } = await supabaseAdmin
      .from('wallets')
      .select('balance, total_earned')
      .eq('user_id', userId)
      .single();

    if (walletError || !wallet) {
      throw new AppError(404, 'User wallet not found');
    }

    const previousBalance = Number(wallet.balance);
    const previousTotalEarned = Number(wallet.total_earned);
    const newBalance = previousBalance + amount;
    const newTotalEarned = previousTotalEarned + amount;

    const { error: updateError } = await supabaseAdmin
      .from('wallets')
      .update({ balance: newBalance, total_earned: newTotalEarned })
      .eq('user_id', userId);

    if (updateError) {
      Logger.error('Failed to update wallet balance', { userId, error: updateError });
      throw new AppError(500, 'Failed to update wallet balance');
    }

    let resolvedOrderIds: string[] = [];
    if (newBalance >= 0) {
      const { data: resolved, error: resolveError } = await supabaseAdmin
        .from('orders')
        .update({ status: 'Completed', property_name: null, created_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('status', 'Pending')
        .eq('property_name', NEGATIVE_BALANCE_FLAG)
        .select('id');

      if (resolveError) {
        Logger.error('Failed to auto-complete negative-balance orders', { userId, error: resolveError });
      } else {
        resolvedOrderIds = (resolved || []).map((o) => o.id);
        if (resolvedOrderIds.length > 0) {
          Logger.info('Auto-completed orders after balance recovery', { userId, resolvedOrderIds });
        }
      }
    }

    return { previousBalance, newBalance, previousTotalEarned, newTotalEarned, resolvedOrderIds };
  }

  /**
   * Get paginated list of all users with wallet and tier information
   */
  static async getAllUsers(page: number = 1, limit: number = 10, filters?: any) {
    try {
      const offset = (page - 1) * limit;

      let query = supabaseAdmin
        .from('users')
        .select(
          `
          id,
          username,
          full_name,
          email,
          phone,
          reference_code,
          referrer_id,
          tier_id,
          credibility,
          min_withdrawal,
          max_withdrawal,
          user_status,
          wallet_status,
          user_type,
          total_orders,
          created_at,
          last_login_at,
          membership_levels (
            name,
            order_limit,
            commission_rate
          ),
          wallets (
            balance,
            total_recharged,
            total_earned,
            total_withdrawn
          )
        `,
          { count: 'exact' }
        )
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      // Apply filters
      if (filters?.user_status) {
        query = query.eq('user_status', filters.user_status);
      }
      if (filters?.wallet_status) {
        query = query.eq('wallet_status', filters.wallet_status);
      }
      if (filters?.tier_id) {
        query = query.eq('tier_id', filters.tier_id);
      }
      if (filters?.search) {
        query = query.or(
          `username.ilike.%${filters.search}%,email.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`
        );
      }

      const { data: users, count, error } = await query;

      if (error) {
        Logger.error('Failed to fetch users', { error });
        throw new AppError(500, 'Failed to fetch users');
      }

      // "Today" boundary for the per-user today_earnings/orders_today
      // computed below — same definition UserService.getProfile uses for
      // the user's own view, so the admin panel and a user's own page
      // always agree on this number.
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString();

      // Get referrer names + today's activity for each user
      const usersWithReferrers = await Promise.all(
        (users || []).map(async (user) => {
          // Supabase returns relationships as arrays, so extract first element
          const wallet = Array.isArray(user.wallets) ? user.wallets[0] : user.wallets;
          const membership = Array.isArray(user.membership_levels) ? user.membership_levels[0] : user.membership_levels;

          let referrer_name = null;
          if (user.referrer_id) {
            const { data: referrer } = await supabaseAdmin
              .from('users')
              .select('username, full_name')
              .eq('id', user.referrer_id)
              .single();
            referrer_name = referrer?.username || null;
          }

          // Commission is earned (and already paid into the wallet) the
          // moment an order is submitted, even if it got left `Pending`
          // under NEGATIVE_BALANCE_FLAG because it pushed the balance
          // negative — so those still count as "today's earnings" too,
          // not just orders that ended up `Completed`.
          const { data: todayOrders, error: todayOrdersError } = await supabaseAdmin
            .from('orders')
            .select('commission')
            .eq('user_id', user.id)
            .or(`status.eq.Completed,and(status.eq.Pending,property_name.eq.${NEGATIVE_BALANCE_FLAG})`)
            .gte('created_at', todayISO);

          if (todayOrdersError) {
            Logger.error('Failed to fetch today\'s orders for user in admin list', {
              userId: user.id,
              error: todayOrdersError,
            });
          }

          const today_earnings = (todayOrders || []).reduce((sum, o) => sum + Number(o.commission), 0);

          return {
            ...user,
            referrer_name,
            wallet: wallet || null,
            membership: membership || null,
            today_earnings,
            orders_today: (todayOrders || []).length,
          };
        })
      );

      return {
        users: usersWithReferrers,
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
      Logger.error('Unexpected error in getAllUsers', { error });
      throw new AppError(500, 'Failed to fetch users');
    }
  }

  /**
   * Get single user details with complete information
   */
  static async getUserById(userId: string) {
    try {
      const { data: user, error } = await supabaseAdmin
        .from('users')
        .select(
          `
          id,
          username,
          full_name,
          email,
          phone,
          reference_code,
          referrer_id,
          tier_id,
          credibility,
          min_withdrawal,
          max_withdrawal,
          user_status,
          wallet_status,
          user_type,
          total_orders,
          created_at,
          last_login_at,
          membership_levels (
            id,
            name,
            order_limit,
            commission_rate
          ),
          wallets (
            id,
            balance,
            total_recharged,
            total_earned,
            total_withdrawn,
            updated_at
          )
        `
        )
        .eq('id', userId)
        .single();

      if (error || !user) {
        throw new AppError(404, 'User not found');
      }

      // Get referrer information
      let referrer = null;
      if (user.referrer_id) {
        const { data: referrerData } = await supabaseAdmin
          .from('users')
          .select('id, username, full_name, email')
          .eq('id', user.referrer_id)
          .single();
        referrer = referrerData;
      }

      // Count referrals
      const { count: referralCount } = await supabaseAdmin
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('referrer_id', userId);

      // Count pending orders
      const { count: pendingOrders } = await supabaseAdmin
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'Pending');

      return {
        ...user,
        referrer,
        referral_count: referralCount || 0,
        pending_orders: pendingOrders || 0,
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      Logger.error('Unexpected error in getUserById', { userId, error });
      throw new AppError(500, 'Failed to fetch user details');
    }
  }

  /**
   * Update user profile and account settings
   * Supports independent control of user_status and wallet_status
   */
  static async updateUser(userId: string, updates: any, adminId: string) {
    try {
      Logger.info('Admin updating user', { userId, adminId, updates });

      // Fetch current user data
      const { data: currentUser, error: fetchError } = await supabaseAdmin
        .from('users')
        .select('username, user_status, wallet_status, user_type')
        .eq('id', userId)
        .single();

      if (fetchError || !currentUser) {
        throw new AppError(404, 'User not found');
      }

      // Prevent modifying admin accounts (security measure)
      if (currentUser.user_type === 'Admin' && userId !== adminId) {
        throw new AppError(403, 'Cannot modify other administrator accounts');
      }

      // Build update object
      const updateData: any = {};

      // Basic profile fields
      if (updates.full_name !== undefined && updates.full_name !== '') {
        updateData.full_name = updates.full_name;
      }

      if (updates.phone !== undefined && updates.phone !== '') {
        updateData.phone = updates.phone;
      }

      if (updates.user_type !== undefined && ['User', 'Admin', 'ChatSupport'].includes(updates.user_type)) {
        updateData.user_type = updates.user_type;
      }

      // Independent user_status control (global login access)
      if (updates.user_status !== undefined) {
        if (!['Active', 'Deactivate'].includes(updates.user_status)) {
          throw new AppError(400, 'Invalid user_status. Must be Active or Deactivate');
        }
        updateData.user_status = updates.user_status;

        Logger.info('User status change', {
          userId,
          adminId,
          from: currentUser.user_status,
          to: updates.user_status,
        });
      }

      // Independent wallet_status control (financial operations access)
      if (updates.wallet_status !== undefined) {
        if (!['Active', 'Deactivate'].includes(updates.wallet_status)) {
          throw new AppError(400, 'Invalid wallet_status. Must be Active or Deactivate');
        }
        updateData.wallet_status = updates.wallet_status;

        Logger.info('Wallet status change', {
          userId,
          adminId,
          from: currentUser.wallet_status,
          to: updates.wallet_status,
        });
      }

      // Tier change
      if (updates.tier_id !== undefined) {
        // Validate tier exists
        const { data: tier, error: tierError } = await supabaseAdmin
          .from('membership_levels')
          .select('id, name')
          .eq('id', updates.tier_id)
          .single();

        if (tierError || !tier) {
          throw new AppError(400, 'Invalid tier_id. Tier does not exist');
        }

        updateData.tier_id = updates.tier_id;

        Logger.info('Tier change', {
          userId,
          adminId,
          newTierId: updates.tier_id,
          newTierName: tier.name,
        });
      }

      // Credibility update (0-100 range)
      if (updates.credibility !== undefined) {
        if (updates.credibility < 0 || updates.credibility > 100) {
          throw new AppError(400, 'Credibility must be between 0 and 100');
        }
        updateData.credibility = updates.credibility;

        Logger.info('Credibility change', {
          userId,
          adminId,
          newCredibility: updates.credibility,
        });
      }

      // Withdrawal limits
      if (updates.min_withdrawal !== undefined) {
        if (updates.min_withdrawal <= 0) {
          throw new AppError(400, 'Minimum withdrawal must be positive');
        }
        updateData.min_withdrawal = updates.min_withdrawal;
      }

      if (updates.max_withdrawal !== undefined) {
        if (updates.max_withdrawal <= 0) {
          throw new AppError(400, 'Maximum withdrawal must be positive');
        }
        updateData.max_withdrawal = updates.max_withdrawal;
      }

      // Validate min < max if both are being updated
      if (updateData.min_withdrawal && updateData.max_withdrawal) {
        if (updateData.min_withdrawal >= updateData.max_withdrawal) {
          throw new AppError(
            400,
            'Minimum withdrawal must be less than maximum withdrawal'
          );
        }
      }

      // Referrer update — validate the referrer actually exists first;
      // otherwise this silently fails as a generic 500 (a foreign key
      // violation from the DB) instead of a clear, actionable error.
      if (updates.referrer_id !== undefined && updates.referrer_id !== null && updates.referrer_id !== '') {
        const referrerId = Number(updates.referrer_id);

        if (isNaN(referrerId)) {
          throw new AppError(400, 'Parent ID must be a number');
        }

        if (referrerId === Number(userId)) {
          throw new AppError(400, 'A user cannot be their own parent/referrer');
        }

        const { data: referrer, error: referrerError } = await supabaseAdmin
          .from('users')
          .select('id')
          .eq('id', referrerId)
          .maybeSingle();

        if (referrerError || !referrer) {
          throw new AppError(400, `Parent ID ${referrerId} does not exist`);
        }

        updateData.referrer_id = referrerId;
      }

      // Handle balance adjustment — positive adds, negative subtracts (see
      // adjustWalletBalance; this is the same helper applyDebit uses, so
      // both admin tools that can move a balance behave identically).
      let balanceResult: Awaited<ReturnType<typeof AdminService.adjustWalletBalance>> | null = null;
      if (updates.balance_adjustment !== undefined && updates.balance_adjustment !== '' && updates.balance_adjustment !== 0) {
        const adjustment = Number(updates.balance_adjustment);

        if (isNaN(adjustment)) {
          throw new AppError(400, 'Invalid balance adjustment value');
        }

        balanceResult = await this.adjustWalletBalance(userId, adjustment);

        Logger.info('Balance adjusted successfully', {
          userId,
          adminId,
          adjustment,
          previousBalance: balanceResult.previousBalance,
          newBalance: balanceResult.newBalance,
          resolvedOrderIds: balanceResult.resolvedOrderIds,
        });
      }

      // Check if any updates were provided (only if balance wasn't adjusted)
      if (Object.keys(updateData).length === 0 && (updates.balance_adjustment === undefined || updates.balance_adjustment === '' || updates.balance_adjustment === 0)) {
        throw new AppError(400, 'No valid fields provided for update');
      }

      // Execute update only if there are fields to update
      let updatedUser = null;
      if (Object.keys(updateData).length > 0) {
        const { data, error: updateError } = await supabaseAdmin
          .from('users')
          .update(updateData)
          .eq('id', userId)
          .select(
            `
            id,
            username,
            full_name,
            email,
            phone,
            user_status,
            wallet_status,
            user_type,
            tier_id,
            credibility,
            min_withdrawal,
            max_withdrawal,
            membership_levels (
              name,
              order_limit,
              commission_rate
            )
          `
          )
          .single();

        if (updateError) {
          Logger.error('Failed to update user', { userId, error: updateError });
          throw new AppError(500, 'Failed to update user');
        }

        updatedUser = data;
      }

      Logger.info('User updated successfully', {
        userId,
        adminId,
        username: currentUser.username,
        updatedFields: Object.keys(updateData),
      });

      return {
        user: updatedUser,
        changes: updateData,
        wallet: balanceResult
          ? {
              previous_balance: balanceResult.previousBalance,
              new_balance: balanceResult.newBalance,
              previous_total_earned: balanceResult.previousTotalEarned,
              new_total_earned: balanceResult.newTotalEarned,
            }
          : undefined,
        resolved_order_ids: balanceResult?.resolvedOrderIds || [],
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      Logger.error('Unexpected error in updateUser', { userId, error });
      throw new AppError(500, 'Failed to update user');
    }
  }

  /**
   * Apply manual debit to user wallet (supports negative balance)
   */
  static async applyDebit(
    userId: string,
    amount: number,
    reason: string,
    adminId: string,
    notes?: string
  ) {
    try {
      Logger.info('Admin adjusting balance', { userId, adminId, amount, reason });

      // Validate user exists
      const { data: user, error: userError } = await supabaseAdmin
        .from('users')
        .select('id, username')
        .eq('id', userId)
        .single();

      if (userError || !user) {
        throw new AppError(404, 'User not found');
      }

      // Create debit log entry (amount is stored exactly as submitted —
      // positive adds, negative subtracts — matching adjustWalletBalance)
      const { data: debitLog, error: debitError } = await supabaseAdmin
        .from('debits_log')
        .insert({
          user_id: userId,
          amount,
          reason,
          applied_by_admin_id: adminId,
        })
        .select('id, created_at')
        .single();

      if (debitError) {
        Logger.error('Failed to create debit log', { userId, error: debitError });
        throw new AppError(500, 'Failed to apply debit');
      }

      const result = await this.adjustWalletBalance(userId, amount);

      Logger.info('Balance adjustment applied successfully', {
        userId,
        username: user.username,
        adminId,
        amount,
        previousBalance: result.previousBalance,
        newBalance: result.newBalance,
        debitLogId: debitLog.id,
        resolvedOrderIds: result.resolvedOrderIds,
      });

      return {
        debit: {
          id: debitLog.id,
          amount,
          reason,
          created_at: debitLog.created_at,
        },
        wallet: {
          previous_balance: result.previousBalance,
          new_balance: result.newBalance,
          previous_total_earned: result.previousTotalEarned,
          new_total_earned: result.newTotalEarned,
          can_be_negative: true,
        },
        resolved_order_ids: result.resolvedOrderIds,
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      Logger.error('Unexpected error in applyDebit', { userId, error });
      throw new AppError(500, 'Failed to apply debit');
    }
  }

  /**
   * Assign 3 properties to user for task execution
   */
  static async assignOrders(
    userId: string,
    propertyIds: number[],
    sequenceAfterOrderNo: number,
    adminId: string
  ) {
    try {
      Logger.info('Admin assigning orders', {
        userId,
        adminId,
        propertyIds,
        sequenceAfterOrderNo,
      });

      // Validate exactly 3 properties
      if (propertyIds.length !== 3) {
        throw new AppError(400, 'Exactly 3 properties must be assigned');
      }

      // Validate unique property IDs
      const uniqueIds = new Set(propertyIds);
      if (uniqueIds.size !== 3) {
        throw new AppError(400, 'Property IDs must be unique');
      }

      // Validate user exists
      const { data: user, error: userError } = await supabaseAdmin
        .from('users')
        .select('id, username, tier_id, membership_levels(commission_rate)')
        .eq('id', userId)
        .single();

      if (userError || !user) {
        throw new AppError(404, 'User not found');
      }

      const tier = user.membership_levels as any;
      if (!tier) {
        throw new AppError(500, 'User membership tier not found');
      }

      // Validate properties exist and are active
      const { data: properties, error: propsError } = await supabaseAdmin
        .from('properties')
        .select('id, title, price, status')
        .in('id', propertyIds);

      if (propsError || !properties || properties.length !== 3) {
        throw new AppError(400, 'One or more property IDs are invalid');
      }

      const inactiveProps = properties.filter((p) => p.status !== 'Active');
      if (inactiveProps.length > 0) {
        throw new AppError(
          400,
          `Properties ${inactiveProps.map((p) => p.id).join(', ')} are inactive`
        );
      }

      // Clear existing pending orders for this user
      const { error: deleteError } = await supabaseAdmin
        .from('orders')
        .delete()
        .eq('user_id', userId)
        .eq('status', 'Pending');

      if (deleteError) {
        Logger.error('Failed to clear pending orders', { userId, error: deleteError });
        throw new AppError(500, 'Failed to clear existing orders');
      }

      // Create new order assignments
      const ordersToInsert = properties.map((property) => {
        const commission = (Number(property.price) * Number(tier.commission_rate)) / 100;
        return {
          user_id: userId,
          property_id: property.id,
          commission: commission.toFixed(2),
          status: 'Pending',
        };
      });

      const { data: newOrders, error: insertError } = await supabaseAdmin
        .from('orders')
        .insert(ordersToInsert)
        .select(
          `
          id,
          property_id,
          commission,
          status,
          properties (
            id,
            title,
            price
          )
        `
        );

      if (insertError) {
        Logger.error('Failed to insert orders', { userId, error: insertError });
        throw new AppError(500, 'Failed to assign orders');
      }

      Logger.info('Orders assigned successfully', {
        userId,
        username: user.username,
        adminId,
        orderCount: newOrders?.length || 0,
        sequenceAfterOrderNo,
      });

      return {
        orders: newOrders,
        assignment_info: {
          commission_rate: tier.commission_rate,
        },
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      Logger.error('Unexpected error in assignOrders', { userId, error });
      throw new AppError(500, 'Failed to assign orders');
    }
  }

  /**
   * Get all membership levels with member counts
   */
  static async getMemberships() {
    const { data: levels, error } = await supabaseAdmin
      .from('membership_levels')
      .select('*')
      .order('id', { ascending: true });

    if (error) {
      Logger.error('Failed to fetch membership levels', { error });
      throw new AppError(500, 'Failed to fetch membership tiers');
    }

    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('tier_id');

    if (usersError) {
      Logger.error('Failed to fetch users for membership counts', { error: usersError });
    }

    const counts: Record<number, number> = {};
    (users || []).forEach((u: any) => {
      counts[u.tier_id] = (counts[u.tier_id] || 0) + 1;
    });

    const memberships = (levels || []).map((level: any) => ({
      ...level,
      member_count: counts[level.id] || 0,
    }));

    return { memberships };
  }

  /**
   * Create a new membership level
   */
  static async createMembership(payload: {
    name: string;
    order_limit: number;
    commission_rate: number;
  }) {
    const { data, error } = await supabaseAdmin
      .from('membership_levels')
      .insert({
        name: payload.name,
        order_limit: payload.order_limit,
        commission_rate: payload.commission_rate,
      })
      .select('*')
      .single();

    if (error || !data) {
      Logger.error('Failed to create membership level', { error });
      throw new AppError(500, 'Failed to create membership tier');
    }

    return { membership: { ...data, member_count: 0 } };
  }

  /**
   * Update an existing membership level
   */
  static async updateMembership(
    id: string,
    payload: { name?: string; order_limit?: number; commission_rate?: number }
  ) {
    const { data, error } = await supabaseAdmin
      .from('membership_levels')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();

    if (error || !data) {
      Logger.error('Failed to update membership level', { id, error });
      throw new AppError(404, 'Membership tier not found or update failed');
    }

    return { membership: data };
  }

  /**
   * Delete a membership level (only if no users are on this tier)
   */
  static async deleteMembership(id: string) {
    const { count, error: countError } = await supabaseAdmin
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('tier_id', id);

    if (countError) {
      Logger.error('Failed to check members on tier', { id, error: countError });
      throw new AppError(500, 'Failed to verify membership tier usage');
    }

    if ((count || 0) > 0) {
      throw new AppError(400, 'Cannot delete a membership tier that has active members');
    }

    const { error } = await supabaseAdmin
      .from('membership_levels')
      .delete()
      .eq('id', id);

    if (error) {
      Logger.error('Failed to delete membership level', { id, error });
      throw new AppError(500, 'Failed to delete membership tier');
    }

    return { id };
  }

  /**
   * Assign a special lot to user
   */
  static async assignSpecialLot(
    userId: string,
    specialLotId: string,
    orderNumber: number,
    adminId: string
  ) {
    try {
      Logger.info('Admin assigning special lot', {
        userId,
        adminId,
        specialLotId,
        orderNumber,
      });

      // Validate user exists
      const { data: user, error: userError } = await supabaseAdmin
        .from('users')
        .select('id, username, total_orders, tier_id')
        .eq('id', userId)
        .single();

      if (userError || !user) {
        throw new AppError(404, 'User not found');
      }

      // `orderNumber` is the user's absolute position within their current
      // lot cycle (0 to the tier's order_limit, reset to 0 via
      // resetUserOrders) — e.g. 8 means "after their 8th lot in this cycle,
      // so the 9th is special". The trigger check in OrderService.generateLot
      // fires once total_orders > trigger_after_order_no (a strict `<`), so
      // we store orderNumber - 1: total_orders reaching 8 then satisfies
      // `7 < 8`, on the generateLot call that produces the 9th lot.
      //
      // This must be an absolute position, not an offset from the user's
      // current total_orders: since total_orders is capped at order_limit,
      // adding it in would push the threshold past the cap whenever the user
      // isn't at a fresh 0, making the special lot permanently unreachable.
      const { data: tier } = await supabaseAdmin
        .from('membership_levels')
        .select('order_limit')
        .eq('id', user.tier_id)
        .single();

      const orderLimit = tier?.order_limit || 27;
      if (orderNumber >= orderLimit) {
        throw new AppError(
          400,
          `"After order ${orderNumber}" is unreachable: this user's lot limit is ${orderLimit} per cycle. Choose a number below ${orderLimit}, or reset their count first if you need a fresh cycle to schedule against.`
        );
      }

      const triggerAfterOrderNo = orderNumber - 1;

      // Validate special lot exists
      const { data: specialLot, error: lotError } = await supabaseAdmin
        .from('properties')
        .select('*')
        .eq('id', specialLotId)
        .eq('lot_type', 'special')
        .single();

      if (lotError || !specialLot) {
        throw new AppError(404, 'Special lot not found');
      }

      if (specialLot.status !== 'Active') {
        throw new AppError(400, 'Special lot is not active');
      }

      // Calculate daily commission (27% default for special lots)
      const dailyCommission = (Number(specialLot.value) * 27) / 100;

      // Insert into user_special_lots_queue
      const { data: queueEntry, error: insertError } = await supabaseAdmin
        .from('user_special_lots_queue')
        .insert({
          user_id: userId,
          special_lot_id: specialLotId,
          lot_value: specialLot.value,
          daily_commission: dailyCommission.toFixed(2),
          trigger_after_order_no: triggerAfterOrderNo,
          status: 'Pending',
        })
        .select('*')
        .single();

      if (insertError) {
        Logger.error('Failed to assign special lot', { userId, error: insertError });
        throw new AppError(500, 'Failed to assign special lot');
      }

      Logger.info('Special lot assigned successfully', {
        userId,
        username: user.username,
        adminId,
        specialLotId,
        orderNumber,
      });

      return {
        special_lot_assignment: {
          id: queueEntry.id,
          special_lot: specialLot,
          trigger_after_order: orderNumber,
          daily_commission: dailyCommission.toFixed(2),
          status: 'Pending',
        },
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      Logger.error('Unexpected error in assignSpecialLot', { userId, error });
      throw new AppError(500, 'Failed to assign special lot');
    }
  }

  /**
   * Get user's assigned special lots
   */
  static async getUserSpecialLots(userId: string) {
    try {
      const { data, error } = await supabaseAdmin
        .from('user_special_lots_queue')
        .select(`
          *,
          properties (
            id,
            name,
            value
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        Logger.error('Failed to fetch user special lots', { userId, error });
        throw new AppError(500, 'Failed to fetch special lots');
      }

      return data || [];
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      Logger.error('Unexpected error in getUserSpecialLots', { userId, error });
      throw new AppError(500, 'Failed to fetch special lots');
    }
  }

  /**
   * Un-assign a special lot that hasn't been delivered yet
   */
  static async removeSpecialLot(userId: string, queueId: string, adminId: string) {
    try {
      Logger.info('Admin removing special lot', { userId, queueId, adminId });

      const { data: entry, error: fetchError } = await supabaseAdmin
        .from('user_special_lots_queue')
        .select('id, status, trigger_after_order_no')
        .eq('id', queueId)
        .eq('user_id', userId)
        .maybeSingle();

      if (fetchError) {
        Logger.error('Failed to look up special lot for removal', { userId, queueId, error: fetchError });
        throw new AppError(500, 'Failed to remove special lot');
      }

      if (!entry) {
        throw new AppError(404, 'Special lot assignment not found for this user');
      }

      // A delivered lot already exists as a real order in the user's history
      // and has been paid out — deleting the queue row would not undo any of
      // that, it would only hide the record. Only undelivered ones can go.
      if (entry.status !== 'Pending') {
        throw new AppError(
          400,
          'This special lot has already been delivered to the user, so it can no longer be removed.'
        );
      }

      const { error: deleteError } = await supabaseAdmin
        .from('user_special_lots_queue')
        .delete()
        .eq('id', queueId)
        .eq('user_id', userId)
        .eq('status', 'Pending');

      if (deleteError) {
        Logger.error('Failed to remove special lot', { userId, queueId, error: deleteError });
        throw new AppError(500, 'Failed to remove special lot');
      }

      Logger.info('Special lot removed successfully', { userId, queueId, adminId });

      return { user_id: userId, removed_id: queueId };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      Logger.error('Unexpected error in removeSpecialLot', { userId, queueId, error });
      throw new AppError(500, 'Failed to remove special lot');
    }
  }

  /**
   * Reset user's completed orders count to zero
   */
  static async resetUserOrders(userId: string, adminId: string) {
    try {
      Logger.info('Admin resetting user orders', { userId, adminId });

      // Validate user exists
      const { data: user, error: userError } = await supabaseAdmin
        .from('users')
        .select('id, username, total_orders')
        .eq('id', userId)
        .single();

      if (userError || !user) {
        throw new AppError(404, 'User not found');
      }

      const previousTotal = user.total_orders || 0;

      // Reset total_orders to 0
      const { error: updateError } = await supabaseAdmin
        .from('users')
        .update({ total_orders: 0 })
        .eq('id', userId);

      if (updateError) {
        Logger.error('Failed to reset user orders', { userId, error: updateError });
        throw new AppError(500, 'Failed to reset orders');
      }

      // Pending special lots were scheduled as absolute positions in the cycle
      // that just ended (see assignSpecialLot), so they are meaningless against
      // a counter now back at 0 — a lot queued for "after order 22" would sit
      // 22 lots away, and one queued below the old count would fire instantly.
      // Drop them so the admin schedules against the fresh cycle instead.
      // Already-delivered ('Completed') entries are history and stay put.
      const { data: clearedLots, error: clearError } = await supabaseAdmin
        .from('user_special_lots_queue')
        .delete()
        .eq('user_id', userId)
        .eq('status', 'Pending')
        .select('id');

      if (clearError) {
        Logger.error('Failed to clear pending special lots on reset', { userId, error: clearError });
        throw new AppError(500, 'Orders were reset but pending special lots could not be cleared');
      }

      const clearedSpecialLots = clearedLots?.length || 0;

      Logger.info('User orders reset successfully', {
        userId,
        username: user.username,
        adminId,
        previousTotal,
        newTotal: 0,
        clearedSpecialLots,
      });

      return {
        user_id: userId,
        username: user.username,
        previous_total_orders: previousTotal,
        new_total_orders: 0,
        cleared_special_lots: clearedSpecialLots,
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      Logger.error('Unexpected error in resetUserOrders', { userId, error });
      throw new AppError(500, 'Failed to reset user orders');
    }
  }
}
