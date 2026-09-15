export default function TierBadge({ tier, size = 'md' }) {
  // Monochrome tiers: higher tiers read darker.
  const getTierStyles = () => {
    const tierName = tier?.toLowerCase() || '';

    if (tierName.includes('silver')) {
      return 'bg-white text-black border border-gray-400';
    }
    if (tierName.includes('gold')) {
      return 'bg-gray-500 text-white';
    }
    if (tierName.includes('platinum')) {
      return 'bg-black text-white';
    }
    if (tierName.includes('diamond')) {
      return 'bg-black text-white ring-2 ring-offset-1 ring-black';
    }
    return 'bg-gray-200 text-black';
  };

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base',
  };

  return (
    <span
      className={`inline-flex items-center font-medium tracking-wide ${getTierStyles()} ${sizeClasses[size]}`}
    >
      {tier}
    </span>
  );
}
