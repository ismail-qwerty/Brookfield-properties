import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { LoadingSpinner } from '../../components/ui';
import api from '../../utils/api';

export default function ResetOrders() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [assignedLots, setAssignedLots] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserOrders();
  }, [id]);

  const fetchUserOrders = async () => {
    setLoading(true);
    try {
      const userResponse = await api.admin.getUserById(id);
      setUser(userResponse.data.data);
      
      // Fetch assigned special lots
      const lotsResponse = await api.get(`/admin/users/${id}/special-lots`);
      setAssignedLots(lotsResponse.data.data || []);
    } catch (err) {
      console.error('Failed to fetch user orders:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

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

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-black px-8 py-6">
          <h2 className="text-xl font-bold text-white">
            Setup Orders for {user?.username}
          </h2>
        </div>

        <div className="p-8">
          {assignedLots.length === 0 ? (
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
                          Daily Commission: <span className="font-semibold text-black">${lot.daily_commission} (27%)</span>
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        lot.status === 'Completed' ? 'bg-black text-white' :
                        lot.status === 'Pending' ? 'bg-white text-black border border-black' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {lot.status}
                      </span>
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
