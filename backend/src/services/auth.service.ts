import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabaseAdmin } from '../config/database.js';
import { ENV } from '../config/environment.js';
import { AppError } from '../middleware/errorHandler.js';

export class AuthService {
  /**
   * Check whether a username is free to register, for live "already taken"
   * feedback while the user is still typing (rather than only finding out
   * after submitting the whole form).
   */
  static async checkUsernameAvailable(username: string) {
    const trimmed = username.trim();

    if (trimmed.length < 3) {
      return { available: false, reason: 'Username must be at least 3 characters' };
    }

    const { data: existing } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('username', trimmed)
      .maybeSingle();

    return { available: !existing };
  }

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

    console.log('[REGISTER] Registration attempt:', { username, email, phone, reference_code });

    // Any reference code is accepted; it only links a referrer when it matches an active user
    let referrer_id = null;
    if (reference_code && reference_code.trim() !== '') {
      const { data: referrer } = await supabaseAdmin
        .from('users')
        .select('id, username, user_status')
        .eq('reference_code', reference_code)
        .maybeSingle();

      if (referrer?.user_status === 'Active') {
        referrer_id = referrer.id;
        console.log('[REGISTER] Reference code matched active user:', referrer.username);
      } else {
        console.log('[REGISTER] Reference code has no active match, continuing without referrer:', reference_code);
      }
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
    const newReferenceCode = await this.generateReferenceCode();

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

  static async login(identifier: string, password: string) {
    console.log('[LOGIN] Attempt for identifier:', identifier);
    console.log('[LOGIN] Password length:', password?.length);

    // Regular accounts sign in with their gmail address; admin/support
    // accounts (which don't have one) keep signing in with their username.
    // Try a username match first, then fall back to an email match so both
    // work through the same field without the caller needing to say which.
    let { data: user, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('username', identifier)
      .maybeSingle();

    if (!user && !error) {
      ({ data: user, error } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('email', identifier.toLowerCase())
        .maybeSingle());
    }

    console.log('[LOGIN] User lookup result:', {
      found: !!user,
      error: error?.message,
      errorDetails: error
    });

    if (error) {
      console.error('[LOGIN] Database error:', error);
      throw new AppError(401, 'Invalid username or password');
    }

    if (!user) {
      console.error('[LOGIN] User not found for identifier:', identifier);
      throw new AppError(401, 'Invalid username or password');
    }

    console.log('[LOGIN] User found:', { 
      id: user.id, 
      username: user.username, 
      status: user.user_status,
      hasPasswordHash: !!user.password_hash,
      passwordHashLength: user.password_hash?.length 
    });

    // Check if account is active
    if (user.user_status !== 'Active') {
      console.log('[LOGIN] Account is not active:', user.user_status);
      throw new AppError(403, 'Your account has been deactivated. Please contact support.');
    }

    // Verify password
    console.log('[LOGIN] Verifying password...');
    console.log('[LOGIN] Input password:', password.substring(0, 3) + '***');
    console.log('[LOGIN] Stored hash prefix:', user.password_hash?.substring(0, 10) + '...');
    
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    console.log('[LOGIN] Password comparison result:', isPasswordValid);

    if (!isPasswordValid) {
      console.error('[LOGIN] Invalid password for user:', identifier);
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

    console.log('[LOGIN] Login successful for user:', user.username);

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
        is_verified: !!user.is_verified,
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
        order_limit: 27,
        commission_rate: 0.9,
      },
      token,
    };
  }

  private static generateToken(userId: string): string {
    return jwt.sign({ userId }, ENV.JWT.SECRET, { expiresIn: '7d' });
  }

  private static generateReferenceCodeCandidate(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 5; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  private static async generateReferenceCode(): Promise<string> {
    // 5 alphanumeric chars gives 36^5 (~60M) combinations, but check for a
    // collision anyway rather than relying on chance with a growing user base.
    for (let attempt = 0; attempt < 10; attempt++) {
      const candidate = this.generateReferenceCodeCandidate();
      const { data: existing } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('reference_code', candidate)
        .maybeSingle();

      if (!existing) {
        return candidate;
      }
    }

    throw new AppError(500, 'Failed to generate a unique reference code');
  }
}
