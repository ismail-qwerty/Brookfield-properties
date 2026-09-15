import { Request, Response } from 'express';
import { OrderService } from '../services/order.service.js';
import { ResponseUtil } from '../utils/response.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { AuthenticatedRequest } from '../middleware/verifyToken.js';

export class OrderController {
  /**
   * @route   POST /api/v1/users/orders/generate
   * @desc    Generate/Execute next available task (Generate Lots)
   * @access  Private
   */
  static generateLot = asyncHandler(async (req: Request, res: Response) => {
    const user = (req as AuthenticatedRequest).user;

    if (!user) {
      return ResponseUtil.unauthorized(res, 'Authentication required');
    }

    const result = await OrderService.generateLot(user.id);

    return ResponseUtil.success(
      res,
      result,
      'Order fetched successfully. Please review and submit.'
    );
  });

  /**
   * @route   POST /api/v1/users/orders/:orderId/submit
   * @desc    Submit and complete a pending order
   * @access  Private
   */
  static submitOrder = asyncHandler(async (req: Request, res: Response) => {
    const user = (req as AuthenticatedRequest).user;
    const { orderId } = req.params;
    const { review } = req.body;

    if (!user) {
      return ResponseUtil.unauthorized(res, 'Authentication required');
    }

    const result = await OrderService.submitOrder(user.id, orderId, review);

    let message = '';
    if (result.is_special_lot) {
      message = `Special lot completed! Earned $${result.commission.toFixed(2)} commission. Property cost $${result.deduction.toFixed(2)} deducted.`;
    } else {
      message = `Order completed successfully! You earned $${result.commission.toFixed(2)}`;
    }

    return ResponseUtil.success(
      res,
      result,
      message
    );
  });

  /**
   * @route   GET /api/v1/users/orders
   * @desc    Get user's order/task history
   * @access  Private
   */
  static getOrderHistory = asyncHandler(async (req: Request, res: Response) => {
    const user = (req as AuthenticatedRequest).user;

    if (!user) {
      return ResponseUtil.unauthorized(res, 'Authentication required');
    }

    const { status, page, limit } = req.query;

    const result = await OrderService.getOrderHistory(
      user.id,
      status as any,
      page ? parseInt(page as string) : 1,
      limit ? parseInt(limit as string) : 10
    );

    return ResponseUtil.success(res, result);
  });

  /**
   * @route   GET /api/v1/users/orders/stats
   * @desc    Get user's daily task statistics
   * @access  Private
   */
  static getDailyStats = asyncHandler(async (req: Request, res: Response) => {
    const user = (req as AuthenticatedRequest).user;

    if (!user) {
      return ResponseUtil.unauthorized(res, 'Authentication required');
    }

    const result = await OrderService.getDailyStats(user.id);

    return ResponseUtil.success(res, result);
  });
}
