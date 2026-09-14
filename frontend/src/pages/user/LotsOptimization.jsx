import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/api';
import { TierBadge, LoadingSpinner } from '../../components/ui';

export default function LotsOptimization() {
  const { user } = useAuth();
  const [memberships, setMemberships] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMemberships();
  }, []);

  const fetchMemberships = async () => {
    try {
      const response = await api.admin.getMemberships();
      setMemberships(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch memberships:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar - Same as Dashboard */}
      <div className="bg-black text-white p-6">
        <h1 className="text-2xl font-bold">Membership Upgrade</h1>
        <p className="text-gray-300 mt-1">Unlock higher earning potential with premium tiers</p>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        <div className="mb-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-blue-900 mb-2">Your Current Tier</h2>
          <div className="flex items-center gap-3">
            <TierBadge tier={user?.tier_name || 'Silver'} />
            <span className="text-blue-800">
              Daily Limit: {user?.order_limit || 35} orders | Commission Rate:{' '}
              {user?.commission_rate || 0.5}%
            </span>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {memberships.map((tier) => {
            const isCurrent = tier.id === user?.tier_id;
            const isHigher = tier.id > user?.tier_id;

            return (
              <div
                key={tier.id}
                className={`rounded-lg shadow-lg p-6 border-2 ${
                  isCurrent
                    ? 'border-black bg-gray-100'
                    : isHigher
                    ? 'border-gray-200 bg-white'
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="text-center mb-4">
                  <TierBadge tier={tier.name} large />
                  {isCurrent && (
                    <span className="inline-block mt-2 px-3 py-1 bg-black text-white text-xs rounded-full">
                      Current Tier
                    </span>
                  )}
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Daily Orders:</span>
                    <span className="font-semibold">{tier.order_limit}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Commission Rate:</span>
                    <span className="font-semibold text-black">{tier.commission_rate}%</span>
                  </div>
                </div>

                <button
                  disabled={!isHigher}
                  className={`w-full py-3 rounded-lg font-medium ${
                    isHigher
                      ? 'bg-black text-white hover:bg-primary-700'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {isCurrent ? 'Current Plan' : isHigher ? 'Upgrade Now' : 'Previous Tier'}
                </button>
              </div>
            );
          })}
        </div>

        <div className="mt-8 bg-gray-100 border border-gray-300 p-6">
          <h3 className="font-medium text-black mb-2">📌 Upgrade Information</h3>
          <p className="text-sm text-gray-700">
            To upgrade your membership tier, please contact customer support. Upgrades may require
            account verification and minimum balance requirements.
          </p>
        </div>
      </div>
    </div>
  );
}
