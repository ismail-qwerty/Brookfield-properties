import { useState, useEffect } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { BrandLogo } from '../components/ui';

const NAV = [
  { path: '/administration', label: 'Users', end: true },
  { path: '/administration/properties', label: 'Properties' },
  { path: '/administration/memberships', label: 'Memberships' },
  { path: '/administration/recharges', label: 'Recharges' },
  { path: '/administration/redemptions', label: 'Redemptions' },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  // Below md the sidebar is a drawer; above it, it's always on screen.
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  return (
    <div className="min-h-screen bg-white">
      {/* Mobile top bar */}
      <header className="md:hidden sticky top-0 z-30 flex items-center gap-3 h-16 px-4 bg-black text-white">
        <button
          onClick={() => setMenuOpen(true)}
          aria-label="Open menu"
          aria-expanded={menuOpen}
          className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
        >
          <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
          </svg>
        </button>
        <BrandLogo textClassName="text-[14px]" />
        <span className="eyebrow-light ml-auto truncate max-w-[40%]">{user?.username}</span>
      </header>

      {menuOpen && (
        <button
          aria-label="Close menu"
          onClick={() => setMenuOpen(false)}
          className="md:hidden fixed inset-0 z-40 bg-black/50"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[260px] max-w-[82vw] bg-black text-white overflow-y-auto flex flex-col transition-transform duration-200 md:translate-x-0 ${
          menuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="px-8 py-9 flex items-start justify-between gap-3">
          <div>
            <BrandLogo textClassName="text-[15px]" />
            <div className="eyebrow-light mt-4">Administration</div>
          </div>
          <button
            onClick={() => setMenuOpen(false)}
            aria-label="Close menu"
            className="md:hidden -mr-2 -mt-1 w-9 h-9 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 px-4">
          {NAV.map((link) => (
            <NavLink
              key={link.path}
              to={link.path}
              end={link.end}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                `block px-4 py-3 text-[14px] tracking-wide transition-colors ${
                  isActive ? 'bg-white text-black' : 'text-white/50 hover:text-white'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="px-8 py-8 border-t border-white/15">
          <div className="text-[13px] text-white mb-1">{user?.username}</div>
          <div className="text-[11px] text-white/40 mb-5">Administrator</div>
          <button
            onClick={logout}
            className="text-[13px] text-white/50 hover:text-white transition-colors"
          >
            Log out
          </button>
        </div>
      </aside>

      <main className="md:ml-[260px] px-4 py-6 md:px-10 md:py-12 min-w-0">
        <Outlet />
      </main>
    </div>
  );
}
