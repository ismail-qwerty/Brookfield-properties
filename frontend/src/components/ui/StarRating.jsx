import { useState } from 'react';

const sizeClasses = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-xl',
  large: 'text-3xl',
};

// Read-only by default; pass onChange to make the stars selectable.
export default function StarRating({ rating = 5, maxStars = 5, size = 'md', onChange, label = 'Rating' }) {
  const [hovered, setHovered] = useState(null);
  const stars = [...Array(maxStars)].map((_, i) => i + 1);

  if (!onChange) {
    return (
      <div className={`flex items-center space-x-1 ${sizeClasses[size]}`}>
        {stars.map((value) => (
          <span key={value} className={value <= rating ? 'text-black' : 'text-gray-300'}>
            ★
          </span>
        ))}
      </div>
    );
  }

  const shown = hovered ?? rating;

  // Arrow keys move the selection, like a native radio group.
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      onChange(Math.min(maxStars, rating + 1));
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      onChange(Math.max(1, rating - 1));
    }
  };

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={`flex items-center ${sizeClasses[size]}`}
      onMouseLeave={() => setHovered(null)}
      onKeyDown={handleKeyDown}
    >
      {stars.map((value) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={value === rating}
          aria-label={`${value} star${value > 1 ? 's' : ''}`}
          tabIndex={value === rating ? 0 : -1}
          onClick={() => onChange(value)}
          onMouseEnter={() => setHovered(value)}
          className={`px-0.5 leading-none transition duration-150 hover:scale-110 ${
            value <= shown ? 'text-black' : 'text-gray-300'
          }`}
        >
          ★
        </button>
      ))}
    </div>
  );
}
