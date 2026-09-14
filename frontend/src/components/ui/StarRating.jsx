export default function StarRating({ rating = 5, maxStars = 5, size = 'md' }) {
  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-xl',
    large: 'text-3xl',
  };

  return (
    <div className={`flex items-center space-x-1 ${sizeClasses[size]}`}>
      {[...Array(maxStars)].map((_, index) => (
        <span key={index} className={index < rating ? 'text-black' : 'text-gray-300'}>
          ★
        </span>
      ))}
    </div>
  );
}
