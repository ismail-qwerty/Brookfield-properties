export default function StatusBadge({ status }) {
  // Monochrome palette: states are distinguished by fill weight rather than
  // hue — solid for positive, outlined for pending, muted for negative.
  const getStatusStyles = () => {
    switch (status) {
      case 'Completed':
      case 'Active':
      case 'Approved':
        return 'bg-black text-white border-black';
      case 'Pending':
        return 'bg-white text-black border-black';
      case 'Undone':
      case 'Deactivate':
      case 'Inactive':
      case 'Rejected':
        return 'bg-gray-100 text-gray-500 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <span
      className={`inline-flex items-center px-3 py-1 text-xs font-medium border tracking-wide ${getStatusStyles()}`}
    >
      {status}
    </span>
  );
}
