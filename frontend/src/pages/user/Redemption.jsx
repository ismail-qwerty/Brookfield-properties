import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/api';
import { PayoutMethodIcon, CurrencyDisplay, Skeleton } from '../../components/ui';

const ACCENT = 'linear-gradient(135deg, #3a3a3a 0%, #000000 100%)';

const PAYOUT_METHODS = [
  { id: 'paypal', label: 'PayPal' },
  { id: 'card', label: 'Credit / Debit' },
  { id: 'ach', label: 'ACH Bank Transfer' },
  { id: 'crypto', label: 'Cryptocurrency' },
  { id: 'chime', label: 'Chime' },
  { id: 'zelle', label: 'Zelle / e-Transfer' },
];

const CRYPTO_NETWORKS = ['BTC', 'ETH', 'USDT (TRC20)', 'USDT (ERC20)'];
const ACCOUNT_TYPES = ['Checking', 'Savings'];

const initialDetails = {
  paypal: { email: '' },
  card: { name: '', number: '', expiry: '' },
  ach: { holder: '', bankName: '', routing: '', account: '', accountType: 'Checking' },
  crypto: { network: 'BTC', address: '' },
  chime: { handle: '' },
  zelle: { contact: '' },
};

const fieldClass =
  'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-[15px] text-white placeholder-white/25 focus:outline-none focus:border-white/30 transition-colors';
const labelClass = 'block text-[11px] uppercase tracking-[0.16em] text-white/40 mb-2';

function PillButton({ active, children, ...props }) {
  return (
    <button
      type="button"
      className="py-3 text-[13px] rounded-xl border transition-all tnum"
      style={
        active
          ? { background: ACCENT, borderColor: 'transparent', color: '#fff', boxShadow: '0 8px 20px -10px rgba(0,0,0,0.6)' }
          : { background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }
      }
      {...props}
    >
      {children}
    </button>
  );
}

export default function Redemption() {
  const { user } = useAuth();
  const [balance, setBalance] = useState(null);
  const [balanceFailed, setBalanceFailed] = useState(false);
  const [amount, setAmount] = useState('');
  const [walletPassword, setWalletPassword] = useState('');
  const [method, setMethod] = useState('paypal');
  const [details, setDetails] = useState(initialDetails);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const quickAmounts = [100, 150, 200, 1000, 1500, 2000];

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

  const handleAllAmount = () => {
    if (balance === null) return;
    setAmount(balance.toString());
  };

  const updateDetail = (key, value) => {
    setDetails((prev) => ({ ...prev, [method]: { ...prev[method], [key]: value } }));
  };

  const isMethodComplete = () => {
    const d = details[method];
    switch (method) {
      case 'paypal':
        return !!d.email.trim();
      case 'card':
        return !!d.name.trim() && !!d.number.trim() && !!d.expiry.trim();
      case 'ach':
        return !!d.holder.trim() && !!d.bankName.trim() && !!d.routing.trim() && !!d.account.trim();
      case 'crypto':
        return !!d.address.trim();
      case 'chime':
        return !!d.handle.trim();
      case 'zelle':
        return !!d.contact.trim();
      default:
        return false;
    }
  };

  const buildDestination = () => {
    const d = details[method];
    switch (method) {
      case 'paypal':
        return `PayPal: ${d.email}`;
      case 'card':
        return `Credit/Debit Card: ${d.name}, card ${d.number}, exp ${d.expiry}`;
      case 'ach':
        return `ACH Bank Transfer: ${d.holder}, ${d.bankName}, routing ${d.routing}, account ${d.account} (${d.accountType})`;
      case 'crypto':
        return `Crypto (${d.network}): ${d.address}`;
      case 'chime':
        return `Chime: ${d.handle}`;
      case 'zelle':
        return `Zelle / e-Transfer: ${d.contact}`;
      default:
        return '';
    }
  };

  const methodLabel = PAYOUT_METHODS.find((m) => m.id === method)?.label || '';

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

      // Only pre-check once the real balance is known; the server enforces it
      // either way, so an unloaded balance must not reject a valid request.
      if (balance !== null && numAmount > balance) {
        throw new Error('Insufficient balance');
      }

      if (!isMethodComplete()) {
        throw new Error(`Please complete your ${methodLabel} details`);
      }

      await api.user.requestRedemption({
        amount: numAmount,
        wallet_address: buildDestination(),
        wallet_password: walletPassword,
        payout_method: method,
      });

      setMessage({
        type: 'success',
        text: 'Withdrawal request submitted successfully. Pending admin approval.',
      });

      setAmount('');
      setWalletPassword('');
      setDetails(initialDetails);
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
    <div style={{ background: '#08080b' }} className="min-h-full text-white">
      <div className="wrap py-10 md:py-14 max-w-[620px] mx-auto">
        <div className="flex items-center gap-3 text-[12px] text-white/40 mb-6">
          <Link to="/dashboard" className="hover:text-white transition-colors">Dashboard</Link>
          <span>/</span>
          <Link to="/wallet" className="hover:text-white transition-colors">Wallet</Link>
          <span>/</span>
          <span className="text-white/70">Withdraw</span>
        </div>

        <div className="text-[11px] uppercase tracking-[0.22em] text-white/40 mb-2">Withdraw Funds</div>
        <div className="text-[15px] text-white/60 mb-8">
          Available balance &middot;{' '}
          {balance !== null ? (
            <span className="text-white/85 tnum"><CurrencyDisplay amount={balance} /></span>
          ) : balanceFailed ? (
            <span className="text-white/85">—</span>
          ) : (
            <Skeleton dark className="inline-block align-middle h-4 w-20" />
          )}
        </div>

        <form onSubmit={handleSubmit}>
          {/* Amount */}
          <div
            className="rounded-[24px] px-6 py-7 mb-6"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <div className="flex items-end justify-between gap-4 mb-3">
              <label className={`${labelClass} mb-0`}>Amount</label>
              <button
                type="button"
                onClick={handleAllAmount}
                disabled={balance === null}
                className="text-[11px] uppercase tracking-wider text-white/50 hover:text-white transition-colors disabled:opacity-40 disabled:hover:text-white/50"
              >
                Withdraw all
              </button>
            </div>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-transparent text-[36px] font-bold tnum text-white placeholder-white/20 focus:outline-none mb-6"
              placeholder="0.00"
              required
            />

            <div className="grid grid-cols-3 gap-2.5">
              {quickAmounts.map((val) => (
                <PillButton key={val} active={String(val) === String(amount)} onClick={() => handleQuickSelect(val)}>
                  {val}
                </PillButton>
              ))}
            </div>
          </div>

          {/* Payout method */}
          <div className="mb-6">
            <div className={labelClass}>Withdraw Via</div>
            <div className="grid grid-cols-3 gap-3">
              {PAYOUT_METHODS.map((m) => {
                const active = m.id === method;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMethod(m.id)}
                    className="flex flex-col items-center justify-center gap-2.5 py-5 px-2 rounded-2xl text-center transition-all"
                    style={{
                      background: active ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${active ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.08)'}`,
                    }}
                  >
                    <PayoutMethodIcon icon={m.id} size={38} active={active} />
                    <span className="text-[11px] leading-snug text-white/70">{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Method-specific details */}
          <div
            className="rounded-[24px] px-6 py-7 mb-6 space-y-5"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <div className="text-[11px] uppercase tracking-[0.16em] text-white/40">{methodLabel} Details</div>

            {method === 'paypal' && (
              <div>
                <label className={labelClass}>PayPal Email</label>
                <input
                  type="email"
                  value={details.paypal.email}
                  onChange={(e) => updateDetail('email', e.target.value)}
                  className={fieldClass}
                  placeholder="you@example.com"
                  required
                />
              </div>
            )}

            {method === 'card' && (
              <>
                <div>
                  <label className={labelClass}>Cardholder Name</label>
                  <input
                    type="text"
                    value={details.card.name}
                    onChange={(e) => updateDetail('name', e.target.value)}
                    className={fieldClass}
                    placeholder="Full name on card"
                    required
                  />
                </div>
                <div>
                  <label className={labelClass}>Card Number</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={details.card.number}
                    onChange={(e) => updateDetail('number', e.target.value)}
                    className={fieldClass}
                    placeholder="0000 0000 0000 0000"
                    maxLength={19}
                    required
                  />
                </div>
                <div>
                  <label className={labelClass}>Expiry (MM/YY)</label>
                  <input
                    type="text"
                    value={details.card.expiry}
                    onChange={(e) => updateDetail('expiry', e.target.value)}
                    className={fieldClass}
                    placeholder="MM/YY"
                    maxLength={5}
                    required
                  />
                </div>
              </>
            )}

            {method === 'ach' && (
              <>
                <div>
                  <label className={labelClass}>Account Holder Name</label>
                  <input
                    type="text"
                    value={details.ach.holder}
                    onChange={(e) => updateDetail('holder', e.target.value)}
                    className={fieldClass}
                    placeholder="Full name on account"
                    required
                  />
                </div>
                <div>
                  <label className={labelClass}>Bank Name</label>
                  <input
                    type="text"
                    value={details.ach.bankName}
                    onChange={(e) => updateDetail('bankName', e.target.value)}
                    className={fieldClass}
                    placeholder="e.g. Chase, Bank of America"
                    required
                  />
                </div>
                <div>
                  <label className={labelClass}>Routing Number</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={details.ach.routing}
                    onChange={(e) => updateDetail('routing', e.target.value)}
                    className={fieldClass}
                    placeholder="9-digit routing number"
                    maxLength={9}
                    required
                  />
                </div>
                <div>
                  <label className={labelClass}>Account Number</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={details.ach.account}
                    onChange={(e) => updateDetail('account', e.target.value)}
                    className={fieldClass}
                    placeholder="Account number"
                    required
                  />
                </div>
                <div>
                  <div className={labelClass}>Account Type</div>
                  <div className="grid grid-cols-2 gap-3">
                    {ACCOUNT_TYPES.map((t) => (
                      <PillButton key={t} active={details.ach.accountType === t} onClick={() => updateDetail('accountType', t)}>
                        {t}
                      </PillButton>
                    ))}
                  </div>
                </div>
              </>
            )}

            {method === 'crypto' && (
              <>
                <div>
                  <div className={labelClass}>Network</div>
                  <div className="grid grid-cols-2 gap-3">
                    {CRYPTO_NETWORKS.map((n) => (
                      <PillButton key={n} active={details.crypto.network === n} onClick={() => updateDetail('network', n)}>
                        {n}
                      </PillButton>
                    ))}
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Wallet Address</label>
                  <input
                    type="text"
                    value={details.crypto.address}
                    onChange={(e) => updateDetail('address', e.target.value)}
                    className={fieldClass}
                    placeholder="Enter your wallet address"
                    required
                  />
                </div>
              </>
            )}

            {method === 'chime' && (
              <div>
                <label className={labelClass}>Chime $Cashtag or Phone Number</label>
                <input
                  type="text"
                  value={details.chime.handle}
                  onChange={(e) => updateDetail('handle', e.target.value)}
                  className={fieldClass}
                  placeholder="$YourCashtag or phone number"
                  required
                />
              </div>
            )}

            {method === 'zelle' && (
              <div>
                <label className={labelClass}>Zelle / e-Transfer Email or Phone</label>
                <input
                  type="text"
                  value={details.zelle.contact}
                  onChange={(e) => updateDetail('contact', e.target.value)}
                  className={fieldClass}
                  placeholder="Email or phone number"
                  required
                />
              </div>
            )}
          </div>

          <div className="mb-6">
            <label className={labelClass}>Withdrawal Password</label>
            <input
              type="password"
              value={walletPassword}
              onChange={(e) => setWalletPassword(e.target.value)}
              className={fieldClass}
              placeholder="Enter withdrawal password"
              required
            />
          </div>

          {message.text && (
            <div
              className="mb-6 px-4 py-3.5 rounded-xl text-[14px]"
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
            className="w-full py-4 rounded-xl text-[15px] font-semibold text-white transition-opacity disabled:opacity-40"
            style={{ background: ACCENT, boxShadow: '0 14px 34px -14px rgba(0,0,0,0.6)' }}
          >
            {loading ? 'Processing…' : 'Submit Withdrawal Request'}
          </button>

          <p className="text-[12px] mt-6 text-white/40">
            Withdrawal requests are reviewed before funds are released. Confirm your
            payout details carefully. Transfers cannot be reversed.
          </p>
        </form>
      </div>
    </div>
  );
}
