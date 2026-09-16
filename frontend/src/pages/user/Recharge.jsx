import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/api';
import { Skeleton, CurrencyDisplay, CARD, HERO_CARD, MUTED, HAIRLINE } from '../../components/ui';

const QUICK_AMOUNTS = [50, 100, 200, 1000, 3000, 5000];

export default function Recharge() {
  const { user } = useAuth();
  const [balance, setBalance] = useState(null);
  const [balanceFailed, setBalanceFailed] = useState(false);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      await api.user.requestRecharge({ amount: parseFloat(amount) });

      setMessage({
        type: 'success',
        text: 'Deposit request submitted successfully. Pending admin approval.',
      });

      setAmount('');
      fetchWallet();
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.error || error.message || 'Failed to submit deposit request',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: '#000' }} className="min-h-full text-white">
      <div className="wrap py-8 md:py-12 max-w-[620px] mx-auto">
        <div className="flex items-center gap-2.5 text-[12px] mb-6" style={{ color: MUTED }}>
          <Link to="/wallet" className="hover:text-white transition-colors">Wallet</Link>
          <span>/</span>
          <span className="text-white/75">Add Funds</span>
        </div>

        <h1 className="text-[22px] md:text-[26px] font-semibold leading-tight mb-1">Add Funds</h1>
        <p className="text-[13px] mb-7" style={{ color: MUTED }}>
          Deposits are credited once an administrator approves them.
        </p>

        {/* Balance */}
        <section className="rounded-[20px] px-5 py-5 sm:px-7 sm:py-6 mb-5" style={HERO_CARD}>
          <div className="text-[11px] uppercase tracking-[0.18em] text-white/50 mb-2">
            Available balance &middot; {user?.username}
          </div>
          <div className="font-bold text-[32px] sm:text-[38px] leading-none tnum">
            {balance !== null ? (
              <CurrencyDisplay amount={balance} />
            ) : balanceFailed ? (
              '-'
            ) : (
              <Skeleton dark className="h-[32px] sm:h-[38px] w-44" />
            )}
          </div>
        </section>

        <form onSubmit={handleSubmit}>
          {/* Amount */}
          <section className="rounded-[20px] px-5 py-6 sm:px-7 sm:py-7 mb-5" style={CARD}>
            <label className="block text-[11px] uppercase tracking-[0.16em] text-white/45 mb-3">
              Amount to add
            </label>
            <div className="flex items-baseline gap-2 mb-6">
              <span className="text-[30px] font-bold text-white/35">$</span>
              <input
                type="number"
                step="0.01"
                min="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-transparent text-[34px] font-bold tnum text-white placeholder-white/20 focus:outline-none"
                placeholder="0.00"
                required
              />
            </div>

            <div className="text-[11px] uppercase tracking-[0.16em] text-white/45 mb-3">Quick select</div>
            <div className="grid grid-cols-3 gap-2.5">
              {QUICK_AMOUNTS.map((val) => {
                const active = String(val) === String(amount);
                return (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setAmount(val.toString())}
                    className={`py-3 rounded-xl text-[14px] font-semibold tnum transition-colors ${
                      active ? 'bg-white text-black' : 'text-white/75 hover:bg-white/[0.12]'
                    }`}
                    style={active ? undefined : { background: 'rgba(255,255,255,0.05)', border: `1px solid ${HAIRLINE}` }}
                  >
                    ${val.toLocaleString('en-US')}
                  </button>
                );
              })}
            </div>
          </section>

          {message.text && (
            <div
              className="mb-5 px-4 py-3.5 rounded-xl text-[14px]"
              style={
                message.type === 'success'
                  ? { background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.25)', color: '#e5e5e5' }
                  : { background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.35)', color: '#fca5a5' }
              }
            >
              {message.text}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-full bg-white text-black text-[15px] font-semibold transition-all hover:bg-white/90 active:scale-[0.99] disabled:opacity-40"
          >
            {loading ? 'Processing…' : 'Submit Deposit Request'}
          </button>

          <div className="flex items-center justify-between gap-4 mt-6 text-[12px]" style={{ color: MUTED }}>
            <span>Funds appear in your wallet after approval.</span>
            <Link to="/recharge-history" className="hover:text-white transition-colors whitespace-nowrap">
              View deposits
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
