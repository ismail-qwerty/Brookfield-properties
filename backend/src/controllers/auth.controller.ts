import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service.js';
import { ResponseUtil } from '../utils/response.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export class AuthController {
  /**
   * @route   GET /api/v1/auth/check-username
   * @desc    Check whether a username is available before submitting the
   *          full registration form
   * @access  Public
   */
  static checkUsername = asyncHandler(async (req: Request, res: Response) => {
    const username = String(req.query.username || '');

    const result = await AuthService.checkUsernameAvailable(username);

    return ResponseUtil.success(res, result);
  });

  /**
   * @route   POST /api/v1/auth/register
   * @desc    Register new user with reference code validation
   * @access  Public
   */
  static register = asyncHandler(async (req: Request, res: Response) => {
    const {
      username,
      full_name,
      email,
      phone,
      password,
      wallet_password,
      reference_code,
    } = req.body;

    const result = await AuthService.register({
      username,
      full_name,
      email,
      phone,
      password,
      wallet_password,
      reference_code,
    });

    return ResponseUtil.created(
      res,
      result,
      'Registration successful. Welcome to Brookfield Properties!'
    );
  });

  /**
   * @route   POST /api/v1/auth/login
   * @desc    Login user and return JWT token
   * @access  Public
   */
  static login = asyncHandler(async (req: Request, res: Response) => {
    const { username, password } = req.body;

    const result = await AuthService.login(username, password);

    return ResponseUtil.success(res, result, 'Login successful');
  });
}
