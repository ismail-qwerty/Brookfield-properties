import { Router } from 'express';
import { verifyUser, requireActiveWallet } from '../middleware/verifyToken.js';
import { OrderController } from '../controllers/order.controller.js';
import { UserController } from '../controllers/user.controller.js';

const router = Router();

/**
 * All user routes require authentication
 */
router.use(verifyUser);

/**
 * @route   GET /api/v1/users/profile
 * @desc    Get authenticated user profile
 * @access  Private
 */
router.get('/profile', UserController.getProfile);

/**
 * @route   PUT /api/v1/users/profile
 * @desc    Update user profile information
 * @access  Private
 */
router.put('/profile', (req, res) => {
  res.json({ message: 'Update profile - to be implemented' });
});

/**
 * @route   GET /api/v1/users/wallet
 * @desc    Get wallet balance and transaction summary
 * @access  Private
 */
router.get('/wallet', UserController.getWallet);

/**
 * @route   GET /api/v1/users/orders
 * @desc    Get user task/order history
 * @access  Private
 */
router.get('/orders', OrderController.getOrderHistory);

/**
 * @route   GET /api/v1/users/orders/stats
 * @desc    Get user daily task statistics
 * @access  Private
 */
router.get('/orders/stats', OrderController.getDailyStats);

/**
 * @route   POST /api/v1/users/orders/generate
 * @desc    Generate/Execute next available task (Generate Lots)
 * @access  Private
 */
router.post('/orders/generate', OrderController.generateLot);

/**
 * @route   POST /api/v1/users/orders/:orderId/submit
 * @desc    Submit and complete a pending order
 * @access  Private
 */
router.post('/orders/:orderId/submit', OrderController.submitOrder);

/**
 * @route   GET /api/v1/users/recharges
 * @desc    Get user recharge/deposit history
 * @access  Private
 */
router.get('/recharges', (req, res) => {
  res.json({ message: 'User recharge history - to be implemented' });
});

/**
 * @route   POST /api/v1/users/recharges
 * @desc    Request new deposit/recharge
 * @access  Private
 */
router.post('/recharges', (req, res) => {
  res.json({ message: 'Request recharge - to be implemented' });
});

/**
 * @route   GET /api/v1/users/redemptions
 * @desc    Get user withdrawal/redemption history
 * @access  Private
 */
router.get('/redemptions', (req, res) => {
  res.json({ message: 'User redemption history - to be implemented' });
});

/**
 * @route   POST /api/v1/users/redemptions
 * @desc    Request withdrawal/redemption (requires active wallet & wallet password)
 * @access  Private
 */
router.post('/redemptions', requireActiveWallet, (req, res) => {
  res.json({ message: 'Request redemption - to be implemented' });
});

/**
 * @route   GET /api/v1/users/referrals
 * @desc    Get list of users referred by current user
 * @access  Private
 */
router.get('/referrals', (req, res) => {
  res.json({ message: 'User referrals - to be implemented' });
});

/**
 * @route   POST /api/v1/users/wallet/bind
 * @desc    Bind external wallet address
 * @access  Private
 */
router.post('/wallet/bind', (req, res) => {
  res.json({ message: 'Bind wallet - to be implemented' });
});

export default router;
