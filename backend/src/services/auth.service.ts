import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabaseAdmin } from '../config/database.js';
import { ENV } from '../config/environment.js';
import { AppError } from '../middleware/errorHandler.js';

export class AuthService {
  static async register(userData: {
    username: string;
    full_name: string;
    email: string;
    phone: string;
    password: string;
    wallet_password: string;
    reference_code: string;
  }) {
    const {
      username,
      full_name,
      email,
      phone,
      password,
      wallet_password,
      reference_code,
    } = userData;

    // Validate reference code if provided
    let referrer_id = null;
    if (reference_code && reference_code.trim() !== '') {
      const { data: referrer, error: referrerError } = await supabaseAdmin
        .from('users')
        .select('id, username, user_status')
        .eq('reference_code', reference_code)
        .maybeSingle();

      if (referrerError) {
        console.error('Referrer lookup error:', referrerError);
        throw new AppError(400, 'Error validating reference code. Please try again.');
      }

      if (!referrer) {
        throw new AppError(400, 'Invalid reference code. Please check your invitation link.');
      }

      if (referrer.user_status !== 'Active') {
        throw new AppError(400, 'Reference code belongs to an inactive account.');
      }

      referrer_id = referrer.id;
    }

    // Check if username already exists
    const { data: existingUsername } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('username', username)
      .maybeSingle();

    if (existingUsername) {
      throw new AppError(400, 'Username already taken');
    }

    // Check if email already exists
    const { data: existingEmail } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (existingEmail) {
      throw new AppError(400, 'Email already registered');
    }

    // Check if phone already exists
    const { data: existingPhone } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('phone', phone)
      .maybeSingle();

    if (existingPhone) {
      throw new AppError(400, 'Phone number already registered');
    }

    // Hash passwords
    const password_hash = await bcrypt.hash(password, 10);
    const wallet_password_hash = await bcrypt.hash(wallet_password, 10);

    // Generate unique reference code for new user
    const newReferenceCode = this.generateReferenceCode();

    // Try RPC function first, fallback to direct insert
    let createdUser;
    try {
      const { data: rpcUser, error: rpcError } = await supabaseAdmin
        .rpc('create_new_user', {
          p_username: username,
          p_full_name: full_name,
          p_email: email,
          p_phone: phone,
          p_password_hash: password_hash,
          p_wallet_password_hash: wallet_password_hash,
          p_reference_code: newReferenceCode,
          p_referrer_id: referrer_id,
        });

      if (rpcError) {
        throw rpcError;
      }
      createdUser = rpcUser;
    } catch (rpcError: any) {
      console.log('RPC function not available, using direct insert:', rpcError.message);
      
      // Fallback: Direct insert
      const { data: insertedUser, error: insertError } = await supabaseAdmin
        .from('users')
        .insert({
          username,
          full_name,
          email,
          phone,
          password_hash,
          wallet_password_hash,
          reference_code: newReferenceCode,
          referrer_id,
          tier_id: 1,
          user_status: 'Active',
          wallet_status: 'Active',
          user_type: 'User',
        })
        .select()
        .single();

      if (insertError) {
        console.error('User insert error:', insertError);
        throw new AppError(500, `Failed to create user: ${insertError.message}`);
      }

      // Create wallet for new user
      await supabaseAdmin
        .from('wallets')
        .insert({
          user_id: insertedUser.id,
          balance: 0,
          total_recharged: 0,
          total_earned: 0,
          total_withdrawn: 0,
        });

      createdUser = insertedUser;
    }

    const token = this.generateToken(String(createdUser.id));

    return {
      user: createdUser,
      token,
    };
  }

  static async login(username: string, password: string) {
    // Find user by username
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('username', username)
      .single();

    if (error || !user) {
      throw new AppError(401, 'Invalid username or password');
    }

    // Check if account is active
    if (user.user_status !== 'Active') {
      throw new AppError(403, 'Your account has been deactivated. Please contact support.');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      throw new AppError(401, 'Invalid username or password');
    }

    // Update last login timestamp
    await supabaseAdmin
      .from('users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', user.id);

    // Generate JWT token
    const token = this.generateToken(user.id);

    // Get wallet information
    const { data: wallet } = await supabaseAdmin
      .from('wallets')
      .select('balance, total_earned, total_recharged, total_withdrawn')
      .eq('user_id', user.id)
      .single();

    // Get tier information
    const { data: tier } = await supabaseAdmin
      .from('membership_levels')
      .select('name, order_limit, commission_rate')
      .eq('id', user.tier_id)
      .single();

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        phone: user.phone,
        reference_code: user.reference_code,
        tier_id: user.tier_id,
        credibility: user.credibility,
        user_status: user.user_status,
        wallet_status: user.wallet_status,
        user_type: user.user_type,
        total_orders: user.total_orders,
      },
      wallet: wallet || {
        balance: 0,
        total_earned: 0,
        total_recharged: 0,
        total_withdrawn: 0,
      },
      tier: tier || {
        name: 'Silver',
        order_limit: 35,
        commission_rate: 0.5,
      },
      token,
    };
  }

  private static generateToken(userId: string): string {
    return jwt.sign({ userId }, ENV.JWT.SECRET, { expiresIn: '7d' });
  }

  private static generateReferenceCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'REF';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }
}
