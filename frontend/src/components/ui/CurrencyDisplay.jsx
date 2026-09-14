export default function CurrencyDisplay({ amount, className = '', showCurrency = true }) {
  const numericAmount = typeof amount === 'number' ? amount : parseFloat(amount || 0);
  const formattedAmount = Math.abs(numericAmount).toFixed(2);

  return (
    <span className={`font-semibold whitespace-nowrap ${className}`}>
      {numericAmount < 0 ? '-' : ''}
      {showCurrency && '$'}
      {formattedAmount}
    </span>
  );
}
