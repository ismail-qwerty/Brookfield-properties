import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { StatusBadge, TierBadge, CurrencyDisplay, LoadingSpinner, EmptyState } from '../../components/ui';
import api from '../../utils/api';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showDebitModal, setShowDebitModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [debitAmount, setDebitAmount] = useState('');
  const [debitReason, setDebitReason] = useState('');
  const [openDropdown, setOpenDropdown] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [allUsers, setAllUsers] = useState([]);

  useEffect(() => {
    fetchUsers();

    // Auto-refresh every 30 seconds to show real-time data. Pass
    // isBackgroundRefresh so this doesn't toggle the loading spinner and
    // blank out the whole table every cycle — only the values update.
    const interval = setInterval(() => {
      fetchUsers(true);
    }, 30000);

    return () => clearInterval(interval);
  }, [currentPage]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Close dropdown if clicking outside any dropdown
      if (openDropdown !== null) {
        const isDropdownClick = event.target.closest('.dropdown-container');
        if (!isDropdownClick) {
          setOpenDropdown(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openDropdown]);

  const fetchUsers = async (isBackgroundRefresh = false) => {
    if (!isBackgroundRefresh) setLoading(true);
    try {
      const response = await api.admin.getUsers({ page: currentPage, limit: 10 });
      const fetchedUsers = response.data.data.users || [];
      setAllUsers(fetchedUsers);
      setUsers(fetchedUsers);
      setTotalPages(response.data.data.pagination?.totalPages || 1);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      if (!isBackgroundRefresh) setLoading(false);
    }
  };

  // Filter users based on search query
  const filteredUsers = users.filter((user) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      user.username?.toLowerCase().includes(query) ||
      user.email?.toLowerCase().includes(query) ||
      user.phone?.includes(query) ||
      user.reference_code?.toLowerCase().includes(query) ||
      user.id?.toString().includes(query)
    );
  });

  const handleAddDebit = async () => {
    if (!selectedUser || !debitAmount) {
      alert('Please enter an amount');
      return;
    }

    const amount = parseFloat(debitAmount);
    if (isNaN(amount) || amount === 0) {
      alert('Please enter a non-zero amount');
      return;
    }

    try {
      const { data } = await api.admin.applyDebit(selectedUser.id, {
        amount,
        reason: debitReason || (amount > 0 ? 'Manual credit by admin' : 'Manual debit by admin'),
      });
      const resolvedCount = data?.data?.resolved_order_ids?.length || 0;
      const direction = amount > 0 ? 'Credit' : 'Debit';
      let message = `${direction} of $${Math.abs(amount).toFixed(2)} applied successfully!`;
      if (resolvedCount > 0) {
        message += ` ${resolvedCount} pending order(s) were completed now that the balance is no longer negative.`;
      }
      alert(message);
      setShowDebitModal(false);
      setDebitAmount('');
      setDebitReason('');
      setSelectedUser(null);
      await fetchUsers();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to apply balance adjustment');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div>
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
            <p className="text-gray-600 mt-1">Manage all platform members and accounts</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => fetchUsers()}
              disabled={loading}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-semibold transition-colors flex items-center space-x-2 disabled:opacity-50"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Refresh</span>
            </button>
            <Link
              to="/administration/add-member"
              className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              + Add Member
            </Link>
          </div>
        </div>
        
        {/* Search Bar */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by username, email, phone, reference code, or ID..."
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              <svg className="w-5 h-5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
        {loading ? (
          <div className="py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <EmptyState message={searchQuery ? 'No users found matching your search' : 'No users found'} icon="👥" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">ID</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Username</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">P-ID</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Phone</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Balance</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Available</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Total Orders</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Reward</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">%</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">PID Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Referral Code</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Membership</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">W Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Registration</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Last Login</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">{user.id}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{user.username}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{user.referrer_id || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{user.phone}</td>
                      <td className="px-4 py-3 text-sm">
                        <CurrencyDisplay
                          amount={user.wallet?.balance || 0}
                          className={(user.wallet?.balance || 0) < 0 ? 'text-black font-semibold' : 'text-primary-600'}
                        />
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {Math.max(0, (user.membership?.order_limit || 27) - (user.total_orders || 0))}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">{user.total_orders || 0}</td>
                      <td className="px-4 py-3 text-sm">
                        <CurrencyDisplay amount={user.today_earnings || 0} className="text-black" />
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">{user.credibility}%</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{user.referrer?.username || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 font-mono">{user.reference_code}</td>
                      <td className="px-4 py-3 text-sm">
                        <TierBadge tier={user.membership?.name || 'Silver'} size="sm" />
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <StatusBadge status={user.user_status} />
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <StatusBadge status={user.wallet_status} />
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{formatDate(user.created_at)}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{formatDate(user.last_login_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col space-y-2 min-w-[140px]">
                          {/* Row 1 */}
                          <div className="flex space-x-2">
                            <Link
                              to={`/administration/reset-orders/${user.id}`}
                              className="flex-1 bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold px-3 py-1.5 rounded text-center transition-colors"
                            >
                              Setup Order
                            </Link>
                            <button
                              onClick={() => {
                                setSelectedUser(user);
                                setShowDebitModal(true);
                              }}
                              className="flex-1 bg-[#DC2626] hover:bg-red-700 text-white text-xs font-semibold px-3 py-1.5 rounded transition-colors"
                            >
                              Adjust Balance
                            </button>
                          </div>
                          {/* Row 2 */}
                          <div className="flex space-x-2">
                            <button
                              onClick={async () => {
                                if (confirm(`Reset completed orders for ${user.username}? This will set their total orders to 0.`)) {
                                  try {
                                    await api.post(`/admin/users/${user.id}/reset-orders`);
                                    alert('Orders reset successfully!');
                                    await fetchUsers();
                                  } catch (err) {
                                    alert(err.response?.data?.error || 'Failed to reset orders');
                                  }
                                }
                              }}
                              className="flex-1 bg-primary-700 hover:bg-primary-600 text-white text-xs font-semibold px-3 py-1.5 rounded transition-colors"
                            >
                              Reset Count
                            </button>
                            <div className="relative dropdown-container flex-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenDropdown(openDropdown === user.id ? null : user.id);
                                }}
                                className="w-full bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold px-3 py-1.5 rounded transition-colors flex items-center justify-center"
                              >
                                More Actions
                                <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </button>
                              {openDropdown === user.id && (
                                <div className="absolute right-0 mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                                  <div className="py-1">
                                    <Link
                                      to={`/administration/update-user/${user.id}`}
                                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                      onClick={() => setOpenDropdown(null)}
                                    >
                                      Edit Profile
                                    </Link>
                                    <Link
                                      to={`/administration/wallet/${user.id}`}
                                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                      onClick={() => setOpenDropdown(null)}
                                    >
                                      Wallet Details
                                    </Link>
                                    <Link
                                      to={`/administration/recharge-history/${user.id}`}
                                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                      onClick={() => setOpenDropdown(null)}
                                    >
                                      Deposit History
                                    </Link>
                                    <Link
                                      to={`/administration/redemption-history/${user.id}`}
                                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                      onClick={() => setOpenDropdown(null)}
                                    >
                                      Withdrawal History
                                    </Link>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Add Debit Modal */}
      {showDebitModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Adjust Balance - {selectedUser?.username}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="label">
                  Amount ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={debitAmount}
                  onChange={(e) => setDebitAmount(e.target.value)}
                  className="input-field"
                  placeholder="e.g. 50 to credit, -50 to debit"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Positive adds to the balance (credit). Negative subtracts from it (debit). Crediting a negative balance back up also auto-completes any orders that were held pending on it.
                </p>
              </div>
              <div>
                <label className="label">
                  Reason (Optional)
                </label>
                <textarea
                  value={debitReason}
                  onChange={(e) => setDebitReason(e.target.value)}
                  className="input-field"
                  placeholder="Enter reason for this adjustment..."
                  rows="3"
                />
              </div>
              <div className="flex space-x-3 pt-2">
                <button
                  onClick={() => {
                    setShowDebitModal(false);
                    setDebitAmount('');
                    setDebitReason('');
                    setSelectedUser(null);
                  }}
                  className="flex-1 px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddDebit}
                  className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
