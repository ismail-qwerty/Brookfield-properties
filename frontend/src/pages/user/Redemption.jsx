import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/api';

export default function Redemption() {
  const { user } = useAuth();
  const [balance, setBalance] = useState(0);
  const [amount, setAmount] = useState('');
  const [walletPassword, setWalletPassword] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const quickAmounts = [100, 150, 200, 1000, 1500, 2000];

  useEffect(() => {
    fetchWallet();
  }, []);

  const fetchWallet = async () => {
    try {
      const response = await api.user.getWallet();
      setBalance(response.data.data.balance || 0);
    } catch (error) {
      console.error('Failed to fetch wallet:', error);
    }
  };

  const handleQuickSelect = (value) => {
    setAmount(value.toString());
  };

  const handleAllAmount = () => {
    setAmount(balance.toString());
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const numAmount = parseFloat(amount);

      if (numAmount < (user?.min_withdrawal || 50)) {
        throw new Error(`Minimum withdrawal is $${(user?.min_withdrawal || 50).toFixed(2)}`);
      }

      if (numAmount > (user?.max_withdrawal || 500)) {
        throw new Error(`Maximum withdrawal is $${(user?.max_withdrawal || 500).toFixed(2)}`);
      }

      if (numAmount > balance) {
        throw new Error('Insufficient balance');
      }

      await api.user.requestRedemption({
        amount: numAmount,
        wallet_address: walletAddress,
        wallet_password: walletPassword,
      });

      setMessage({
        type: 'success',
        text: 'Withdrawal request submitted successfully. Pending admin approval.',
      });

      setAmount('');
      setWalletPassword('');
      setWalletAddress('');
      fetchWallet();
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.error || error.message || 'Failed to submit withdrawal request',
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
            <span className="text-white/80">Withdraw</span>
          </div>
          <h1 className="display text-white">Withdraw Funds</h1>
        </div>
      </div>

      <div className="wrap-narrow section-tight">
        {/* Balance */}
        <div className="border-b pb-8 mb-12" style={{ borderColor: 'var(--rule)' }}>
          <div className="stat-label">Available Balance &middot; {user?.username}</div>
          <div className="stat-value">${balance.toFixed(2)}</div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-10">
            <div className="flex items-end justify-between gap-4 mb-2">
              <label className="label mb-0">Amount</label>
              <button
                type="button"
                onClick={handleAllAmount}
                className="link-quiet text-[12px] uppercase tracking-wider"
              >
                Withdraw all
              </button>
            </div>
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

          <div className="space-y-8 mb-10">
            <div>
              <label className="label">Withdrawal Password</label>
              <input
                type="password"
                value={walletPassword}
                onChange={(e) => setWalletPassword(e.target.value)}
                className="field"
                placeholder="Enter withdrawal password"
                required
              />
            </div>

            <div>
              <label className="label">Wallet Address</label>
              <input
                type="text"
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                className="field"
                placeholder="Enter wallet address"
                required
              />
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

          <button type="submit" disabled={loading} className="btn-solid w-full">
            {loading ? 'Processing…' : 'Submit Withdrawal Request'}
          </button>

          <p className="text-[12px] mt-6" style={{ color: 'var(--ink-45)' }}>
            Withdrawal requests are reviewed before funds are released. Confirm your
            wallet address carefully. Transfers cannot be reversed.
          </p>
        </form>
      </div>
    </div>
  );
}
