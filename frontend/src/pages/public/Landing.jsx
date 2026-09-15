import { Link } from 'react-router-dom';

export default function Landing() {
  return (
    // 100dvh + overflow-hidden pins the page to exactly one viewport. Every
    // measure below is clamped against vh so the panel compresses on short
    // screens rather than overflowing into a scrollbar.
    <div className="relative h-[100dvh] overflow-hidden bg-black">
      <video
        className="absolute inset-0 w-full h-full object-cover"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
      >
        <source src="/bg.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      <div className="absolute inset-0 bg-black/60"></div>

      <main className="relative z-10 h-full flex items-center justify-center px-5">
        <div
          className="w-full max-w-[660px] border border-white/25 bg-black/40 text-center"
          style={{
            paddingBlock: 'clamp(1.75rem, 5.5vh, 4rem)',
            paddingInline: 'clamp(1.5rem, 5vw, 4rem)',
          }}
        >
          <div
            className="font-serif text-white mx-auto"
            style={{
              fontSize: 'clamp(1.5rem, 4vh, 2.5rem)',
              marginBottom: 'clamp(1.25rem, 3.6vh, 2.5rem)',
            }}
          >
            Blackstone
          </div>

          <div
            className="eyebrow-light"
            style={{ marginBottom: 'clamp(0.75rem, 2.2vh, 1.5rem)' }}
          >
            Real Estate Investment &amp; Management
          </div>

          <h1
            className="font-serif text-white"
            style={{
              fontSize: 'clamp(1.6rem, 4.4vh, 2.875rem)',
              lineHeight: 1.1,
              marginBottom: 'clamp(0.85rem, 2.6vh, 1.75rem)',
            }}
          >
            Building your future
            <br className="hidden md:block" /> on solid ground.
          </h1>

          <p
            className="text-white/70 mx-auto max-w-md"
            style={{
              fontSize: 'clamp(0.8125rem, 1.85vh, 1rem)',
              lineHeight: 1.6,
              marginBottom: 'clamp(1.5rem, 4.2vh, 2.75rem)',
            }}
          >
            Delivering considered real estate solutions, from residential
            communities to commercial developments, with a commitment to
            quality and integrity.
          </p>

          <Link
            to="/user-login"
            className="btn bg-white text-black hover:bg-white/85 w-full sm:w-auto"
          >
            Sign In to Account
          </Link>

          <div
            className="border-t border-white/15"
            style={{
              marginTop: 'clamp(1.5rem, 4vh, 3rem)',
              paddingTop: 'clamp(0.9rem, 2.4vh, 1.5rem)',
            }}
          >
            <p className="text-white/40" style={{ fontSize: 'clamp(0.65rem, 1.4vh, 0.75rem)' }}>
              &copy; {new Date().getFullYear()} Blackstone &middot; Kings
              Mountain, NC
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
