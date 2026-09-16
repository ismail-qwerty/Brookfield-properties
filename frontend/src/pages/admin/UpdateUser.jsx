import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { LoadingSpinner, Skeleton, SkeletonRegion, VerifiedBadge } from '../../components/ui';
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
    parent_id: '',
    phone: '',
    credibility: 100,
    password: '',
    wallet_password: '',
    min_withdrawal: 50.00,
    max_withdrawal: 500.00,
    user_status: 'Active',
    wallet_status: 'Deactivate',
    user_type: 'User',
    reference_code: '',
    tier_id: '',
    balance_adjustment: '',
    current_balance: 0,
    is_verified: false,
  });

  useEffect(() => {
    fetchUserData();
    fetchMemberships();
  }, [id]);

  const fetchUserData = async () => {
    try {
      console.log('Fetching user data for ID:', id);
      const response = await api.admin.getUserById(id);
      console.log('User data response:', response.data);
      const userData = response.data.data;
      setFormData({
        username: userData.username || '',
        full_name: userData.full_name || '',
        parent_id: userData.referrer_id || '',
        phone: userData.phone || '',
        credibility: userData.credibility || 100,
        password: '',
        wallet_password: '',
        min_withdrawal: userData.min_withdrawal || 50.00,
        max_withdrawal: userData.max_withdrawal || 500.00,
        user_status: userData.user_status || 'Active',
        wallet_status: userData.wallet_status || 'Deactivate',
        user_type: userData.user_type || 'User',
        reference_code: userData.reference_code || '',
        tier_id: userData.tier_id || '',
        balance_adjustment: '',
        current_balance: userData.wallet?.balance || 0,
        is_verified: !!userData.is_verified,
      });
    } catch (err) {
      console.error('Error fetching user data:', err);
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
    console.log('Field changed:', name, 'Value:', value, 'Type:', type);
    
    let newValue = value;
    if (type === 'number') {
      // Don't convert empty string to 0 for balance_adjustment
      if (name === 'balance_adjustment' && value === '') {
        newValue = '';
      } else {
        newValue = parseFloat(value) || 0;
      }
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: newValue,
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
      // Prepare data with proper type conversions
      const updateData = {
        full_name: formData.full_name,
        phone: formData.phone,
        user_type: formData.user_type,
        user_status: formData.user_status,
        wallet_status: formData.wallet_status,
        tier_id: formData.tier_id ? parseInt(formData.tier_id) : undefined,
        credibility: parseInt(formData.credibility),
        min_withdrawal: parseFloat(formData.min_withdrawal),
        max_withdrawal: parseFloat(formData.max_withdrawal),
        balance_adjustment: formData.balance_adjustment !== '' ? parseFloat(formData.balance_adjustment) : undefined,
        referrer_id: formData.parent_id ? parseInt(formData.parent_id) : null,
        is_verified: formData.is_verified,
      };

      // Remove undefined values
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined || updateData[key] === '') {
          delete updateData[key];
        }
      });

      console.log('Submitting form data:', updateData);
      console.log('Balance adjustment:', updateData.balance_adjustment);
      const response = await api.admin.updateUser(id, updateData);
      console.log('Update response:', response.data);
      const resolvedCount = response.data?.data?.resolved_order_ids?.length || 0;
      setSuccess(
        resolvedCount > 0
          ? `User updated successfully. ${resolvedCount} pending order(s) were completed now that the balance is no longer negative.`
          : 'User updated successfully'
      );
      // Refresh user data to show new balance
      await fetchUserData();
      // Clear balance adjustment field
      setFormData(prev => ({ ...prev, balance_adjustment: '' }));
    } catch (err) {
      console.error('Update error:', err);
      console.error('Error response:', err.response?.data);
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  // Unlike read-only pages, this form can't render early with blank values —
  // an admin could edit or submit it before the member's data arrives.
  if (loading) {
    const field = (i) => (
      <div key={i}>
        <Skeleton className="h-4 w-32 mb-2" />
        <Skeleton className="h-12 w-full rounded-lg" />
      </div>
    );

    return (
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Update Member</h1>
          <p className="text-sm text-gray-600 mt-1">
            <Link to="/administration" className="link-quiet">Home</Link>
            <span className="mx-2">/</span>
            <span>Update Member</span>
          </p>
        </div>

        <SkeletonRegion label="Loading member" className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-black px-8 py-6">
            <h2 className="text-xl font-bold text-white">Member Data</h2>
          </div>
          <div className="p-6 space-y-4">
            {[0, 1, 2, 3].map(field)}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-300">
              <Skeleton className="h-4 w-44 mb-4" />
              <Skeleton className="h-4 w-36 mb-2" />
              <Skeleton className="h-12 w-full rounded-lg" />
            </div>
            {[4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14].map(field)}
            <div className="flex space-x-4 pt-4">
              <Skeleton className="h-12 w-48 rounded-lg" />
              <Skeleton className="h-12 w-24 rounded-lg" />
            </div>
          </div>
        </SkeletonRegion>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Update Member</h1>
        <p className="text-sm text-gray-600 mt-1">
          <Link to="/administration" className="link-quiet">Home</Link>
          <span className="mx-2">/</span>
          <span>Update Member</span>
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-gray-100 border border-black text-black">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-black px-8 py-6">
            <h2 className="text-xl font-bold text-white">Member Data</h2>
          </div>

          <div className="p-6 space-y-4">
            <div>
              <label className="label">Username</label>
              <input
                type="text"
                name="username"
                value={formData.username}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50"
                disabled
              />
            </div>

            <div className="flex items-center justify-between gap-4 p-4 rounded-lg border border-gray-300 bg-gray-50">
              <div className="flex items-center gap-3">
                <VerifiedBadge size={28} />
                <div>
                  <div className="font-semibold text-gray-900">Verified Badge</div>
                  <div className="text-sm text-gray-600">Shows a verified tick next to this member's name</div>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={formData.is_verified}
                onClick={() => {
                  setFormData((prev) => ({ ...prev, is_verified: !prev.is_verified }));
                  setSuccess('');
                }}
                className={`relative w-12 h-7 rounded-full transition-colors flex-shrink-0 ${formData.is_verified ? 'bg-black' : 'bg-gray-300'}`}
              >
                <span
                  className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${formData.is_verified ? 'translate-x-5' : ''}`}
                />
              </button>
            </div>

            <div>
              <label className="label">Complete Name</label>
              <input
                type="text"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                className="input-field"
                required
              />
            </div>

            <div>
              <label className="label">Parent ID</label>
              <input
                type="text"
                name="parent_id"
                value={formData.parent_id}
                onChange={handleChange}
                className="input-field"
              />
            </div>

            <div>
              <label className="label">Phone Number</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="input-field"
                required
              />
            </div>

            <div className="bg-gray-50 p-4 rounded-lg border border-gray-300">
              <label className="label">
                Current Balance: <span className="text-primary-600 font-bold">${formData.current_balance.toFixed(2)}</span>
              </label>
              <label className="block text-sm font-medium text-gray-700 mb-2 mt-3">Add/Subtract Balance</label>
              <input
                type="number"
                name="balance_adjustment"
                value={formData.balance_adjustment}
                onChange={handleChange}
                step="0.01"
                placeholder="Enter positive to add, negative to subtract (e.g., 100 or -50)"
                className="input-field"
              />
              {formData.balance_adjustment && (
                <p className="text-sm mt-2">
                  New Balance: <span className="font-bold text-black">
                    ${(parseFloat(formData.current_balance) + parseFloat(formData.balance_adjustment || 0)).toFixed(2)}
                  </span>
                </p>
              )}
            </div>

            <div>
              <label className="label">Credibility</label>
              <input
                type="number"
                name="credibility"
                value={formData.credibility}
                onChange={handleChange}
                min="0"
                max="100"
                className="input-field"
                required
              />
            </div>

            <div>
              <label className="label">Password</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Leave blank to keep current password"
                className="input-field"
              />
            </div>

            <div>
              <label className="label">Withdrawal Password</label>
              <input
                type="password"
                name="wallet_password"
                value={formData.wallet_password}
                onChange={handleChange}
                placeholder="Leave blank to keep current withdrawal password"
                className="input-field"
              />
            </div>

            <div>
              <label className="label">Minimum Withdrawal</label>
              <input
                type="number"
                name="min_withdrawal"
                value={formData.min_withdrawal}
                onChange={handleChange}
                step="0.01"
                min="0"
                className="input-field"
                required
              />
            </div>

            <div>
              <label className="label">Maximum Withdrawal</label>
              <input
                type="number"
                name="max_withdrawal"
                value={formData.max_withdrawal}
                onChange={handleChange}
                step="0.01"
                min="0"
                className="input-field"
                required
              />
            </div>

            <div>
              <label className="label">User Status</label>
              <select
                name="user_status"
                value={formData.user_status}
                onChange={handleChange}
                className="input-field"
                required
              >
                <option value="Active">Active</option>
                <option value="Deactivate">Deactivate</option>
              </select>
            </div>

            <div>
              <label className="label">Wallet Status</label>
              <select
                name="wallet_status"
                value={formData.wallet_status}
                onChange={handleChange}
                className="input-field"
                required
              >
                <option value="Active">Active</option>
                <option value="Deactivate">Deactivate</option>
              </select>
            </div>

            <div>
              <label className="label">User Type</label>
              <select
                name="user_type"
                value={formData.user_type}
                onChange={handleChange}
                className="input-field"
                required
              >
                <option value="User">User</option>
                <option value="Admin">Admin</option>
                <option value="ChatSupport">ChatSupport</option>
              </select>
            </div>

            <div>
              <label className="label">Reference Code</label>
              <input
                type="text"
                name="reference_code"
                value={formData.reference_code}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50"
                disabled
              />
            </div>

            <div>
              <label className="label">Membership Level</label>
              <select
                name="tier_id"
                value={formData.tier_id}
                onChange={handleChange}
                className="input-field"
                required
              >
                <option value="">Select Tier</option>
                {memberships.map((tier) => (
                  <option key={tier.id} value={tier.id}>
                    {tier.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex space-x-4 pt-4">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {saving ? (
                  <>
                    <LoadingSpinner size="sm" color="white" />
                    <span>Updating...</span>
                  </>
                ) : (
                  <span>Update Member Data</span>
                )}
              </button>
              <button
                type="button"
                onClick={() => navigate('/administration')}
                className="px-6 py-3 bg-gray-400 hover:bg-gray-500 text-white font-semibold rounded-lg transition-colors"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
