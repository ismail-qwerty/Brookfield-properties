import { Request, Response } from 'express';
import { UserService } from '../services/user.service.js';
import { ResponseUtil } from '../utils/response.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { AuthenticatedRequest } from '../middleware/verifyToken.js';

export class UserController {
  /**
   * @route   GET /api/v1/users/profile
   * @desc    Get authenticated user profile
   * @access  Private
   */
  static getProfile = asyncHandler(async (req: Request, res: Response) => {
    const user = (req as AuthenticatedRequest).user;

    if (!user) {
      return ResponseUtil.unauthorized(res, 'Authentication required');
    }

    const result = await UserService.getProfile(user.id);

    return ResponseUtil.success(res, result);
  });

  /**
   * @route   GET /api/v1/users/wallet
   * @desc    Get wallet balance and transaction summary
   * @access  Private
   */
  static getWallet = asyncHandler(async (req: Request, res: Response) => {
    const user = (req as AuthenticatedRequest).user;

    if (!user) {
      return ResponseUtil.unauthorized(res, 'Authentication required');
    }

    const result = await UserService.getWallet(user.id);

    return ResponseUtil.success(res, result);
  });
}
