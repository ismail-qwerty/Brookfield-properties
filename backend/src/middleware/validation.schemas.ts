import { z } from 'zod';

/**
 * ================================================================
 * AUTHENTICATION VALIDATION SCHEMAS
 * ================================================================
 */

export const registerSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must not exceed 50 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')
    .trim(),
  
  full_name: z
    .string()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name must not exceed 100 characters')
    .regex(/^[a-zA-Z\s]+$/, 'Full name can only contain letters and spaces')
    .trim(),
  
  email: z
    .string()
    .email('Invalid email address')
    .max(150, 'Email must not exceed 150 characters')
    .toLowerCase()
    .trim(),
  
  phone: z
    .string()
    .min(10, 'Phone number must be at least 10 digits')
    .max(20, 'Phone number must not exceed 20 digits')
    .regex(/^\+?[0-9\s\-()]+$/, 'Invalid phone number format')
    .trim(),
  
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters')
    .max(128, 'Password must not exceed 128 characters')
    .regex(/[A-Za-z]/, 'Password must contain at least one letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  
  confirm_password: z
    .string()
    .min(6, 'Confirm password must be at least 6 characters'),
  
  wallet_password: z
    .string()
    .min(6, 'Withdrawal password must be at least 6 characters')
    .max(128, 'Withdrawal password must not exceed 128 characters')
    .regex(/[0-9]/, 'Withdrawal password must contain at least one number'),
  
  reference_code: z
    .string()
    .max(20, 'Reference code must not exceed 20 characters')
    .trim()
    .optional()
    .or(z.literal('')),
}).refine((data) => data.password === data.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password'],
});

export const loginSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .trim(),
  
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters'),
});

/**
 * ================================================================
 * USER PROFILE VALIDATION SCHEMAS
 * ================================================================
 */

export const updateProfileSchema = z.object({
  full_name: z
    .string()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name must not exceed 100 characters')
    .regex(/^[a-zA-Z\s]+$/, 'Full name can only contain letters and spaces')
    .trim()
    .optional(),
  
  email: z
    .string()
    .email('Invalid email address')
    .max(150, 'Email must not exceed 150 characters')
    .toLowerCase()
    .trim()
    .optional(),
  
  phone: z
    .string()
    .min(10, 'Phone number must be at least 10 digits')
    .max(20, 'Phone number must not exceed 20 digits')
    .regex(/^\+?[0-9\s\-()]+$/, 'Invalid phone number format')
    .trim()
    .optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update',
});

/**
 * ================================================================
 * PASSWORD UPDATE VALIDATION SCHEMAS
 * ================================================================
 */

export const updatePasswordSchema = z.object({
  current_password: z
    .string()
    .min(6, 'Current password must be at least 6 characters'),
  
  new_password: z
    .string()
    .min(6, 'New password must be at least 6 characters')
    .max(128, 'New password must not exceed 128 characters')
    .regex(/[A-Za-z]/, 'New password must contain at least one letter')
    .regex(/[0-9]/, 'New password must contain at least one number'),
  
  confirm_new_password: z
    .string()
    .min(6, 'Confirm new password must be at least 6 characters'),
}).refine((data) => data.new_password === data.confirm_new_password, {
  message: 'New passwords do not match',
  path: ['confirm_new_password'],
}).refine((data) => data.current_password !== data.new_password, {
  message: 'New password must be different from current password',
  path: ['new_password'],
});

export const updateWalletPasswordSchema = z.object({
  current_wallet_password: z
    .string()
    .min(6, 'Current withdrawal password must be at least 6 characters'),
  
  new_wallet_password: z
    .string()
    .min(6, 'New withdrawal password must be at least 6 characters')
    .max(128, 'New withdrawal password must not exceed 128 characters')
    .regex(/[0-9]/, 'New withdrawal password must contain at least one number'),
  
  confirm_new_wallet_password: z
    .string()
    .min(6, 'Confirm new withdrawal password must be at least 6 characters'),
}).refine((data) => data.new_wallet_password === data.confirm_new_wallet_password, {
  message: 'New withdrawal passwords do not match',
  path: ['confirm_new_wallet_password'],
}).refine((data) => data.current_wallet_password !== data.new_wallet_password, {
  message: 'New withdrawal password must be different from current withdrawal password',
  path: ['new_wallet_password'],
});

/**
 * ================================================================
 * FINANCIAL OPERATIONS VALIDATION SCHEMAS
 * ================================================================
 */

export const rechargeRequestSchema = z.object({
  amount: z
    .number()
    .positive('Amount must be positive')
    .min(10, 'Minimum recharge amount is $10.00')
    .max(10000, 'Maximum recharge amount is $10,000.00')
    .multipleOf(0.01, 'Amount can have at most 2 decimal places'),
  
  transaction_reference: z
    .string()
    .min(5, 'Transaction reference must be at least 5 characters')
    .max(100, 'Transaction reference must not exceed 100 characters')
    .trim()
    .optional(),
  
  notes: z
    .string()
    .max(500, 'Notes must not exceed 500 characters')
    .trim()
    .optional(),
});

export const redemptionRequestSchema = z.object({
  amount: z
    .number()
    .positive('Amount must be positive')
    .multipleOf(0.01, 'Amount can have at most 2 decimal places'),
  
  wallet_address: z
    .string()
    .min(10, 'Wallet address must be at least 10 characters')
    .max(200, 'Wallet address must not exceed 200 characters')
    .trim(),
  
  wallet_password: z
    .string()
    .min(6, 'Withdrawal password is required for redemption'),
}).refine((data) => data.amount >= 50, {
  message: 'Minimum withdrawal amount is $50.00 (this will be validated against user-specific min_withdrawal)',
  path: ['amount'],
});

/**
 * ================================================================
 * WALLET BINDING VALIDATION SCHEMAS
 * ================================================================
 */

export const bindWalletSchema = z.object({
  wallet_address: z
    .string()
    .min(10, 'Wallet address must be at least 10 characters')
    .max(200, 'Wallet address must not exceed 200 characters')
    .regex(/^[a-zA-Z0-9]+$/, 'Wallet address can only contain alphanumeric characters')
    .trim(),
  
  wallet_type: z
    .enum(['External', 'Bank', 'Crypto', 'Other'], {
      errorMap: () => ({ message: 'Invalid wallet type' }),
    })
    .default('External'),
  
  is_primary: z
    .boolean()
    .default(true),
  
  wallet_password: z
    .string()
    .min(6, 'Withdrawal password is required to bind wallet address'),
});

export const updateWalletBindingSchema = z.object({
  is_primary: z
    .boolean()
    .optional(),
  
  wallet_password: z
    .string()
    .min(6, 'Withdrawal password is required to update wallet binding'),
});

/**
 * ================================================================
 * ADMIN OPERATIONS VALIDATION SCHEMAS
 * ================================================================
 */

export const assignOrdersSchema = z.object({
  property_ids: z
    .array(z.number().positive('Property ID must be positive'))
    .length(3, 'Exactly 3 properties must be assigned')
    .refine((ids) => new Set(ids).size === 3, {
      message: 'Property IDs must be unique',
    }),
  
  sequence_after_order_no: z
    .number()
    .int('Sequence number must be an integer')
    .min(0, 'Sequence number cannot be negative')
    .default(0),
});

export const applyDebitSchema = z.object({
  // Positive = debit (subtract from balance), negative = credit (add to
  // balance) — see AdminService.applyDebit.
  amount: z
    .number()
    .multipleOf(0.01, 'Amount can have at most 2 decimal places')
    .refine((val) => val !== 0, 'Amount cannot be zero'),
  
  reason: z
    .string()
    .min(5, 'Reason must be at least 5 characters')
    .max(255, 'Reason must not exceed 255 characters')
    .trim(),
  
  notes: z
    .string()
    .max(1000, 'Notes must not exceed 1000 characters')
    .trim()
    .optional(),
});

export const updateUserSchema = z.object({
  full_name: z
    .string()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name must not exceed 100 characters')
    .trim()
    .optional(),
  
  phone: z
    .string()
    .min(10, 'Phone number must be at least 10 digits')
    .max(20, 'Phone number must not exceed 20 digits')
    .trim()
    .optional(),
  
  user_type: z
    .enum(['User', 'Admin', 'ChatSupport'], {
      errorMap: () => ({ message: 'Invalid user type' }),
    })
    .optional(),

  is_verified: z.boolean().optional(),

  user_status: z
    .enum(['Active', 'Deactivate'], {
      errorMap: () => ({ message: 'Invalid user status' }),
    })
    .optional(),
  
  wallet_status: z
    .enum(['Active', 'Deactivate'], {
      errorMap: () => ({ message: 'Invalid wallet status' }),
    })
    .optional(),
  
  tier_id: z
    .number()
    .int('Tier ID must be an integer')
    .positive('Tier ID must be positive')
    .optional(),
  
  credibility: z
    .number()
    .int('Credibility must be an integer')
    .min(0, 'Credibility cannot be negative')
    .max(100, 'Credibility cannot exceed 100')
    .optional(),
  
  min_withdrawal: z
    .number()
    .positive('Minimum withdrawal must be positive')
    .multipleOf(0.01, 'Amount can have at most 2 decimal places')
    .optional(),
  
  max_withdrawal: z
    .number()
    .positive('Maximum withdrawal must be positive')
    .multipleOf(0.01, 'Amount can have at most 2 decimal places')
    .optional(),
  
  balance_adjustment: z
    .number()
    .multipleOf(0.01, 'Balance adjustment can have at most 2 decimal places')
    .optional(),

  referrer_id: z
    .number()
    .int('Referrer ID must be an integer')
    .positive('Referrer ID must be positive')
    .optional()
    .nullable(),
}).refine((data) => {
  if (data.min_withdrawal && data.max_withdrawal) {
    return data.min_withdrawal < data.max_withdrawal;
  }
  return true;
}, {
  message: 'Minimum withdrawal must be less than maximum withdrawal',
  path: ['min_withdrawal'],
});

export const approveRechargeSchema = z.object({
  status: z
    .enum(['Approved', 'Rejected'], {
      errorMap: () => ({ message: 'Status must be either Approved or Rejected' }),
    }),
  
  notes: z
    .string()
    .max(500, 'Notes must not exceed 500 characters')
    .trim()
    .optional(),
});

export const approveRedemptionSchema = z.object({
  status: z
    .enum(['Approved', 'Rejected'], {
      errorMap: () => ({ message: 'Status must be either Approved or Rejected' }),
    }),
  
  rejection_reason: z
    .string()
    .min(10, 'Rejection reason must be at least 10 characters')
    .max(500, 'Rejection reason must not exceed 500 characters')
    .trim()
    .optional(),
}).refine((data) => {
  if (data.status === 'Rejected') {
    return !!data.rejection_reason;
  }
  return true;
}, {
  message: 'Rejection reason is required when rejecting a redemption',
  path: ['rejection_reason'],
});

/**
 * ================================================================
 * PROPERTY MANAGEMENT VALIDATION SCHEMAS
 * ================================================================
 */

export const createPropertySchema = z.object({
  title: z
    .string()
    .min(5, 'Title must be at least 5 characters')
    .max(200, 'Title must not exceed 200 characters')
    .trim(),
  
  description: z
    .string()
    .min(20, 'Description must be at least 20 characters')
    .max(2000, 'Description must not exceed 2000 characters')
    .trim(),
  
  image_url: z
    .string()
    .url('Invalid image URL')
    .max(500, 'Image URL must not exceed 500 characters')
    .trim(),
  
  price: z
    .number()
    .positive('Price must be positive')
    .min(1, 'Minimum property price is $1.00')
    .max(10000, 'Maximum property price is $10,000.00')
    .multipleOf(0.01, 'Price can have at most 2 decimal places'),
  
  status: z
    .enum(['Active', 'Inactive'], {
      errorMap: () => ({ message: 'Invalid property status' }),
    })
    .default('Active'),
});

export const updatePropertySchema = z.object({
  title: z
    .string()
    .min(5, 'Title must be at least 5 characters')
    .max(200, 'Title must not exceed 200 characters')
    .trim()
    .optional(),
  
  description: z
    .string()
    .min(20, 'Description must be at least 20 characters')
    .max(2000, 'Description must not exceed 2000 characters')
    .trim()
    .optional(),
  
  image_url: z
    .string()
    .url('Invalid image URL')
    .max(500, 'Image URL must not exceed 500 characters')
    .trim()
    .optional(),
  
  price: z
    .number()
    .positive('Price must be positive')
    .min(1, 'Minimum property price is $1.00')
    .max(10000, 'Maximum property price is $10,000.00')
    .multipleOf(0.01, 'Price can have at most 2 decimal places')
    .optional(),
  
  status: z
    .enum(['Active', 'Inactive'], {
      errorMap: () => ({ message: 'Invalid property status' }),
    })
    .optional(),
});

/**
 * ================================================================
 * QUERY PARAMETER VALIDATION SCHEMAS
 * ================================================================
 */

export const paginationSchema = z.object({
  page: z
    .string()
    .optional()
    .default('1')
    .transform((val) => parseInt(val, 10))
    .refine((val) => val > 0, 'Page must be greater than 0'),
  
  limit: z
    .string()
    .optional()
    .default('10')
    .transform((val) => parseInt(val, 10))
    .refine((val) => val > 0 && val <= 100, 'Limit must be between 1 and 100'),
  
  sort: z
    .enum(['asc', 'desc'])
    .optional()
    .default('desc'),
});

export const statusFilterSchema = z.object({
  status: z
    .enum(['Pending', 'Completed', 'Undone', 'Approved', 'Rejected', 'Active', 'Inactive'])
    .optional(),
});

/**
 * ================================================================
 * TYPE EXPORTS
 * ================================================================
 */

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>;
export type UpdateWalletPasswordInput = z.infer<typeof updateWalletPasswordSchema>;
export type RechargeRequestInput = z.infer<typeof rechargeRequestSchema>;
export type RedemptionRequestInput = z.infer<typeof redemptionRequestSchema>;
export type BindWalletInput = z.infer<typeof bindWalletSchema>;
export type UpdateWalletBindingInput = z.infer<typeof updateWalletBindingSchema>;
export type AssignOrdersInput = z.infer<typeof assignOrdersSchema>;
export type ApplyDebitInput = z.infer<typeof applyDebitSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ApproveRechargeInput = z.infer<typeof approveRechargeSchema>;
export type ApproveRedemptionInput = z.infer<typeof approveRedemptionSchema>;
export type CreatePropertyInput = z.infer<typeof createPropertySchema>;
export type UpdatePropertyInput = z.infer<typeof updatePropertySchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
export type StatusFilterInput = z.infer<typeof statusFilterSchema>;
