import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/api';
import { QuickAccessIcon, Skeleton, VerifiedBadge } from '../../components/ui';

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await api.user.getProfile();
      setProfile(response.data.data);
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
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(() => {
        alert('Invitation code copied to clipboard!');
      });
    } else {
      const tempInput = document.createElement('input');
      tempInput.value = text;
      document.body.appendChild(tempInput);
      tempInput.select();
      document.execCommand('copy');
      document.body.removeChild(tempInput);
      alert('Invitation code copied to clipboard!');
    }
  };

  const quickAccessMenu = [
    { label: 'Profile', path: '/profile', icon: 'user' },
    { label: 'Analyst Reviews', path: '/data-optimization', icon: 'chart' },
    { label: 'History', path: '/history', icon: 'clock' },
    { label: 'Bind Wallet', path: '/bind-wallet', icon: 'card' },
    { label: 'Recharge History', path: '/recharge-history', icon: 'trending' },
    { label: 'Redemption', path: '/redemption', icon: 'exchange' },
    { label: 'Redemption History', path: '/redemption-history', icon: 'document' },
    { label: 'Support', path: '/support', icon: 'chat' },
  ];


  // Shell renders immediately; values wait for data, and show a dash (not a
  // fake zero) if the load failed.
  const stat = (node) =>
    loading ? <Skeleton className="h-[32px] md:h-[38px] w-32" /> : profile ? node : '—';

  return (
    <div className="bg-white">
      <div className="page-head">
        <div className="wrap">
          <div className="eyebrow-light mb-5">Account</div>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div>
              <h1 className="display text-white mb-4">
                {profile?.username || user?.username}
                {profile?.is_verified && <VerifiedBadge light size={34} className="ml-3 -mt-1" />}
              </h1>
              {loading ? (
                <Skeleton dark className="h-[26px] w-20" />
              ) : (
                <span className="inline-block px-3 py-1 border border-white/50 text-white text-[11px] uppercase tracking-widest">
                  {profile?.membership?.name || 'Silver'}
                </span>
              )}
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
        <div className="grid sm:grid-cols-2 gap-10 pb-12 mb-12 border-b" style={{ borderColor: 'var(--rule)' }}>
          <div>
            <div className="stat-label">Account Balance</div>
            <div className="stat-value">{stat(`$${Number(profile?.wallet?.balance || 0).toFixed(2)}`)}</div>
          </div>
          <div>
            <div className="stat-label">Today&apos;s Earnings</div>
            <div className="stat-value">{stat(`$${Number(profile?.today_earnings || 0).toFixed(2)}`)}</div>
          </div>
        </div>

        {/* Referrals */}
        <div className="mb-16 pb-12 border-b" style={{ borderColor: 'var(--rule)' }}>
          <div className="flex justify-between items-baseline mb-6">
            <span className="eyebrow">Referral Program</span>
            <button onClick={() => setShowModal(true)} className="text-[12px] underline" style={{ color: 'var(--ink-45)' }}>
              Share your code
            </button>
          </div>
          <div className="grid sm:grid-cols-3 gap-10">
            <div>
              <div className="stat-label">Referral Bonus</div>
              <div className="stat-value">15%</div>
            </div>
            <div>
              <div className="stat-label">Members Referred</div>
              <div className="stat-value">{stat(profile?.referral_count || 0)}</div>
            </div>
            <div>
              <div className="stat-label">Referral Earnings</div>
              <div className="stat-value">{stat(`$${Number(profile?.referral_earnings || 0).toFixed(2)}`)}</div>
            </div>
          </div>
          <p className="text-[12px] mt-6" style={{ color: 'var(--ink-45)' }}>
            Earn 15% of the commission your invitees make on every completed analyst review, credited directly to your balance.
          </p>
        </div>

        {/* Credibility */}
        <div className="mb-16">
          <div className="flex justify-between items-baseline mb-3">
            <span className="eyebrow">Credibility</span>
            {loading ? (
              <Skeleton className="h-[18px] w-12" />
            ) : (
              <span className="text-[15px] tnum">{profile ? `${profile.credibility || 100}%` : '—'}</span>
            )}
          </div>
          <div className="w-full h-px" style={{ background: 'var(--rule)' }}>
            {profile && (
              <div
                className="h-px bg-black"
                style={{ width: `${profile.credibility || 100}%` }}
              ></div>
            )}
          </div>
        </div>

        {/* Quick access */}
        <div>
          <div className="eyebrow mb-6">Quick Access</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {quickAccessMenu.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className="group flex flex-col items-center justify-center text-center gap-4 p-6 rounded-[16px] bg-white border transition-all duration-200 hover:-translate-y-1"
                style={{
                  borderColor: 'var(--rule)',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 20px 40px -12px rgba(0,0,0,0.18)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'; }}
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
          <div className="bg-white max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center px-8 py-5 border-b" style={{ borderColor: 'var(--rule)' }}>
              <span className="eyebrow">Invitation Code</span>
              <button
                onClick={() => setShowModal(false)}
                aria-label="Close"
                className="text-[var(--ink-45)] hover:text-black transition-colors"
              >
                <i className="fa fa-times"></i>
              </button>
            </div>
            <div className="px-8 py-10 text-center">
              <p className="text-[13px] mb-6" style={{ color: 'var(--ink-45)' }}>
                Share this code to invite others to the platform.
              </p>
              <p className="font-serif text-[32px] tracking-wide mb-8 tnum">
                {loading ? <Skeleton className="h-[38px] w-44 mx-auto" /> : profile?.reference_code || '—'}
              </p>
              <button
                onClick={copyInviteCode}
                disabled={!profile?.reference_code}
                className="btn-solid w-full disabled:opacity-50"
              >
                Copy Code
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
