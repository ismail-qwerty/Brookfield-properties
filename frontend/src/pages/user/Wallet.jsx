import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/api';
import { CurrencyDisplay, PayoutMethodIcon, Skeleton } from '../../components/ui';

const ACCENT = 'linear-gradient(135deg, #3a3a3a 0%, #000000 100%)';

const PAYOUT_METHODS = [
  { id: 'paypal', label: 'PayPal' },
  { id: 'card', label: 'Credit / Debit' },
  { id: 'ach', label: 'ACH Bank' },
  { id: 'crypto', label: 'Crypto' },
  { id: 'chime', label: 'Chime' },
  { id: 'zelle', label: 'Zelle' },
];

const ICONS = {
  plus: (
    <path d="M12 5v14M5 12h14" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
  ),
  arrowUp: (
    <path d="M12 19V5M6 11l6-6 6 6" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
  ),
  arrowDown: (
    <path d="M12 5v14M6 13l6 6 6-6" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
  ),
  list: (
    <path d="M6 7h12M6 12h12M6 17h8" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
  ),
  eye: (
    <>
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z" stroke="#fff" strokeWidth="1.8" fill="none" />
      <circle cx="12" cy="12" r="3" stroke="#fff" strokeWidth="1.8" fill="none" />
    </>
  ),
  eyeOff: (
    <>
      <path d="M3 3l18 18" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M10.6 5.2A10.7 10.7 0 0112 5c6.4 0 10 7 10 7a15.6 15.6 0 01-3.2 4.1M6.6 6.6C4 8.3 2 12 2 12s3.6 7 10 7c1.3 0 2.5-.2 3.6-.6" stroke="#fff" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <path d="M9.9 9.9a3 3 0 004.2 4.2" stroke="#fff" strokeWidth="1.8" fill="none" />
    </>
  ),
  down: (
    <path d="M12 3v13M12 16l4-4M12 16l-4-4M4 20h16" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  ),
  up: (
    <path d="M12 21V8M12 8l4 4M12 8l-4 4M4 4h16" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  ),
  trend: (
    <path d="M4 16l5-5 4 4 7-8" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  ),
};

function Icon({ name, className = '' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      {ICONS[name]}
    </svg>
  );
}

function ActionButton({ icon, label, onClick }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-2.5 group flex-shrink-0">
      <span
        className="w-14 h-14 rounded-full flex items-center justify-center transition-transform duration-200 group-hover:scale-105 group-active:scale-95"
        style={{ background: ACCENT, boxShadow: '0 10px 26px -10px rgba(0,0,0,0.6)' }}
      >
        <Icon name={icon} className="w-6 h-6" />
      </span>
      <span className="text-[12px] text-white/70 whitespace-nowrap">{label}</span>
    </button>
  );
}

export default function Wallet() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hideBalance, setHideBalance] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await api.user.getProfile();
      setProfile(response.data.data);
    } catch (error) {
      console.error('Failed to fetch wallet:', error);
    } finally {
      setLoading(false);
    }
  };

  const wallet = profile?.wallet;

  // The page shell renders immediately; only data-driven values wait. After a
  // failed load they show a dash rather than a misleading $0.00.
  const money = (amount, skeletonClass) =>
    loading ? <Skeleton dark className={skeletonClass} /> : profile ? <CurrencyDisplay amount={amount || 0} /> : '—';

  // Purely cosmetic "card number" derived from the account id, so the
  // balance card reads like a real wallet card rather than a bare number.
  const rawId = String(profile?.id ?? profile?.username ?? '0000000000000000').replace(/[^0-9a-zA-Z]/g, '').toUpperCase();
  const padded = rawId.padEnd(16, '0');
  const last4 = padded.slice(-4);

  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : '—';

  const statRows = [
    { key: 'total_recharged', label: 'Total Recharged', icon: 'down', value: wallet?.total_recharged },
    { key: 'total_earned', label: 'Total Earned', icon: 'trend', value: wallet?.total_earned },
    { key: 'total_withdrawn', label: 'Total Withdrawn', icon: 'up', value: wallet?.total_withdrawn },
  ];

  return (
    <div style={{ background: '#08080b' }} className="min-h-full text-white">
      <div className="wrap py-10 md:py-14">
        {/* Top row */}
        <div className="flex items-center justify-between mb-8 md:mb-10">
          <div>
            <div className="text-[11px] uppercase tracking-[0.22em] text-white/40 mb-1.5">Wallet</div>
            <div className="text-[15px] text-white/70">
              {loading ? (
                <Skeleton dark className="h-[18px] my-[3px] w-44" />
              ) : (
                <>{profile?.membership?.name ? `${profile.membership.name} Member` : 'Member'} &middot; {user?.username}</>
              )}
            </div>
          </div>
          <button
            onClick={() => setHideBalance((h) => !h)}
            aria-label={hideBalance ? 'Show balance' : 'Hide balance'}
            className="w-11 h-11 rounded-full flex items-center justify-center border border-white/10 bg-white/5 hover:bg-white/10 transition-colors flex-shrink-0"
          >
            <Icon name={hideBalance ? 'eyeOff' : 'eye'} className="w-[18px] h-[18px]" />
          </button>
        </div>

        {/* Balance hero */}
        <div
          className="relative overflow-hidden rounded-[28px] px-6 py-8 sm:px-10 sm:py-10 mb-8"
          style={{
            background: 'linear-gradient(160deg, #16161d 0%, #0a0a0d 75%)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <div
            className="pointer-events-none absolute -top-24 -left-16 w-72 h-72 rounded-full opacity-[0.08] blur-3xl"
            style={{ background: '#ffffff' }}
          />
          <div
            className="pointer-events-none absolute -bottom-28 -right-12 w-72 h-72 rounded-full opacity-[0.06] blur-3xl"
            style={{ background: '#ffffff' }}
          />

          <div className="relative">
            <div className="text-[11px] uppercase tracking-[0.2em] text-white/40 mb-3">Total Balance</div>
            <div className="font-sans font-bold text-[46px] sm:text-[64px] leading-none tnum mb-9 sm:mb-11">
              {hideBalance && !loading ? '••••••' : money(wallet?.balance, 'h-[46px] sm:h-[64px] w-56 sm:w-80')}
            </div>

            <div className="flex gap-6 sm:gap-10 mb-9 sm:mb-11 overflow-x-auto">
              <ActionButton icon="plus" label="Add Funds" onClick={() => navigate('/recharge')} />
              <ActionButton icon="arrowUp" label="Withdraw" onClick={() => navigate('/redemption')} />
              <ActionButton icon="arrowDown" label="Deposits" onClick={() => navigate('/recharge-history')} />
              <ActionButton icon="list" label="Activity" onClick={() => navigate('/redemption-history')} />
            </div>

            <div
              className="flex flex-wrap items-center justify-between gap-x-8 gap-y-3 pt-6"
              style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
            >
              <div className="font-mono text-[13px] sm:text-[15px] tracking-[0.25em] text-white/50 tnum">
                •••• •••• •••• {loading ? <Skeleton dark className="inline-block align-middle h-4 w-12" /> : last4}
              </div>
              <div className="text-[12px] text-white/40">
                Member since{' '}
                {loading ? (
                  <Skeleton dark className="inline-block align-middle h-3.5 w-16" />
                ) : (
                  <span className="text-white/70">{memberSince}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Stats list */}
        <div
          className="rounded-[24px] mb-8 overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          {statRows.map((s, i) => (
            <div
              key={s.key}
              className="flex items-center justify-between px-5 sm:px-7 py-5"
              style={i > 0 ? { borderTop: '1px solid rgba(255,255,255,0.06)' } : undefined}
            >
              <div className="flex items-center gap-4">
                <span className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <Icon name={s.icon} className="w-[18px] h-[18px]" />
                </span>
                <span className="text-[14px] text-white/70">{s.label}</span>
              </div>
              <span className="text-[17px] sm:text-[19px] font-semibold tnum">
                {money(s.value, 'h-5 w-24')}
              </span>
            </div>
          ))}
        </div>

        {/* Withdraw to */}
        <div>
          <div className="text-[11px] uppercase tracking-[0.2em] text-white/40 mb-4">Withdraw To</div>
          <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
            {PAYOUT_METHODS.map((m) => (
              <Link
                key={m.id}
                to="/redemption"
                className="flex flex-col items-center justify-center text-center gap-2.5 py-5 px-4 rounded-[16px] flex-shrink-0 transition-colors hover:bg-white/[0.06]"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', minWidth: 92 }}
              >
                <PayoutMethodIcon icon={m.id} size={40} />
                <span className="text-[11px] leading-snug text-white/60 whitespace-nowrap">{m.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
