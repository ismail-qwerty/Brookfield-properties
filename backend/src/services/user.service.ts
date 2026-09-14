import { supabaseAdmin } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';
import { Logger } from '../utils/logger.js';
import { NEGATIVE_BALANCE_FLAG } from './order.service.js';

export class UserService {
  /**
   * Get authenticated user profile with wallet and membership info
   */
  static async getProfile(userId: string) {
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
            balance,
            total_recharged,
            total_earned,
            total_withdrawn
          )
        `
        )
        .eq('id', userId)
        .single();

      if (error || !user) {
        throw new AppError(404, 'User profile not found');
      }

      // Get today's earnings
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Commission is earned (and already paid into the wallet) the moment
      // an order is submitted, even if it got left `Pending` under
      // NEGATIVE_BALANCE_FLAG because it pushed the balance negative — so
      // those still count as "today's earnings" too, not just orders that
      // ended up `Completed`.
      const { data: todayOrders } = await supabaseAdmin
        .from('orders')
        .select('commission')
        .eq('user_id', userId)
        .or(`status.eq.Completed,and(status.eq.Pending,property_name.eq.${NEGATIVE_BALANCE_FLAG})`)
        .gte('created_at', today.toISOString());

      const todayEarnings = (todayOrders || []).reduce(
        (sum, order) => sum + Number(order.commission),
        0
      );

      // Get orders completed today count (same inclusion rule as above)
      const { count: ordersToday } = await supabaseAdmin
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .or(`status.eq.Completed,and(status.eq.Pending,property_name.eq.${NEGATIVE_BALANCE_FLAG})`)
        .gte('created_at', today.toISOString());

      // Referral stats: how many people this user has referred, and how
      // much they've earned in referral bonuses (15% of each referred
      // user's commission — see OrderService.payReferralBonus).
      const { count: referralCount } = await supabaseAdmin
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('referrer_id', userId);

      const { data: referralBonusRows } = await supabaseAdmin
        .from('debits_log')
        .select('amount')
        .eq('user_id', userId)
        .like('reason', 'Referral bonus%');

      const referralEarnings = (referralBonusRows || []).reduce(
        (sum, row) => sum + Number(row.amount),
        0
      );

      // Extract first element from arrays (Supabase returns relationships as arrays)
      const wallet = Array.isArray(user.wallets) ? user.wallets[0] : user.wallets;
      const membership = Array.isArray(user.membership_levels) ? user.membership_levels[0] : user.membership_levels;

      return {
        ...user,
        membership: membership || null,
        wallet: wallet || null,
        today_earnings: todayEarnings,
        orders_today: ordersToday || 0,
        referral_count: referralCount || 0,
        referral_earnings: referralEarnings,
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      Logger.error('Unexpected error in getProfile', { userId, error });
      throw new AppError(500, 'Failed to fetch user profile');
    }
  }

  /**
   * Get authenticated user's wallet balance and transaction summary
   */
  static async getWallet(userId: string) {
    try {
      const { data: wallet, error } = await supabaseAdmin
        .from('wallets')
        .select('balance, total_recharged, total_earned, total_withdrawn')
        .eq('user_id', userId)
        .single();

      if (error || !wallet) {
        throw new AppError(404, 'Wallet not found');
      }

      return wallet;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      Logger.error('Unexpected error in getWallet', { userId, error });
      throw new AppError(500, 'Failed to fetch wallet');
    }
  }
}
