import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/environment.js';
import { ResponseUtil } from '../utils/response.js';
import { Logger } from '../utils/logger.js';
import { supabaseAdmin } from '../config/database.js';
import { User } from '../types/index.js';

interface JwtPayload {
  userId: string;
  iat: number;
  exp: number;
}

export interface AuthenticatedRequest extends Request {
  user?: User;
  userId?: string;
}

/**
 * Extract and decode JWT token from Authorization header
 */
const extractToken = (authHeader: string | undefined): string | null => {
  if (!authHeader) {
    return null;
  }

  // Support both "Bearer <token>" and direct token formats
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // If no Bearer prefix, assume direct token
  return authHeader;
};

/**
 * Decode and verify JWT token
 */
const decodeToken = (token: string): JwtPayload | null => {
  try {
    const decoded = jwt.verify(token, ENV.JWT.SECRET) as JwtPayload;
    return decoded;
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      Logger.warn('Token expired', { expiredAt: error.expiredAt });
    } else if (error.name === 'JsonWebTokenError') {
      Logger.warn('Invalid token', { message: error.message });
    }
    return null;
  }
};

/**
 * Fetch user from database by ID
 */
const fetchUserById = async (userId: string): Promise<User | null> => {
  try {
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !user) {
      Logger.error('User fetch failed', { userId, error });
      return null;
    }

    return user as User;
  } catch (error) {
    Logger.error('Database error while fetching user', { userId, error });
    return null;
  }
};

/**
 * Middleware: Verify user authentication token
 * Validates JWT and attaches user object to request
 * Allows any authenticated user (User or Admin)
 */
export const verifyUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    const token = extractToken(authHeader);

    if (!token) {
      Logger.warn('Authentication failed: No token provided', {
        path: req.path,
        ip: req.ip,
      });
      return ResponseUtil.unauthorized(res, 'Authentication required. Please provide a valid token.');
    }

    // Decode and verify token
    const decoded = decodeToken(token);

    if (!decoded) {
      Logger.warn('Authentication failed: Invalid or expired token', {
        path: req.path,
        ip: req.ip,
      });
      return ResponseUtil.unauthorized(res, 'Invalid or expired token. Please login again.');
    }

    // Fetch user from database
    const user = await fetchUserById(decoded.userId);

    if (!user) {
      Logger.warn('Authentication failed: User not found', {
        userId: decoded.userId,
        path: req.path,
      });
      return ResponseUtil.unauthorized(res, 'User account not found. Please contact support.');
    }

    // Check if user account is active
    if (user.user_status !== 'Active') {
      Logger.warn('Authentication failed: Inactive account', {
        userId: user.id,
        username: user.username,
        status: user.user_status,
      });
      return ResponseUtil.forbidden(
        res,
        'Your account has been deactivated. Please contact support for assistance.'
      );
    }

    // Attach user to request object
    (req as AuthenticatedRequest).user = user;
    (req as AuthenticatedRequest).userId = user.id;

    Logger.debug('User authenticated successfully', {
      userId: user.id,
      username: user.username,
      userType: user.user_type,
    });

    next();
  } catch (error) {
    Logger.error('Error in verifyUser middleware', { error, path: req.path });
    return ResponseUtil.serverError(res, 'Authentication error occurred');
  }
};

/**
 * Middleware: Verify admin authorization
 * Must be used AFTER verifyUser middleware
 * Validates that authenticated user has Admin privileges (user_type === 'Admin')
 */
export const verifyAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = (req as AuthenticatedRequest).user;

    // Ensure user was attached by verifyUser middleware
    if (!user) {
      Logger.error('verifyAdmin called without verifyUser middleware', {
        path: req.path,
      });
      return ResponseUtil.unauthorized(res, 'Authentication required');
    }

    // Check if user type is Admin
    if (user.user_type !== 'Admin') {
      Logger.warn('Authorization failed: Non-admin access attempt', {
        userId: user.id,
        username: user.username,
        userType: user.user_type,
        path: req.path,
        method: req.method,
      });
      return ResponseUtil.forbidden(
        res,
        'Access denied. Administrator privileges required.'
      );
    }

    // Double-check admin status in database for critical operations
    const { data: freshUser, error } = await supabaseAdmin
      .from('users')
      .select('user_type, user_status')
      .eq('id', user.id)
      .single();

    if (error || !freshUser) {
      Logger.error('Failed to verify admin status', {
        userId: user.id,
        error,
      });
      return ResponseUtil.serverError(res, 'Failed to verify admin status');
    }

    // Verify admin status hasn't changed
    if (freshUser.user_type !== 'Admin') {
      Logger.warn('Admin privileges revoked', {
        userId: user.id,
        username: user.username,
      });
      return ResponseUtil.forbidden(
        res,
        'Admin privileges have been revoked. Please contact support.'
      );
    }

    // Verify account is still active
    if (freshUser.user_status !== 'Active') {
      Logger.warn('Admin account deactivated', {
        userId: user.id,
        username: user.username,
      });
      return ResponseUtil.forbidden(res, 'Admin account has been deactivated.');
    }

    Logger.debug('Admin authenticated successfully', {
      userId: user.id,
      username: user.username,
      path: req.path,
      method: req.method,
    });

    next();
  } catch (error) {
    Logger.error('Error in verifyAdmin middleware', { error, path: req.path });
    return ResponseUtil.serverError(res, 'Authorization error occurred');
  }
};

/**
 * Optional middleware: Verify wallet password for financial operations
 * Use for redemption/withdrawal requests
 */
export const verifyWalletPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = (req as AuthenticatedRequest).user;
    const { wallet_password } = req.body;

    if (!user) {
      return ResponseUtil.unauthorized(res, 'Authentication required');
    }

    if (!wallet_password) {
      return ResponseUtil.error(
        res,
        'Withdrawal password is required for this operation',
        400
      );
    }

    // Import bcrypt dynamically to avoid circular dependency
    const bcrypt = await import('bcryptjs');
    const isValid = await bcrypt.compare(
      wallet_password,
      user.wallet_password_hash
    );

    if (!isValid) {
      Logger.warn('Invalid wallet password attempt', {
        userId: user.id,
        username: user.username,
      });
      return ResponseUtil.error(res, 'Invalid withdrawal password', 401);
    }

    Logger.debug('Wallet password verified', { userId: user.id });
    next();
  } catch (error) {
    Logger.error('Error in verifyWalletPassword middleware', { error });
    return ResponseUtil.serverError(res, 'Wallet verification error occurred');
  }
};

/**
 * Optional middleware: Check if wallet is active
 * Use for financial operations that require active wallet status
 */
export const requireActiveWallet = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const user = (req as AuthenticatedRequest).user;

  if (!user) {
    return ResponseUtil.unauthorized(res, 'Authentication required');
  }

  if (user.wallet_status !== 'Active') {
    Logger.warn('Inactive wallet access attempt', {
      userId: user.id,
      username: user.username,
      walletStatus: user.wallet_status,
    });
    return ResponseUtil.forbidden(
      res,
      'Your wallet is currently deactivated. Please contact support to activate it.'
    );
  }

  next();
};
