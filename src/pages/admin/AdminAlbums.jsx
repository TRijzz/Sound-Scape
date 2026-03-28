import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import apiService from '../../services/api';
import AdminLayout from './AdminLayout';
import { ToastContainer } from '../../components/ui/Toast';
import ConfirmModal from '../../components/ui/ConfirmModal';
import DatePicker from '../../components/ui/DatePicker';

const getAlbumDisplayName = (album) => {
  if (album?.name === '\u00F7 (Deluxe)') return 'Divide Deluxe';
  return album?.name;
};

export default function AdminAlbums() {
  const navigate = useNavigate();
  const [albums, setAlbums] = useState([]);
  const [artists, setArtists] = useState([]);
  const [trackCounts, setTrackCounts] = useState({});
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState('');
  
  // Delete State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [albumToDelete, setAlbumToDelete] = useState(null);

  // Create State
  const [name, setName] = useState('');
  const [albumType, setAlbumType] = useState('album');
  const [totalTracks, setTotalTracks] = useState('');
  const [releaseDate, setReleaseDate] = useState('');
  const [selectedArtists, setSelectedArtists] = useState([]);
  const [genres, setGenres] = useState('');
  const [moods, setMoods] = useState('');
  const [popularity, setPopularity] = useState('');
  const [spotifyId, setSpotifyId] = useState('');
  const [coverFile, setCoverFile] = useState(null);
  const [moodOptions, setMoodOptions] = useState([]);
  
  const [toasts, setToasts] = useState([]);
  const canCreate = useMemo(()=>name.trim().length>0 && !creating, [name, creating]);
  const stats = useMemo(() => ({
    total: albums.length,
    withAudio: Object.values(trackCounts).filter((count) => count > 0).length,
    singles: albums.filter((album) => album.album_type === 'single').length,
    upcoming: albums.filter((album) => album.release_date && new Date(album.release_date) > new Date()).length
  }), [albums, trackCounts]);

  const showToast = (message, type = 'error', duration = 4000) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type, duration }]);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const load = async () => {
    setLoading(true);
    try {
      // Fetch albums, artists, and songs (to count tracks per album)
      // Note: Fetching all songs might be heavy for large datasets. 
      // Ideally, the backend album list should return track counts.
      // For this demo, we'll fetch a large batch of songs to compute counts client-side.
      const [res, artistsRes, songsRes, moodsRes] = await Promise.all([
        apiService.getAlbums(1, 1000, search),
        apiService.getArtists(1, 1000),
        apiService.getSongs(1, 2000),
        apiService.getSongMoods().catch(() => ({ moods: [] }))
      ]);
      
      const list = Array.isArray(res?.albums) ? res.albums : Array.isArray(res) ? res : [];
      setAlbums(list);
      
      const artistsList = artistsRes?.artists || (Array.isArray(artistsRes) ? artistsRes : []);
      setArtists(artistsList);

      // Compute track counts
      const songsList = songsRes?.songs || (Array.isArray(songsRes) ? songsRes : []);
      const counts = {};
      songsList.forEach(song => {
        const albumId = typeof song.album === 'object' ? song.album?._id : song.album;
        if (albumId && song.audio_url) {
            counts[albumId] = (counts[albumId] || 0) + 1;
        }
      });
      setTrackCounts(counts);
      setMoodOptions(Array.isArray(moodsRes?.moods) ? moodsRes.moods : []);

    } catch (error) {
      console.error('Error loading albums:', error);
      setAlbums([]);
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

  const createAlbum = async () => {
    if (!canCreate || creating) return;
    setCreating(true);
    try {
      const formData = new FormData();
      formData.append('name', name.trim());
      formData.append('album_type', albumType);
      if (totalTracks) formData.append('total_tracks', totalTracks);
      if (releaseDate) formData.append('release_date', releaseDate);
      if (genres) formData.append('genres', genres); // Comma separated string is fine, backend handles it
      if (moods) formData.append('moods', moods);
      if (popularity) formData.append('popularity', popularity);
      if (spotifyId) formData.append('spotify_id', spotifyId);
      
      if (selectedArtists.length > 0) {
        formData.append('artists', JSON.stringify(selectedArtists));
      }
      
      if (coverFile) {
        formData.append('cover', coverFile);
      }

      const created = await apiService.createAlbum(formData);
      console.log('Album created successfully:', created);
      
      // Reset
      setName(''); setAlbumType('album'); setTotalTracks(''); setReleaseDate('');
      setSelectedArtists([]); setGenres(''); setMoods(''); setPopularity(''); setSpotifyId(''); setCoverFile(null);
      
      // Reset file input
      const fileInputs = document.querySelectorAll('input[type="file"]');
      fileInputs.forEach(input => input.value = '');

      showToast('Album created successfully!', 'success', 3000);
      await load();
    } catch (error) {
      console.error('Error creating album:', error);
      showToast(`Failed to create album: ${error?.message || 'Unknown error'}`, 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteClick = (album) => {
    setAlbumToDelete(album);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!albumToDelete) return;
    
    try {
      await apiService.deleteAlbum(albumToDelete._id || albumToDelete.id);
      showToast('Album deleted successfully!', 'success', 3000);
      await load();
    } catch (error) {
      console.error('Error deleting album:', error);
      showToast(`Failed to delete album: ${error?.message || 'Unknown error'}`, 'error');
    } finally {
      setDeleteModalOpen(false);
      setAlbumToDelete(null);
    }
  };

  return (
    <AdminLayout>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="space-y-4">
        <div className="rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(61,180,255,0.18),_transparent_38%),linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-neon-blue/80">Album Console</p>
              <h2 className="text-3xl font-semibold text-white">List, create, edit, release</h2>
              <p className="max-w-2xl text-sm text-gray-300">Manage album metadata, covers, release dates, and linked audio inventory from one place.</p>
            </div>
            <button onClick={() => document.querySelector('input[placeholder="Album Name *"]')?.focus()} className="rounded-2xl bg-neon-blue px-5 py-3 text-sm font-semibold text-dark-bg hover:bg-neon-blue/85">Add album</button>
          </div>
          <div className="mt-6 grid gap-3 md:grid-cols-4">
            {[
              ['Total albums', stats.total],
              ['With audio', stats.withAudio],
              ['Singles', stats.singles],
              ['Upcoming', stats.upcoming]
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-gray-400">{label}</p>
                <p className="mt-2 text-3xl font-semibold text-white">{value}</p>
              </div>
            ))}
          </div>
        </div>
        
        {/* Search */}
        <div className="flex items-center gap-2">
          <input 
            value={search} 
            onChange={e=>setSearch(e.target.value)} 
            placeholder="Search albums" 
            className="px-3 py-2 rounded-lg bg-light-gray/50 text-white border border-gray-700 flex-1" 
          />
        </div>

        {/* Create Form */}
        <div className="p-4 bg-dark-gray/40 rounded-xl border border-gray-800 space-y-3">
          <h3 className="text-lg font-medium text-white">Create Album</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <input value={name} onChange={e=>setName(e.target.value)} placeholder="Album Name *" className="px-3 py-2 rounded-lg bg-light-gray/50 text-white border border-gray-700" />
            
            <select value={albumType} onChange={e=>setAlbumType(e.target.value)} className="px-3 py-2 rounded-lg bg-light-gray/50 text-white border border-gray-700">
              <option value="album">Album</option>
              <option value="single">Single</option>
              <option value="compilation">Compilation</option>
            </select>
            
            <input value={totalTracks} onChange={e=>setTotalTracks(e.target.value)} type="number" placeholder="Total Tracks" className="hidden" />
            
            <DatePicker 
              value={releaseDate} 
              onChange={setReleaseDate} 
              placeholder="Release Date" 
            />
            
            <input value={genres} onChange={e=>setGenres(e.target.value)} placeholder="Genres (comma separated)" className="px-3 py-2 rounded-lg bg-light-gray/50 text-white border border-gray-700" />
            <div>
              <input list="admin-album-moods" value={moods} onChange={e=>setMoods(e.target.value)} placeholder="Moods (comma separated)" className="w-full px-3 py-2 rounded-lg bg-light-gray/50 text-white border border-gray-700" />
              <datalist id="admin-album-moods">
                {moodOptions.map((option) => (
                  <option key={option} value={option} />
                ))}
              </datalist>
            </div>

          </div>
          <button onClick={createAlbum} disabled={!canCreate} className="px-4 py-2 rounded-lg bg-neon-blue text-dark-bg disabled:opacity-50 font-medium mt-2">
            {creating ? 'Creating...' : 'Create Album'}
          </button>
        </div>

        {/* List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {albums.map(a => (
            <div key={a._id || a.id} className="flex flex-col p-3 rounded-lg bg-light-gray/30 gap-3">
              <div className="flex gap-3">
                 {/* Image */}
                 <div className="w-16 h-16 flex-shrink-0 bg-black/40 rounded overflow-hidden">
                   {a.images && a.images[0] ? (
                     <img src={a.images[0].url} alt={getAlbumDisplayName(a)} className="w-full h-full object-cover" />
                   ) : (
                     <div className="w-full h-full flex items-center justify-center text-gray-600 text-xs">No Img</div>
                   )}
                 </div>
                 <div className="flex-1 min-w-0">
                   <div className="font-medium truncate">{getAlbumDisplayName(a)}</div>
                   <div className="text-xs text-gray-400 truncate">
                     {a.artists && a.artists.map(ar => ar.name).join(', ')}
                   </div>
                   <div className="text-xs text-gray-500 mt-1">
                     {a.release_date} ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ {a.album_type}
                   </div>
                   <div className="text-xs text-neon-blue mt-1">
                     Linked Tracks: {trackCounts[a._id || a.id] || 0}
                   </div>
                 </div>
              </div>
              
              <div className="flex items-center gap-2 mt-auto">
                <button onClick={()=>navigate(`/admin/albums/edit/${a._id || a.id}`)} className="flex-1 px-3 py-1 rounded bg-gray-600 text-white text-sm">Edit</button>
                <button onClick={()=>handleDeleteClick(a)} className="flex-1 px-3 py-1 rounded bg-red-500/80 text-white text-sm">Delete</button>
              </div>
            </div>
          ))}
        </div>
        
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-400">
            {loading ? 'Loading...' : `Total: ${albums.length} album${albums.length !== 1 ? 's' : ''}`}
          </div>
          <button 
            disabled={loading} 
            onClick={load} 
            className="px-3 py-2 rounded bg-gray-700 text-white disabled:opacity-50 hover:bg-gray-600"
          >
            Refresh
          </button>
        </div>

        <ConfirmModal
          isOpen={deleteModalOpen}
          onClose={() => setDeleteModalOpen(false)}
          onConfirm={confirmDelete}
          title="Delete Album"
          message={`Are you sure you want to delete "${albumToDelete?.name}"? This action cannot be undone.`}
          confirmText="Delete Album"
          isDangerous={true}
        />
      </motion.section>
    </AdminLayout>
  );
}


