import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import { Skeleton, SkeletonRegion } from '../../components/ui';

const PAGE_SIZE = 10;

export default function History() {
  const [activeFilter, setActiveFilter] = useState('All');
  const [orders, setOrders] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // 'Undone' isn't a status any order can actually have — orders are only
  // ever 'Pending' or 'Completed' — so it stayed off this list rather than
  // being a filter tab that's permanently empty.
  const filters = ['All', 'Pending', 'Completed'];

  useEffect(() => {
    fetchOrders();
  }, [activeFilter, page]);

  const selectFilter = (filter) => {
    setActiveFilter(filter);
    setPage(1);
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const { data } = await api.user.getOrderHistory(
        activeFilter === 'All' ? undefined : activeFilter,
        page,
        PAGE_SIZE
      );
      const payload = data.data || data;
      setOrders(payload?.orders || []);
      setTotalPages(payload?.pagination?.totalPages || 1);
      setTotal(payload?.pagination?.total || 0);
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
              onClick={() => selectFilter(filter)}
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
          <SkeletonRegion label="Loading orders" className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="rounded-[16px] border p-5 md:p-6"
                style={{ borderColor: 'var(--rule)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
              >
                <div className="flex items-start gap-4 mb-5">
                  <Skeleton className="w-16 h-16 rounded-[10px] flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <Skeleton className="h-5 md:h-6 w-3/5" />
                      <Skeleton className="h-[26px] w-20 flex-shrink-0" />
                    </div>
                    <Skeleton className="h-3.5 w-24 mt-2" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 pt-4 border-t" style={{ borderColor: 'var(--rule)' }}>
                  {['Price', 'Commission', 'Total'].map((label) => (
                    <div key={label}>
                      <div className="text-[10px] uppercase tracking-widest mb-1" style={{ color: 'var(--ink-45)' }}>
                        {label}
                      </div>
                      <Skeleton className="h-5 w-16" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </SkeletonRegion>
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
          <>
            <div className="space-y-4">
              {orders.map((order) => {
                const price = parseFloat(order.properties?.value || 0);
                const commission = parseFloat(order.commission || 0);
                const total = price + commission;

                return (
                  <div
                    key={order.id}
                    className="rounded-[16px] border p-5 md:p-6"
                    style={{ borderColor: 'var(--rule)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
                  >
                    <div className="flex items-start gap-4 mb-5">
                      <img
                        src={order.properties?.image_url || '/placeholder.jpg'}
                        alt=""
                        className="w-16 h-16 rounded-[10px] object-cover flex-shrink-0"
                        onError={(e) => {
                          e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="64" height="64"%3E%3Crect fill="%23e5e7eb" width="64" height="64"/%3E%3C/svg%3E';
                        }}
                      />

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="text-[15px] md:text-[18px] leading-snug break-words">
                            {order.properties?.name || 'Property'}
                          </h3>
                          <span
                            className={`flex-shrink-0 inline-block px-3 py-1 text-[11px] tracking-wide border whitespace-nowrap ${
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
                        <div className="text-[12px] tnum mt-1" style={{ color: 'var(--ink-45)' }}>
                          {formatDate(order.created_at)}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 pt-4 border-t" style={{ borderColor: 'var(--rule)' }}>
                      <div>
                        <div className="text-[10px] uppercase tracking-widest mb-1" style={{ color: 'var(--ink-45)' }}>
                          Price
                        </div>
                        <div className="text-[14px] md:text-[15px] tnum">${price.toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-widest mb-1" style={{ color: 'var(--ink-45)' }}>
                          Commission
                        </div>
                        <div className="text-[14px] md:text-[15px] tnum">${commission.toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-widest mb-1" style={{ color: 'var(--ink-45)' }}>
                          Total
                        </div>
                        <div className="text-[14px] md:text-[15px] tnum font-medium">${total.toFixed(2)}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-8">
                <p className="text-[12px]" style={{ color: 'var(--ink-45)' }}>
                  Page {page} of {totalPages} &middot; {total} total
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="btn-outline disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="btn-outline disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
