// Scalloped rosette outline, built once: 12 bumps around the centre of a 24x24 box.
const ROSETTE = (() => {
  const bumps = 12;
  const inner = 9.3;
  const outer = 12.4;
  const pt = (r, a) => `${(12 + r * Math.cos(a)).toFixed(2)} ${(12 + r * Math.sin(a)).toFixed(2)}`;
  const step = (Math.PI * 2) / bumps;
  let d = `M${pt(inner, -Math.PI / 2)}`;
  for (let i = 0; i < bumps; i++) {
    const a = -Math.PI / 2 + i * step;
    d += ` Q${pt(outer, a + step / 2)} ${pt(inner, a + step)}`;
  }
  return `${d}Z`;
})();

export default function VerifiedBadge({ size = 16, light = false, className = '', title = 'Verified' }) {
  const fill = light ? '#ffffff' : '#000000';
  const tick = light ? '#000000' : '#ffffff';
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      role="img"
      aria-label={title}
      className={`inline-block flex-shrink-0 align-middle ${className}`}
    >
      <title>{title}</title>
      <path d={ROSETTE} fill={fill} />
      <path d="M7.6 12.3l3 3 5.8-6.2" fill="none" stroke={tick} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
