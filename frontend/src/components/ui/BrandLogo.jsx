// Serif wordmark inside a thin frame, matching the supplied Blackstone logo.
// Padding is in em so the frame keeps its proportions at any text size.
export default function BrandLogo({ className = '', textClassName = 'text-[15px]', dark = false }) {
  const color = dark ? 'text-[#1a1a1a] border-[#1a1a1a]' : 'text-white border-white';

  return (
    <span
      className={`inline-flex items-center justify-center border font-normal leading-none tracking-[-0.01em] ${color} ${textClassName} ${className}`}
      style={{ padding: '0.55em 0.9em 0.6em', fontFamily: "'Source Serif 4', Georgia, 'Times New Roman', serif" }}
    >
      Blackstone
    </span>
  );
}
