import { useState, useEffect } from 'react';
import { TierBadge, LoadingSpinner, EmptyState, SkeletonTableRows } from '../../components/ui';
import api from '../../utils/api';

export default function Memberships() {
  const [memberships, setMemberships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedMembership, setSelectedMembership] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    order_limit: 27,
    commission_rate: 0.9,
  });

  useEffect(() => {
    fetchMemberships();
  }, []);

  const fetchMemberships = async () => {
    setLoading(true);
    try {
      const { data } = await api.admin.getMemberships();
      setMemberships(data.data?.memberships || []);
    } catch (err) {
      console.error('Failed to fetch memberships:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMembership = () => {
    setFormData({
      name: '',
      order_limit: 27,
      commission_rate: 0.9,
    });
    setError('');
    setShowAddModal(true);
  };

  const handleEditMembership = (membership) => {
    setFormData({
      name: membership.name,
      order_limit: membership.order_limit,
      commission_rate: membership.commission_rate,
    });
    setSelectedMembership(membership);
    setError('');
    setShowEditModal(true);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: name === 'name' ? value : parseFloat(value) || 0 
    }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      if (showEditModal) {
        await api.admin.updateMembership(selectedMembership.id, formData);
      } else {
        await api.admin.createMembership(formData);
      }
      
      setShowAddModal(false);
      setShowEditModal(false);
      setSelectedMembership(null);
      await fetchMemberships();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save membership');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedMembership) return;
    
    setDeleting(true);
    try {
      await api.admin.deleteMembership(selectedMembership.id);
      setShowDeleteModal(false);
      setSelectedMembership(null);
      await fetchMemberships();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete membership');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Membership Tier Configuration</h1>
          <p className="text-gray-600 mt-1">Manage membership levels, order limits, and commission structures</p>
        </div>
        <button
          onClick={handleAddMembership}
          className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
        >
          + New Membership Tier
        </button>
      </div>

      {/* Membership Tiers Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200 mb-6">
        {!loading && memberships.length === 0 ? (
          <EmptyState message="No membership tiers configured" icon="⭐" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700">ID</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700">Tier Name</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700">Daily Order Limit</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700">Commission Rate</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700">Active Members</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700">Created</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200" aria-busy={loading}>
                {loading ? (
                  <SkeletonTableRows rows={4} columns={7} cellClassName="px-6 py-6" />
                ) : memberships.map((membership) => (
                  <tr key={membership.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">{membership.id}</td>
                    <td className="px-6 py-4">
                      <TierBadge tier={membership.name} size="md" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <span className="text-2xl font-bold text-gray-900">{membership.order_limit}</span>
                        <span className="text-sm text-gray-600">tasks/day</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <span className="text-2xl font-bold text-black">{membership.commission_rate}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <span className="text-xl font-semibold text-primary-600">
                          {membership.member_count || 0}
                        </span>
                        <span className="text-sm text-gray-600">users</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(membership.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEditMembership(membership)}
                          className="link-quiet text-[13px]"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            setSelectedMembership(membership);
                            setShowDeleteModal(true);
                          }}
                          className="text-red-600 hover:text-red-800 font-medium text-sm"
                          disabled={membership.member_count > 0}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Tier Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-black rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold opacity-90">Total Tiers</h3>
            <span className="text-3xl">⭐</span>
          </div>
          <p className="text-4xl font-bold">{memberships.length}</p>
          <p className="text-sm opacity-75 mt-2">Configured membership levels</p>
        </div>

        <div className="bg-black rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold opacity-90">Total Members</h3>
            <span className="text-3xl">👥</span>
          </div>
          <p className="text-4xl font-bold">
            {memberships.reduce((sum, m) => sum + (m.member_count || 0), 0)}
          </p>
          <p className="text-sm opacity-75 mt-2">Active platform users</p>
        </div>

        <div className="bg-black rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold opacity-90">Avg Commission</h3>
            <span className="text-3xl">📊</span>
          </div>
          <p className="text-4xl font-bold">
            {memberships.length > 0
              ? (memberships.reduce((sum, m) => sum + m.commission_rate, 0) / memberships.length).toFixed(2)
              : 0}%
          </p>
          <p className="text-sm opacity-75 mt-2">Average commission rate</p>
        </div>
      </div>

      {/* Add/Edit Membership Modal */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              {showEditModal ? 'Edit Membership Tier' : 'Create New Membership Tier'}
            </h2>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">
                  Tier Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleFormChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="e.g., Silver, Gold, Platinum"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Display name for this membership level</p>
              </div>

              <div>
                <label className="label">
                  Daily Order Limit
                </label>
                <input
                  type="number"
                  name="order_limit"
                  value={formData.order_limit}
                  onChange={handleFormChange}
                  min="1"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="27"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Maximum tasks user can complete per day</p>
              </div>

              <div>
                <label className="label">
                  Commission Rate (%)
                </label>
                <input
                  type="number"
                  name="commission_rate"
                  value={formData.commission_rate}
                  onChange={handleFormChange}
                  step="0.01"
                  min="0"
                  max="100"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="0.50"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Percentage of property value earned per task (e.g., 0.50 for 0.5%)
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900">
                  <strong>Example:</strong> With {formData.commission_rate}% commission rate, 
                  a $66.00 property will earn{' '}
                  <strong>${((66 * formData.commission_rate) / 100).toFixed(2)}</strong> per task
                </p>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setShowEditModal(false);
                    setSelectedMembership(null);
                    setError('');
                  }}
                  className="flex-1 px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {saving ? (
                    <>
                      <LoadingSpinner size="sm" color="white" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>{showEditModal ? 'Update Tier' : 'Create Tier'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Delete Membership Tier
            </h2>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete <strong>{selectedMembership?.name}</strong> tier?
              {selectedMembership?.member_count > 0 && (
                <span className="block mt-2 text-red-600 font-semibold">
                  ⚠️ This tier has {selectedMembership.member_count} active members. 
                  You must reassign them before deletion.
                </span>
              )}
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedMembership(null);
                }}
                className="flex-1 px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting || (selectedMembership?.member_count > 0)}
                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {deleting ? (
                  <>
                    <LoadingSpinner size="sm" color="white" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Delete Tier</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
