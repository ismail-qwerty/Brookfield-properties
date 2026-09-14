import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/api';

export default function History() {
  const { user } = useAuth();
  const [activeFilter, setActiveFilter] = useState('All');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const filters = ['All', 'Pending', 'Completed', 'Undone'];

  useEffect(() => {
    fetchOrders();
  }, [activeFilter]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const { data } = await api.user.getOrderHistory(
        activeFilter === 'All' ? undefined : activeFilter
      );
      setOrders(data.data?.orders || data.orders || []);
    } catch (err) {
      console.error('Failed to fetch orders:', err);
      console.error('Error response:', err.response?.data);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  };

  return (
    <div className="bg-white">
      <div className="page-head">
        <div className="wrap">
          <div className="eyebrow-light mb-5">Activity</div>
          <h1 className="display text-white">Order History</h1>
        </div>
      </div>

      <div className="wrap section-tight">
        {/* Filters */}
        <div className="flex gap-8 border-b mb-2" style={{ borderColor: 'var(--rule)' }}>
          {filters.map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`relative py-4 text-[13px] uppercase tracking-wider transition-colors ${
                activeFilter === filter
                  ? 'text-black after:absolute after:left-0 after:bottom-[-1px] after:h-[2px] after:w-full after:bg-black'
                  : 'text-[var(--ink-25)] hover:text-black'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="py-24 text-center">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-b border-black"></div>
          </div>
        ) : orders.length === 0 ? (
          <div className="py-24 text-center">
            <p className="text-[15px] mb-6" style={{ color: 'var(--ink-45)' }}>
              No orders in this category yet.
            </p>
            <Link to="/data-optimization" className="btn-outline">
              Generate Analyst Reviews
            </Link>
          </div>
        ) : (
          <ul>
            {orders.map((order) => (
              <li
                key={order.id}
                className="grid grid-cols-1 md:grid-cols-12 gap-5 md:gap-8 items-start py-8 border-b"
                style={{ borderColor: 'var(--rule)' }}
              >
                <div className="md:col-span-2 text-[12px] tnum" style={{ color: 'var(--ink-45)' }}>
                  {formatDate(order.created_at)}
                </div>

                <div className="md:col-span-1">
                  <img
                    src={order.properties?.image_url || '/placeholder.jpg'}
                    alt=""
                    className="w-14 h-14 object-cover"
                    onError={(e) => {
                      e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="64" height="64"%3E%3Crect fill="%23e5e7eb" width="64" height="64"/%3E%3C/svg%3E';
                    }}
                  />
                </div>

                <div className="md:col-span-5">
                  <h3 className="text-[18px] mb-2">
                    {order.properties?.name || 'Property'}
                  </h3>
                  <div className="text-[12px] tracking-widest" style={{ color: 'var(--ink-25)' }}>
                    ★★★★★
                  </div>
                </div>

                <div className="md:col-span-2">
                  <div className="text-[10px] uppercase tracking-widest mb-1" style={{ color: 'var(--ink-45)' }}>
                    Amount
                  </div>
                  <div className="text-[15px] tnum">
                    {parseFloat(order.properties?.value || 0).toFixed(2)}
                  </div>
                </div>

                <div className="md:col-span-1">
                  <div className="text-[10px] uppercase tracking-widest mb-1" style={{ color: 'var(--ink-45)' }}>
                    Comm.
                  </div>
                  <div className="text-[15px] tnum">
                    {parseFloat(order.commission || 0).toFixed(2)}
                  </div>
                </div>

                <div className="md:col-span-1 md:text-right">
                  <span
                    className={`inline-block px-3 py-1 text-[11px] tracking-wide border ${
                      order.status === 'Completed'
                        ? 'bg-black text-white border-black'
                        : order.status === 'Pending'
                        ? 'bg-white text-black border-black'
                        : 'bg-gray-100 text-gray-500 border-gray-300'
                    }`}
                  >
                    {order.status}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
