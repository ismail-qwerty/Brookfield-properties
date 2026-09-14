export default function BrandLogo({ className = '', textClassName = 'text-[15px]', dark = false }) {
  const borderColor = dark ? 'border-black' : 'border-white';
  const textColor = dark ? 'text-black' : 'text-white';

  return (
    <span className={`inline-flex items-center justify-center border ${borderColor} px-4 py-2 ${className}`}>
      <span className={`font-serif font-bold ${textColor} leading-none tracking-tight ${textClassName}`}>
        Blackstone
      </span>
    </span>
  );
}
