import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * ProtectedRoute - Wrapper for routes requiring authentication
 * Redirects to login if not authenticated
 */
export const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated()) {
    // Redirect to login while saving the attempted URL
    return <Navigate to="/user-login" state={{ from: location }} replace />;
  }

  return children;
};

/**
 * AdminRoute - Wrapper for routes requiring admin privileges
 * Redirects to dashboard if not admin
 */
export const AdminRoute = ({ children }) => {
  const { isAuthenticated, isAdmin } = useAuth();
  const location = useLocation();

  if (!isAuthenticated()) {
    return <Navigate to="/user-login" state={{ from: location }} replace />;
  }

  if (!isAdmin()) {
    // Redirect regular users to dashboard
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

/**
 * PublicRoute - Wrapper for public routes (login, register)
 * Redirects to dashboard if already authenticated
 */
export const PublicRoute = ({ children }) => {
  const { isAuthenticated, isAdmin, isChatSupport } = useAuth();

  if (isAuthenticated()) {
    // Redirect authenticated users to their appropriate dashboard
    if (isAdmin()) {
      return <Navigate to="/administration" replace />;
    }
    if (isChatSupport()) {
      return <Navigate to="/support" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default ProtectedRoute;
