import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/environment.js';
import { ResponseUtil } from '../utils/response.js';
import { supabaseAdmin } from '../config/database.js';
import { AuthRequest, User } from '../types/index.js';

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader?.startsWith('Bearer ')) {
      return ResponseUtil.unauthorized(res, 'No token provided');
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, ENV.JWT.SECRET) as { userId: string };

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', decoded.userId)
      .single();

    if (error || !user) {
      return ResponseUtil.unauthorized(res, 'Invalid token');
    }

    if (user.user_status !== 'Active') {
      return ResponseUtil.forbidden(res, 'Account is deactivated');
    }

    (req as AuthRequest).user = user as User;
    next();
  } catch (error) {
    return ResponseUtil.unauthorized(res, 'Invalid or expired token');
  }
};

export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  const user = (req as AuthRequest).user;
  
  if (!user || user.user_type !== 'Admin') {
    return ResponseUtil.forbidden(res, 'Admin access required');
  }

  next();
};
