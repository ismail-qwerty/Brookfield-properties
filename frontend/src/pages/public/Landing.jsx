import { Link } from 'react-router-dom';
import { BrandLogo } from '../../components/ui';

export default function Landing() {
  return (
    // Pinned to one viewport; spacing is clamped against vh so the panel
    // compresses on short screens instead of scrolling.
    <div className="relative h-[100dvh] overflow-hidden bg-black text-white">
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

      <div className="absolute inset-0 bg-black/65" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.55)_100%)]" />

      <main className="relative z-10 h-full flex flex-col items-center justify-center px-5">
        <div
          className="w-full max-w-[560px] text-center border border-white/15 bg-black/35 backdrop-blur-[6px]"
          style={{
            paddingBlock: 'clamp(2.25rem, 7vh, 4.5rem)',
            paddingInline: 'clamp(1.5rem, 6vw, 4rem)',
          }}
        >
          <BrandLogo textClassName="text-[20px] md:text-[24px]" />

          <div className="mx-auto h-px w-10 bg-white/30" style={{ marginBlock: 'clamp(1.5rem, 4.5vh, 2.5rem)' }} />

          <h1
            className="font-serif font-light text-white"
            style={{
              fontSize: 'clamp(1.75rem, 4.6vh, 2.75rem)',
              lineHeight: 1.1,
              marginBottom: 'clamp(0.9rem, 2.4vh, 1.4rem)',
            }}
          >
            Building your future
            <br />
            on solid ground.
          </h1>

          <p
            className="text-white/60 mx-auto max-w-[380px] font-light"
            style={{
              fontSize: 'clamp(0.85rem, 1.8vh, 0.975rem)',
              lineHeight: 1.65,
              marginBottom: 'clamp(1.75rem, 4.5vh, 2.75rem)',
            }}
          >
            Considered real estate investment, from residential communities to commercial developments.
          </p>

          <Link to="/user-login" className="btn bg-white text-black hover:bg-white/85 w-full sm:w-[240px]">
            Sign In
          </Link>

          <p className="text-[13px] text-white/45" style={{ marginTop: 'clamp(1rem, 2.6vh, 1.5rem)' }}>
            New here?{' '}
            <Link to="/user-register" className="text-white/80 hover:text-white underline underline-offset-4 decoration-white/30">
              Create an account
            </Link>
          </p>
        </div>

        <footer className="absolute bottom-5 left-0 right-0 text-center text-[11px] tracking-wide text-white/35">
          &copy; {new Date().getFullYear()} Blackstone &middot; Kings Mountain, NC &middot;{' '}
          <Link to="/terms" className="hover:text-white transition-colors">
            Terms
          </Link>
        </footer>
      </main>
    </div>
  );
}
