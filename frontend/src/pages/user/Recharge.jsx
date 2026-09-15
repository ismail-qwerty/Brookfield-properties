import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/api';
import { Skeleton } from '../../components/ui';

export default function Recharge() {
  const { user } = useAuth();
  const [balance, setBalance] = useState(null);
  const [balanceFailed, setBalanceFailed] = useState(false);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const quickAmounts = [50, 100, 200, 1000, 3000, 5000];

  useEffect(() => {
    fetchWallet();
  }, []);

  const fetchWallet = async () => {
    try {
      const response = await api.user.getWallet();
      setBalance(Number(response.data.data.balance) || 0);
    } catch (error) {
      console.error('Failed to fetch wallet:', error);
      setBalanceFailed(true);
    }
  };

  const handleQuickSelect = (value) => {
    setAmount(value.toString());
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const numAmount = parseFloat(amount);

      await api.user.requestRecharge({
        amount: numAmount,
      });

      setMessage({
        type: 'success',
        text: 'Recharge request submitted successfully. Pending admin approval.',
      });

      setAmount('');
      fetchWallet();
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.error || error.message || 'Failed to submit recharge request',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white">
      <div className="page-head">
        <div className="wrap">
          <div className="flex items-center gap-3 text-[12px] text-white/50 mb-5">
            <Link to="/dashboard" className="hover:text-white transition-colors">Dashboard</Link>
            <span>/</span>
            <span className="text-white/80">Add Funds</span>
          </div>
          <h1 className="display text-white">Add Funds</h1>
        </div>
      </div>

      <div className="wrap-narrow section-tight">
        {/* Balance */}
        <div className="border-b pb-8 mb-12" style={{ borderColor: 'var(--rule)' }}>
          <div className="stat-label">Account Balance &middot; {user?.username}</div>
          <div className="stat-value">
            {balance !== null
              ? `$${balance.toFixed(2)}`
              : balanceFailed
              ? '—'
              : <Skeleton className="h-[32px] md:h-[38px] w-40" />}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-10">
            <label className="label">Amount to add</label>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="field text-[28px] font-serif"
              placeholder="0.00"
              required
            />
          </div>

          <div className="mb-12">
            <div className="eyebrow mb-4">Quick Select</div>
            <div className="grid grid-cols-3 gap-3">
              {quickAmounts.map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleQuickSelect(val)}
                  className={`py-3 text-[14px] border transition-colors tnum ${
                    String(val) === String(amount)
                      ? 'bg-black text-white border-black'
                      : 'border-gray-300 hover:border-black'
                  }`}
                >
                  {val}
                </button>
              ))}
            </div>
          </div>

          {message.text && (
            <div
              className={`mb-8 px-4 py-3 text-[14px] border-l-2 ${
                message.type === 'success'
                  ? 'border-black bg-gray-100 text-black'
                  : 'border-red-600 bg-red-50 text-red-800'
              }`}
            >
              {message.text}
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-solid w-full sm:w-auto">
            {loading ? 'Processing…' : 'Add Funds'}
          </button>
        </form>
      </div>
    </div>
  );
}
