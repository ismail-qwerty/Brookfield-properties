import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/api';
import { Skeleton } from '../../components/ui';

export default function BindWallet() {
  const { user } = useAuth();
  const [walletAddress, setWalletAddress] = useState('');
  const [balance, setBalance] = useState(null);
  const [balanceFailed, setBalanceFailed] = useState(false);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchWallet();
  }, []);

  const fetchWallet = async () => {
    try {
      const response = await api.user.getWallet();
      setBalance(Number(response.data.data?.balance) || 0);
    } catch (error) {
      console.error('Failed to fetch wallet:', error);
      setBalanceFailed(true);
    }
  };

  const handleAmountSelect = (value) => {
    setAmount(value.toString());
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount) {
      setMessage({ type: 'error', text: 'Please select or enter an amount' });
      return;
    }

    // Show contact support message
    setMessage({ 
      type: 'success', 
      text: 'Please contact support to complete your fund addition request.' 
    });
  };

  return (
    <div className="min-h-screen bg-[#f7f9fc]">
      {/* Navbar - Same as Dashboard */}
      {/* Hero Header */}
      <section className="relative py-16 bg-black text-white">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl font-bold mb-2">Add Funds</h1>
          <nav className="flex justify-center items-center gap-2 text-sm">
            <Link to="/dashboard" className="hover:underline">Dashboard</Link>
            <span>/</span>
            <span>Recharge</span>
          </nav>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <div className="bg-white rounded-lg shadow-lg p-8">
              {/* Account Balance */}
              <div className="mb-6">
                <h4 className="text-xl font-bold text-gray-900 mb-2">
                  Account Balance - {user?.username}
                </h4>
                <p className="text-2xl font-bold text-blue-600">
                  {balance !== null
                    ? `$${balance.toFixed(2)}`
                    : balanceFailed
                    ? '—'
                    : <Skeleton className="h-8 w-32" />}
                </p>
              </div>

              {/* Amount Input */}
              <div className="mb-6">
                <h4 className="text-lg font-bold text-gray-900 mb-3">Add Funds Amount</h4>
                <input
                  type="text"
                  value={amount}
                  placeholder="Enter amount"
                  readOnly
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 text-lg font-semibold"
                />
              </div>

              {/* Quick Amount Buttons */}
              <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-6">
                {[50, 100, 200, 1000, 3000, 5000].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => handleAmountSelect(value)}
                    className="px-4 py-3 border-2 border-blue-600 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition font-semibold"
                  >
                    {value}
                  </button>
                ))}
              </div>

              {/* Message */}
              {message.text && (
                <div
                  className={`mb-4 p-4 rounded-lg flex items-start gap-3 ${
                    message.type === 'success'
                      ? 'bg-blue-50 text-blue-800 border border-blue-200'
                      : 'bg-red-50 text-red-800 border border-red-200'
                  }`}
                >
                  {message.type === 'success' && (
                    <i className="fa fa-info-circle text-xl mt-0.5"></i>
                  )}
                  <div>
                    <p className="font-semibold">{message.text}</p>
                    {message.type === 'success' && (
                      <p className="text-sm mt-2">
                        You can reach our support team at{' '}
                        <a href="/support" className="underline font-semibold">Support Page</a>
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <form onSubmit={handleSubmit}>
                <button
                  type="submit"
                  disabled={loading || !amount}
                  className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  Add Funds
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
    </div>
  );
}
