// Shared surface values for the dark money pages (Wallet, Add Funds,
// Withdraw and the two histories) so they stay visually identical.
export const MUTED = '#8a8a8a';
export const HAIRLINE = 'rgba(255,255,255,0.08)';

export const CARD = {
  background: 'linear-gradient(180deg, #111111 0%, #0a0a0a 100%)',
  border: `1px solid ${HAIRLINE}`,
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
};

export const HERO_CARD = {
  background: 'linear-gradient(155deg, #1c1c1c 0%, #0e0e0e 45%, #050505 100%)',
  border: '1px solid rgba(255,255,255,0.10)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 30px 60px -30px rgba(0,0,0,0.9)',
};

export const FIELD =
  'w-full bg-white/[0.05] border border-white/10 rounded-xl px-4 py-3.5 text-[15px] text-white placeholder-white/25 focus:outline-none focus:border-white/30 transition-colors';

export const LABEL = 'block text-[11px] uppercase tracking-[0.16em] text-white/45 mb-2';

export const statusStyle = (status) => {
  if (status === 'Approved' || status === 'Completed') return 'bg-white text-black';
  if (status === 'Pending') return 'text-white border border-white/35';
  return 'text-white/60 border border-white/15';
};
