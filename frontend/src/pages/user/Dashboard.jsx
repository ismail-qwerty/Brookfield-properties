import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();

  const quickAccessMenu = [
    { label: 'Profile', path: '/profile', icon: '1.webp' },
    { label: 'Analyst Reviews', path: '/data-optimization', icon: '2.webp' },
    { label: 'History', path: '/history', icon: '3.webp' },
    { label: 'Bind Wallet', path: '/bind-wallet', icon: '4.webp' },
    { label: 'Recharge History', path: '/recharge-history', icon: '5.webp' },
    { label: 'Redemption', path: '/redemption', icon: '6.webp' },
    { label: 'Redemption History', path: '/redemption-history', icon: '7.webp' },
    { label: 'Support', path: '/support', icon: '8.webp' },
  ];

  const services = [
    {
      title: 'Property Sales & Leasing',
      desc: 'Buy, sell, or lease residential and commercial properties with expert negotiation and guidance.',
    },
    {
      title: 'Property Management',
      desc: 'End-to-end management to protect your investment and maximise returns.',
    },
    {
      title: 'Investment Advisory',
      desc: 'Market research and advisory for investors seeking long-term value.',
    },
    {
      title: 'Tenant Representation',
      desc: 'Find the right space and secure favourable terms for your business.',
    },
  ];

  const features = [
    {
      title: 'Local market expertise nationwide',
      desc: 'From neighbourhood trends to national outlooks, our advisors help you make confident decisions.',
    },
    {
      title: 'Diverse portfolio',
      desc: 'Access residential, retail, office, and mixed-use opportunities across major U.S. markets.',
    },
    {
      title: 'Transparent process',
      desc: 'Clear communication, streamlined steps, and support from first viewing to closing.',
    },
    {
      title: 'Client-first approach',
      desc: 'We align every recommendation with your goals, timeline, and budget.',
    },
  ];

  return (
    <div className="bg-white">
      {/* Hero */}
      <section
        className="relative min-h-[560px] flex items-center"
        style={{
          backgroundImage: 'url(/hero-skyline.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Heavier on the left so the headline keeps contrast over the skyline */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/40"></div>
        <div className="wrap relative z-10 py-24">
          <div className="max-w-2xl">
            <div className="eyebrow-light mb-6">Your Account</div>
            <h1 className="display text-white mb-6">Welcome, {user?.username}</h1>
            <p className="lede-light mb-10 max-w-xl">
              Manage your portfolio, review activity, and generate new analyst
              reviews — all from a single place.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to="/data-optimization" className="btn-on-dark">
                Generate Analyst Reviews
              </Link>
              <Link to="/wallet" className="btn-on-dark">
                View Wallet
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Quick access */}
      <section className="section-tight">
        <div className="wrap">
          <div className="eyebrow mb-8">Quick Access</div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 border-t border-l" style={{ borderColor: 'var(--rule)' }}>
            {quickAccessMenu.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className="group flex flex-col items-center justify-center text-center gap-3 p-6 border-r border-b transition-colors hover:bg-[var(--paper-alt)]"
                style={{ borderColor: 'var(--rule)' }}
              >
                <img
                  src={`/${item.icon}`}
                  alt=""
                  aria-hidden="true"
                  className="w-10 h-10 object-contain opacity-80 transition-opacity group-hover:opacity-100"
                />
                <span className="text-[12px] leading-snug" style={{ color: 'var(--ink-70)' }}>
                  {item.label}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="section">
        <div className="wrap">
          <div className="grid lg:grid-cols-12 gap-14 lg:gap-20">
            <div className="lg:col-span-5">
              <div className="eyebrow mb-6">What We Do</div>
              <h2 className="title mb-7">Full-service real estate agency</h2>
              <p className="lede mb-5">
                We specialise in residential and commercial properties across the
                U.S., offering expert guidance from discovery to closing.
              </p>
              <p className="text-[15px] leading-relaxed" style={{ color: 'var(--ink-45)' }}>
                Whether you&apos;re investing, relocating, or expanding your
                portfolio, our team provides market insights, transparent
                processes, and dedicated support.
              </p>
            </div>

            <div className="lg:col-span-7">
              <div className="grid sm:grid-cols-2 gap-x-12 gap-y-10">
                {services.map((s, i) => (
                  <div key={s.title}>
                    <div
                      className="text-[12px] tnum mb-4 pb-4 border-b"
                      style={{ color: 'var(--ink-25)', borderColor: 'var(--rule)' }}
                    >
                      {String(i + 1).padStart(2, '0')}
                    </div>
                    <h3 className="text-[19px] mb-3">{s.title}</h3>
                    <p className="text-[14px] leading-relaxed" style={{ color: 'var(--ink-45)' }}>
                      {s.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why us */}
      <section className="section bg-black text-white">
        <div className="wrap">
          <div className="grid lg:grid-cols-12 gap-14 lg:gap-20 items-start">
            <div className="lg:col-span-4">
              <div className="eyebrow-light mb-6">Why Blackstone</div>
              <h2 className="title text-white">
                A steady hand on every transaction.
              </h2>
            </div>

            <div className="lg:col-span-8">
              <ul>
                {features.map((f) => (
                  <li
                    key={f.title}
                    className="grid sm:grid-cols-12 gap-4 sm:gap-8 py-8 border-t border-white/15 first:border-t-0 first:pt-0"
                  >
                    <h3 className="sm:col-span-5 text-[19px] text-white">{f.title}</h3>
                    <p className="sm:col-span-7 text-[15px] leading-relaxed text-white/60">
                      {f.desc}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Closing prompt */}
      <section className="section">
        <div className="wrap">
          <div className="border p-10 md:p-16 text-center" style={{ borderColor: 'var(--rule)' }}>
            <h2 className="title mb-5">Ready for your next analyst review?</h2>
            <p className="lede mb-9 max-w-lg mx-auto">
              Review your balance and submit a new optimisation run in a few steps.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link to="/data-optimization" className="btn-solid">
                Generate Analyst Reviews
              </Link>
              <Link to="/support" className="btn-outline">
                Contact Support
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
