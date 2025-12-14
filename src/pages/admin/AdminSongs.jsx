import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import apiService from '../../services/api';
import AdminLayout from './AdminLayout';
import { ToastContainer } from '../../components/ui/Toast';

export default function AdminSongs() {
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [genre, setGenre] = useState('');
  const [mood, setMood] = useState('');
  const [language, setLanguage] = useState('');
  const [tags, setTags] = useState('');
  
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editDuration, setEditDuration] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editGenre, setEditGenre] = useState('');
  const [editMood, setEditMood] = useState('');
  const [editLanguage, setEditLanguage] = useState('');
  const [editTags, setEditTags] = useState('');
  const [toasts, setToasts] = useState([]);
  const canCreate = useMemo(()=>name.trim().length>0 && !creating, [name, creating]);
  const [normalizing, setNormalizing] = useState(false);
  const [normalizedCount, setNormalizedCount] = useState(0);

  const showToast = (message, type = 'error', duration = 4000) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type, duration }]);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  // Load ALL songs from database (using high limit for admin)
  const load = async () => {
    setLoading(true);
    try {
      // Use high limit to get all items (backend allows up to 1000)
      const res = await apiService.getSongs(1, 1000, search);
      const list = Array.isArray(res?.songs) ? res.songs : Array.isArray(res) ? res : [];
      setSongs(list);
    } catch (error) {
      console.error('Error loading songs:', error);
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
      const payload = { 
        name: name.trim(),
        ...(category.trim() ? { category: category.trim() } : {}),
        ...(genre.trim() ? { genre: genre.trim() } : {}),
        ...(mood.trim() ? { mood: mood.trim() } : {}),
        ...(language.trim() ? { language: language.trim() } : {}),
        ...(tags.trim() ? { tags: tags.split(',').map(t=>t.trim()).filter(Boolean) } : {}),
      };
      console.log('Creating song with payload:', payload);
      const created = await apiService.createSong(payload);
      console.log('Song created successfully:', created);
      setName('');
      setCategory(''); setGenre(''); setMood(''); setLanguage(''); setTags('');
      showToast('Song created successfully!', 'success', 3000);
      // Reload all songs to ensure sync with database
      await load();
    } catch (error) {
      console.error('Error creating song:', error);
      const errorMessage = error?.message || error?.details?.message || error?.details?.error || 'Unknown error';
      showToast(`Failed to create song: ${errorMessage}`, 'error');
    } finally {
      setCreating(false);
    }
  };

  const saveSong = async () => {
    if (!editId) return;
    try {
      const updates = {};
      if (editName.trim()) updates.name = editName.trim();
      if (editDuration && /^[0-9]+$/.test(String(editDuration))) {
        updates.duration_ms = parseInt(String(editDuration), 10);
      }
      if (editCategory.trim()) updates.category = editCategory.trim();
      if (editGenre.trim()) updates.genre = editGenre.trim();
      if (editMood.trim()) updates.mood = editMood.trim();
      if (editLanguage.trim()) updates.language = editLanguage.trim();
      if (editTags.trim()) updates.tags = editTags.split(',').map(t=>t.trim()).filter(Boolean);
      await apiService.updateSong(editId, updates);
      setEditId(null); 
      setEditName(''); 
      setEditDuration('');
      setEditCategory(''); setEditGenre(''); setEditMood(''); setEditLanguage(''); setEditTags('');
      showToast('Song updated successfully!', 'success', 3000);
      // Reload all songs to ensure sync with database
      await load();
    } catch (error) {
      console.error('Error updating song:', error);
      showToast(`Failed to update song: ${error?.message || 'Unknown error'}`, 'error');
    }
  };

  const deleteSong = async (id) => {
    if (!window.confirm('Are you sure you want to delete this song?')) return;
    try {
      await apiService.deleteSong(id);
      showToast('Song deleted successfully!', 'success', 3000);
      // Reload all songs to ensure sync with database
      await load();
    } catch (error) {
      console.error('Error deleting song:', error);
      showToast(`Failed to delete song: ${error?.message || 'Unknown error'}`, 'error');
    }
  };

  const canonicalizeOne = (g) => {
    const list = apiService.canonicalizeGenreList([g]);
    return Array.isArray(list) && list[0] ? list[0] : '';
  };

  const getGenreForSong = (s) => {
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
    } catch (e) {
      console.error('Failed to create category for genre:', genreName, e);
      return null;
    }
  };

  const normalizeGenresAndAssign = async () => {
    if (normalizing) return;
    setNormalizing(true);
    setNormalizedCount(0);
    try {
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
        } catch (err) {
          console.error('Error normalizing song:', id, err);
        } finally {
          processed++;
          setNormalizedCount(processed);
        }
      }
      try {
        const res = await apiService.getCategories('Rai');
        const list = Array.isArray(res?.categories) ? res.categories : Array.isArray(res) ? res : [];
        for (const c of list) {
          const name = String(c?.name || '');
          const norm = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
          if (norm === 'rai') {
            const cid = c._id || c.id;
            if (cid) await apiService.deleteCategory(cid);
          }
        }
      } catch {}
      showToast(`Normalized ${processed} songs and assigned categories`, 'success', 4000);
      await load();
    } catch (err) {
      console.error('Normalization failed:', err);
      showToast(`Normalization failed: ${err?.message || 'Unknown error'}`, 'error');
    } finally {
      setNormalizing(false);
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
        <div className="flex items-center gap-2">
          <input 
            value={name} 
            onChange={e=>setName(e.target.value)} 
            placeholder="New song name" 
            className="px-3 py-2 rounded-lg bg-light-gray/50 text-white border border-gray-700 flex-1" 
          />
          <input 
            value={category}
            onChange={e=>setCategory(e.target.value)}
            placeholder="Category (e.g., Pop Songs)"
            className="px-3 py-2 rounded-lg bg-light-gray/50 text-white border border-gray-700 flex-1"
          />
          <input 
            value={genre}
            onChange={e=>setGenre(e.target.value)}
            placeholder="Genre (e.g., pop)"
            className="px-3 py-2 rounded-lg bg-light-gray/50 text-white border border-gray-700 flex-1"
          />
          <input 
            value={mood}
            onChange={e=>setMood(e.target.value)}
            placeholder="Mood (e.g., chill)"
            className="px-3 py-2 rounded-lg bg-light-gray/50 text-white border border-gray-700 flex-1"
          />
          <input 
            value={language}
            onChange={e=>setLanguage(e.target.value)}
            placeholder="Language (e.g., English)"
            className="px-3 py-2 rounded-lg bg-light-gray/50 text-white border border-gray-700 flex-1"
          />
          <input 
            value={tags}
            onChange={e=>setTags(e.target.value)}
            placeholder="Tags (comma-separated)"
            className="px-3 py-2 rounded-lg bg-light-gray/50 text-white border border-gray-700 flex-1"
          />
          
          <button onClick={createSong} disabled={!canCreate} className="px-3 py-2 rounded-lg bg-neon-blue text-dark-bg disabled:opacity-50">
            {creating ? 'Creating...' : 'Create'}
          </button>
          <button onClick={autoPopulate} className="px-3 py-2 rounded-lg bg-purple-500/80 text-white">Auto-populate categories</button>
          <button onClick={normalizeGenresAndAssign} disabled={normalizing} className="px-3 py-2 rounded-lg bg-green-600/80 text-white disabled:opacity-50">
            {normalizing ? `Normalizing... (${normalizedCount}/${songs.length})` : 'Normalize genres and assign'}
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {songs.map(s => (
            <div key={s._id || s.id} className="flex items-center justify-between p-3 rounded-lg bg-light-gray/30">
              {editId === (s._id || s.id) ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 w-full">
                  <input className="px-3 py-2 rounded bg-light-gray/50 text-white border border-gray-700" value={editName} onChange={e=>setEditName(e.target.value)} placeholder="Name" />
                  <input className="px-3 py-2 rounded bg-light-gray/50 text-white border border-gray-700" value={editDuration} onChange={e=>setEditDuration(e.target.value)} placeholder="Duration (ms)" />
                  <input className="px-3 py-2 rounded bg-light-gray/50 text-white border border-gray-700" value={editCategory} onChange={e=>setEditCategory(e.target.value)} placeholder="Category" />
                  <input className="px-3 py-2 rounded bg-light-gray/50 text-white border border-gray-700" value={editGenre} onChange={e=>setEditGenre(e.target.value)} placeholder="Genre" />
                  <input className="px-3 py-2 rounded bg-light-gray/50 text-white border border-gray-700" value={editMood} onChange={e=>setEditMood(e.target.value)} placeholder="Mood" />
                  <input className="px-3 py-2 rounded bg-light-gray/50 text-white border border-gray-700" value={editLanguage} onChange={e=>setEditLanguage(e.target.value)} placeholder="Language" />
                  <input className="px-3 py-2 rounded bg-light-gray/50 text-white border border-gray-700" value={editTags} onChange={e=>setEditTags(e.target.value)} placeholder="Tags (comma-separated)" />
                  <div className="flex items-center gap-2">
                    <button onClick={saveSong} className="px-3 py-1 rounded bg-neon-blue text-dark-bg">Save</button>
                    <button onClick={()=>{ setEditId(null); setEditName(''); setEditDuration(''); }} className="px-3 py-1 rounded bg-gray-700 text-white">Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="truncate">{s.name}</div>
                  <div className="flex items-center gap-2">
                    <button onClick={()=>{ setEditId(s._id || s.id); setEditName(s.name || ''); setEditDuration(String(s.duration_ms || '')); setEditCategory(s.category || ''); setEditGenre(s.genre || ''); setEditMood(s.mood || ''); setEditLanguage(s.language || ''); setEditTags((s.tags || []).join(', ')); }} className="px-3 py-1 rounded bg-gray-600 text-white">Edit</button>
                    <button onClick={()=>deleteSong(s._id || s.id)} className="px-3 py-1 rounded bg-red-500/80 text-white">Delete</button>
                  </div>
                </>
              )}
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
