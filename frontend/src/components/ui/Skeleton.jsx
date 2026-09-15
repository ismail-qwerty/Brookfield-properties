// Placeholder block shaped like the content it stands in for. Size it with
// className (e.g. "h-6 w-24") so the real content lands without layout shift.
export default function Skeleton({ className = '', dark = false }) {
  return (
    <span
      aria-hidden="true"
      className={`skeleton ${dark ? 'skeleton-dark' : ''} block ${className}`}
    />
  );
}

// Varied widths so placeholder columns read like real, uneven data.
const CELL_WIDTHS = ['w-10', 'w-24', 'w-16', 'w-32', 'w-20', 'w-28', 'w-14'];

// Placeholder <tr>s for a table whose real <thead> is already rendered.
export function SkeletonTableRows({ rows = 5, columns, cellClassName = 'px-6 py-4', rowClassName }) {
  return Array.from({ length: rows }).map((_, r) => (
    <tr key={r} aria-hidden="true" className={rowClassName ? rowClassName(r) : undefined}>
      {Array.from({ length: columns }).map((_, c) => (
        <td key={c} className={cellClassName}>
          <Skeleton className={`h-4 ${CELL_WIDTHS[(c + r) % CELL_WIDTHS.length]}`} />
        </td>
      ))}
    </tr>
  ));
}

// Wraps a page's skeleton so assistive tech announces loading once, instead of
// reading out a pile of empty blocks.
export function SkeletonRegion({ children, className = '', label = 'Loading' }) {
  return (
    <div role="status" aria-busy="true" aria-live="polite" className={className}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}
