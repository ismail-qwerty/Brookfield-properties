// Monochrome-on-dark glyphs for withdrawal payout methods. Icons are pure
// white strokes/fills (no background-matched cutouts) so the tile behind
// them can switch between a neutral glass surface and the accent gradient
// (selected state) without redrawing the glyph.

const GLYPHS = {
  paypal: (
    <text x="20" y="27" textAnchor="middle" fontFamily="Georgia, 'Times New Roman', serif" fontSize="20" fontWeight="700" fill="#fff">
      P
    </text>
  ),
  card: (
    <>
      <rect x="6" y="11" width="28" height="19" rx="3.5" fill="none" stroke="#fff" strokeWidth="2.2" />
      <rect x="6" y="16" width="28" height="4.5" fill="#fff" />
      <rect x="10.5" y="24" width="8" height="2.6" rx="1.3" fill="#fff" />
    </>
  ),
  ach: (
    <>
      <path d="M20 6l15 9H5l15-9z" fill="#fff" />
      <rect x="8" y="17" width="3.4" height="11" fill="#fff" />
      <rect x="18.3" y="17" width="3.4" height="11" fill="#fff" />
      <rect x="28.6" y="17" width="3.4" height="11" fill="#fff" />
      <rect x="5" y="30" width="30" height="3.4" rx="1" fill="#fff" />
    </>
  ),
  crypto: (
    <path
      d="M20 5l13 7.5v15L20 35 7 27.5v-15L20 5zM20 5v30M7 12.5l13 7.5 13-7.5M7 27.5l13-7.5 13 7.5"
      fill="none"
      stroke="#fff"
      strokeWidth="2"
      strokeLinejoin="round"
      strokeLinecap="round"
    />
  ),
  chime: (
    <>
      <path
        d="M20 6a2 2 0 012 2v1.3c4.8 1.1 8 5.4 8 10.4v5.8l2.6 3.5H7.4L10 25.5v-5.8c0-5 3.2-9.3 8-10.4V8a2 2 0 012-2z"
        fill="#fff"
      />
      <circle cx="20" cy="31" r="2" fill="#fff" />
    </>
  ),
  zelle: (
    <>
      <path d="M8 16c0-4.5 4-8 9-8h6" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" />
      <path d="M19 4l4 4-4 4" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M32 24c0 4.5-4 8-9 8h-6" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" />
      <path d="M21 36l-4-4 4-4" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
};

export default function PayoutMethodIcon({ icon, size = 40, active = false }) {
  return (
    <div
      className="flex items-center justify-center rounded-[14px] flex-shrink-0 transition-all duration-200"
      style={{
        width: size,
        height: size,
        background: active ? 'linear-gradient(135deg, #6C5CE7 0%, #00C2FF 100%)' : '#1a1a1a',
        boxShadow: active ? '0 8px 22px -8px rgba(108,92,231,0.65)' : 'none',
      }}
    >
      <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 40 40" aria-hidden="true">
        {GLYPHS[icon]}
      </svg>
    </div>
  );
}
