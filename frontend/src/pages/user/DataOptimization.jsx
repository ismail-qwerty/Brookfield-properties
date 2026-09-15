import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/api';
import { Skeleton, VerifiedBadge } from '../../components/ui';

// Must match backend MINIMUM_BALANCE_TO_TRADE (order.service.ts)
const MINIMUM_BALANCE_TO_TRADE = 50;

export default function DataOptimization() {
  const { user, syncVerified } = useAuth();
  const navigate = useNavigate();
  // null until the first fetch lands, so nothing renders a fake $0.00 (or a
  // false low-balance warning) before the real numbers arrive.
  const [stats, setStats] = useState(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAlert, setShowAlert] = useState(true);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    fetchStats();

    // Check for success message from navigation
    if (location.state?.success && location.state?.message) {
      setSuccessMessage(location.state.message);
      // Clear the state
      navigate(location.pathname, { replace: true, state: {} });

      // Auto-hide after 5 seconds
      setTimeout(() => setSuccessMessage(''), 5000);
    }

    // "Today's Earnings" is computed server-side from each order's
    // timestamp, so it naturally resets once a new day starts — but only
    // the NEXT time this page fetches. Without polling, a tab left open
    // across midnight (or just sitting idle a while) would keep showing
    // yesterday's number until manually reloaded.
    const interval = setInterval(fetchStats, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      const response = await api.user.getProfile();
      const profileData = response.data.data;
      syncVerified(profileData?.is_verified);

      const tierLimit = profileData?.membership?.order_limit || 27;
      const totalOrders = profileData?.total_orders || 0;

      setStats({
        balance: profileData?.wallet?.balance || 0,
        todayEarnings: profileData?.today_earnings || 0,
        // Same total_orders the admin panel's "Total Orders" / "Available"
        // columns are built from, so this page and the admin panel always
        // agree — and neither can exceed the tier's order_limit, since the
        // generate-lot gate blocks total_orders from ever going past it.
        lotsCompleted: totalOrders,
        lotsRemaining: Math.max(0, tierLimit - totalOrders),
      });
    } catch (err) {
      console.error('Failed to fetch stats:', err);
      setLoadFailed(true);
    }
  };

  const handleGenerateLots = async () => {
    setError('');
    setLoading(true);

    try {
      const response = await api.user.generateLots();
      const data = response.data.data;

      // Navigate to submit order page with order data
      navigate('/submit-order', {
        state: {
          orderData: data,
        },
      });
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.response?.data?.message || 'Failed to generate analyst reviews';
      setError(errorMsg);
      console.error('Generate lots error:', err.response?.data);
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => `${amount < 0 ? '-' : ''}$${Math.abs(amount).toFixed(2)}`;

  const metrics = [
    { label: 'Account Balance', value: stats && formatCurrency(stats.balance) },
    { label: "Today's Earnings", value: stats && formatCurrency(stats.todayEarnings) },
    { label: 'Lots Completed', value: stats?.lotsCompleted },
    { label: 'Lots Remaining', value: stats?.lotsRemaining },
  ];

  return (
    <div className="bg-black text-white">
      {/* Masthead */}
      <section className="wrap pt-10 pb-8 md:pt-12 md:pb-10">
        <div className="eyebrow-light mb-3">Data Optimization</div>
        <h1 className="font-serif text-[30px] md:text-[42px] leading-tight text-white mb-3">
          Welcome back, {user?.username}
          {user?.is_verified && <VerifiedBadge light size={28} className="ml-2.5 -mt-1" />}
        </h1>
        <p className="text-white/60 text-[14px] md:text-[15px] max-w-xl">
          Review your position, then generate a new set of analyst reviews for submission.
        </p>
      </section>

      {/* Low balance notice */}
      {showAlert && stats && stats.balance < MINIMUM_BALANCE_TO_TRADE && (
        <section className="wrap pb-6">
          <div className="border-l-2 border-white bg-white/5 px-5 py-4 flex items-start justify-between gap-6">
            <div>
              <h2 className="text-[15px] text-white mb-1">Low Balance</h2>
              <p className="text-[13px] text-white/60">
                A minimum balance of ${MINIMUM_BALANCE_TO_TRADE.toFixed(2)} is required to generate a lot.
                You're ${Math.max(0, MINIMUM_BALANCE_TO_TRADE - stats.balance).toFixed(2)} short. Please contact support or add funds.
              </p>
            </div>
            <button
              onClick={() => setShowAlert(false)}
              aria-label="Dismiss"
              className="text-white/50 hover:text-white text-xl leading-none transition-colors"
            >
              &times;
            </button>
          </div>
        </section>
      )}

      {/* Metrics */}
      <section className="wrap pb-10" aria-busy={!stats}>
        <div className="grid grid-cols-2 lg:grid-cols-4 border-t border-l border-white/15">
          {metrics.map((m) => (
            <div key={m.label} className="border-r border-b border-white/15 px-5 py-5">
              <div className="text-[10px] uppercase tracking-[0.16em] text-white/45 mb-2">
                {m.label}
              </div>
              <div className="font-serif text-[22px] md:text-[26px] leading-none tnum text-white">
                {stats
                  ? m.value
                  : loadFailed
                  ? '—'
                  : <Skeleton dark className="h-[22px] md:h-[26px] w-20 md:w-24" />}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Action */}
      <section className="wrap pb-14">
        <div className="border border-white/15 px-6 py-8 md:px-12 md:py-10 text-center">
          <h2 className="font-serif text-[20px] md:text-[26px] text-white mb-3">
            Generate your next analyst review
          </h2>
          <p className="text-white/55 text-[13px] max-w-md mx-auto mb-6">
            A new optimisation run will be prepared and sent to the submission
            step for your review.
          </p>

          <button
            onClick={handleGenerateLots}
            disabled={loading}
            className="btn bg-white text-black hover:bg-white/80 disabled:opacity-40"
          >
            {loading ? 'Processing…' : 'Generate Analyst Reviews'}
          </button>

          {successMessage && (
            <div className="mt-6 max-w-lg mx-auto border-l-2 border-white bg-white/5 px-4 py-3 text-[13px] text-white text-left">
              {successMessage}
            </div>
          )}

          {error && (
            <div className="mt-6 max-w-lg mx-auto border-l-2 border-red-500 bg-red-500/10 px-4 py-3 text-[13px] text-red-200 text-left">
              {error}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
