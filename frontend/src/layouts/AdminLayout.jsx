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

  return (
    <div className="flex min-h-screen bg-white">
      <aside className="w-[260px] bg-black text-white fixed h-full overflow-y-auto flex flex-col">
        <div className="px-8 py-9">
          <BrandLogo textClassName="text-[15px]" />
          <div className="eyebrow-light mt-4">Administration</div>
        </div>

        <nav className="flex-1 px-4">
          {NAV.map((link) => (
            <NavLink
              key={link.path}
              to={link.path}
              end={link.end}
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

      <main className="ml-[260px] flex-1 px-10 py-12 min-w-0">
        <Outlet />
      </main>
    </div>
  );
}
