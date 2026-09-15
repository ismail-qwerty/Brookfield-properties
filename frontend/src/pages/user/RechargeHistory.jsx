import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import { SkeletonRegion, SkeletonTableRows } from '../../components/ui';

export default function RechargeHistory() {
  const { user } = useAuth();
  const [recharges, setRecharges] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecharges();
  }, []);

  const fetchRecharges = async () => {
    try {
      const response = await api.user.getRecharges();
      setRecharges(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch recharge history:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white">
      {/* Header Section */}
      <div className="page-head">
        <div className="wrap">
          <div className="flex items-center gap-3 text-[12px] text-white/50 mb-5">
            <Link to="/dashboard" className="hover:text-white transition-colors">Dashboard</Link>
            <span>/</span>
            <span className="text-white/80">Recharge History</span>
          </div>
          <h1 className="display text-white">Recharge History</h1>
        </div>
      </div>

      {/* Content Section */}
      <div className="wrap section-tight">
        <h2 className="text-2xl font-semibold text-gray-700 mb-6">
          Recent Recharges - {user?.username}
        </h2>

        {loading ? (
          <SkeletonRegion label="Loading recharges" className="bg-white rounded-lg shadow-sm overflow-hidden">
            <table className="min-w-full">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">#</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Amount ($)</th>
                </tr>
              </thead>
              <tbody>
                <SkeletonTableRows rows={5} columns={3} rowClassName={(i) => (i % 2 === 0 ? 'bg-gray-50' : 'bg-white')} />
              </tbody>
            </table>
          </SkeletonRegion>
        ) : recharges.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <p className="text-gray-500">No recharge records found</p>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <table className="min-w-full">
                <thead className="bg-gray-100 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">#</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Amount ($)</th>
                  </tr>
                </thead>
                <tbody>
                  {recharges.map((recharge, index) => (
                    <tr key={recharge.id} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                      <td className="px-6 py-4 text-sm text-gray-900">{index + 1}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {new Date(recharge.created_at).toISOString().split('T')[0]}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {parseFloat(recharge.amount).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-6">
              <Link
                to="/recharge"
                className="inline-block px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium"
              >
                Recharge
              </Link>
            </div>
          </>
        )}
      </div>

    </div>
  );
}
