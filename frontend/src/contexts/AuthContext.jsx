import { createContext, useContext, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// localStorage is synchronous, so the session is read during the very first
// render. Restoring it in an effect instead would paint one "logged out" frame
// on every page load, which the route guards covered with a full-screen spinner.
const readStoredAuth = () => {
  try {
    const storedToken = localStorage.getItem('authToken');
    const storedUser = localStorage.getItem('user');
    if (storedToken && storedUser) {
      return { token: storedToken, user: JSON.parse(storedUser) };
    }
  } catch (error) {
    console.error('Failed to initialize auth:', error);
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
  }
  return { token: null, user: null };
};

export const AuthProvider = ({ children }) => {
  const [initialAuth] = useState(readStoredAuth);
  const [user, setUser] = useState(initialAuth.user);
  const [token, setToken] = useState(initialAuth.token);
  const navigate = useNavigate();

  // Login function - Makes API call to backend
  const login = async (username, password) => {
    try {
      // Import API client
      const api = (await import('../utils/api.js')).default;
      
      // Call login API
      const response = await api.auth.login({ username, password });
      
      // Extract data from response
      const { user: userData, token: authToken } = response.data.data;

      // Store token and user data
      localStorage.setItem('authToken', authToken);
      localStorage.setItem('user', JSON.stringify(userData));

      setToken(authToken);
      setUser(userData);

      // Auto-redirect based on user type
      if (userData.user_type === 'Admin') {
        navigate('/administration');
      } else if (userData.user_type === 'ChatSupport') {
        navigate('/support');
      } else {
        navigate('/dashboard');
      }

      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      throw error; // Re-throw to let Login component handle it
    }
  };

  // Logout function
  const logout = () => {
    try {
      // Clear storage
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');

      // Clear state
      setToken(null);
      setUser(null);

      // Redirect to login
      navigate('/user-login');

      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      return { success: false, error: 'Failed to complete logout' };
    }
  };

  // Update user profile (for profile edits)
  const updateUser = (updates) => {
    try {
      const updatedUser = { ...user, ...updates };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      return { success: true };
    } catch (error) {
      console.error('Update user error:', error);
      return { success: false, error: 'Failed to update user' };
    }
  };

  // Keeps the stored copy in step with fresh profile data (e.g. an admin
  // granting the verified badge) so the next load renders it immediately.
  const syncVerified = useCallback((isVerified) => {
    if (typeof isVerified !== 'boolean') return;
    setUser((prev) => {
      if (!prev || prev.is_verified === isVerified) return prev;
      const next = { ...prev, is_verified: isVerified };
      localStorage.setItem('user', JSON.stringify(next));
      return next;
    });
  }, []);

  // Check if user is authenticated
  const isAuthenticated = () => {
    return !!(token && user);
  };

  // Check if user is admin
  const isAdmin = () => {
    return user?.user_type === 'Admin';
  };

  // Check if user is chat support
  const isChatSupport = () => {
    return user?.user_type === 'ChatSupport';
  };

  // Check if user account is active
  const isActive = () => {
    return user?.user_status === 'Active';
  };

  // Check if wallet is active
  const isWalletActive = () => {
    return user?.wallet_status === 'Active';
  };

  // Get authorization header for API requests
  const getAuthHeader = () => {
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const value = {
    user,
    token,
    login,
    logout,
    updateUser,
    syncVerified,
    isAuthenticated,
    isAdmin,
    isChatSupport,
    isActive,
    isWalletActive,
    getAuthHeader,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
