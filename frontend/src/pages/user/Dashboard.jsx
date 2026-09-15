import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/api';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api.user.getProfile()
      .then((res) => {
        if (!cancelled) setStats(res.data.data);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

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

  const heroStats = [
    { label: 'Account Balance', value: stats ? `$${(stats.wallet?.balance || 0).toFixed(2)}` : '—' },
    { label: "Today's Earnings", value: stats ? `$${(stats.today_earnings || 0).toFixed(2)}` : '—' },
    { label: 'Membership Tier', value: stats?.membership?.name || '—' },
    { label: 'Lots Completed', value: stats ? `${stats.total_orders || 0}` : '—' },
  ];

  return (
    <div className="bg-white">
      {/* Hero */}
      <section
        className="relative min-h-[600px] flex items-center overflow-hidden"
        style={{
          backgroundImage: 'url(/hero-skyline.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Heavier on the left so the headline keeps contrast over the skyline */}
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/75 to-black/30"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent"></div>
        <div className="wrap relative z-10 pt-24 pb-32">
          <div className="max-w-2xl">
            <div className="eyebrow-light mb-6">Your Account</div>
            <h1 className="display text-white mb-6">Welcome, {user?.username}</h1>
            <p className="lede-light mb-10 max-w-xl">
              Manage your portfolio, review activity, and generate new analyst
              reviews, all from a single place.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to="/data-optimization" className="btn bg-white text-black hover:bg-white/85 shadow-[0_8px_30px_rgba(0,0,0,0.35)]">
                Generate Analyst Reviews
              </Link>
              <Link to="/wallet" className="btn-on-dark">
                View Wallet
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Floating stats bar, overlapping the hero */}
      <section className="wrap relative z-20 -mt-16 md:-mt-20">
        <div className="grid grid-cols-2 md:grid-cols-4 bg-white rounded-[20px] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.35)] border border-black/5 overflow-hidden">
          {heroStats.map((s, i) => (
            <div
              key={s.label}
              className={`px-6 py-7 md:px-8 md:py-9 ${i % 2 === 0 ? 'border-r' : ''} ${i < 2 ? 'border-b' : ''} md:border-r md:border-b-0 md:last:border-r-0`}
              style={{ borderColor: 'var(--rule)' }}
            >
              <div className="text-[10px] uppercase tracking-[0.16em] mb-2" style={{ color: 'var(--ink-45)' }}>
                {s.label}
              </div>
              <div className="font-serif text-[24px] md:text-[28px] tnum leading-none">
                {s.value}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Quick access */}
      <section className="section-tight pt-20 md:pt-24">
        <div className="wrap">
          <div className="eyebrow mb-8">Quick Access</div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
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
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center transition-colors group-hover:bg-black"
                  style={{ background: 'var(--paper-alt)' }}
                >
                  <svg
                    className="w-5 h-5 transition-colors group-hover:text-white"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    style={{ color: 'var(--ink-70)' }}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d={iconPaths[item.icon]} />
                  </svg>
                </div>
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
              <div className="grid sm:grid-cols-2 gap-6">
                {services.map((s, i) => (
                  <div
                    key={s.title}
                    className="p-8 rounded-[16px] bg-white border transition-shadow duration-200 hover:shadow-[0_20px_40px_-16px_rgba(0,0,0,0.2)]"
                    style={{ borderColor: 'var(--rule)' }}
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center font-serif text-[14px] mb-6"
                      style={{ background: 'var(--paper-alt)', color: 'var(--ink-70)' }}
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
      <section
        className="section text-white relative overflow-hidden"
        style={{ background: 'radial-gradient(120% 140% at 15% 0%, #262626 0%, #0a0a0a 55%, #000000 100%)' }}
      >
        <div className="wrap relative z-10">
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
                    className="grid sm:grid-cols-12 gap-4 sm:gap-8 py-8 border-t border-white/10 first:border-t-0 first:pt-0"
                  >
                    <h3 className="sm:col-span-5 text-[19px] text-white">{f.title}</h3>
                    <p className="sm:col-span-7 text-[15px] leading-relaxed text-white/55">
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
          <div
            className="rounded-[20px] p-10 md:p-16 text-center relative overflow-hidden"
            style={{ background: 'var(--paper-alt)' }}
          >
            <h2 className="title mb-5">Ready for your next analyst review?</h2>
            <p className="lede mb-9 max-w-lg mx-auto">
              Review your balance and submit a new optimisation run in a few steps.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link to="/data-optimization" className="btn-solid shadow-[0_16px_40px_-12px_rgba(0,0,0,0.4)]">
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
