import { Router } from 'express';
import { verifyUser, verifyAdmin } from '../middleware/verifyToken.js';
import { AdminController } from '../controllers/admin.controller.js';
import { PropertyController } from '../controllers/property.controller.js';
import { validateBody, validatePropertyAvailability } from '../middleware/validation.js';
import {
  updateUserSchema,
  applyDebitSchema,
  assignOrdersSchema,
  createPropertySchema,
  updatePropertySchema,
} from '../middleware/validation.schemas.js';

const router = Router();

/**
 * All admin routes require both user authentication and admin privileges
 */
router.use(verifyUser, verifyAdmin);

// ================================================================
// USER MANAGEMENT ROUTES
// ================================================================

/**
 * @route   GET /api/v1/admin/users
 * @desc    Get paginated list of all users with filters
 * @access  Admin
 * @query   page, limit, user_status, wallet_status, tier_id, search
 */
router.get('/users', AdminController.getAllUsers);

/**
 * @route   GET /api/v1/admin/users/:id
 * @desc    Get specific user details with complete information
 * @access  Admin
 */
router.get('/users/:id', AdminController.getUserById);

/**
 * @route   PUT /api/v1/admin/users/:id
 * @desc    Update user account settings (independent status controls)
 * @access  Admin
 * @body    {user_status?, wallet_status?, tier_id?, credibility?, min_withdrawal?, max_withdrawal?}
 */
router.put(
  '/users/:id',
  validateBody(updateUserSchema),
  AdminController.updateUser
);

/**
 * @route   POST /api/v1/admin/users/:id/debit
 * @desc    Apply manual debit to user wallet (supports negative balance)
 * @access  Admin
 * @body    {amount, reason, notes?}
 */
router.post(
  '/users/:id/debit',
  validateBody(applyDebitSchema),
  AdminController.applyDebit
);

/**
 * @route   POST /api/v1/admin/users/:id/orders/assign
 * @desc    Assign exactly 3 properties to user for task execution
 * @access  Admin
 * @body    {property_ids: [number, number, number], sequence_after_order_no: number}
 */
router.post(
  '/users/:id/orders/assign',
  validateBody(assignOrdersSchema),
  validatePropertyAvailability,
  AdminController.assignOrders
);

// ================================================================
// PROPERTY CATALOG MANAGEMENT ROUTES
// ================================================================

/**
 * @route   GET /api/v1/admin/properties/stats
 * @desc    Get property statistics overview
 * @access  Admin
 */
router.get('/properties/stats', PropertyController.getPropertyStats);

/**
 * @route   GET /api/v1/admin/properties
 * @desc    Get all properties with pagination and filters
 * @access  Admin
 * @query   page, limit, status, min_price, max_price, search
 */
router.get('/properties', PropertyController.getAllProperties);

/**
 * @route   GET /api/v1/admin/properties/:id
 * @desc    Get single property details with usage statistics
 * @access  Admin
 */
router.get('/properties/:id', PropertyController.getPropertyById);

/**
 * @route   POST /api/v1/admin/properties
 * @desc    Create new property
 * @access  Admin
 * @body    {title, description, image_url, price, status?}
 */
router.post(
  '/properties',
  validateBody(createPropertySchema),
  PropertyController.createProperty
);

/**
 * @route   PUT /api/v1/admin/properties/:id
 * @desc    Update property details
 * @access  Admin
 * @body    {title?, description?, image_url?, price?, status?}
 */
router.put(
  '/properties/:id',
  validateBody(updatePropertySchema),
  PropertyController.updateProperty
);

/**
 * @route   DELETE /api/v1/admin/properties/:id
 * @desc    Delete property (soft delete by default, ?hard=true for permanent delete)
 * @access  Admin
 * @query   hard=true (optional, for hard delete)
 */
router.delete('/properties/:id', PropertyController.deleteProperty);

// ================================================================
// FINANCIAL OPERATIONS ROUTES
// ================================================================

/**
 * @route   GET /api/v1/admin/recharges
 * @desc    Get pending recharge requests (admin only)
 * @access  Admin
 */
router.get('/recharges', (req, res) => {
  res.json({ message: 'Admin recharge requests - to be implemented' });
});

/**
 * @route   PUT /api/v1/admin/recharges/:id
 * @desc    Approve/reject recharge request (admin only)
 * @access  Admin
 */
router.put('/recharges/:id', (req, res) => {
  res.json({ message: 'Admin process recharge - to be implemented' });
});

/**
 * @route   GET /api/v1/admin/redemptions
 * @desc    Get pending redemption/withdrawal requests (admin only)
 * @access  Admin
 */
router.get('/redemptions', (req, res) => {
  res.json({ message: 'Admin redemption requests - to be implemented' });
});

/**
 * @route   PUT /api/v1/admin/redemptions/:id
 * @desc    Approve/reject redemption request (admin only)
 * @access  Admin
 */
router.put('/redemptions/:id', (req, res) => {
  res.json({ message: 'Admin process redemption - to be implemented' });
});

// ================================================================
// MEMBERSHIP TIER MANAGEMENT ROUTES
// ================================================================

/**
 * @route   GET /api/v1/admin/memberships
 * @desc    Get all membership levels with member counts
 * @access  Admin
 */
router.get('/memberships', AdminController.getMemberships);

/**
 * @route   POST /api/v1/admin/memberships
 * @desc    Create new membership level
 * @access  Admin
 * @body    {name, order_limit, commission_rate}
 */
router.post('/memberships', AdminController.createMembership);

/**
 * @route   PUT /api/v1/admin/memberships/:id
 * @desc    Update membership level
 * @access  Admin
 * @body    {name?, order_limit?, commission_rate?}
 */
router.put('/memberships/:id', AdminController.updateMembership);

/**
 * @route   DELETE /api/v1/admin/memberships/:id
 * @desc    Delete membership level (only if no active members)
 * @access  Admin
 */
router.delete('/memberships/:id', AdminController.deleteMembership);

export default router;
