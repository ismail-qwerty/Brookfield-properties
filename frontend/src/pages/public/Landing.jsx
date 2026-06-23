export default function Landing() {
  const STATIC_URL = import.meta.env.VITE_STATIC_URL || '/static';
  
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background Video */}
      <video 
        className="absolute inset-0 w-full h-full object-cover"
        autoPlay 
        muted 
        loop 
        playsInline
        preload="auto"
      >
        <source src={`${STATIC_URL}/bg.mp4`} type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-black/50"></div>

      {/* Content */}
      <main className="relative z-10 min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-4xl mx-auto">
          {/* Glassmorphism Welcome Box - Reduced width and text sizes */}
          <div className="backdrop-blur-sm bg-white/10 border border-white/20 rounded-3xl px-12 py-10 shadow-2xl">
            <div className="text-center">
              {/* Logo */}
              <div className="mb-4 flex justify-center">
                <img src={`${STATIC_URL}/BR logo.webp`} alt="Brookfield Properties" className="h-14 md:h-16" />
              </div>

              {/* Heading */}
              <h3 className="text-2xl md:text-3xl font-bold text-white mb-3" style={{letterSpacing: '0.03em'}}>
                Building Your Future
              </h3>

              {/* Description */}
              <p className="text-sm md:text-base text-white/90 mb-5 leading-relaxed max-w-2xl mx-auto">
                Brookfield Properties is dedicated to delivering innovative real estate solutions, from residential communities to commercial developments. We are committed to quality, integrity, and customer satisfaction.
              </p>

              {/* CTA Button */}
              <a
                href="/user-login"
                className="inline-block bg-[#5DBDAE] hover:bg-[#4da89a] text-white font-semibold text-base px-10 py-2.5 rounded-full transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                Sign In to Account
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
