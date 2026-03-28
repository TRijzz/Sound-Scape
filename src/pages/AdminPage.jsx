import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useMusic } from '../contexts/MusicContext';
import apiService from '../services/api';
import AdminNotifications from '../components/admin/AdminNotifications';

function Section({ title, children }) {
  return (
    <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="bg-dark-gray/60 border border-gray-800 rounded-xl p-4">
      <h2 className="text-lg font-semibold mb-3">{title}</h2>
      {children}
    </motion.section>
  );
}

function AdminPage() {
  const { isAuthenticated } = useMusic();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [artists, setArtists] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [songs, setSongs] = useState([]);
  const [overview, setOverview] = useState({ artists: 0, audios: 0, vinyls: 0 });
  const [categories, setCategories] = useState([]);
  const [adminVerified, setAdminVerified] = useState(() => {
    try {
      return localStorage.getItem('adminVerified') === 'true';
    } catch {
      return false;
    }
  });
  const [adminCode, setAdminCode] = useState('');
  const [adminError, setAdminError] = useState('');
  const [banner, setBanner] = useState({ type: '', message: '' });

  const showError = (message, details) => {
    const msg = details && typeof details === 'string' ? `${message}: ${details}` : message;
    setBanner({ type: 'error', message: msg });
    setTimeout(() => setBanner({ type: '', message: '' }), 4000);
  };
  const showSuccess = (message) => {
    setBanner({ type: 'success', message });
    setTimeout(() => setBanner({ type: '', message: '' }), 2000);
  };
  const [editArtistId, setEditArtistId] = useState(null);
  const [editArtistName, setEditArtistName] = useState('');
  const [editAlbumId, setEditAlbumId] = useState(null);
  const [editAlbumName, setEditAlbumName] = useState('');
  const [editSongId, setEditSongId] = useState(null);
  const [editSongName, setEditSongName] = useState('');
  const [editSongDuration, setEditSongDuration] = useState('');
  const [editCategoryId, setEditCategoryId] = useState(null);
  const [editCategoryName, setEditCategoryName] = useState('');

  const [artistName, setArtistName] = useState('');
  const [albumName, setAlbumName] = useState('');
  const [songName, setSongName] = useState('');
  const [songDurationMs, setSongDurationMs] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [categoryDescription, setCategoryDescription] = useState('');
  const [categoryPublic, setCategoryPublic] = useState(true);

  const canSubmitSong = useMemo(() => songName.trim().length > 0 && /^[0-9]+$/.test(String(songDurationMs)), [songName, songDurationMs]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        // Only load data if we have an access token to avoid 401s
        const storedTokens = localStorage.getItem('authTokens');
        if (!storedTokens) {
          console.warn('No auth tokens found, skipping data load');
          return;
        }

        const [artistsRes, albumsRes, songsRes, vinylsRes, myCats, audioInventoryRes] = await Promise.all([
          apiService.getArtists(1, 20, ''),
          apiService.getAlbums(1, 20, ''),
          apiService.getSongs(1, 5000, ''),
          apiService.getVinyls(1, 1),
          apiService.getMyCategories().catch(err => {
            console.warn('Failed to load categories, might not be logged in fully:', err.message);
            return [];
          }),
          apiService.getAudioInventory()
        ]);
        setArtists(Array.isArray(artistsRes?.artists) ? artistsRes.artists : Array.isArray(artistsRes) ? artistsRes : []);
        setAlbums(Array.isArray(albumsRes?.albums) ? albumsRes.albums : Array.isArray(albumsRes) ? albumsRes : []);
        setSongs(Array.isArray(songsRes?.songs) ? songsRes.songs : Array.isArray(songsRes) ? songsRes : []);

        setOverview({
          artists: Number(artistsRes?.pagination?.total) || (Array.isArray(artistsRes?.artists) ? artistsRes.artists.length : 0),
          audios: Number(audioInventoryRes?.total_files) || 0,
          vinyls: Number(vinylsRes?.total) || Number(vinylsRes?.pagination?.total) || (Array.isArray(vinylsRes?.vinyls) ? vinylsRes.vinyls.length : 0)
        });
        setCategories(Array.isArray(myCats) ? myCats : []);
      } finally {
        setLoading(false);
      }
    };
    if (adminVerified) load();
  }, [adminVerified]);

  const verifyAdmin = async () => {
    try {
      setAdminError('');
      const code = adminCode.trim();
      if (!code) {
        setAdminError('Enter access code');
        return;
      }
      apiService.setAdminCode(code);
      await apiService.verifyAdminAccess(code);
      localStorage.setItem('adminAccessCode', code); // Consistently save code for notifications
      localStorage.setItem('adminVerified', 'true');
      setAdminVerified(true);
    } catch (err) {
      setAdminError(err?.message || 'Verification failed');
    }
  };

  const createArtist = async () => {
    const payload = { name: artistName.trim() };
    if (!payload.name) return;
    try {
      const created = await apiService.createArtist(payload);
      setArtists(prev => [created, ...prev]);
      setArtistName('');
      showSuccess('Artist created');
    } catch (err) {
      const details = err?.details?.error || err?.details?.message;
      showError(err?.message || 'Failed to create artist', details);
    }
  };

  const deleteArtist = async (id) => {
    try {
      await apiService.deleteArtist(id);
      setArtists(prev => prev.filter(a => (a._id || a.id) !== id));
      showSuccess('Artist deleted');
    } catch (err) {
      const details = err?.details?.error || err?.details?.message;
      showError(err?.message || 'Failed to delete artist', details);
    }
  };

  const saveArtist = async () => {
    if (!editArtistId) return;
    const name = editArtistName.trim();
    if (!name) return;
    const updated = await apiService.updateArtist(editArtistId, { name });
    setArtists(prev => prev.map(a => ((a._id || a.id) === (updated._id || updated.id) ? updated : a)));
    setEditArtistId(null);
    setEditArtistName('');
  };

  const createAlbum = async () => {
    const payload = { name: albumName.trim() };
    if (!payload.name) return;
    try {
      const created = await apiService.createAlbum(payload);
      setAlbums(prev => [created, ...prev]);
      setAlbumName('');
      showSuccess('Album created');
    } catch (err) {
      const details = err?.details?.error || err?.details?.message;
      showError(err?.message || 'Failed to create album', details);
    }
  };

  const deleteAlbum = async (id) => {
    try {
      await apiService.deleteAlbum(id);
      setAlbums(prev => prev.filter(a => (a._id || a.id) !== id));
      showSuccess('Album deleted');
    } catch (err) {
      const details = err?.details?.error || err?.details?.message;
      showError(err?.message || 'Failed to delete album', details);
    }
  };

  const saveAlbum = async () => {
    if (!editAlbumId) return;
    const name = editAlbumName.trim();
    if (!name) return;
    const updated = await apiService.updateAlbum(editAlbumId, { name });
    setAlbums(prev => prev.map(a => ((a._id || a.id) === (updated._id || updated.id) ? updated : a)));
    setEditAlbumId(null);
    setEditAlbumName('');
  };

  const createSong = async () => {
    if (!canSubmitSong) return;
    const payload = { name: songName.trim(), duration_ms: parseInt(String(songDurationMs), 10) };
    try {
      const created = await apiService.createSong(payload);
      setSongs(prev => [created, ...prev]);
      setSongName('');
      setSongDurationMs('');
      showSuccess('Song created');
    } catch (err) {
      const details = err?.details?.error || err?.details?.message;
      showError(err?.message || 'Failed to create song', details);
    }
  };

  const deleteSong = async (id) => {
    try {
      await apiService.deleteSong(id);
      setSongs(prev => prev.filter(s => (s._id || s.id) !== id));
      showSuccess('Song deleted');
    } catch (err) {
      const details = err?.details?.error || err?.details?.message;
      showError(err?.message || 'Failed to delete song', details);
    }
  };

  const saveSong = async () => {
    if (!editSongId) return;
    const name = editSongName.trim();
    const duration_ms = editSongDuration ? parseInt(String(editSongDuration), 10) : undefined;
    const updates = {};
    if (name) updates.name = name;
    if (!Number.isNaN(duration_ms)) updates.duration_ms = duration_ms;
    const updated = await apiService.updateSong(editSongId, updates);
    setSongs(prev => prev.map(s => ((s._id || s.id) === (updated._id || updated.id) ? updated : s)));
    setEditSongId(null);
    setEditSongName('');
    setEditSongDuration('');
  };

  const createCategory = async () => {
    const payload = { name: categoryName.trim(), description: categoryDescription.trim(), is_public: !!categoryPublic };
    if (!payload.name) return;
    try {
      const created = await apiService.createCategory(payload);
      setCategories(prev => [created, ...prev]);
      setCategoryName('');
      setCategoryDescription('');
      setCategoryPublic(true);
      showSuccess('Category created');
    } catch (err) {
      const details = err?.details?.error || err?.details?.message;
      showError(err?.message || 'Failed to create category', details);
    }
  };

  const deleteCategory = async (id) => {
    try {
      await apiService.deleteCategory(id);
      setCategories(prev => prev.filter(c => (c._id || c.id) !== id));
      showSuccess('Category deleted');
    } catch (err) {
      const details = err?.details?.error || err?.details?.message;
      showError(err?.message || 'Failed to delete category', details);
    }
  };

  const saveCategory = async () => {
    if (!editCategoryId) return;
    const name = editCategoryName.trim();
    if (!name) return;
    const updated = await apiService.updateCategory(editCategoryId, { name });
    setCategories(prev => prev.map(c => ((c._id || c.id) === (updated._id || updated.id) ? updated : c)));
    setEditCategoryId(null);
    setEditCategoryName('');
  };

  

  if (!adminVerified) {
    return (
      <div className="p-6">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="max-w-md mx-auto bg-dark-gray/60 border border-gray-800 rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-2">Admin Access</h2>
          <p className="text-gray-300 mb-4">Enter the admin access code to continue.</p>
          <div className="space-y-3">
            <input
              type="password"
              value={adminCode}
              onChange={(e)=>setAdminCode(e.target.value)}
              placeholder="Access code"
              className="w-full px-4 py-2 rounded-lg bg-light-gray/50 text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-neon-blue"
            />
            {adminError && <div className="text-red-400 text-sm">{adminError}</div>}
            <div className="flex justify-end">
              <button onClick={verifyAdmin} className="px-4 py-2 rounded-lg bg-neon-blue text-dark-bg">Verify</button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 relative">
      <AdminNotifications />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin</h1>
      </div>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
        <div className="mb-4">
          <div className="rounded-xl border border-gray-800 bg-dark-gray/60 p-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {[
                { label: 'Total artists', value: overview.artists },
                { label: 'Total audios', value: overview.audios, onClick: () => navigate('/admin/songs?uploaded=1') },
                { label: 'Total vinyls', value: overview.vinyls },
              ].map(({ label, value, onClick }) => {
                const clickable = typeof onClick === 'function';
                const Tag = clickable ? 'button' : 'div';
                return (
                  <Tag
                    key={label}
                    onClick={onClick}
                    className={`rounded-xl border border-gray-800 bg-black/20 p-5 text-left ${clickable ? 'transition hover:border-neon-blue/40 hover:bg-neon-blue/5' : ''}`}
                  >
                    <div className="text-sm text-gray-300">{label}</div>
                    <div className="mt-2 text-3xl font-semibold text-white">{loading ? '...' : value}</div>
                    {clickable ? <div className="mt-2 text-xs text-neon-blue">View uploaded audios</div> : null}
                  </Tag>
                );
              })}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button onClick={() => navigate('/admin/artists')} className="text-left rounded-xl border border-gray-800 bg-dark-gray/60 hover:bg-dark-gray/80 transition p-5">
            <div className="text-xl font-semibold mb-1">Artists</div>
            <div className="text-gray-300 text-sm">Manage all artists</div>
          </button>
          <button onClick={() => navigate('/admin/albums')} className="text-left rounded-xl border border-gray-800 bg-dark-gray/60 hover:bg-dark-gray/80 transition p-5">
            <div className="text-xl font-semibold mb-1">Albums</div>
            <div className="text-gray-300 text-sm">Manage all albums</div>
          </button>
          <button onClick={() => navigate('/admin/songs')} className="text-left rounded-xl border border-gray-800 bg-dark-gray/60 hover:bg-dark-gray/80 transition p-5">
            <div className="text-xl font-semibold mb-1">Songs</div>
            <div className="text-gray-300 text-sm">Manage all songs</div>
          </button>
          <button onClick={() => navigate('/admin/lyrics')} className="text-left rounded-xl border border-gray-800 bg-dark-gray/60 hover:bg-dark-gray/80 transition p-5">
            <div className="text-xl font-semibold mb-1">Lyrics</div>
            <div className="text-gray-300 text-sm">Manage song lyrics</div>
          </button>
          <button onClick={() => navigate('/admin/vinyls')} className="text-left rounded-xl border border-gray-800 bg-dark-gray/60 hover:bg-dark-gray/80 transition p-5">
            <div className="text-xl font-semibold mb-1">Vinyls</div>
            <div className="text-gray-300 text-sm">Manage vinyl records</div>
          </button>
          <button onClick={() => navigate('/admin/users')} className="text-left rounded-xl border border-gray-800 bg-dark-gray/60 hover:bg-dark-gray/80 transition p-5">
            <div className="text-xl font-semibold mb-1">Users</div>
            <div className="text-gray-300 text-sm">Manage user vinyl ownership</div>
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default AdminPage;

