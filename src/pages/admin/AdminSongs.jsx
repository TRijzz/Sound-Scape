import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import apiService from '../../services/api';
import AdminLayout from './AdminLayout';
import { ToastContainer } from '../../components/ui/Toast';

export default function AdminSongs() {
  const navigate = useNavigate();
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const [toasts, setToasts] = useState([]);
  const [syncingFolders, setSyncingFolders] = useState(false);

  const showToast = (message, type = 'error', duration = 4000) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type, duration }]);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const load = async () => {
    setLoading(true);
    try {
      const songsRes = await apiService.getSongs(1, 1000, search);

      const songList = Array.isArray(songsRes?.songs) ? songsRes.songs : Array.isArray(songsRes) ? songsRes : [];

      setSongs(songList);
    } catch (error) {
      console.error('Error loading data:', error);
      setSongs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [search]);

  const autoPopulate = async () => {
    try {
      showToast('Assigning song genres and categories from synced metadata...', 'success', 2500);
      const res = await apiService.populateSongCategories({
        dryRun: false,
        limit: 0,
        overwriteGenre: true,
        overwriteCategory: true
      });
      showToast('Genre and category assignment complete: ' + (res?.updated || 0) + ' songs updated', 'success', 3500);
      await load();
    } catch (error) {
      showToast('Automatic assignment failed: ' + (error?.message || 'Unknown error'), 'error');
    }
  };

  const deleteSong = async (id) => {
    if (!window.confirm('Are you sure you want to delete this song?')) return;
    try {
      await apiService.deleteSong(id);
      showToast('Song deleted successfully!', 'success', 3000);
      await load();
    } catch (error) {
      console.error('Error deleting song:', error);
      showToast('Failed to delete song: ' + (error?.message || 'Unknown error'), 'error');
    }
  };

  const handleFolderSync = async () => {
    if (syncingFolders) return;
    setSyncingFolders(true);
    try {
      showToast('Starting folder sync...', 'success', 2000);
      const res = await apiService.syncFromFolders();
      showToast('Folder sync complete: Added ' + (res?.stats?.added || 0) + ', Updated ' + (res?.stats?.updated || 0), 'success', 4000);
      await load();
    } catch (error) {
      showToast('Folder sync failed: ' + (error?.message || 'Unknown error'), 'error');
    } finally {
      setSyncingFolders(false);
    }
  };

  return (
    <AdminLayout>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search songs"
            className="px-3 py-2 rounded-lg bg-light-gray/50 text-white border border-gray-700 flex-1"
          />
          <button onClick={() => navigate('/admin/songs/create')} className="px-4 py-2 rounded-lg bg-neon-blue text-dark-bg font-medium">
            Create Song
          </button>
          <button onClick={autoPopulate} className="px-3 py-2 rounded-lg bg-purple-500/80 text-white text-sm">Auto Assign Genre + Category</button>
          <button onClick={handleFolderSync} disabled={syncingFolders} className="px-3 py-2 rounded-lg bg-yellow-600/80 text-white disabled:opacity-50 text-sm">
            {syncingFolders ? 'Syncing...' : 'Sync Folders'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {songs.map((song) => (
            <div key={song._id || song.id} className="flex flex-col p-3 rounded-lg bg-light-gray/30 gap-3">
              <div className="flex gap-3">
                <div className="w-16 h-16 flex-shrink-0 bg-black/40 rounded overflow-hidden">
                  {(song.cover_art_url || song.album?.images?.[0]?.url) ? (
                    <img src={song.cover_art_url || song.album?.images?.[0]?.url} alt={song.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-600 text-xs">No Art</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{song.name}</div>
                  <div className="text-xs text-gray-400 truncate">{song.artists && song.artists.map((artist) => artist.name).join(', ')}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {song.album ? song.album.name : 'No Album'} � {Math.floor((song.duration_ms || 0) / 1000 / 60)}:{(Math.floor((song.duration_ms || 0) / 1000) % 60).toString().padStart(2, '0')}
                  </div>
                  <div className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                    <span className="opacity-70">Genre:</span>
                    <span className="bg-gray-800 px-1 rounded truncate max-w-[100px]">{song.genre?.name || song.genre || 'Uncategorized'}</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {song.explicit && <div className="text-[10px] text-red-400 border border-red-400/50 inline-block px-1 rounded">Explicit</div>}
                    {song.audio_url ? (
                      <div className="text-[10px] text-green-400 border border-green-400/50 inline-block px-1 rounded flex items-center gap-1">
                        <span>Audio</span>
                        <svg className="w-2 h-2" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                      </div>
                    ) : (
                      <div className="text-[10px] text-orange-400 border border-orange-400/50 inline-block px-1 rounded">No Audio</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-auto">
                <button onClick={() => navigate('/admin/songs/edit/' + (song._id || song.id))} className="flex-1 px-3 py-1 rounded bg-gray-600 text-white text-sm">Edit</button>
                <button onClick={() => deleteSong(song._id || song.id)} className="flex-1 px-3 py-1 rounded bg-red-500/80 text-white text-sm">Delete</button>
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-400">
            {loading ? 'Loading...' : 'Total: ' + songs.length + ' song' + (songs.length !== 1 ? 's' : '')}
          </div>
          <button disabled={loading} onClick={load} className="px-3 py-2 rounded bg-gray-700 text-white disabled:opacity-50 hover:bg-gray-600">
            Refresh
          </button>
        </div>
      </motion.section>
    </AdminLayout>
  );
}
