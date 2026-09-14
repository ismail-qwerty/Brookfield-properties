import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';

export default function RedemptionHistory() {
  const { user } = useAuth();
  const [redemptions, setRedemptions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRedemptions();
  }, []);

  const fetchRedemptions = async () => {
    try {
      const response = await api.user.getRedemptions();
      setRedemptions(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch redemption history:', error);
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
            <span className="text-white/80">Redemption History</span>
          </div>
          <h1 className="display text-white">Redemption History</h1>
        </div>
      </div>

      {/* Content Section */}
      <div className="wrap section-tight">
        <h2 className="text-2xl font-semibold text-gray-700 mb-6">
          Recent Redemptions - {user?.username}
        </h2>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b border-black"></div>
          </div>
        ) : redemptions.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <p className="text-gray-500">No redemption records found</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <table className="min-w-full">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">#</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Amount ($)</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Wallet Address</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                </tr>
              </thead>
              <tbody>
                {redemptions.map((redemption, index) => (
                  <tr key={redemption.id} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                    <td className="px-6 py-4 text-sm text-gray-900">{index + 1}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {new Date(redemption.created_at).toISOString().split('T')[0]}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {parseFloat(redemption.amount).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                      {redemption.wallet_address}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                          redemption.status === 'Approved'
                            ? 'bg-black text-white'
                            : redemption.status === 'Pending'
                            ? 'bg-white text-black border border-black'
                            : 'bg-gray-100 text-gray-500 border border-gray-300'
                        }`}
                      >
                        {redemption.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
