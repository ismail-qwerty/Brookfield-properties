import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { LoadingSpinner, StatusBadge, TierBadge, CurrencyDisplay } from '../../components/ui';
import api from '../../utils/api';

export default function UpdateUser() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [memberships, setMemberships] = useState([]);
  
  const [formData, setFormData] = useState({
    username: '',
    full_name: '',
    email: '',
    phone: '',
    referrer_id: '',
    tier_id: '',
    credibility: 100,
    min_withdrawal: 50.00,
    max_withdrawal: 500.00,
    user_status: 'Active',
    wallet_status: 'Active',
  });

  useEffect(() => {
    fetchUserData();
    fetchMemberships();
  }, [id]);

  const fetchUserData = async () => {
    try {
      const response = await api.admin.getUserById(id);
      const userData = response.data.data;
      setFormData({
        username: userData.username || '',
        full_name: userData.full_name || '',
        email: userData.email || '',
        phone: userData.phone || '',
        referrer_id: userData.referrer_id || '',
        tier_id: userData.tier_id || '',
        credibility: userData.credibility || 100,
        min_withdrawal: userData.min_withdrawal || 50.00,
        max_withdrawal: userData.max_withdrawal || 500.00,
        user_status: userData.user_status || 'Active',
        wallet_status: userData.wallet_status || 'Active',
      });
    } catch (err) {
      setError('Failed to load user data');
    } finally {
      setLoading(false);
    }
  };

  const fetchMemberships = async () => {
    try {
      const response = await api.admin.getMemberships();
      setMemberships(response.data.data.memberships || []);
    } catch (err) {
      console.error('Failed to fetch memberships:', err);
    }
  };

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value,
    }));
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      await api.admin.updateUser(id, formData);
      setSuccess('User updated successfully');
      setTimeout(() => navigate('/administration'), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center space-x-3 mb-2">
          <Link
            to="/administration"
            className="text-gray-600 hover:text-gray-900 transition-colors"
          >
            ← Back to Users
          </Link>
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Update User Profile</h1>
        <p className="text-gray-600 mt-1">Modify user attributes and account settings</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Username
              </label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                disabled
              />
              <p className="text-xs text-gray-500 mt-1">Username cannot be changed</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name
              </label>
              <input
                type="text"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              />
            </div>
          </div>
        </div>

        {/* Membership & Referral */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Membership & Referral</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Membership Tier
              </label>
              <select
                name="tier_id"
                value={formData.tier_id}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              >
                <option value="">Select Tier</option>
                {memberships.map((tier) => (
                  <option key={tier.id} value={tier.id}>
                    {tier.name} - {tier.order_limit} orders/day - {tier.commission_rate}%
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Parent Referrer ID
              </label>
              <input
                type="number"
                name="referrer_id"
                value={formData.referrer_id}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Leave empty if no referrer"
              />
              <p className="text-xs text-gray-500 mt-1">User ID of the parent referrer</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Credibility Score (0-100)
              </label>
              <input
                type="number"
                name="credibility"
                value={formData.credibility}
                onChange={handleChange}
                min="0"
                max="100"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              />
            </div>
          </div>
        </div>

        {/* Withdrawal Limits */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Withdrawal Limitations</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Minimum Withdrawal (VIEWS)
              </label>
              <input
                type="number"
                name="min_withdrawal"
                value={formData.min_withdrawal}
                onChange={handleChange}
                step="0.01"
                min="0"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Minimum amount user can withdraw</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Maximum Withdrawal (VIEWS)
              </label>
              <input
                type="number"
                name="max_withdrawal"
                value={formData.max_withdrawal}
                onChange={handleChange}
                step="0.01"
                min="0"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Maximum amount user can withdraw</p>
            </div>
          </div>
        </div>

        {/* Account Status Controls */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Account Status Controls</h2>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-800">
              <strong>Important:</strong> User Status and Wallet Status are independent. 
              You can deactivate wallet access while keeping the account active for task generation.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                User Status (Login Access)
              </label>
              <select
                name="user_status"
                value={formData.user_status}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              >
                <option value="Active">Active</option>
                <option value="Deactivate">Deactivate</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Controls global login permission
              </p>
              <div className="mt-2">
                <StatusBadge status={formData.user_status} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Wallet Status (Withdrawal Access)
              </label>
              <select
                name="wallet_status"
                value={formData.wallet_status}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              >
                <option value="Active">Active</option>
                <option value="Deactivate">Deactivate</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Controls withdrawal permission only
              </p>
              <div className="mt-2">
                <StatusBadge status={formData.wallet_status} />
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-4">
          <button
            type="button"
            onClick={() => navigate('/administration')}
            className="flex-1 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {saving ? (
              <>
                <LoadingSpinner size="sm" color="white" />
                <span>Saving...</span>
              </>
            ) : (
              <span>Update User</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
