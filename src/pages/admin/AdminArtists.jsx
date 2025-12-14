import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import apiService from '../../services/api';
import AdminLayout from './AdminLayout';
import { ToastContainer } from '../../components/ui/Toast';

export default function AdminArtists() {
  const [artists, setArtists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState('');
  const [name, setName] = useState('');
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState('');
  const [toasts, setToasts] = useState([]);
  const canCreate = useMemo(()=>name.trim().length>0 && !creating, [name, creating]);

  const showToast = (message, type = 'error', duration = 4000) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type, duration }]);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  // Load ALL artists from database (using high limit for admin)
  const load = async () => {
    setLoading(true);
    try {
      // Use high limit to get all items (backend allows up to 1000)
      const res = await apiService.getArtists(1, 1000, search);
      const list = Array.isArray(res?.artists) ? res.artists : Array.isArray(res) ? res : [];
      setArtists(list);
    } catch (error) {
      console.error('Error loading artists:', error);
      setArtists([]);
    } finally { 
      setLoading(false); 
    }
  };

  // Ensure auth token is loaded
  useEffect(() => {
    const storedTokens = localStorage.getItem('authTokens');
    if (storedTokens) {
      try {
        const { accessToken } = JSON.parse(storedTokens);
        if (accessToken) {
          apiService.setAuthToken(accessToken);
        }
      } catch (e) {
        console.error('Error loading auth token:', e);
      }
    }
  }, []);

  useEffect(()=>{ load(); /* eslint-disable-line */ }, [search]);

  const createArtist = async () => {
    if (!canCreate || creating) return;
    setCreating(true);
    try {
    const payload = { name: name.trim() };
      console.log('Creating artist with payload:', payload);
      console.log('Auth token:', apiService.authToken ? 'Present' : 'Missing');
    const created = await apiService.createArtist(payload);
      console.log('Artist created successfully:', created);
    setName('');
      showToast('Artist created successfully!', 'success', 3000);
      // Reload all artists to ensure sync with database
      await load();
    } catch (error) {
      console.error('Error creating artist:', error);
      console.error('Error status:', error?.status);
      console.error('Error details:', error?.details);
      console.error('Full error object:', JSON.stringify(error, null, 2));
      
      let errorMessage = 'Unknown error';
      
      // Handle specific error cases - check error field first (contains actual error)
      if (error?.status === 401) {
        errorMessage = 'Authentication required. Please log in again.';
      } else if (error?.details?.error) {
        // Backend returns actual error in error field
        errorMessage = error.details.error;
      } else if (error?.details?.message) {
        errorMessage = error.details.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      showToast(`Failed to create artist: ${errorMessage}`, 'error');
    } finally {
      setCreating(false);
    }
  };

  const saveArtist = async () => {
    if (!editId) return;
    try {
      await apiService.updateArtist(editId, { name: editName.trim() });
      setEditId(null); 
      setEditName('');
      showToast('Artist updated successfully!', 'success', 3000);
      // Reload all artists to ensure sync with database
      await load();
    } catch (error) {
      console.error('Error updating artist:', error);
      showToast(`Failed to update artist: ${error?.message || 'Unknown error'}`, 'error');
    }
  };

  const deleteArtist = async (id) => {
    if (!window.confirm('Are you sure you want to delete this artist?')) return;
    try {
    await apiService.deleteArtist(id);
      showToast('Artist deleted successfully!', 'success', 3000);
      // Reload all artists to ensure sync with database
      await load();
    } catch (error) {
      console.error('Error deleting artist:', error);
      showToast(`Failed to delete artist: ${error?.message || 'Unknown error'}`, 'error');
    }
  };

  const populateGenres = async (dryRun = false) => {
    try {
      setLoading(true);
      const res = await apiService.populateArtistGenres({ dryRun });
      const updatedCount = Number(res?.updated || 0);
      showToast(dryRun ? `Dry run: ${updatedCount} artists would be updated` : `Populated genres for ${updatedCount} artists`, 'success', 4000);
      await load();
    } catch (error) {
      console.error('Error populating genres:', error);
      let message = error?.details?.message || error?.message || 'Unknown error';
      if (error?.status === 401) message = 'Authentication required. Please log in again.';
      showToast(`Failed to populate genres: ${message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="space-y-4">
        <div className="flex items-center gap-2">
          <input 
            value={search} 
            onChange={e=>setSearch(e.target.value)} 
            placeholder="Search artists" 
            className="px-3 py-2 rounded-lg bg-light-gray/50 text-white border border-gray-700 flex-1" 
          />
        </div>
        <div className="flex items-center gap-2">
          <input value={name} onChange={e=>setName(e.target.value)} placeholder="New artist name" className="px-3 py-2 rounded-lg bg-light-gray/50 text-white border border-gray-700 flex-1" />
          <button onClick={createArtist} disabled={!canCreate} className="px-3 py-2 rounded-lg bg-neon-blue text-dark-bg disabled:opacity-50">
            {creating ? 'Creating...' : 'Create'}
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {artists.map(a => (
            <div key={a._id || a.id} className="flex items-center justify-between p-3 rounded-lg bg-light-gray/30">
              {editId === (a._id || a.id) ? (
                <div className="flex items-center gap-2 w-full">
                  <input className="px-3 py-2 rounded bg-light-gray/50 text-white border border-gray-700 flex-1" value={editName} onChange={e=>setEditName(e.target.value)} />
                  <button onClick={saveArtist} className="px-3 py-1 rounded bg-neon-blue text-dark-bg">Save</button>
                  <button onClick={()=>{ setEditId(null); setEditName(''); }} className="px-3 py-1 rounded bg-gray-700 text-white">Cancel</button>
                </div>
              ) : (
                <>
                  <div className="truncate">{a.name}</div>
                  <div className="flex items-center gap-2">
                    <button onClick={()=>{ setEditId(a._id || a.id); setEditName(a.name || ''); }} className="px-3 py-1 rounded bg-gray-600 text-white">Edit</button>
                    <button onClick={()=>deleteArtist(a._id || a.id)} className="px-3 py-1 rounded bg-red-500/80 text-white">Delete</button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-400">
            {loading ? 'Loading...' : `Total: ${artists.length} artist${artists.length !== 1 ? 's' : ''}`}
          </div>
          <div className="flex items-center gap-2">
            <button 
              disabled={loading} 
              onClick={load} 
              className="px-3 py-2 rounded bg-gray-700 text-white disabled:opacity-50 hover:bg-gray-600"
            >
              Refresh
            </button>
            <button 
              disabled={loading} 
              onClick={() => populateGenres(true)} 
              className="px-3 py-2 rounded bg-light-gray/50 text-white border border-gray-700 disabled:opacity-50 hover:bg-light-gray"
            >
              Dry Run: Populate Genres
            </button>
            <button 
              disabled={loading} 
              onClick={() => populateGenres(false)} 
              className="px-3 py-2 rounded bg-neon-blue text-dark-bg disabled:opacity-50 hover:bg-neon-blue/80"
            >
              Populate Genres
            </button>
          </div>
        </div>
      </motion.section>
    </AdminLayout>
  );
}
