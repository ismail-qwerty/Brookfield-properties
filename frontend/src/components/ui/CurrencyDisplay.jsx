export default function CurrencyDisplay({ amount, className = '', showCurrency = true }) {
  const numericAmount = typeof amount === 'number' ? amount : parseFloat(amount || 0);
  const formattedAmount = Math.abs(numericAmount || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <span className={`font-semibold whitespace-nowrap ${className}`}>
      {numericAmount < 0 ? '-' : ''}
      {showCurrency && '$'}
      {formattedAmount}
    </span>
  );
}
