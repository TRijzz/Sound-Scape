import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import AdminLayout from './AdminLayout';
import apiService from '../../services/api';
import { ToastContainer } from '../../components/ui/Toast';

const getUserLabel = (user) => user?.name || user?.username || user?.email || 'Unnamed user';
const getVinylId = (vinyl) => String(vinyl?._id || vinyl?.id || vinyl || '');

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [vinyls, setVinyls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingUserId, setSavingUserId] = useState(null);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedVinylIds, setSelectedVinylIds] = useState([]);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [search, setSearch] = useState('');
  const [toasts, setToasts] = useState([]);

  const showToast = (message, type = 'success', duration = 3000) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type, duration }]);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const load = async () => {
    setLoading(true);
    try {
      const [usersRes, vinylsRes] = await Promise.all([
        apiService.getUsers(),
        apiService.getVinyls(1, 500),
      ]);

      const nextUsers = Array.isArray(usersRes) ? usersRes : [];
      const nextVinyls = Array.isArray(vinylsRes?.vinyls) ? vinylsRes.vinyls : Array.isArray(vinylsRes) ? vinylsRes : [];
      setUsers(nextUsers);
      setVinyls(nextVinyls);

      if (!selectedUserId && nextUsers.length > 0) {
        const firstUserId = String(nextUsers[0]._id || nextUsers[0].id);
        setSelectedUserId(firstUserId);
        setSelectedVinylIds((nextUsers[0].purchased_vinyls || []).map((vinyl) => getVinylId(vinyl)));
      }
    } catch (error) {
      console.error('Failed to load users/vinyls:', error);
      showToast(error?.message || 'Failed to load user vinyl data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return users;
    return users.filter((user) => {
      const haystack = [
        user.name,
        user.username,
        user.email,
      ].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(term);
    });
  }, [users, search]);

  const selectedUser = useMemo(
    () => users.find((user) => String(user._id || user.id) === selectedUserId) || null,
    [users, selectedUserId]
  );

  useEffect(() => {
    if (!selectedUser) return;
    setSelectedVinylIds((selectedUser.purchased_vinyls || []).map((vinyl) => getVinylId(vinyl)));
  }, [selectedUser]);

  const handleToggleVinyl = (vinylId) => {
    setSelectedVinylIds((prev) => (
      prev.includes(vinylId)
        ? prev.filter((id) => id !== vinylId)
        : [...prev, vinylId]
    ));
  };

  const handleSelectUser = (user) => {
    const userId = String(user._id || user.id);
    setSelectedUserId(userId);
    setSelectedVinylIds((user.purchased_vinyls || []).map((vinyl) => getVinylId(vinyl)));
  };

  const toggleUserSelection = (userId) => {
    setSelectedUserIds((prev) => (
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    ));
  };

  const handleSave = async () => {
    if (!selectedUser) return;

    setSavingUserId(String(selectedUser._id || selectedUser.id));
    try {
      const response = await apiService.updateUserVinyls(selectedUser._id || selectedUser.id, {
        purchased_vinyls: selectedVinylIds,
        active_vinyl: null,
      });

      const updatedUser = response?.user;
      if (updatedUser) {
        setUsers((prev) => prev.map((user) => (String(user._id || user.id) === String(updatedUser._id || updatedUser.id) ? updatedUser : user)));
      }
      showToast('User vinyl ownership updated', 'success');
    } catch (error) {
      console.error('Failed to update user vinyls:', error);
      showToast(error?.message || 'Failed to update user vinyl ownership', 'error');
    } finally {
      setSavingUserId(null);
    }
  };

  return (
    <AdminLayout>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-white">User Vinyl Ownership</h2>
          <p className="text-sm text-gray-400 mt-1">See how many vinyls each user owns, inspect their collection, and update ownership stored in the database.</p>
          <p className="mt-2 text-sm text-gray-300">{selectedUserIds.length ? `${selectedUserIds.length} users selected` : 'No users selected'}</p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <div className="xl:col-span-4 space-y-4">
            <div className="p-4 rounded-xl border border-gray-800 bg-dark-gray/40">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search users by name or email"
                className="w-full px-3 py-2 rounded-lg bg-light-gray/50 text-white border border-gray-700 focus:border-neon-blue outline-none"
              />
            </div>

            <div className="rounded-xl border border-gray-800 bg-dark-gray/40 overflow-hidden">
              {loading ? (
                <div className="p-6 text-gray-500">Loading users...</div>
              ) : filteredUsers.length === 0 ? (
                <div className="p-6 text-gray-500">No users matched your search.</div>
              ) : (
                filteredUsers.map((user) => {
                  const userId = String(user._id || user.id);
                  const userVinylCount = Array.isArray(user.purchased_vinyls) ? user.purchased_vinyls.length : 0;
                  return (
                    <button
                      key={userId}
                      onClick={() => handleSelectUser(user)}
                      className={`w-full text-left p-4 border-b border-gray-800 last:border-b-0 transition-colors ${
                        selectedUserId === userId ? 'bg-neon-blue/10' : 'hover:bg-white/5'
                      }`}
                    >
                      <div className="mb-2">
                        <input type="checkbox" checked={selectedUserIds.includes(userId)} onChange={(e) => { e.stopPropagation(); toggleUserSelection(userId); }} />
                      </div>
                      <div className="font-semibold text-white truncate">{getUserLabel(user)}</div>
                      <div className="text-xs text-gray-400 truncate">{user.email}</div>
                      <div className="mt-2 flex items-center justify-between text-xs">
                        <span className="text-neon-blue">{userVinylCount} vinyl{userVinylCount === 1 ? '' : 's'}</span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className="xl:col-span-8">
            {!selectedUser ? (
              <div className="p-8 rounded-xl border border-dashed border-gray-800 bg-dark-gray/20 text-gray-500">
                Select a user to manage their vinyl ownership.
              </div>
            ) : (
              <div className="space-y-6">
                <div className="p-5 rounded-xl border border-gray-800 bg-dark-gray/40">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-semibold text-white">{getUserLabel(selectedUser)}</h3>
                      <p className="text-sm text-gray-400">{selectedUser.email}</p>
                    </div>
                    <div className="flex gap-3 text-sm">
                      <div className="px-3 py-2 rounded-lg bg-light-gray/30 border border-gray-700 text-white">
                        Owns {selectedVinylIds.length} vinyl{selectedVinylIds.length === 1 ? '' : 's'}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-5 rounded-xl border border-gray-800 bg-dark-gray/40 space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h4 className="text-lg font-semibold text-white">Owned Vinyls</h4>
                      <p className="text-sm text-gray-400">Changes here update the user document in MongoDB.</p>
                    </div>
                    <button
                      onClick={handleSave}
                      disabled={savingUserId === selectedUserId}
                      className="px-5 py-2 rounded-lg bg-neon-blue text-dark-bg font-bold disabled:opacity-50"
                    >
                      {savingUserId === selectedUserId ? 'Saving...' : 'Save Ownership'}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {vinyls.map((vinyl) => {
                      const vinylId = getVinylId(vinyl);
                      const checked = selectedVinylIds.includes(vinylId);
                      return (
                        <label key={vinylId} className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${
                          checked ? 'border-neon-blue/40 bg-neon-blue/10' : 'border-gray-800 bg-black/20 hover:bg-white/5'
                        }`}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => handleToggleVinyl(vinylId)}
                            className="mt-1"
                          />
                          <div className="min-w-0">
                            <div className="font-medium text-white truncate">{vinyl.name}</div>
                            <div className="text-sm text-gray-400 truncate">{vinyl.artist}</div>
                            <div className="text-xs text-gray-500 mt-1">
                              {vinyl.albumId?.name || 'Standalone vinyl'}{vinyl.release_year ? ` • ${vinyl.release_year}` : ''}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.section>
    </AdminLayout>
  );
}
