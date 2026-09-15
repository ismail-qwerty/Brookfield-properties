import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Skeleton, SkeletonRegion } from '../../components/ui';
import api from '../../utils/api';

export default function ResetOrders() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [assignedLots, setAssignedLots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchUserOrders();
  }, [id]);

  // Background refreshes (e.g. after removing a lot) keep the current list on
  // screen instead of dropping the whole page back to its skeleton.
  const fetchUserOrders = async (background = false) => {
    if (!background) setLoading(true);
    try {
      const userResponse = await api.admin.getUserById(id);
      setUser(userResponse.data.data);
      
      // Fetch assigned special lots
      const lotsResponse = await api.get(`/admin/users/${id}/special-lots`);
      setAssignedLots(lotsResponse.data.data || []);
    } catch (err) {
      console.error('Failed to fetch user orders:', err);
    } finally {
      if (!background) setLoading(false);
    }
  };

  const handleRemove = async (lot) => {
    const label = lot.properties?.name || lot.special_lots?.title || 'this special lot';
    if (!confirm(`Remove ${label} from ${user?.username}'s queue? They will no longer receive it.`)) {
      return;
    }

    setError('');
    setRemovingId(lot.id);
    try {
      await api.delete(`/admin/users/${id}/special-lots/${lot.id}`);
      await fetchUserOrders(true);
    } catch (err) {
      setError(
        err.response?.data?.error ||
          err.response?.data?.message ||
          'Failed to remove special lot'
      );
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Setup Orders</h1>
          <p className="text-sm text-gray-600 mt-1">
            <Link to="/administration" className="link-quiet">Home</Link>
            <span className="mx-2">/</span>
            <span>Setup Orders</span>
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-black px-8 py-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            Setup Orders for{' '}
            {loading ? <Skeleton dark className="h-6 w-28" /> : user?.username}
          </h2>
        </div>

        <div className="p-8">
          {loading ? (
            <SkeletonRegion label="Loading special lots">
              <Skeleton className="h-5 w-48 mb-4" />
              <div className="space-y-4 mb-6">
                {[0, 1].map((i) => (
                  <div key={i} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-5 w-56" />
                        <Skeleton className="h-4 w-64" />
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-4 w-44" />
                      </div>
                      <Skeleton className="h-6 w-20 rounded-full" />
                    </div>
                  </div>
                ))}
              </div>
              <Skeleton className="h-11 w-40" />
            </SkeletonRegion>
          ) : assignedLots.length === 0 ? (
            <>
              <p className="text-gray-600 mb-6">No orders selected for this user.</p>
              <button
                onClick={() => navigate(`/administration/reset-single/${id}`)}
                className="btn-solid"
              >
                Setup Order
              </button>
            </>
          ) : (
            <>
              <p className="text-black font-semibold mb-4">
                {assignedLots.length} Special Lot(s) Assigned
              </p>
              
              <div className="space-y-4 mb-6">
                {assignedLots.map((lot) => (
                  <div key={lot.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-gray-900">{lot.properties?.name || lot.special_lots?.title || 'Special Lot'}</p>
                        <p className="text-sm text-gray-600 mt-1">
                          {lot.status === 'Pending' ? (
                            <>
                              {/* Delivery fires once total_orders exceeds
                                  trigger_after_order_no, so the user needs to
                                  reach trigger + 1 — not trigger itself. */}
                              Appears after{' '}
                              <span className="font-semibold">
                                {Math.max(0, lot.trigger_after_order_no + 1 - (user?.total_orders || 0))}
                              </span>{' '}
                              more completed order(s)
                            </>
                          ) : (
                            <>Was set to appear at lifetime order #{lot.trigger_after_order_no}</>
                          )}
                        </p>
                        <p className="text-sm text-gray-600">
                          Price: <span className="font-semibold text-black">${lot.lot_value}</span>
                        </p>
                        <p className="text-sm text-gray-600">
                          Daily Commission: <span className="font-semibold text-black">${lot.daily_commission}</span>
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          lot.status === 'Completed' ? 'bg-black text-white' :
                          lot.status === 'Pending' ? 'bg-white text-black border border-black' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {lot.status}
                        </span>
                        {/* Delivered lots already exist as real, paid-out
                            orders, so removing the queue row would hide the
                            record without undoing anything. */}
                        {lot.status === 'Pending' && (
                          <button
                            type="button"
                            onClick={() => handleRemove(lot)}
                            disabled={removingId === lot.id}
                            className="text-xs font-semibold text-red-600 hover:text-red-700 hover:underline disabled:opacity-50 disabled:no-underline"
                          >
                            {removingId === lot.id ? 'Removing...' : 'Remove'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => navigate(`/administration/reset-single/${id}`)}
                className="btn-solid"
              >
                Add More Orders
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
