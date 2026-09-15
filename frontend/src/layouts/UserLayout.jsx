import { Outlet, Link, NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { BrandLogo } from '../components/ui';

const NAV = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/data-optimization', label: 'Analyst Reviews' },
  { to: '/history', label: 'History' },
  { to: '/wallet', label: 'Wallet' },
  { to: '/profile', label: 'Profile' },
];

export default function UserLayout() {
  const { logout } = useAuth();

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="bg-black sticky top-0 z-50">
        <div className="wrap">
          <div className="flex items-center justify-between h-20 gap-8">
            <Link to="/dashboard" className="flex items-center shrink-0">
              <BrandLogo textClassName="text-[16px]" />
            </Link>

            <nav className="hidden lg:flex items-center gap-9">
              {NAV.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `relative text-[14px] tracking-wide transition-colors py-1 ${
                      isActive
                        ? 'text-white after:absolute after:left-0 after:-bottom-0.5 after:h-px after:w-full after:bg-white'
                        : 'text-white/60 hover:text-white'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>

            <div className="flex items-center gap-6 shrink-0">
              <Link to="/support" className="btn-on-dark hidden sm:inline-flex">
                Support
              </Link>
              <button
                onClick={logout}
                className="text-[13px] tracking-wide text-white/60 hover:text-white transition-colors"
              >
                Log out
              </button>
            </div>
          </div>
        </div>

        {/* Condensed nav for narrow screens, since the primary row collapses */}
        <div className="lg:hidden border-t border-white/15">
          <div className="wrap flex items-center gap-6 overflow-x-auto py-3">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `text-[13px] whitespace-nowrap transition-colors ${
                    isActive ? 'text-white' : 'text-white/55 hover:text-white'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="bg-black text-white mt-24">
        <div className="wrap py-16 md:py-20">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-12">
            <div className="md:col-span-5">
              <div className="font-serif text-[26px] leading-tight mb-5">
                Blackstone
              </div>
              <p className="text-white/55 text-[14px] leading-relaxed max-w-xs">
                455 West Orchard Street<br />
                Real estate investment and portfolio management.
              </p>
            </div>

            <div className="md:col-span-3">
              <div className="eyebrow-light mb-5">Navigate</div>
              <ul className="space-y-3 text-[14px]">
                {NAV.map((item) => (
                  <li key={item.to}>
                    <Link to={item.to} className="text-white/60 hover:text-white transition-colors">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="md:col-span-4">
              <div className="eyebrow-light mb-5">Account</div>
              <ul className="space-y-3 text-[14px]">
                <li>
                  <Link to="/recharge" className="text-white/60 hover:text-white transition-colors">
                    Add Funds
                  </Link>
                </li>
                <li>
                  <Link to="/redemption" className="text-white/60 hover:text-white transition-colors">
                    Withdraw
                  </Link>
                </li>
                <li>
                  <Link to="/support" className="text-white/60 hover:text-white transition-colors">
                    Support
                  </Link>
                </li>
                <li>
                  <Link to="/terms" className="text-white/60 hover:text-white transition-colors">
                    Terms &amp; Conditions
                  </Link>
                </li>
                <li>
                  <button
                    onClick={logout}
                    className="text-white/60 hover:text-white transition-colors"
                  >
                    Log out
                  </button>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/15 mt-14 pt-8 flex flex-col sm:flex-row justify-between gap-4">
            <p className="text-white/40 text-[12px]">
              &copy; {new Date().getFullYear()} Blackstone. All rights reserved.
            </p>
            <p className="text-white/40 text-[12px]">
              Investments carry risk. Past performance is not indicative of future results.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
