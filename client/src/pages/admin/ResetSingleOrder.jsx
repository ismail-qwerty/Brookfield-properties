import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { LoadingSpinner, CurrencyDisplay } from '../../components/ui';
import api from '../../utils/api';

export default function ResetSingleOrder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [user, setUser] = useState(null);
  const [properties, setProperties] = useState([]);
  const [selectedSpecialOrders, setSelectedSpecialOrders] = useState([]);
  const [sequenceAfterOrderNo, setSequenceAfterOrderNo] = useState(0);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [userRes, propertiesRes] = await Promise.all([
        api.admin.getUserById(id),
        api.admin.getProperties({ limit: 300 }),
      ]);
      
      setUser(userRes.data.data);
      setProperties(propertiesRes.data.data.properties || []);
    } catch (err) {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckboxChange = (propertyId) => {
    setSelectedSpecialOrders(prev => {
      if (prev.includes(propertyId)) {
        return prev.filter(id => id !== propertyId);
      } else {
        if (prev.length >= 3) {
          setError('You can only select exactly 3 orders as special orders');
          return prev;
        }
        return [...prev, propertyId];
      }
    });
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (selectedSpecialOrders.length !== 3) {
      setError('You must select exactly 3 orders as special orders');
      return;
    }

    setSaving(true);

    try {
      // Prepare payload for backend
      const payload = {
        property_ids: properties.filter(p => p.status === 'Active').slice(0, 35).map(p => p.id),
        special_order_ids: selectedSpecialOrders,
        sequence_after_order_no: parseInt(sequenceAfterOrderNo),
      };

      console.log('Assigning orders with special lots:', payload);
      
      // TODO: Create backend endpoint
      // await api.admin.assignOrdersWithSpecialLots(id, payload);
      
      setSuccess(`Successfully configured orders! Selected ${selectedSpecialOrders.length} special orders. Backend implementation pending...`);
      setTimeout(() => navigate('/administration'), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to assign orders');
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
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Select Orders</h1>
          <p className="text-sm text-gray-600 mt-1">
            <Link to="/administration" className="hover:text-primary-600">Home</Link>
            <span className="mx-2">/</span>
            <span>Reset Orders</span>
          </p>
        </div>
        <Link
          to="/administration"
          className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          ← Back
        </Link>
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

      <form onSubmit={handleSubmit}>
        {/* Configuration Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
          {/* Blue Header */}
          <div className="bg-primary-600 px-6 py-4">
            <h2 className="text-xl font-bold text-white">Select Exactly Three Orders</h2>
          </div>

          {/* Card Content */}
          <div className="p-6 space-y-6">
            {/* User Info */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Username</p>
                  <p className="font-semibold text-gray-900">{user?.username}</p>
                </div>
                <div>
                  <p className="text-gray-600">Balance</p>
                  <p className="font-semibold text-primary-600">
                    <CurrencyDisplay amount={user?.wallets?.balance || 0} />
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Total Orders</p>
                  <p className="font-semibold text-gray-900">{user?.total_orders || 0}</p>
                </div>
                <div>
                  <p className="text-gray-600">Membership</p>
                  <p className="font-semibold text-gray-900">
                    {user?.membership_levels?.name || 'Silver'} ({user?.membership_levels?.commission_rate || 0.5}%)
                  </p>
                </div>
              </div>
            </div>

            {/* After Order Number */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                After Order Number:
              </label>
              <input
                type="number"
                value={sequenceAfterOrderNo}
                onChange={(e) => setSequenceAfterOrderNo(e.target.value)}
                min="0"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Enter order number after which these orders will be received"
                required
              />
              <p className="text-xs text-gray-500 mt-2">
                Orders will be available after user completes <strong>{sequenceAfterOrderNo}</strong> orders
              </p>
            </div>

            {/* Save Button */}
            <button
              type="submit"
              disabled={saving || selectedSpecialOrders.length !== 3}
              className="w-full px-6 py-4 bg-primary-600 hover:bg-primary-700 text-white font-bold text-lg rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {saving ? (
                <>
                  <LoadingSpinner size="sm" color="white" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Selected Orders ({selectedSpecialOrders.length}/3)</span>
              )}
            </button>

            {/* Info Box */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <svg className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <div className="text-sm text-amber-900">
                  <p className="font-semibold mb-1">How Special Orders Work:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Select exactly <strong>3 orders</strong> from the list below</li>
                    <li>These will be marked as "special orders" that cause a <strong>loss</strong> instead of earning</li>
                    <li>Normal orders: User earns commission = Price × {user?.membership_levels?.commission_rate || 0.5}%</li>
                    <li>Special orders: User loses the same amount instead</li>
                    <li>All other properties will be assigned automatically as normal orders</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Select Orders Heading */}
        <div className="mb-4">
          <h3 className="text-xl font-bold text-gray-900">Select Orders:</h3>
          <p className="text-sm text-gray-600 mt-1">
            Choose exactly 3 orders to mark as special (these will cause loss instead of earning)
          </p>
        </div>

        {/* Orders Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b-2 border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-900 w-24">
                    Select
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">
                    Title
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-900 w-32">
                    Price
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {properties.filter(p => p.status === 'Active').map((property, index) => {
                  const isSelected = selectedSpecialOrders.includes(property.id);
                  
                  return (
                    <tr
                      key={property.id}
                      className={`hover:bg-gray-50 cursor-pointer transition-colors ${
                        isSelected ? 'bg-red-50' : ''
                      }`}
                      onClick={() => handleCheckboxChange(property.id)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleCheckboxChange(property.id)}
                            className="w-5 h-5 text-red-600 border-gray-300 rounded focus:ring-red-500 cursor-pointer"
                          />
                          {isSelected && (
                            <span className="ml-2 text-red-600 font-bold text-sm">⚠️</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-sm ${isSelected ? 'font-semibold text-red-900' : 'text-gray-900'}`}>
                          {property.title}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-sm font-semibold ${isSelected ? 'text-red-600' : 'text-primary-600'}`}>
                          {property.price}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Table Footer with Count */}
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Total available orders: <span className="font-semibold">{properties.filter(p => p.status === 'Active').length}</span>
              </p>
              <p className={`text-sm font-semibold ${selectedSpecialOrders.length === 3 ? 'text-green-600' : 'text-red-600'}`}>
                Special orders selected: {selectedSpecialOrders.length} / 3
                {selectedSpecialOrders.length === 3 && ' ✓'}
              </p>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
