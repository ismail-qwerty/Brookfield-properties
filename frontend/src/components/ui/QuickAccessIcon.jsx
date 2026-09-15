// Bold filled glyphs on a grey tile — the "flat icon" look, hand-built (not
// pulled from a third-party icon library) so there's no licensing question.
// Shared between Dashboard and Profile so the Quick Access grid stays visually
// identical in both places.

// Glyph cut-outs (card stripe, document lines, chat dots) are painted in this
// same color so they read as holes through the white shape.
const TILE_COLOR = '#4a4a4a';

const GLYPHS = {
  user: (
    <>
      <circle cx="20" cy="15" r="6.5" fill="#fff" />
      <path d="M6 33c0-8 6.5-13 14-13s14 5 14 13a1.5 1.5 0 01-1.5 1.5h-25A1.5 1.5 0 016 33z" fill="#fff" />
    </>
  ),
  chart: (
    <>
      <rect x="7" y="22" width="6.5" height="12" rx="1.5" fill="#fff" />
      <rect x="16.75" y="14" width="6.5" height="20" rx="1.5" fill="#fff" />
      <rect x="26.5" y="8" width="6.5" height="26" rx="1.5" fill="#fff" />
    </>
  ),
  clock: (
    <>
      <circle cx="20" cy="20" r="13" fill="none" stroke="#fff" strokeWidth="3" />
      <path d="M20 12v9l6 4" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  card: (
    <>
      <rect x="6" y="11" width="28" height="19" rx="3.5" fill="#fff" />
      <rect x="6" y="16" width="28" height="4.5" fill={TILE_COLOR} />
      <rect x="10.5" y="24" width="8" height="2.6" rx="1.3" fill={TILE_COLOR} />
    </>
  ),
  trending: (
    <>
      <path d="M7 27l8.5-9 5.5 5 9.5-11" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M23.5 10h7v7" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  exchange: (
    <>
      <path d="M8 16c0-4.5 4-8 9-8h6" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" />
      <path d="M19 4l4 4-4 4" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M32 24c0 4.5-4 8-9 8h-6" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" />
      <path d="M21 36l-4-4 4-4" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  document: (
    <>
      <path d="M10 6h13l7 7v21a2 2 0 01-2 2H10a2 2 0 01-2-2V8a2 2 0 012-2z" fill="#fff" />
      <path d="M23 6v7h7" fill={TILE_COLOR} />
      <rect x="12.5" y="20" width="15" height="2.4" rx="1.2" fill={TILE_COLOR} />
      <rect x="12.5" y="25.5" width="15" height="2.4" rx="1.2" fill={TILE_COLOR} />
    </>
  ),
  chat: (
    <>
      <path d="M6 9a3 3 0 013-3h22a3 3 0 013 3v14a3 3 0 01-3 3H15l-7 6v-6a3 3 0 01-3-3z" fill="#fff" />
      <circle cx="14" cy="16" r="2" fill={TILE_COLOR} />
      <circle cx="20" cy="16" r="2" fill={TILE_COLOR} />
      <circle cx="26" cy="16" r="2" fill={TILE_COLOR} />
    </>
  ),
};

export default function QuickAccessIcon({ icon, size = 56 }) {
  return (
    <div
      className="flex items-center justify-center rounded-[18px] flex-shrink-0"
      style={{ width: size, height: size, background: TILE_COLOR }}
    >
      <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 40 40" aria-hidden="true">
        {GLYPHS[icon]}
      </svg>
    </div>
  );
}
