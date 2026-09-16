import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/api';
import { QuickAccessIcon, Skeleton, VerifiedBadge, CurrencyDisplay } from '../../components/ui';

// Darker than --rule so card edges and row dividers stay visible on white.
const EDGE = '#c9c9c9';
const DIVIDER = '#dadada';

const CARD = {
  borderColor: EDGE,
  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
};

const QUICK_ACCESS = [
  { label: 'Analyst Reviews', path: '/data-optimization', icon: 'chart' },
  { label: 'History', path: '/history', icon: 'clock' },
  { label: 'Bind Wallet', path: '/bind-wallet', icon: 'user' },
  { label: 'Recharge History', path: '/recharge-history', icon: 'trending' },
  { label: 'Redemption', path: '/redemption', icon: 'exchange' },
  { label: 'Redemption History', path: '/redemption-history', icon: 'document' },
  { label: 'Wallet', path: '/wallet', icon: 'card' },
  { label: 'Support', path: '/support', icon: 'chat' },
];

export default function Profile() {
  const { user, logout, syncVerified } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await api.user.getProfile();
      setProfile(response.data.data);
      syncVerified(response.data.data?.is_verified);
    } catch (err) {
      console.error('Failed to fetch profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/user-login');
  };

  const copyInviteCode = () => {
    const text = profile?.reference_code || '';
    if (!text) return;
    const done = () => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };
    // Clipboard API can reject (permission, insecure context), so always fall
    // back to the legacy path rather than leaving the button unconfirmed.
    const legacy = () => {
      const tempInput = document.createElement('input');
      tempInput.value = text;
      document.body.appendChild(tempInput);
      tempInput.select();
      document.execCommand('copy');
      document.body.removeChild(tempInput);
      done();
    };

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(done).catch(legacy);
    } else {
      legacy();
    }
  };

  const username = profile?.username || user?.username || '';
  const initial = username.charAt(0).toUpperCase() || 'B';
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : '—';
  const credibility = profile?.credibility ?? 100;
  const referralPercent = profile?.referral_bonus_percent ?? 27;
  const tierLimit = profile?.membership?.order_limit || 27;
  const completed = profile?.total_orders || 0;

  // Shell renders immediately; values wait for data, and show a dash (not a
  // fake zero) if the load failed.
  const stat = (node, skeletonClass = 'h-[30px] w-28') =>
    loading ? <Skeleton className={skeletonClass} /> : profile ? node : '—';

  const metrics = [
    { label: 'Account Balance', value: <CurrencyDisplay amount={profile?.wallet?.balance || 0} /> },
    { label: "Today's Earnings", value: <CurrencyDisplay amount={profile?.today_earnings || 0} /> },
    { label: 'Total Earned', value: <CurrencyDisplay amount={profile?.wallet?.total_earned || 0} /> },
    { label: 'Lots Completed', value: `${completed} / ${tierLimit}` },
  ];

  const details = [
    { label: 'Username', value: username },
    { label: 'Phone', value: profile?.phone || '—' },
    { label: 'Email', value: profile?.email || '—' },
    { label: 'Membership', value: profile?.membership?.name || 'Silver' },
    { label: 'Commission per lot', value: `${Number(profile?.membership?.commission_rate ?? 0)}%` },
    { label: 'Member since', value: memberSince },
  ];

  return (
    <div className="bg-white">
      {/* Masthead */}
      <div className="page-head">
        <div className="wrap">
          <div className="eyebrow-light mb-6">Account</div>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div className="flex items-center gap-5">
              <div
                className="w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center flex-shrink-0 font-serif text-[26px] md:text-[32px] text-white"
                style={{ background: 'linear-gradient(160deg, #2a2a2a, #0b0b0b)', border: '1px solid rgba(255,255,255,0.18)' }}
              >
                {initial}
              </div>
              <div className="min-w-0">
                <h1 className="font-serif font-light text-white text-[32px] md:text-[44px] leading-none mb-3 break-words">
                  {username}
                  {user?.is_verified && <VerifiedBadge light size={28} className="ml-2.5 -mt-1" />}
                </h1>
                <div className="flex flex-wrap items-center gap-2.5">
                  {loading ? (
                    <Skeleton dark className="h-[26px] w-24" />
                  ) : (
                    <>
                      <span className="inline-block px-3 py-1 border border-white/50 text-white text-[11px] uppercase tracking-widest">
                        {profile?.membership?.name || 'Silver'}
                      </span>
                      <span className="text-[13px] text-white/50">Member since {memberSince}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button onClick={() => setShowModal(true)} className="btn-on-dark">
                Invitation Code
              </button>
              <button onClick={handleLogout} className="btn-on-dark">
                Log out
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="wrap section-tight">
        {/* Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          {metrics.map((m) => (
            <div key={m.label} className="rounded-[16px] border p-5 md:p-6" style={CARD}>
              <div className="text-[10px] uppercase tracking-[0.16em] mb-3" style={{ color: 'var(--ink-45)' }}>
                {m.label}
              </div>
              <div className="font-serif text-[24px] md:text-[30px] leading-none tnum">
                {stat(m.value, 'h-[26px] md:h-[30px] w-24')}
              </div>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-12 gap-4 mb-12">
          {/* Account details */}
          <div className="lg:col-span-7 rounded-[16px] border p-6 md:p-8" style={CARD}>
            <div className="eyebrow mb-6">Account Details</div>
            <dl>
              {details.map((d, i) => (
                <div
                  key={d.label}
                  className="flex items-baseline justify-between gap-6 py-3.5"
                  style={i > 0 ? { borderTop: `1px solid ${DIVIDER}` } : undefined}
                >
                  <dt className="text-[13px] flex-shrink-0" style={{ color: 'var(--ink-45)' }}>{d.label}</dt>
                  <dd className="text-[14px] md:text-[15px] text-right break-words min-w-0">
                    {stat(d.value, 'h-4 w-28 ml-auto')}
                  </dd>
                </div>
              ))}
            </dl>

            {/* Credibility */}
            <div className="mt-8 pt-6" style={{ borderTop: `1px solid ${DIVIDER}` }}>
              <div className="flex justify-between items-baseline mb-3">
                <span className="text-[13px]" style={{ color: 'var(--ink-45)' }}>Credibility</span>
                <span className="text-[15px] tnum font-medium">
                  {loading ? <Skeleton className="inline-block h-4 w-10" /> : profile ? `${credibility}%` : '—'}
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--paper-alt)' }}>
                <div
                  className="h-full bg-black rounded-full transition-[width] duration-700"
                  style={{ width: `${profile ? credibility : 0}%` }}
                />
              </div>
            </div>
          </div>

          {/* Referral */}
          <div className="lg:col-span-5 rounded-[16px] border p-6 md:p-8 flex flex-col" style={{ ...CARD, background: 'var(--paper-alt)' }}>
            <div className="eyebrow mb-6">Referral Program</div>

            <div className="mb-6">
              <div className="text-[11px] uppercase tracking-[0.16em] mb-2" style={{ color: 'var(--ink-45)' }}>
                Your invitation code
              </div>
              <div className="flex items-center gap-3">
                <span className="font-serif text-[26px] md:text-[30px] tracking-wide tnum break-all">
                  {loading ? <Skeleton className="h-[30px] w-36" /> : profile?.reference_code || '—'}
                </span>
                <button
                  onClick={copyInviteCode}
                  disabled={!profile?.reference_code}
                  className="text-[12px] underline underline-offset-4 disabled:opacity-40 flex-shrink-0"
                  style={{ color: 'var(--ink-45)' }}
                >
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 py-5" style={{ borderTop: `1px solid ${DIVIDER}`, borderBottom: `1px solid ${DIVIDER}` }}>
              <div>
                <div className="text-[10px] uppercase tracking-[0.14em] mb-1.5" style={{ color: 'var(--ink-45)' }}>Bonus</div>
                <div className="text-[18px] tnum">{referralPercent}%</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.14em] mb-1.5" style={{ color: 'var(--ink-45)' }}>Referred</div>
                <div className="text-[18px] tnum">{stat(profile?.referral_count || 0, 'h-5 w-8')}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.14em] mb-1.5" style={{ color: 'var(--ink-45)' }}>Earned</div>
                <div className="text-[18px] tnum">
                  {stat(<CurrencyDisplay amount={profile?.referral_earnings || 0} />, 'h-5 w-16')}
                </div>
              </div>
            </div>

            <p className="text-[12px] leading-relaxed mt-5 mb-6" style={{ color: 'var(--ink-45)' }}>
              Earn {referralPercent}% of the commission your invitees make on every completed analyst review, credited directly to
              your balance.
            </p>

            <button onClick={() => setShowModal(true)} className="btn-solid w-full mt-auto">
              Share Your Code
            </button>
          </div>
        </div>

        {/* Quick access */}
        <div>
          <div className="eyebrow mb-6">Quick Access</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {QUICK_ACCESS.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className="group flex flex-col items-center justify-center text-center gap-4 p-6 rounded-[16px] bg-white border transition-all duration-200 hover:-translate-y-1"
                style={CARD}
                onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 20px 40px -12px rgba(0,0,0,0.18)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.boxShadow = CARD.boxShadow; }}
              >
                <div className="transition-transform group-hover:scale-105">
                  <QuickAccessIcon icon={item.icon} size={56} />
                </div>
                <span className="text-[12px]" style={{ color: 'var(--ink-70)' }}>
                  {item.label}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-6"
          onClick={() => setShowModal(false)}
        >
          <div className="bg-white max-w-md w-full rounded-[16px] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center px-8 py-5 border-b" style={{ borderColor: DIVIDER }}>
              <span className="eyebrow">Invitation Code</span>
              <button
                onClick={() => setShowModal(false)}
                aria-label="Close"
                className="text-[var(--ink-45)] hover:text-black transition-colors text-[20px] leading-none"
              >
                &times;
              </button>
            </div>
            <div className="px-8 py-10 text-center">
              <p className="text-[13px] mb-6" style={{ color: 'var(--ink-45)' }}>
                Share this code to invite others to the platform.
              </p>
              <p className="font-serif text-[32px] tracking-wide mb-8 tnum break-all">
                {loading ? <Skeleton className="h-[38px] w-44 mx-auto" /> : profile?.reference_code || '—'}
              </p>
              <button
                onClick={copyInviteCode}
                disabled={!profile?.reference_code}
                className="btn-solid w-full disabled:opacity-50"
              >
                {copied ? 'Copied' : 'Copy Code'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
