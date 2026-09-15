import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/api';
import { CurrencyDisplay, PayoutMethodIcon, Skeleton, VerifiedBadge } from '../../components/ui';

const MUTED = '#8a8a8a';
const HAIRLINE = 'rgba(255,255,255,0.08)';
const CARD = {
  background: 'linear-gradient(180deg, #111111 0%, #0a0a0a 100%)',
  border: `1px solid ${HAIRLINE}`,
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
};

const PAYOUT_METHODS = [
  { id: 'paypal', label: 'PayPal' },
  { id: 'card', label: 'Credit / Debit' },
  { id: 'ach', label: 'ACH Bank' },
  { id: 'crypto', label: 'Crypto' },
  { id: 'chime', label: 'Chime' },
  { id: 'zelle', label: 'Zelle' },
];

const ICONS = {
  plus: <path d="M12 5v14M5 12h14" strokeWidth="2.2" strokeLinecap="round" />,
  arrowUp: <path d="M12 19V5M6 11l6-6 6 6" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" strokeWidth="1.8" />
      <path d="M12 7.5V12l3 2" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  list: <path d="M6 7h12M6 12h12M6 17h8" strokeWidth="2.2" strokeLinecap="round" />,
  eye: (
    <>
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z" strokeWidth="2.4" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3" strokeWidth="2.4" />
    </>
  ),
  eyeOff: (
    <>
      <path d="M3 3l18 18" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M10.6 5.2A10.7 10.7 0 0112 5c6.4 0 10 7 10 7a15.6 15.6 0 01-3.2 4.1M6.6 6.6C4 8.3 2 12 2 12s3.6 7 10 7c1.3 0 2.5-.2 3.6-.6" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M9.9 9.9a3 3 0 004.2 4.2" strokeWidth="2.4" />
    </>
  ),
  wallet: (
    <>
      <rect x="3" y="6" width="18" height="13" rx="2.5" strokeWidth="1.8" />
      <path d="M3 10h18M16 14.5h2" strokeWidth="1.8" strokeLinecap="round" />
    </>
  ),
  down: <path d="M12 4v12M7 11l5 5 5-5M5 20h14" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />,
  up: <path d="M12 20V8M7 13l5-5 5 5M5 4h14" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />,
  trend: <path d="M4 16l5-5 4 4 7-8M15 7h5v5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />,
  trendBold: <path d="M4 16l5-5 4 4 7-8M15 7h5v5" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />,
  chevron: <path d="M9 6l6 6-6 6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />,
};

function Icon({ name, className = '', color = '#fff' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke={color} aria-hidden="true">
      {ICONS[name]}
    </svg>
  );
}

function PillButton({ icon, label, onClick, primary = false }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-center gap-1.5 sm:gap-2 h-11 px-2 sm:px-5 rounded-full text-[13px] sm:text-[14px] font-semibold whitespace-nowrap transition-all active:scale-[0.97] ${
        primary ? 'bg-white text-black hover:bg-white/90' : 'text-white hover:bg-white/[0.12]'
      }`}
      style={
        primary
          ? { boxShadow: '0 8px 24px -10px rgba(255,255,255,0.35)' }
          : { background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }
      }
    >
      <Icon name={icon} className="w-[17px] h-[17px] flex-shrink-0" color={primary ? '#000' : '#fff'} />
      {label}
    </button>
  );
}

// Big whole-dollar figure with muted cents, the way trading apps present balances.
function BigAmount({ amount }) {
  const n = Number(amount) || 0;
  const [whole, cents] = Math.abs(n)
    .toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    .split('.');
  return (
    <>
      {n < 0 ? '−' : ''}${whole}
      <span className="text-white/45">.{cents}</span>
    </>
  );
}

export default function Wallet() {
  const navigate = useNavigate();
  const { user, syncVerified } = useAuth();
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
      syncVerified(response.data.data?.is_verified);
    } catch (error) {
      console.error('Failed to fetch wallet:', error);
    } finally {
      setLoading(false);
    }
  };

  const wallet = profile?.wallet;
  const membership = profile?.membership;

  // The page shell renders immediately; only data-driven values wait. After a
  // failed load they show a dash rather than a misleading $0.00.
  const money = (amount, skeletonClass) => {
    if (loading) return <Skeleton dark className={skeletonClass} />;
    if (!profile) return '-';
    if (hideBalance) return '****';
    return <CurrencyDisplay amount={amount || 0} />;
  };

  const assets = [
    { key: 'balance', label: 'Available Balance', sub: 'Ready to trade or withdraw', icon: 'wallet', value: wallet?.balance },
    { key: 'total_earned', label: 'Total Earned', sub: 'Commission from completed lots', icon: 'trend', value: wallet?.total_earned },
    { key: 'total_recharged', label: 'Total Deposited', sub: 'All approved deposits', icon: 'down', value: wallet?.total_recharged },
    { key: 'total_withdrawn', label: 'Total Withdrawn', sub: 'All paid out withdrawals', icon: 'up', value: wallet?.total_withdrawn },
  ];

  return (
    <div style={{ background: '#000' }} className="min-h-full text-white">
      <div className="wrap py-8 md:py-12 max-w-[880px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-[22px] md:text-[26px] font-semibold leading-tight">Wallet</h1>
            <div className="text-[13px] mt-1" style={{ color: MUTED }}>
              {loading ? (
                <Skeleton dark className="inline-block align-middle h-3.5 w-20" />
              ) : membership?.name ? (
                `${membership.name} Member`
              ) : (
                'Member'
              )}{' '}
              &middot; {user?.username}
              {user?.is_verified && <VerifiedBadge light size={14} className="ml-1.5 -mt-0.5" />}
            </div>
          </div>
          <Link
            to="/redemption-history"
            className="flex items-center gap-1.5 text-[13px] hover:text-white transition-colors"
            style={{ color: MUTED }}
          >
            <Icon name="clock" className="w-4 h-4" color="currentColor" />
            History
          </Link>
        </div>

        {/* Balance card */}
        <section
          className="relative overflow-hidden rounded-[24px] mb-8"
          style={{
            background: 'linear-gradient(155deg, #1c1c1c 0%, #0e0e0e 45%, #050505 100%)',
            border: '1px solid rgba(255,255,255,0.10)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 30px 60px -30px rgba(0,0,0,0.9)',
          }}
        >
          {/* Metallic top edge and soft light, all monochrome */}
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-px"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.45), transparent)' }}
          />
          <div
            className="pointer-events-none absolute -top-32 -right-24 w-80 h-80 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.10) 0%, transparent 65%)' }}
          />

          <div className="relative px-5 pt-5 pb-5 sm:px-8 sm:pt-7 sm:pb-7">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[12px] uppercase tracking-[0.18em] text-white/55">Total assets</span>
              <button
                onClick={() => setHideBalance((h) => !h)}
                aria-label={hideBalance ? 'Show balance' : 'Hide balance'}
                className="w-10 h-10 rounded-full flex items-center justify-center transition-colors hover:bg-white/[0.14] active:scale-95"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
              >
                <Icon name={hideBalance ? 'eyeOff' : 'eye'} className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-baseline gap-2.5 mb-6">
              <span className="font-bold text-[42px] sm:text-[56px] leading-none tnum tracking-tight">
                {loading ? (
                  <Skeleton dark className="h-[42px] sm:h-[56px] w-52 sm:w-72" />
                ) : !profile ? (
                  '-'
                ) : hideBalance ? (
                  '****'
                ) : (
                  <BigAmount amount={wallet?.balance} />
                )}
              </span>
              <span
                className="text-[11px] font-semibold tracking-wider px-2 py-0.5 rounded-md text-white/70"
                style={{ background: 'rgba(255,255,255,0.08)' }}
              >
                USD
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2.5 sm:flex sm:gap-3">
              <PillButton primary icon="plus" label="Deposit" onClick={() => navigate('/recharge')} />
              <PillButton icon="arrowUp" label="Withdraw" onClick={() => navigate('/redemption')} />
              <PillButton icon="list" label="Deposits" onClick={() => navigate('/recharge-history')} />
            </div>
          </div>

          {/* Stats strip */}
          <div className="relative grid grid-cols-2" style={{ borderTop: `1px solid ${HAIRLINE}`, background: 'rgba(255,255,255,0.02)' }}>
            <div className="px-5 py-4 sm:px-8">
              <div className="text-[10px] sm:text-[11px] uppercase tracking-[0.1em] sm:tracking-[0.14em] text-white/45 mb-1.5 whitespace-nowrap">Today's earnings</div>
              <div className="flex items-center gap-1.5 text-[15px] sm:text-[17px] font-semibold tnum whitespace-nowrap">
                {loading ? (
                  <Skeleton dark className="h-5 w-20" />
                ) : !profile ? (
                  '-'
                ) : hideBalance ? (
                  '****'
                ) : (
                  <>
                    <Icon name="trendBold" className="w-4 h-4 flex-shrink-0" />
                    <span>+<CurrencyDisplay amount={profile?.today_earnings || 0} /></span>
                  </>
                )}
              </div>
            </div>
            <div className="px-5 py-4 sm:px-8" style={{ borderLeft: `1px solid ${HAIRLINE}` }}>
              <div className="text-[10px] sm:text-[11px] uppercase tracking-[0.1em] sm:tracking-[0.14em] text-white/45 mb-1.5">Membership</div>
              <div className="text-[15px] sm:text-[17px] font-semibold whitespace-nowrap">
                {loading ? (
                  <Skeleton dark className="h-5 w-24" />
                ) : membership ? (
                  <>
                    {membership.name}
                    <span className="text-white/45 font-medium text-[12px] sm:text-[14px]"> &middot; {Number(membership.commission_rate)}%</span>
                  </>
                ) : (
                  '-'
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Assets */}
        <section className="mb-8">
          <div className="flex items-end justify-between mb-3 px-1">
            <h2 className="text-[15px] font-semibold">Assets</h2>
            <div className="text-[12px]" style={{ color: MUTED }}>Value (USD)</div>
          </div>

          <div className="rounded-[20px] overflow-hidden" style={CARD}>
            {assets.map((a, i) => (
              <div
                key={a.key}
                className="flex items-center justify-between gap-4 px-4 sm:px-6 py-4"
                style={i > 0 ? { borderTop: `1px solid ${HAIRLINE}` } : undefined}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <span
                    className="w-10 h-10 rounded-[12px] flex items-center justify-center flex-shrink-0"
                    style={{ background: 'linear-gradient(180deg, #232323, #161616)', border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    <Icon name={a.icon} className="w-[18px] h-[18px]" />
                  </span>
                  <div className="min-w-0">
                    <div className="text-[15px] font-medium">{a.label}</div>
                    <div className="text-[12px] truncate" style={{ color: MUTED }}>{a.sub}</div>
                  </div>
                </div>
                <div className="text-[15px] sm:text-[16px] font-semibold tnum text-right flex-shrink-0">
                  {money(a.value, 'h-5 w-20 ml-auto')}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Withdraw to */}
        <section>
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-[15px] font-semibold">Withdraw to</h2>
            <Link
              to="/redemption"
              className="flex items-center gap-0.5 text-[13px] hover:text-white transition-colors"
              style={{ color: MUTED }}
            >
              Withdraw
              <Icon name="chevron" className="w-4 h-4" color="currentColor" />
            </Link>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {PAYOUT_METHODS.map((m) => (
              <Link
                key={m.id}
                to="/redemption"
                className="flex flex-col items-center justify-center text-center gap-2.5 py-4 px-2 rounded-[16px] transition-colors hover:brightness-125"
                style={CARD}
              >
                <PayoutMethodIcon icon={m.id} size={38} />
                <span className="text-[11px] leading-snug whitespace-nowrap" style={{ color: MUTED }}>{m.label}</span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
