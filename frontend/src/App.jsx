import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute, AdminRoute, PublicRoute } from './components/ProtectedRoute';
import UserLayout from './layouts/UserLayout';
import AdminLayout from './layouts/AdminLayout';
import FloatingChatButton from './components/FloatingChatButton';
import ScrollToTop from './components/ScrollToTop';

// Public Pages
import Landing from './pages/public/Landing';
import Login from './pages/public/Login';
import Register from './pages/public/Register';

// Authenticated User Pages
import Dashboard from './pages/user/Dashboard';
import DataOptimization from './pages/user/DataOptimization';
import SubmitOrder from './pages/user/SubmitOrder';
import Profile from './pages/user/Profile';
import History from './pages/user/History';
import Recharge from './pages/user/Recharge';
import RechargeHistory from './pages/user/RechargeHistory';
import Redemption from './pages/user/Redemption';
import RedemptionHistory from './pages/user/RedemptionHistory';
import Support from './pages/user/Support';
import Wallet from './pages/user/Wallet';
import BindWallet from './pages/user/BindWallet';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import UpdateUser from './pages/admin/UpdateUser';
import ResetSingleOrder from './pages/admin/ResetSingleOrder';
import ResetOrders from './pages/admin/ResetOrders';
import OrderList from './pages/admin/OrderList';
import Memberships from './pages/admin/Memberships';
import AddMember from './pages/admin/AddMember';
import ChatSupportDashboard from './pages/support/ChatSupportDashboard';

function App() {
  return (
    <Router>
      <ScrollToTop />
      <AuthProvider>
        <FloatingChatButton />
        <Routes>
          {/* ============================================ */}
          {/* PUBLIC ROUTES - No Authentication Required */}
          {/* ============================================ */}
          <Route path="/" element={<Landing />} />
          <Route
            path="/user-login"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />
          <Route
            path="/user-register"
            element={
              <PublicRoute>
                <Register />
              </PublicRoute>
            }
          />

          {/* ============================================ */}
          {/* AUTHENTICATED USER ROUTES */}
          {/* ============================================ */}
          <Route
            element={
              <ProtectedRoute>
                <UserLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/data-optimization" element={<DataOptimization />} />
            <Route path="/submit-order" element={<SubmitOrder />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/history" element={<History />} />
            <Route path="/recharge" element={<Recharge />} />
            <Route path="/recharge-history" element={<RechargeHistory />} />
            <Route path="/redemption" element={<Redemption />} />
            <Route path="/redemption-history" element={<RedemptionHistory />} />
            <Route path="/wallet" element={<Wallet />} />
            <Route path="/bind-wallet" element={<BindWallet />} />
          </Route>

          {/* ============================================ */}
          {/* SUPPORT ROUTE (No Layout) */}
          {/* ============================================ */}
          <Route
            path="/support"
            element={
              <ProtectedRoute>
                <Support />
              </ProtectedRoute>
            }
          />

          {/* ============================================ */}
          {/* ADMIN ROUTES - Prefixed with /administration */}
          {/* ============================================ */}
          <Route
            path="/administration"
            element={
              <AdminRoute>
                <AdminLayout />
              </AdminRoute>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="update-user/:id" element={<UpdateUser />} />
            <Route path="reset-single/:id" element={<ResetSingleOrder />} />
            <Route path="reset-orders/:id" element={<ResetOrders />} />
            <Route path="properties" element={<OrderList />} />
            <Route path="memberships" element={<Memberships />} />
            <Route path="add-member" element={<AddMember />} />
            <Route path="wallet/:id" element={<div className="p-8"><h1 className="text-2xl font-bold">Wallet Details</h1><p className="mt-4 text-gray-600">View detailed wallet information for a user.</p></div>} />
            <Route path="recharge-history/:id" element={<div className="p-8"><h1 className="text-2xl font-bold">User Deposit History</h1><p className="mt-4 text-gray-600">View all deposit/recharge records for this user.</p></div>} />
            <Route path="redemption-history/:id" element={<div className="p-8"><h1 className="text-2xl font-bold">User Withdrawal History</h1><p className="mt-4 text-gray-600">View all withdrawal/redemption records for this user.</p></div>} />
            <Route path="recharges" element={<div className="p-8"><h1 className="text-2xl font-bold">Pending Recharges</h1><p className="mt-4 text-gray-600">Approve or reject deposit requests.</p></div>} />
            <Route path="redemptions" element={<div className="p-8"><h1 className="text-2xl font-bold">Pending Redemptions</h1><p className="mt-4 text-gray-600">Approve or reject withdrawal requests.</p></div>} />
          </Route>

          {/* ============================================ */}
          {/* FALLBACK - 404 Not Found */}
          {/* ============================================ */}
          <Route
            path="*"
            element={
              <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="text-center">
                  <h1 className="text-6xl font-bold text-gray-800 mb-4">404</h1>
                  <p className="text-xl text-gray-600 mb-8">Page Not Found</p>
                  <a href="/" className="btn-primary">
                    Go Home
                  </a>
                </div>
              </div>
            }
          />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
