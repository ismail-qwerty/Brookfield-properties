import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/api';
import { CurrencyDisplay, PayoutMethodIcon, Skeleton, VerifiedBadge } from '../../components/ui';

const SURFACE = '#121212';
const LINE = '#1f1f1f';
const MUTED = '#8a8a8a';

const PAYOUT_METHODS = [
  { id: 'paypal', label: 'PayPal' },
  { id: 'card', label: 'Credit / Debit' },
  { id: 'ach', label: 'ACH Bank' },
  { id: 'crypto', label: 'Crypto' },
  { id: 'chime', label: 'Chime' },
  { id: 'zelle', label: 'Zelle' },
];

const ICONS = {
  plus: <path d="M12 5v14M5 12h14" strokeWidth="2" strokeLinecap="round" />,
  arrowUp: <path d="M12 19V5M6 11l6-6 6 6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" strokeWidth="1.8" />
      <path d="M12 7.5V12l3 2" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  list: <path d="M6 7h12M6 12h12M6 17h8" strokeWidth="2" strokeLinecap="round" />,
  eye: (
    <>
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="3" strokeWidth="1.8" />
    </>
  ),
  eyeOff: (
    <>
      <path d="M3 3l18 18" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M10.6 5.2A10.7 10.7 0 0112 5c6.4 0 10 7 10 7a15.6 15.6 0 01-3.2 4.1M6.6 6.6C4 8.3 2 12 2 12s3.6 7 10 7c1.3 0 2.5-.2 3.6-.6" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M9.9 9.9a3 3 0 004.2 4.2" strokeWidth="1.8" />
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
      className={`flex items-center justify-center gap-1.5 sm:gap-2 h-11 px-2 sm:px-5 rounded-full text-[13px] sm:text-[14px] font-semibold whitespace-nowrap transition-colors ${
        primary ? 'bg-white text-black hover:bg-white/85' : 'text-white hover:bg-[#262626]'
      }`}
      style={primary ? undefined : { background: '#1c1c1c' }}
    >
      <Icon name={icon} className="w-[18px] h-[18px]" color={primary ? '#000' : '#fff'} />
      {label}
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
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-[22px] md:text-[26px] font-semibold leading-tight">Wallet</h1>
            <div className="text-[13px] mt-1" style={{ color: MUTED }}>
              {loading ? (
                <Skeleton dark className="h-4 w-40 mt-0.5" />
              ) : (
                <>
                  {profile?.membership?.name ? `${profile.membership.name} Member` : 'Member'} &middot; {user?.username}
                  {profile?.is_verified && <VerifiedBadge light size={14} className="ml-1.5 -mt-0.5" />}
                </>
              )}
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

        {/* Overview */}
        <section className="mb-10">
          <button
            onClick={() => setHideBalance((h) => !h)}
            aria-label={hideBalance ? 'Show balance' : 'Hide balance'}
            className="flex items-center gap-2 text-[13px] mb-3 hover:text-white transition-colors"
            style={{ color: MUTED }}
          >
            Total assets
            <Icon name={hideBalance ? 'eyeOff' : 'eye'} className="w-4 h-4" color="currentColor" />
          </button>

          <div className="flex items-baseline gap-2.5 mb-3">
            <span className="font-bold text-[40px] sm:text-[52px] leading-none tnum tracking-tight">
              {money(wallet?.balance, 'h-[40px] sm:h-[52px] w-52 sm:w-72')}
            </span>
            <span className="text-[14px] font-medium" style={{ color: MUTED }}>USD</span>
          </div>

          <div className="flex items-center gap-2 text-[13px] mb-7" style={{ color: MUTED }}>
            <span>Today's earnings</span>
            <span className="text-white tnum font-medium">
              {loading ? (
                <Skeleton dark className="inline-block align-middle h-3.5 w-14" />
              ) : hideBalance ? (
                '****'
              ) : profile ? (
                <>+<CurrencyDisplay amount={profile?.today_earnings || 0} /></>
              ) : (
                '-'
              )}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2.5 sm:flex sm:gap-3">
            <PillButton primary icon="plus" label="Deposit" onClick={() => navigate('/recharge')} />
            <PillButton icon="arrowUp" label="Withdraw" onClick={() => navigate('/redemption')} />
            <PillButton icon="list" label="Deposits" onClick={() => navigate('/recharge-history')} />
          </div>
        </section>

        {/* Assets */}
        <section className="mb-10">
          <div className="flex items-end justify-between border-b mb-1" style={{ borderColor: LINE }}>
            <div className="relative pb-3 text-[15px] font-semibold">
              Assets
              <span className="absolute left-0 right-0 -bottom-px h-[2px] bg-white" />
            </div>
            <div className="pb-3 text-[12px]" style={{ color: MUTED }}>Value (USD)</div>
          </div>

          {assets.map((a, i) => (
            <div
              key={a.key}
              className="flex items-center justify-between gap-4 py-4"
              style={i > 0 ? { borderTop: `1px solid ${LINE}` } : undefined}
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <span
                  className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: '#1c1c1c' }}
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
        </section>

        {/* Withdraw to */}
        <section>
          <div className="flex items-center justify-between mb-4">
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
                className="flex flex-col items-center justify-center text-center gap-2.5 py-4 px-2 rounded-[14px] transition-colors hover:bg-[#1a1a1a]"
                style={{ background: SURFACE }}
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
