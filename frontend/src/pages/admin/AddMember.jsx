import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LoadingSpinner, Skeleton } from '../../components/ui';
import api from '../../utils/api';

const EMAIL_DOMAIN = '@gmail.com';

export default function AddMember() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [memberships, setMemberships] = useState([]);
  const [tiersLoading, setTiersLoading] = useState(true);
  const [formData, setFormData] = useState({
    username: '',
    full_name: '',
    parent_id: '',
    phone: '',
    email_local: '',
    password: '',
    wallet_password: '',
    credibility: '100',
    opening_balance: '455',
    min_withdrawal: '50',
    max_withdrawal: '500',
    user_type: 'User',
    tier_id: '1',
  });
  const [usernameStatus, setUsernameStatus] = useState({ checking: false, available: null });
  const usernameCheckTimer = useRef(null);

  const checkUsername = async (username) => {
    setUsernameStatus({ checking: true, available: null });
    try {
      const { data } = await api.auth.checkUsername(username);
      setUsernameStatus({ checking: false, available: data.data.available });
    } catch {
      setUsernameStatus({ checking: false, available: null });
    }
  };

  const fetchMemberships = async () => {
    try {
      const response = await api.admin.getMemberships();
      setMemberships(response.data.data.memberships || []);
    } catch (err) {
      console.error('Failed to fetch memberships:', err);
    } finally {
      setTiersLoading(false);
    }
  };

  useEffect(() => {
    fetchMemberships();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });

    if (name === 'username') {
      setUsernameStatus({ checking: false, available: null });
      clearTimeout(usernameCheckTimer.current);
      const trimmed = value.trim();
      if (trimmed.length >= 3) {
        usernameCheckTimer.current = setTimeout(() => checkUsername(trimmed), 400);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.username || !formData.full_name || !formData.email_local || !formData.phone || !formData.password || !formData.wallet_password) {
      setError('Username, Full Name, Email, Phone, Password, and Withdrawal Password are required');
      return;
    }

    if (usernameStatus.available === false) {
      setError('That username is already taken. Please choose another.');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (!/[A-Za-z]/.test(formData.password)) {
      setError('Password must contain at least one letter');
      return;
    }

    if (!/[0-9]/.test(formData.password)) {
      setError('Password must contain at least one number');
      return;
    }

    if (!/[0-9]/.test(formData.wallet_password)) {
      setError('Withdrawal password must contain at least one number');
      return;
    }

    if (parseInt(formData.credibility) < 0 || parseInt(formData.credibility) > 100) {
      setError('Credibility must be between 0 and 100');
      return;
    }

    setLoading(true);

    try {
      // Registration and the follow-up profile update are two separate
      // requests, not one transaction — validate everything we can up front
      // (including that a given Parent ID actually exists) so a bad field
      // can't leave an orphaned, half-configured account behind after
      // registration succeeds but the update fails.
      if (formData.parent_id) {
        try {
          await api.admin.getUserById(formData.parent_id);
        } catch {
          setError(`Parent ID ${formData.parent_id} does not exist`);
          setLoading(false);
          return;
        }
      }

      const payload = {
        username: formData.username,
        full_name: formData.full_name,
        email: `${formData.email_local.trim().replace(/@.*$/, '')}${EMAIL_DOMAIN}`,
        phone: formData.phone,
        password: formData.password,
        confirm_password: formData.password,
        wallet_password: formData.wallet_password,
      };

      const registerResponse = await api.auth.register(payload);
      const newUserId = registerResponse.data.data.user.id;

      const updatePayload = {
        tier_id: parseInt(formData.tier_id),
        credibility: parseInt(formData.credibility),
        min_withdrawal: parseFloat(formData.min_withdrawal),
        max_withdrawal: parseFloat(formData.max_withdrawal),
        user_type: formData.user_type,
      };

      if (formData.parent_id) {
        updatePayload.referrer_id = parseInt(formData.parent_id);
      }

      if (formData.opening_balance && parseFloat(formData.opening_balance) !== 0) {
        updatePayload.balance_adjustment = parseFloat(formData.opening_balance);
      }

      try {
        await api.admin.updateUser(newUserId, updatePayload);
      } catch (updateErr) {
        // The account exists but couldn't be fully configured. Say so
        // explicitly rather than showing a generic error that looks like
        // nothing happened — the admin needs to find and fix this account
        // (e.g. via "Edit User"), not just retry with the same username.
        setError(
          `Account "${formData.username}" was created, but couldn't be fully configured: ` +
          `${updateErr.response?.data?.error || 'unknown error'}. Find it in the user list and finish setting it up there.`
        );
        setLoading(false);
        return;
      }

      alert('Member registered successfully!');
      navigate('/administration');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to register member');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Add Member</h1>
        <p className="text-sm text-gray-600 mt-1">
          <Link to="/administration" className="link-quiet">Home</Link>
          <span className="mx-2">/</span>
          <span>Add Member</span>
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-black px-8 py-6">
          <h2 className="text-xl font-bold text-white">Member Data</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Username
              </label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                className="input-field"
                placeholder="Enter Username"
                required
              />
              {usernameStatus.checking && (
                <p className="text-xs mt-1 text-gray-500">Checking availability…</p>
              )}
              {!usernameStatus.checking && usernameStatus.available === true && (
                <p className="text-xs mt-1 text-green-600">Username is available</p>
              )}
              {!usernameStatus.checking && usernameStatus.available === false && (
                <p className="text-xs mt-1 text-red-600">Username is already taken</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Complete Name
              </label>
              <input
                type="text"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                className="input-field"
                placeholder="Enter Complete Name"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                ParentID
              </label>
              <input
                type="number"
                name="parent_id"
                value={formData.parent_id}
                onChange={handleChange}
                className="input-field"
                placeholder="Enter ParentID"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="input-field"
                placeholder="Enter Phone Number"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Email Address
              </label>
              <div className="flex">
                <input
                  type="text"
                  name="email_local"
                  value={formData.email_local}
                  onChange={handleChange}
                  className="input-field rounded-r-none"
                  placeholder="Enter username"
                  required
                />
                <span className="inline-flex items-center px-3 border border-l-0 border-gray-300 bg-gray-100 text-gray-600 text-sm rounded-r-lg whitespace-nowrap">
                  {EMAIL_DOMAIN}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Password
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="input-field"
                placeholder="*********"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Withdrawal Password
              </label>
              <input
                type="password"
                name="wallet_password"
                value={formData.wallet_password}
                onChange={handleChange}
                className="input-field"
                placeholder="*********"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Credibility
              </label>
              <input
                type="number"
                name="credibility"
                value={formData.credibility}
                onChange={handleChange}
                min="0"
                max="100"
                className="input-field"
                placeholder="Enter Credibility"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Opening Balance
              </label>
              <input
                type="number"
                name="opening_balance"
                value={formData.opening_balance}
                onChange={handleChange}
                step="0.01"
                className="input-field"
                placeholder="Enter Opening Balance"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                User Type
              </label>
              <select
                name="user_type"
                value={formData.user_type}
                onChange={handleChange}
                className="input-field"
              >
                <option value="User">User</option>
                <option value="Admin">Admin</option>
                <option value="ChatSupport">Chat Support</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Membership Level
              </label>
              {tiersLoading ? (
                <Skeleton className="h-12 w-full rounded-lg" />
              ) : (
                <select
                  name="tier_id"
                  value={formData.tier_id}
                  onChange={handleChange}
                  className="input-field"
                >
                  {memberships.map((tier) => (
                    <option key={tier.id} value={tier.id}>
                      {tier.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div className="flex justify-end space-x-4 pt-4">
            <button
              type="button"
              onClick={() => navigate('/administration')}
              className="px-8 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-solid disabled:opacity-40"
            >
              {loading ? (
                <>
                  <LoadingSpinner size="sm" color="white" />
                  <span>Registering...</span>
                </>
              ) : (
                <span>Register Member</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
