import { Request, Response, NextFunction } from 'express';
import { ZodTypeAny, ZodError } from 'zod';
import { ResponseUtil } from '../utils/response.js';
import { Logger } from '../utils/logger.js';

/**
 * Generic validation middleware factory
 * Validates request body, query params, or route params against a Zod schema
 */
export const validate = (schema: ZodTypeAny, source: 'body' | 'query' | 'params' = 'body') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Select the data source to validate
      const dataToValidate = req[source];

      // Parse and validate the data
      const validatedData = await schema.parseAsync(dataToValidate);

      // Replace the original data with validated and sanitized data
      req[source] = validatedData;

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        // Extract validation errors
        const errors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        Logger.warn('Validation failed', {
          source,
          path: req.path,
          errors,
        });

        return ResponseUtil.error(
          res,
          errors[0].message, // Return first error message
          400
        );
      }

      Logger.error('Validation middleware error', { error });
      return ResponseUtil.serverError(res, 'Validation error occurred');
    }
  };
};

/**
 * Validate request body
 */
export const validateBody = (schema: ZodTypeAny) => validate(schema, 'body');

export const validateQuery = (schema: ZodTypeAny) => validate(schema, 'query');

export const validateParams = (schema: ZodTypeAny) => validate(schema, 'params');

/**
 * Custom validation middleware for financial operations
 * Validates redemption amount against user-specific withdrawal limits
 */
export const validateRedemptionLimits = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { amount } = req.body;
    const user = (req as any).user;

    if (!user) {
      return ResponseUtil.unauthorized(res, 'Authentication required');
    }

    // Check minimum withdrawal
    if (amount < user.min_withdrawal) {
      Logger.warn('Redemption below minimum limit', {
        userId: user.id,
        amount,
        minWithdrawal: user.min_withdrawal,
      });
      return ResponseUtil.error(
        res,
        `Minimum withdrawal amount is $${user.min_withdrawal.toFixed(2)}`,
        400
      );
    }

    // Check maximum withdrawal
    if (amount > user.max_withdrawal) {
      Logger.warn('Redemption above maximum limit', {
        userId: user.id,
        amount,
        maxWithdrawal: user.max_withdrawal,
      });
      return ResponseUtil.error(
        res,
        `Maximum withdrawal amount is $${user.max_withdrawal.toFixed(2)}`,
        400
      );
    }

    // Check if user has sufficient balance
    const { supabaseAdmin } = await import('../config/database.js');
    const { data: wallet } = await supabaseAdmin
      .from('wallets')
      .select('balance')
      .eq('user_id', user.id)
      .single();

    if (!wallet || wallet.balance < amount) {
      Logger.warn('Insufficient balance for redemption', {
        userId: user.id,
        requestedAmount: amount,
        availableBalance: wallet?.balance || 0,
      });
      return ResponseUtil.error(
        res,
        `Insufficient balance. Available: $${(wallet?.balance || 0).toFixed(2)}`,
        400
      );
    }

    next();
  } catch (error) {
    Logger.error('Error in validateRedemptionLimits middleware', { error });
    return ResponseUtil.serverError(res, 'Validation error occurred');
  }
};

/**
 * Validate wallet address uniqueness
 * Ensures the same wallet address isn't already bound to another user
 */
export const validateWalletUniqueness = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { wallet_address } = req.body;
    const user = (req as any).user;

    if (!user) {
      return ResponseUtil.unauthorized(res, 'Authentication required');
    }

    const { supabaseAdmin } = await import('../config/database.js');
    
    // Check if wallet address is already bound to a different user
    const { data: existingWallet } = await supabaseAdmin
      .from('bound_wallets')
      .select('user_id')
      .eq('wallet_address', wallet_address)
      .neq('user_id', user.id)
      .single();

    if (existingWallet) {
      Logger.warn('Wallet address already bound to another user', {
        userId: user.id,
        walletAddress: wallet_address,
      });
      return ResponseUtil.error(
        res,
        'This wallet address is already bound to another account',
        400
      );
    }

    // Check if user already has this wallet address bound
    const { data: userWallet } = await supabaseAdmin
      .from('bound_wallets')
      .select('id')
      .eq('user_id', user.id)
      .eq('wallet_address', wallet_address)
      .single();

    if (userWallet) {
      Logger.warn('User attempting to bind duplicate wallet', {
        userId: user.id,
        walletAddress: wallet_address,
      });
      return ResponseUtil.error(
        res,
        'You have already bound this wallet address',
        400
      );
    }

    next();
  } catch (error) {
    Logger.error('Error in validateWalletUniqueness middleware', { error });
    return ResponseUtil.serverError(res, 'Validation error occurred');
  }
};

/**
 * Validate property ownership during order assignment
 * Ensures all property IDs exist and are active
 */
export const validatePropertyAvailability = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { property_ids } = req.body;

    const { supabaseAdmin } = await import('../config/database.js');
    
    // Fetch all properties
    const { data: properties, error } = await supabaseAdmin
      .from('properties')
      .select('id, status')
      .in('id', property_ids);

    if (error || !properties || properties.length !== 3) {
      Logger.warn('Invalid property IDs provided', {
        propertyIds: property_ids,
        foundCount: properties?.length || 0,
      });
      return ResponseUtil.error(
        res,
        'One or more property IDs are invalid',
        400
      );
    }

    // Check if all properties are active
    const inactiveProperties = properties.filter((p) => p.status !== 'Active');
    if (inactiveProperties.length > 0) {
      Logger.warn('Attempting to assign inactive properties', {
        inactivePropertyIds: inactiveProperties.map((p) => p.id),
      });
      return ResponseUtil.error(
        res,
        'One or more properties are inactive and cannot be assigned',
        400
      );
    }

    next();
  } catch (error) {
    Logger.error('Error in validatePropertyAvailability middleware', { error });
    return ResponseUtil.serverError(res, 'Validation error occurred');
  }
};

/**
 * Sanitize string inputs to prevent XSS and SQL injection
 */
export const sanitizeInputs = (req: Request, res: Response, next: NextFunction) => {
  const sanitizeValue = (value: any): any => {
    if (typeof value === 'string') {
      // Remove potential XSS vectors
      return value
        .trim()
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '');
    }
    
    if (typeof value === 'object' && value !== null) {
      return Object.keys(value).reduce((acc, key) => {
        acc[key] = sanitizeValue(value[key]);
        return acc;
      }, {} as any);
    }
    
    return value;
  };

  if (req.body) {
    req.body = sanitizeValue(req.body);
  }
  
  if (req.query) {
    req.query = sanitizeValue(req.query);
  }

  next();
};
