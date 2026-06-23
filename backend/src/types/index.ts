import { Request } from 'express';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface User {
  id: string;
  username: string;
  full_name: string;
  email: string;
  phone: string;
  password_hash: string;
  wallet_password_hash: string;
  reference_code: string;
  referrer_id: string | null;
  tier_id: number;
  credibility: number;
  min_withdrawal: number;
  max_withdrawal: number;
  user_status: 'Active' | 'Deactivate';
  wallet_status: 'Active' | 'Deactivate';
  user_type: 'User' | 'Admin';
  total_orders: number;
  created_at: string;
  last_login_at: string | null;
}

export interface Wallet {
  id: number;
  user_id: string;
  balance: number;
  total_recharged: number;
  total_earned: number;
  total_withdrawn: number;
  updated_at: string;
}

export interface AuthRequest extends Request {
  user: User;
}
