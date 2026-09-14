export default function ProgressBar({ value, max = 100, label, showPercentage = true, color = 'green' }) {
  const percentage = Math.min((value / max) * 100, 100);
  
  // Callers pass semantic names; the monochrome theme renders them all black.
  const colorClasses = {
    green: 'bg-black',
    blue: 'bg-black',
    teal: 'bg-black',
    orange: 'bg-black',
    red: 'bg-black',
  };

  return (
    <div className="w-full">
      {(label || showPercentage) && (
        <div className="flex justify-between items-center mb-2">
          {label && <span className="text-sm font-medium text-gray-700">{label}</span>}
          {showPercentage && <span className="text-sm font-semibold text-gray-900">{value}%</span>}
        </div>
      )}
      <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${colorClasses[color] || colorClasses.green}`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
}
