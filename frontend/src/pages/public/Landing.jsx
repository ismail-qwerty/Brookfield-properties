import { Link } from 'react-router-dom';
import { BrandLogo } from '../../components/ui';

const PILLARS = [
  { title: 'Residential', text: 'Apartments, condominiums and family homes in established neighbourhoods.' },
  { title: 'Commercial', text: 'Office towers and retail space leased to long term tenants.' },
  { title: 'Portfolio Management', text: 'Research led analysis that keeps every holding performing.' },
];

export default function Landing() {
  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-black text-white flex flex-col">
      <video
        className="absolute inset-0 w-full h-full object-cover"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
      >
        <source src="/bg.mp4" type="video/mp4" />
      </video>

      {/* Darker on the left so the copy reads cleanly, lighter on the right to let the city show */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/70 to-black/30" />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-black/60" />

      {/* Top bar */}
      <header className="relative z-10">
        <div className="wrap flex items-center justify-between h-20 md:h-24">
          <Link to="/" aria-label="Blackstone home">
            <BrandLogo textClassName="text-[18px] md:text-[22px]" />
          </Link>
          <nav className="flex items-center gap-6 md:gap-8">
            <Link to="/terms" className="hidden sm:inline text-[13px] tracking-wide text-white/60 hover:text-white transition-colors">
              Terms
            </Link>
            <Link to="/user-register" className="hidden sm:inline text-[13px] tracking-wide text-white/60 hover:text-white transition-colors">
              Create Account
            </Link>
            <Link to="/user-login" className="btn-on-dark !px-5 !py-[11px] text-[13px]">
              Sign In
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <main className="relative z-10 flex-1 flex items-center">
        <div className="wrap w-full py-10 md:py-0">
          <div className="max-w-[680px]">
            <div className="flex items-center gap-4 mb-6 md:mb-8">
              <span className="hidden sm:block h-px w-10 bg-white/60" />
              <span className="eyebrow-light !text-[10px] sm:!text-[11px]">Real Estate Investment &amp; Management</span>
            </div>

            <h1
              className="font-serif font-light text-white mb-6 md:mb-8"
              style={{ fontSize: 'clamp(2.1rem, 6.4vw, 5.25rem)', lineHeight: 1.04, letterSpacing: '-0.01em' }}
            >
              Building your future
              <br />
              <span className="text-white/55">on solid ground.</span>
            </h1>

            <p className="text-white/70 text-[15px] md:text-[18px] font-light leading-relaxed max-w-[520px] mb-9 md:mb-11">
              Delivering considered real estate solutions, from residential communities to commercial developments,
              with a commitment to quality and integrity.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <Link to="/user-login" className="btn bg-white text-black hover:bg-white/85 !px-9">
                Sign In to Account
              </Link>
              <Link to="/user-register" className="btn-on-dark !px-9">
                Create Account
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Pillars and footer */}
      <footer className="relative z-10">
        <div className="wrap">
          <div className="grid grid-cols-3 border-t border-white/15">
            {PILLARS.map((p, i) => (
              <div
                key={p.title}
                className={`py-5 md:py-7 pr-3 md:pr-8 ${i > 0 ? 'pl-3 md:pl-8 border-l border-white/15' : ''}`}
              >
                <div className="flex items-center gap-2 mb-0 md:mb-2">
                  <span className="text-[11px] tnum text-white/35">0{i + 1}</span>
                  <span className="text-[12px] md:text-[15px] text-white leading-tight">{p.title}</span>
                </div>
                <p className="hidden md:block text-[13px] leading-relaxed text-white/50 max-w-[300px]">{p.text}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-white/10 py-4 text-[11px] md:text-[12px] text-white/40">
            <span>&copy; {new Date().getFullYear()} Blackstone &middot; Kings Mountain, NC</span>
            <Link to="/terms" className="hover:text-white transition-colors">
              Terms &amp; Conditions
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
