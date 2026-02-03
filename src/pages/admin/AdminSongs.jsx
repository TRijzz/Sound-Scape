import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import apiService from '../../services/api';
import AdminLayout from './AdminLayout';
import { ToastContainer } from '../../components/ui/Toast';

export default function AdminSongs() {
  const navigate = useNavigate();
  const [songs, setSongs] = useState([]);
  const [artists, setArtists] = useState([]);
  const [albums, setAlbums] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState('');
  
  // Create State
  const [name, setName] = useState('');
  const [selectedArtists, setSelectedArtists] = useState([]);
  const [selectedAlbum, setSelectedAlbum] = useState('');
  const [durationMs, setDurationMs] = useState('');
  const [trackNumber, setTrackNumber] = useState('');
  const [discNumber, setDiscNumber] = useState('1');
  const [explicit, setExplicit] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [popularity, setPopularity] = useState('');
  const [category, setCategory] = useState('');
  const [genre, setGenre] = useState('');
  const [mood, setMood] = useState('');
  const [language, setLanguage] = useState('');
  const [tags, setTags] = useState('');
  const [spotifyId, setSpotifyId] = useState('');
  
  const [audioFile, setAudioFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [lyricsFile, setLyricsFile] = useState(null);
  
  const [toasts, setToasts] = useState([]);
  const canCreate = useMemo(()=>name.trim().length>0 && !creating, [name, creating]);
  const [normalizing, setNormalizing] = useState(false);
  const [normalizedCount, setNormalizedCount] = useState(0);
  const [syncingFolders, setSyncingFolders] = useState(false);

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
      const [res, artistsRes, albumsRes] = await Promise.all([
        apiService.getSongs(1, 1000, search),
        apiService.getArtists(1, 1000),
        apiService.getAlbums(1, 1000)
      ]);
      
      const list = Array.isArray(res?.songs) ? res.songs : Array.isArray(res) ? res : [];
      setSongs(list);
      
      setArtists(artistsRes?.artists || (Array.isArray(artistsRes) ? artistsRes : []));
      setAlbums(albumsRes?.albums || (Array.isArray(albumsRes) ? albumsRes : []));
    } catch (error) {
      console.error('Error loading data:', error);
      setSongs([]);
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(()=>{ load(); /* eslint-disable-line */ }, [search]);

  const autoPopulate = async () => {
    try {
      showToast('Starting auto-populate...', 'success', 2000);
      const res = await apiService.populateSongCategories({ dryRun: false, limit: 1000 });
      showToast(`Auto-populate complete: ${res?.updated || 0} songs updated`, 'success', 3000);
      await load();
    } catch (err) {
      showToast(`Auto-populate failed: ${err?.message || 'Unknown error'}`);
    }
  };

  const createSong = async () => {
    if (!canCreate || creating) return;
    setCreating(true);
    try {
      const formData = new FormData();
      formData.append('name', name.trim());
      if (selectedAlbum) formData.append('album', selectedAlbum);
      if (durationMs) formData.append('duration_ms', durationMs);
      if (trackNumber) formData.append('track_number', trackNumber);
      if (discNumber) formData.append('disc_number', discNumber);
      formData.append('explicit', String(explicit));
      if (previewUrl) formData.append('preview_url', previewUrl);
      if (popularity) formData.append('popularity', popularity);
      if (category.trim()) formData.append('category', category.trim());
      if (genre.trim()) formData.append('genre', genre.trim());
      if (mood.trim()) formData.append('mood', mood.trim());
      if (language.trim()) formData.append('language', language.trim());
      if (spotifyId.trim()) formData.append('spotify_id', spotifyId.trim());
      
      if (tags.trim()) {
        const tagList = tags.split(',').map(t=>t.trim()).filter(Boolean);
        tagList.forEach(t => formData.append('tags[]', t));
      }

      if (selectedArtists.length > 0) {
        // Send as JSON string for array
        formData.append('artists', JSON.stringify(selectedArtists));
      }
      
      if (audioFile) formData.append('audio', audioFile);
      if (coverFile) formData.append('cover', coverFile);
      if (lyricsFile) formData.append('lyricsFile', lyricsFile);

      console.log('Creating song with FormData');
      const created = await apiService.createSong(formData);
      console.log('Song created successfully:', created);
      
      // Reset
      setName(''); setSelectedAlbum(''); setSelectedArtists([]);
      setDurationMs(''); setTrackNumber(''); setDiscNumber('1'); setExplicit(false);
      setPreviewUrl(''); setPopularity(''); setCategory(''); setGenre(''); 
      setMood(''); setLanguage(''); setTags(''); setSpotifyId('');
      setAudioFile(null); setCoverFile(null); setLyricsFile(null);
      
      // Reset file inputs
      const fileInputs = document.querySelectorAll('input[type="file"]');
      fileInputs.forEach(input => input.value = '');
      
      showToast('Song created successfully!', 'success', 3000);
      await load();
    } catch (error) {
      console.error('Error creating song:', error);
      const errorMessage = error?.message || error?.details?.message || error?.details?.error || 'Unknown error';
      showToast(`Failed to create song: ${errorMessage}`, 'error');
    } finally {
      setCreating(false);
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
      showToast(`Failed to delete song: ${error?.message || 'Unknown error'}`, 'error');
    }
  };

  const normalizeGenresAndAssign = async () => {
    if (normalizing) return;
    setNormalizing(true);
    setNormalizedCount(0);
    try {
      // (Simplified logic from previous version, kept as is)
      // ... (We can keep the same logic or just call the API endpoint if it exists, but the previous code had client-side logic)
      // For brevity, I'll include a placeholder or the original logic if it's critical.
      // The user asked for CRUD operations attributes, so this helper function is secondary but I should keep it working.
      // I'll copy the logic back in.
      
      const getGenreForSong = (s) => {
         const canonicalizeOne = (g) => {
            const list = apiService.canonicalizeGenreList([g]);
            return Array.isArray(list) && list[0] ? list[0] : '';
         };
         if (Array.isArray(s?.genres) && s.genres.length > 0) {
           const first = canonicalizeOne(s.genres[0]);
           if (first) return first;
         }
         if (s?.genre) {
           const single = canonicalizeOne(s.genre);
           if (single) return single;
         }
         return '';
      };
      
      const getOrCreateCategoryIdForGenre = async (genreName) => {
        try {
          const res = await apiService.getCategories(genreName);
          const list = Array.isArray(res?.categories) ? res.categories : Array.isArray(res) ? res : [];
          const found = list.find(c => String(c?.name || '').toLowerCase() === String(genreName).toLowerCase());
          if (found) return found._id || found.id;
        } catch {}
        try {
          const created = await apiService.createCategory({ name: genreName });
          return created?._id || created?.id;
        } catch (e) { return null; }
      };

      try {
        const genres = await apiService.getGenres(100);
        for (const g of (Array.isArray(genres) ? genres : [])) {
          await getOrCreateCategoryIdForGenre(g);
        }
      } catch {}
      
      let processed = 0;
      for (const s of songs) {
        const canonical = getGenreForSong(s);
        if (!canonical) { processed++; setNormalizedCount(processed); continue; }
        const id = s._id || s.id;
        try {
          if (String(s.genre || '').toLowerCase() !== String(canonical).toLowerCase()) {
            await apiService.updateSong(id, { genre: canonical });
          }
          const catId = await getOrCreateCategoryIdForGenre(canonical);
          if (catId) {
            await apiService.addSongToCategory(catId, id);
          }
        } catch (err) {} finally {
          processed++;
          setNormalizedCount(processed);
        }
      }
      showToast(`Normalized ${processed} songs`, 'success', 4000);
      await load();
    } catch (err) {
      showToast(`Normalization failed: ${err?.message}`, 'error');
    } finally {
      setNormalizing(false);
    }
  };

  const handleFolderSync = async () => {
    if (syncingFolders) return;
    setSyncingFolders(true);
    try {
      showToast('Starting folder sync...', 'success', 2000);
      const res = await apiService.syncFromFolders();
      showToast(`Folder sync complete: Added ${res?.stats?.added || 0}, Updated ${res?.stats?.updated || 0}`, 'success', 4000);
      await load();
    } catch (err) {
      showToast(`Folder sync failed: ${err?.message || 'Unknown error'}`, 'error');
    } finally {
      setSyncingFolders(false);
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
            placeholder="Search songs" 
            className="px-3 py-2 rounded-lg bg-light-gray/50 text-white border border-gray-700 flex-1" 
          />
        </div>
        
        {/* Create Form */}
        <div className="p-4 bg-dark-gray/40 rounded-xl border border-gray-800 space-y-3">
          <h3 className="text-lg font-medium text-white">Create Song</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input value={name} onChange={e=>setName(e.target.value)} placeholder="Name *" className="px-3 py-2 rounded-lg bg-light-gray/50 text-white border border-gray-700" />
            
            <input value={discNumber} onChange={e=>setDiscNumber(e.target.value)} type="number" placeholder="Disc #" className="px-3 py-2 rounded-lg bg-light-gray/50 text-white border border-gray-700" />
            <div className="flex items-center px-3 border border-gray-700 rounded-lg bg-light-gray/50">
               <label className="flex items-center gap-2 text-white text-sm cursor-pointer w-full py-2">
                 <input type="checkbox" checked={explicit} onChange={e=>setExplicit(e.target.checked)} className="rounded bg-gray-700 border-gray-600 text-neon-blue focus:ring-neon-blue" />
                 Explicit
               </label>
            </div>

            <input value={category} onChange={e=>setCategory(e.target.value)} placeholder="Category" className="px-3 py-2 rounded-lg bg-light-gray/50 text-white border border-gray-700" />
            <input value={genre} onChange={e=>setGenre(e.target.value)} placeholder="Genre" className="px-3 py-2 rounded-lg bg-light-gray/50 text-white border border-gray-700" />
            <input value={mood} onChange={e=>setMood(e.target.value)} placeholder="Mood" className="px-3 py-2 rounded-lg bg-light-gray/50 text-white border border-gray-700" />
            
            <input value={language} onChange={e=>setLanguage(e.target.value)} placeholder="Language" className="px-3 py-2 rounded-lg bg-light-gray/50 text-white border border-gray-700" />

            <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-3">
               <div>
                  <label className="block text-xs text-gray-400 mb-1">Audio</label>
                  <input type="file" accept="audio/*" onChange={e=>setAudioFile(e.target.files[0])} className="w-full text-xs text-gray-300" />
               </div>
               <div>
                  <label className="block text-xs text-gray-400 mb-1">Cover</label>
                  <input type="file" accept="image/*" onChange={e=>setCoverFile(e.target.files[0])} className="w-full text-xs text-gray-300" />
               </div>
               <div>
                  <label className="block text-xs text-gray-400 mb-1">Lyrics</label>
                  <input type="file" accept=".lrc,.txt" onChange={e=>setLyricsFile(e.target.files[0])} className="w-full text-xs text-gray-300" />
               </div>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2 mt-2">
            <button onClick={createSong} disabled={!canCreate} className="px-4 py-2 rounded-lg bg-neon-blue text-dark-bg disabled:opacity-50 font-medium">
              {creating ? 'Creating...' : 'Create Song'}
            </button>
            <button onClick={autoPopulate} className="px-3 py-2 rounded-lg bg-purple-500/80 text-white text-sm">Auto-populate</button>
            <button onClick={normalizeGenresAndAssign} disabled={normalizing} className="px-3 py-2 rounded-lg bg-green-600/80 text-white disabled:opacity-50 text-sm">
              {normalizing ? `Normalizing...` : 'Normalize'}
            </button>
            <button onClick={handleFolderSync} disabled={syncingFolders} className="px-3 py-2 rounded-lg bg-yellow-600/80 text-white disabled:opacity-50 text-sm">
              {syncingFolders ? 'Syncing...' : 'Sync Folders'}
            </button>
          </div>
        </div>

        {/* List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {songs.map(s => (
            <div key={s._id || s.id} className="flex flex-col p-3 rounded-lg bg-light-gray/30 gap-3">
              <div className="flex gap-3">
                 <div className="w-16 h-16 flex-shrink-0 bg-black/40 rounded overflow-hidden">
                   {(s.cover_art_url || s.album?.images?.[0]?.url) ? (
                     <img 
                       src={s.cover_art_url || s.album?.images?.[0]?.url} 
                       alt={s.name} 
                       className="w-full h-full object-cover" 
                     />
                   ) : (
                     <div className="w-full h-full flex items-center justify-center text-gray-600 text-xs">No Art</div>
                   )}
                 </div>
                 <div className="flex-1 min-w-0">
                   <div className="font-medium truncate">{s.name}</div>
                   <div className="text-xs text-gray-400 truncate">
                     {s.artists && s.artists.map(ar => ar.name).join(', ')}
                   </div>
                   <div className="text-xs text-gray-500 mt-1">
                     {s.album ? s.album.name : 'No Album'} • {Math.floor((s.duration_ms||0)/1000/60)}:{(Math.floor((s.duration_ms||0)/1000)%60).toString().padStart(2,'0')}
                   </div>
                   <div className="flex flex-wrap gap-1 mt-1">
                     {s.explicit && <div className="text-[10px] text-red-400 border border-red-400/50 inline-block px-1 rounded">Explicit</div>}
                     {s.audio_url ? (
                       <div className="text-[10px] text-green-400 border border-green-400/50 inline-block px-1 rounded flex items-center gap-1">
                         <span>Audio</span>
                         <svg className="w-2 h-2" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                       </div>
                     ) : (
                       <div className="text-[10px] text-orange-400 border border-orange-400/50 inline-block px-1 rounded">No Audio</div>
                     )}
                   </div>
                 </div>
              </div>
              
              <div className="flex items-center gap-2 mt-auto">
                <button onClick={()=>navigate(`/admin/songs/edit/${s._id || s.id}`)} className="flex-1 px-3 py-1 rounded bg-gray-600 text-white text-sm">Edit</button>
                <button onClick={()=>deleteSong(s._id || s.id)} className="flex-1 px-3 py-1 rounded bg-red-500/80 text-white text-sm">Delete</button>
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-400">
            {loading ? 'Loading...' : `Total: ${songs.length} song${songs.length !== 1 ? 's' : ''}`}
          </div>
          <button 
            disabled={loading} 
            onClick={load} 
            className="px-3 py-2 rounded bg-gray-700 text-white disabled:opacity-50 hover:bg-gray-600"
          >
            Refresh
          </button>
        </div>
      </motion.section>
    </AdminLayout>
  );
}
