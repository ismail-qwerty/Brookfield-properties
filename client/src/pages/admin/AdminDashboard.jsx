import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { StatusBadge, TierBadge, CurrencyDisplay, LoadingSpinner, EmptyState } from '../../components/ui';
import api from '../../utils/api';

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showDebitModal, setShowDebitModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [debitAmount, setDebitAmount] = useState('');
  const [debitReason, setDebitReason] = useState('');
  const [openDropdown, setOpenDropdown] = useState(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    fetchUsers();
  }, [currentPage]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await api.admin.getUsers({ page: currentPage, limit: 10 });
      setUsers(response.data.data.users || []);
      setTotalPages(response.data.data.pagination?.totalPages || 1);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddDebit = async () => {
    if (!selectedUser || !debitAmount) return;

    try {
      await api.admin.applyDebit(selectedUser.id, {
        amount: parseFloat(debitAmount),
        reason: debitReason,
      });
      setShowDebitModal(false);
      setDebitAmount('');
      setDebitReason('');
      setSelectedUser(null);
      await fetchUsers();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to apply debit');
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
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600 mt-1">Manage all platform members and accounts</p>
        </div>
        <Link
          to="/administration/add-member"
          className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
        >
          + Add Member
        </Link>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
        {loading ? (
          <div className="py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : users.length === 0 ? (
          <EmptyState message="No users found" icon="👥" />
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
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">{user.id}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{user.username}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{user.referrer_id || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{user.phone}</td>
                      <td className="px-4 py-3 text-sm">
                        <CurrencyDisplay
                          amount={user.wallet?.balance || 0}
                          className={user.wallet?.balance < 0 ? 'text-red-600' : 'text-primary-600'}
                        />
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {(user.membership?.order_limit || 35) - (user.orders_today || 0)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">{user.total_orders || 0}</td>
                      <td className="px-4 py-3 text-sm">
                        <CurrencyDisplay amount={user.wallet?.total_earned || 0} className="text-green-600" />
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
                              className="flex-1 bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1.5 rounded text-center transition-colors"
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
                              Add Debit
                            </button>
                          </div>
                          {/* Row 2 */}
                          <div className="flex space-x-2">
                            <Link
                              to={`/administration/reset-single/${user.id}`}
                              className="flex-1 bg-[#F59E0B] hover:bg-orange-600 text-white text-xs font-semibold px-3 py-1.5 rounded text-center transition-colors"
                            >
                              Reset Orders
                            </Link>
                            <div className="flex-1 relative" ref={dropdownRef}>
                              <button
                                onClick={() => setOpenDropdown(openDropdown === user.id ? null : user.id)}
                                className="w-full bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold px-3 py-1.5 rounded transition-colors"
                              >
                                More Actions ▼
                              </button>
                              {openDropdown === user.id && (
                                <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                                  <Link
                                    to={`/administration/update-user/${user.id}`}
                                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-t-lg"
                                    onClick={() => setOpenDropdown(null)}
                                  >
                                    ✏️ Edit Profile
                                  </Link>
                                  <Link
                                    to={`/administration/wallet/${user.id}`}
                                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                    onClick={() => setOpenDropdown(null)}
                                  >
                                    💰 Wallet Details
                                  </Link>
                                  <Link
                                    to={`/administration/recharge-history/${user.id}`}
                                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                    onClick={() => setOpenDropdown(null)}
                                  >
                                    💳 Deposit History
                                  </Link>
                                  <Link
                                    to={`/administration/redemption-history/${user.id}`}
                                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 border-t rounded-b-lg"
                                    onClick={() => setOpenDropdown(null)}
                                  >
                                    💸 Withdrawal History
                                  </Link>
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
              Add Debit - {selectedUser?.username}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Debit Amount (VIEWS)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={debitAmount}
                  onChange={(e) => setDebitAmount(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason (Optional)
                </label>
                <textarea
                  value={debitReason}
                  onChange={(e) => setDebitReason(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="Enter reason for debit..."
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
                  Apply Debit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
