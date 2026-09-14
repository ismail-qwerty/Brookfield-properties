import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { LoadingSpinner } from '../../components/ui';
import api from '../../utils/api';

export default function ResetSingleOrder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [user, setUser] = useState(null);
  const [specialLots, setSpecialLots] = useState([]);
  const [selectedLot, setSelectedLot] = useState(null);
  const [orderNumber, setOrderNumber] = useState('');

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [userRes, specialLotsRes] = await Promise.all([
        api.admin.getUserById(id),
        api.get('/admin/special-lots'),
      ]);
      
      setUser(userRes.data.data);
      setSpecialLots(specialLotsRes.data.data || []);
    } catch (err) {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!selectedLot) {
      setError('Please select at least one order');
      return;
    }

    if (!orderNumber || orderNumber < 0) {
      setError('Please enter a valid order number');
      return;
    }

    setSaving(true);

    try {
      const payload = {
        special_lot_id: selectedLot,
        order_number: parseInt(orderNumber),
      };

      await api.post(`/admin/users/${id}/assign-special-lot`, payload);
      
      setSuccess('Successfully assigned order!');
      setTimeout(() => navigate(`/administration/reset-orders/${id}`), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to assign order');
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
    <div className="max-w-5xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Select Orders</h1>
          <p className="text-sm text-gray-600 mt-1">
            <Link to="/administration" className="link-quiet">Home</Link>
            <span className="mx-2">/</span>
            <span>Reset Orders</span>
          </p>
        </div>
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
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-6">
          <div className="bg-black px-8 py-6">
            <h2 className="text-xl font-bold text-white">Select Exactly Three Orders</h2>
          </div>

          <div className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                After Order Number:
              </label>
              <input
                type="number"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                min="0"
                className="input-field"
                placeholder="Enter order number after which these orders will be received"
                required
              />
            </div>

            <button
              type="submit"
              disabled={saving || !selectedLot}
              className="w-full px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {saving ? (
                <>
                  <LoadingSpinner size="sm" color="white" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Selected Orders</span>
              )}
            </button>
          </div>
        </div>

        <div className="mb-4">
          <h3 className="text-lg font-bold text-gray-900">Select Orders:</h3>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
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
                {specialLots.filter(l => l.status === 'Active').map((lot) => {
                  const isSelected = selectedLot === lot.id;
                  return (
                    <tr
                      key={lot.id}
                      className={`hover:bg-gray-50 cursor-pointer transition-colors ${isSelected ? 'bg-blue-50' : ''}`}
                      onClick={() => setSelectedLot(lot.id)}
                    >
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => setSelectedLot(lot.id)}
                          className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                        />
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {lot.name || lot.title}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        ${lot.value || lot.price}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </form>
    </div>
  );
}
