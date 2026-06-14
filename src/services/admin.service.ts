import { supabaseAdmin } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';
import { Logger } from '../utils/logger.js';

export class AdminService {
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

      // Get referrer names for users with referrer_id
      const usersWithReferrers = await Promise.all(
        (users || []).map(async (user) => {
          if (user.referrer_id) {
            const { data: referrer } = await supabaseAdmin
              .from('users')
              .select('username, full_name')
              .eq('id', user.referrer_id)
              .single();

            return {
              ...user,
              referrer_name: referrer?.username || null,
            };
          }
          return {
            ...user,
            referrer_name: null,
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

      // Check if any updates were provided
      if (Object.keys(updateData).length === 0) {
        throw new AppError(400, 'No valid fields provided for update');
      }

      // Execute update
      const { data: updatedUser, error: updateError } = await supabaseAdmin
        .from('users')
        .update(updateData)
        .eq('id', userId)
        .select(
          `
          id,
          username,
          full_name,
          email,
          user_status,
          wallet_status,
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

      Logger.info('User updated successfully', {
        userId,
        adminId,
        username: currentUser.username,
        updatedFields: Object.keys(updateData),
      });

      return {
        user: updatedUser,
        changes: updateData,
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
      Logger.info('Admin applying debit', { userId, adminId, amount, reason });

      // Validate user exists
      const { data: user, error: userError } = await supabaseAdmin
        .from('users')
        .select('id, username')
        .eq('id', userId)
        .single();

      if (userError || !user) {
        throw new AppError(404, 'User not found');
      }

      // Get current wallet balance
      const { data: wallet, error: walletError } = await supabaseAdmin
        .from('wallets')
        .select('balance')
        .eq('user_id', userId)
        .single();

      if (walletError || !wallet) {
        throw new AppError(404, 'User wallet not found');
      }

      const currentBalance = Number(wallet.balance);
      const newBalance = currentBalance - amount;

      // Create debit log entry
      const { data: debitLog, error: debitError } = await supabaseAdmin
        .from('debits')
        .insert({
          user_id: userId,
          amount,
          reason,
          notes,
          applied_by_admin_id: adminId,
        })
        .select('id, created_at')
        .single();

      if (debitError) {
        Logger.error('Failed to create debit log', { userId, error: debitError });
        throw new AppError(500, 'Failed to apply debit');
      }

      // Note: Wallet balance is automatically updated by database trigger
      // Fetch updated balance
      const { data: updatedWallet } = await supabaseAdmin
        .from('wallets')
        .select('balance, updated_at')
        .eq('user_id', userId)
        .single();

      Logger.info('Debit applied successfully', {
        userId,
        username: user.username,
        adminId,
        amount,
        previousBalance: currentBalance,
        newBalance: updatedWallet?.balance || newBalance,
        debitLogId: debitLog.id,
      });

      return {
        debit: {
          id: debitLog.id,
          amount,
          reason,
          notes,
          created_at: debitLog.created_at,
        },
        wallet: {
          previous_balance: currentBalance,
          new_balance: updatedWallet?.balance || newBalance,
          can_be_negative: true,
        },
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
          task_value: property.price,
          commission: commission.toFixed(2),
          status: 'Pending',
          sequence_after_order_no: sequenceAfterOrderNo,
        };
      });

      const { data: newOrders, error: insertError } = await supabaseAdmin
        .from('orders')
        .insert(ordersToInsert)
        .select(
          `
          id,
          property_id,
          task_value,
          commission,
          status,
          sequence_after_order_no,
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
          sequence_after_order_no: sequenceAfterOrderNo,
          unlocks_after_total_orders: sequenceAfterOrderNo,
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
}
