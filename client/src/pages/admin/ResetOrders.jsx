import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { LoadingSpinner, EmptyState, StatusBadge, CurrencyDisplay } from '../../components/ui';
import api from '../../utils/api';

export default function ResetOrders() {
  const { id } = useParams();
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserOrders();
  }, [id]);

  const fetchUserOrders = async () => {
    setLoading(true);
    try {
      // Fetch user details
      const userResponse = await api.admin.getUserById(id);
      setUser(userResponse.data.data);

      // TODO: Fetch user's actual orders from backend
      // For now showing empty - needs endpoint GET /api/v1/admin/users/:id/orders
      setOrders([]);
    } catch (err) {
      console.error('Failed to fetch user orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const getLotStatus = (lotNumber) => {
    const order = orders.find(o => o.lot_number === lotNumber);
    if (!order) return { status: 'Empty', color: 'bg-gray-100 border-gray-300', text: 'text-gray-400' };
    if (order.status === 'Completed') return { status: 'Completed', color: 'bg-green-50 border-green-300', text: 'text-green-700' };
    if (order.status === 'Pending') return { status: 'Pending', color: 'bg-blue-50 border-blue-300', text: 'text-blue-700' };
    return { status: 'Undone', color: 'bg-red-50 border-red-300', text: 'text-red-700' };
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">User not found</p>
        <Link to="/administration" className="text-primary-600 hover:underline mt-4 inline-block">
          Back to Users
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Setup Orders - View All Lots</h1>
            <p className="text-gray-600 mt-1">Viewing 35 lot slots for {user.username}</p>
          </div>
          <Link
            to="/administration"
            className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg transition-colors"
          >
            ← Back to Users
          </Link>
        </div>
      </div>

      {/* User Info Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <p className="text-sm text-gray-600">Username</p>
            <p className="text-lg font-semibold text-gray-900">{user.username}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Completed Orders</p>
            <p className="text-lg font-semibold text-primary-600">{user.total_orders || 0} / 35</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Balance</p>
            <p className="text-lg font-semibold">
              <CurrencyDisplay amount={user.wallets?.balance || 0} />
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Daily Limit</p>
            <p className="text-lg font-semibold text-gray-900">
              {user.membership_levels?.order_limit || 35} tasks/day
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Membership</p>
            <p className="text-lg font-semibold text-primary-600">
              {user.membership_levels?.name || 'Silver'} ({user.membership_levels?.commission_rate || 0.5}%)
            </p>
          </div>
        </div>
      </div>

      {/* Action Button */}
      <div className="mb-6">
        <Link
          to={`/administration/reset-single/${id}`}
          className="inline-flex items-center px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg transition-colors"
        >
          ⚙️ Configure Order Lots (Assign Properties)
        </Link>
      </div>

      {/* 35 Lots Grid */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-900">35 Order Lots</h2>
          <p className="text-sm text-gray-600 mt-1">
            Visual representation of all lot positions. Configure them in 'Reset Single' page.
          </p>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-5 md:grid-cols-7 gap-3">
            {Array.from({ length: 35 }, (_, i) => i + 1).map((lotNum) => {
              const lotData = getLotStatus(lotNum);
              const order = orders.find(o => o.lot_number === lotNum);
              
              return (
                <div
                  key={lotNum}
                  className={`relative aspect-square border-2 rounded-lg ${lotData.color} ${lotData.text} flex flex-col items-center justify-center p-2 transition-all hover:shadow-md`}
                >
                  <div className="text-xs font-semibold mb-1">LOT {lotNum}</div>
                  <div className="text-[10px] font-medium">{lotData.status}</div>
                  {order?.is_special_lot && (
                    <div className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] px-1 py-0.5 rounded-full font-bold">
                      ⚠️
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-6 flex flex-wrap gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-gray-100 border-2 border-gray-300 rounded"></div>
              <span className="text-gray-600">Empty</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-blue-50 border-2 border-blue-300 rounded"></div>
              <span className="text-gray-600">Pending</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-green-50 border-2 border-green-300 rounded"></div>
              <span className="text-gray-600">Completed</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-red-50 border-2 border-red-300 rounded"></div>
              <span className="text-gray-600">Undone</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-red-500 font-bold">⚠️</span>
              <span className="text-gray-600">Special Lot (causes loss)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Orders List */}
      {orders.length > 0 && (
        <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h2 className="text-lg font-semibold text-gray-900">Order Details</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Lot #</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Property</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Task Value</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Commission</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Special</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Completed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">#{order.lot_number}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {order.property?.title || 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <CurrencyDisplay amount={order.task_value} />
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <CurrencyDisplay 
                        amount={order.commission} 
                        className={order.is_special_lot ? 'text-red-600' : 'text-green-600'} 
                      />
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {order.is_special_lot ? (
                        <span className="text-red-600 font-bold">⚠️ YES</span>
                      ) : (
                        <span className="text-gray-400">No</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{formatDate(order.completed_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-semibold text-blue-900">How the 35-Lot System Works</h3>
            <div className="mt-2 text-sm text-blue-800">
              <ul className="list-disc pl-5 space-y-1">
                <li>Users have 35 lot positions that can be assigned properties</li>
                <li>Configure lots in the "Reset Single" page by assigning properties</li>
                <li>Mark specific lots as "Special Lots" - these cause a loss when reached</li>
                <li>Users complete lots sequentially within their daily limit</li>
                <li>Normal lots: earn commission = property price × tier rate</li>
                <li>Special lots: cause a deduction from balance instead of earning</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
