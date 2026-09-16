import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/api';
import {
  PayoutMethodIcon,
  CurrencyDisplay,
  Skeleton,
  CARD,
  HERO_CARD,
  FIELD,
  LABEL,
  MUTED,
  HAIRLINE,
} from '../../components/ui';

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

function PillButton({ active, children, ...props }) {
  return (
    <button
      type="button"
      className={`py-3 text-[13px] rounded-xl font-semibold tnum transition-colors ${
        active ? 'bg-white text-black' : 'text-white/75 hover:bg-white/[0.12]'
      }`}
      style={active ? undefined : { background: 'rgba(255,255,255,0.05)', border: `1px solid ${HAIRLINE}` }}
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
    <div style={{ background: '#000' }} className="min-h-full text-white">
      <div className="wrap py-8 md:py-12 max-w-[620px] mx-auto">
        <div className="flex items-center gap-2.5 text-[12px] mb-6" style={{ color: MUTED }}>
          <Link to="/wallet" className="hover:text-white transition-colors">Wallet</Link>
          <span>/</span>
          <span className="text-white/75">Withdraw</span>
        </div>

        <h1 className="text-[22px] md:text-[26px] font-semibold leading-tight mb-1">Withdraw Funds</h1>
        <p className="text-[13px] mb-7" style={{ color: MUTED }}>
          Requests are reviewed before funds are released. Transfers cannot be reversed.
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
            <div className="flex items-end justify-between gap-4 mb-3">
              <label className={`${LABEL} mb-0`}>Amount</label>
              <button
                type="button"
                onClick={handleAllAmount}
                disabled={balance === null}
                className="text-[11px] uppercase tracking-wider text-white/50 hover:text-white transition-colors disabled:opacity-40 disabled:hover:text-white/50"
              >
                Withdraw all
              </button>
            </div>
            <div className="flex items-baseline gap-2 mb-6">
              <span className="text-[30px] font-bold text-white/35">$</span>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-transparent text-[34px] font-bold tnum text-white placeholder-white/20 focus:outline-none"
                placeholder="0.00"
                required
              />
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              {quickAmounts.map((val) => (
                <PillButton key={val} active={String(val) === String(amount)} onClick={() => setAmount(val.toString())}>
                  ${val.toLocaleString('en-US')}
                </PillButton>
              ))}
            </div>
          </section>

          {/* Payout method */}
          <section className="rounded-[20px] px-5 py-6 sm:px-7 sm:py-7 mb-5" style={CARD}>
            <div className={LABEL}>Withdraw via</div>
            <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
              {PAYOUT_METHODS.map((m) => {
                const active = m.id === method;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMethod(m.id)}
                    className="flex flex-col items-center justify-center gap-2.5 py-4 px-2 rounded-2xl text-center transition-colors"
                    style={{
                      background: active ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${active ? 'rgba(255,255,255,0.40)' : HAIRLINE}`,
                    }}
                  >
                    <PayoutMethodIcon icon={m.id} size={38} active={active} />
                    <span className={`text-[11px] leading-snug ${active ? 'text-white' : 'text-white/60'}`}>{m.label}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Method-specific details */}
          <section className="rounded-[20px] px-5 py-6 sm:px-7 sm:py-7 mb-5 space-y-5" style={CARD}>
            <div className="text-[11px] uppercase tracking-[0.16em] text-white/45">{methodLabel} details</div>

            {method === 'paypal' && (
              <div>
                <label className={LABEL}>PayPal Email</label>
                <input
                  type="email"
                  value={details.paypal.email}
                  onChange={(e) => updateDetail('email', e.target.value)}
                  className={FIELD}
                  placeholder="you@example.com"
                  required
                />
              </div>
            )}

            {method === 'card' && (
              <>
                <div>
                  <label className={LABEL}>Cardholder Name</label>
                  <input
                    type="text"
                    value={details.card.name}
                    onChange={(e) => updateDetail('name', e.target.value)}
                    className={FIELD}
                    placeholder="Full name on card"
                    required
                  />
                </div>
                <div>
                  <label className={LABEL}>Card Number</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={details.card.number}
                    onChange={(e) => updateDetail('number', e.target.value)}
                    className={FIELD}
                    placeholder="0000 0000 0000 0000"
                    maxLength={19}
                    required
                  />
                </div>
                <div>
                  <label className={LABEL}>Expiry (MM/YY)</label>
                  <input
                    type="text"
                    value={details.card.expiry}
                    onChange={(e) => updateDetail('expiry', e.target.value)}
                    className={FIELD}
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
                  <label className={LABEL}>Account Holder Name</label>
                  <input
                    type="text"
                    value={details.ach.holder}
                    onChange={(e) => updateDetail('holder', e.target.value)}
                    className={FIELD}
                    placeholder="Full name on account"
                    required
                  />
                </div>
                <div>
                  <label className={LABEL}>Bank Name</label>
                  <input
                    type="text"
                    value={details.ach.bankName}
                    onChange={(e) => updateDetail('bankName', e.target.value)}
                    className={FIELD}
                    placeholder="e.g. Chase, Bank of America"
                    required
                  />
                </div>
                <div>
                  <label className={LABEL}>Routing Number</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={details.ach.routing}
                    onChange={(e) => updateDetail('routing', e.target.value)}
                    className={FIELD}
                    placeholder="9 digit routing number"
                    maxLength={9}
                    required
                  />
                </div>
                <div>
                  <label className={LABEL}>Account Number</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={details.ach.account}
                    onChange={(e) => updateDetail('account', e.target.value)}
                    className={FIELD}
                    placeholder="Account number"
                    required
                  />
                </div>
                <div>
                  <div className={LABEL}>Account Type</div>
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
                  <div className={LABEL}>Network</div>
                  <div className="grid grid-cols-2 gap-3">
                    {CRYPTO_NETWORKS.map((n) => (
                      <PillButton key={n} active={details.crypto.network === n} onClick={() => updateDetail('network', n)}>
                        {n}
                      </PillButton>
                    ))}
                  </div>
                </div>
                <div>
                  <label className={LABEL}>Wallet Address</label>
                  <input
                    type="text"
                    value={details.crypto.address}
                    onChange={(e) => updateDetail('address', e.target.value)}
                    className={FIELD}
                    placeholder="Enter your wallet address"
                    required
                  />
                </div>
              </>
            )}

            {method === 'chime' && (
              <div>
                <label className={LABEL}>Chime $Cashtag or Phone Number</label>
                <input
                  type="text"
                  value={details.chime.handle}
                  onChange={(e) => updateDetail('handle', e.target.value)}
                  className={FIELD}
                  placeholder="$YourCashtag or phone number"
                  required
                />
              </div>
            )}

            {method === 'zelle' && (
              <div>
                <label className={LABEL}>Zelle / e-Transfer Email or Phone</label>
                <input
                  type="text"
                  value={details.zelle.contact}
                  onChange={(e) => updateDetail('contact', e.target.value)}
                  className={FIELD}
                  placeholder="Email or phone number"
                  required
                />
              </div>
            )}

            <div>
              <label className={LABEL}>Withdrawal Password</label>
              <input
                type="password"
                value={walletPassword}
                onChange={(e) => setWalletPassword(e.target.value)}
                className={FIELD}
                placeholder="Enter withdrawal password"
                required
              />
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
            {loading ? 'Processing…' : 'Submit Withdrawal Request'}
          </button>

          <div className="flex items-center justify-between gap-4 mt-6 text-[12px]" style={{ color: MUTED }}>
            <span>Confirm your payout details carefully.</span>
            <Link to="/redemption-history" className="hover:text-white transition-colors whitespace-nowrap">
              View withdrawals
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
