import axios from 'axios';

// Base API URL - Update this to match your backend
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 second timeout
});

// Request interceptor - Add auth token to requests
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle common errors
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;

      switch (status) {
        case 401:
          // Unauthorized - clear auth and redirect to login
          localStorage.removeItem('authToken');
          localStorage.removeItem('user');
          window.location.href = '/user-login';
          break;
        case 403:
          // Forbidden - show error message
          console.error('Access forbidden:', data.error);
          break;
        case 404:
          console.error('Resource not found:', data.error);
          break;
        case 500:
          console.error('Server error:', data.error);
          break;
        default:
          console.error('API error:', data.error || error.message);
      }
    } else if (error.request) {
      // Request made but no response
      console.error('Network error: No response from server');
    } else {
      // Error in request setup
      console.error('Request error:', error.message);
    }

    return Promise.reject(error);
  }
);

// API methods
const api = {
  // Authentication
  auth: {
    register: (data) => apiClient.post('/auth/register', data),
    login: (data) => apiClient.post('/auth/login', data),
  },

  // User endpoints
  user: {
    getProfile: () => apiClient.get('/users/profile'),
    updateProfile: (data) => apiClient.put('/users/profile', data),
    getWallet: () => apiClient.get('/users/wallet'),
    getOrders: (params) => apiClient.get('/users/orders', { params }),
    getOrderHistory: (status, page, limit) =>
      apiClient.get('/users/orders', { params: { status, page, limit } }),
    generateLot: () => apiClient.post('/users/orders/generate'),
    generateLots: () => apiClient.post('/users/orders/generate'),
    getDailyStats: () => apiClient.get('/users/orders/stats'),
    getRecharges: () => apiClient.get('/users/recharges'),
    requestRecharge: (data) => apiClient.post('/users/recharges', data),
    getRedemptions: () => apiClient.get('/users/redemptions'),
    requestRedemption: (data) => apiClient.post('/users/redemptions', data),
    getReferrals: () => apiClient.get('/users/referrals'),
    bindWallet: (data) => apiClient.post('/users/wallet/bind', data),
  },

  // Admin endpoints
  admin: {
    getUsers: (params) => apiClient.get('/admin/users', { params }),
    getUserById: (id) => apiClient.get(`/admin/users/${id}`),
    updateUser: (id, data) => apiClient.put(`/admin/users/${id}`, data),
    applyDebit: (id, data) => apiClient.post(`/admin/users/${id}/debit`, data),
    assignOrders: (id, data) => apiClient.post(`/admin/users/${id}/orders/assign`, data),
    
    getProperties: (params) => apiClient.get('/admin/properties', { params }),
    getPropertyStats: () => apiClient.get('/admin/properties/stats'),
    getPropertyById: (id) => apiClient.get(`/admin/properties/${id}`),
    createProperty: (data) => apiClient.post('/admin/properties', data),
    updateProperty: (id, data) => apiClient.put(`/admin/properties/${id}`, data),
    deleteProperty: (id, hard) => apiClient.delete(`/admin/properties/${id}`, { params: { hard } }),
    
    getRecharges: (params) => apiClient.get('/admin/recharges', { params }),
    processRecharge: (id, data) => apiClient.put(`/admin/recharges/${id}`, data),
    
    getRedemptions: (params) => apiClient.get('/admin/redemptions', { params }),
    processRedemption: (id, data) => apiClient.put(`/admin/redemptions/${id}`, data),

    getMemberships: () => apiClient.get('/admin/memberships'),
    createMembership: (data) => apiClient.post('/admin/memberships', data),
    updateMembership: (id, data) => apiClient.put(`/admin/memberships/${id}`, data),
    deleteMembership: (id) => apiClient.delete(`/admin/memberships/${id}`),
  },
};

export default api;
