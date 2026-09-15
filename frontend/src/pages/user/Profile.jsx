import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/api';

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

  const iconPaths = {
    user: 'M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z',
    chart: 'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z',
    clock: 'M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z',
    card: 'M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z',
    trending: 'M2.25 18L9 11.25l4.306 4.306a11.95 11.95 0 015.814-5.518l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941',
    exchange: 'M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99',
    document: 'M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z',
    chat: 'M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm3.75 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm3.75 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z',
  };

  if (loading) {
    return <div className="min-h-screen bg-[#f7f9fc] flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>;
  }

  return (
    <div className="bg-white">
      <div className="page-head">
        <div className="wrap">
          <div className="eyebrow-light mb-5">Account</div>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div>
              <h1 className="display text-white mb-4">
                {profile?.username || user?.username}
              </h1>
              <span className="inline-block px-3 py-1 border border-white/50 text-white text-[11px] uppercase tracking-widest">
                {profile?.membership?.name || 'Silver'}
              </span>
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
            <div className="stat-value">${(profile?.wallet?.balance || 0).toFixed(2)}</div>
          </div>
          <div>
            <div className="stat-label">Today&apos;s Earnings</div>
            <div className="stat-value">${(profile?.today_earnings || 0).toFixed(2)}</div>
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
              <div className="stat-value">{profile?.referral_count || 0}</div>
            </div>
            <div>
              <div className="stat-label">Referral Earnings</div>
              <div className="stat-value">${(profile?.referral_earnings || 0).toFixed(2)}</div>
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
            <span className="text-[15px] tnum">{profile?.credibility || 100}%</span>
          </div>
          <div className="w-full h-px" style={{ background: 'var(--rule)' }}>
            <div
              className="h-px bg-black"
              style={{ width: `${profile?.credibility || 100}%` }}
            ></div>
          </div>
        </div>

        {/* Quick access */}
        <div>
          <div className="eyebrow mb-6">Quick Access</div>
          <div className="grid grid-cols-2 md:grid-cols-4 border-t border-l" style={{ borderColor: 'var(--rule)' }}>
            {quickAccessMenu.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className="flex flex-col items-center justify-center text-center gap-3 p-6 border-r border-b transition-colors hover:bg-[var(--paper-alt)]"
                style={{ borderColor: 'var(--rule)' }}
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  style={{ color: 'var(--ink-70)' }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d={iconPaths[item.icon]} />
                </svg>
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
                {profile?.reference_code}
              </p>
              <button onClick={copyInviteCode} className="btn-solid w-full">
                Copy Code
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
