import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import AdminLayout from './AdminLayout';
import apiService from '../../services/api';
import { ToastContainer } from '../../components/ui/Toast';
import ConfirmModal from '../../components/ui/ConfirmModal';

export default function AdminVinyls() {
  const [vinyls, setVinyls] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [songs, setSongs] = useState([]);
  const [name, setName] = useState('');
  const [artist, setArtist] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [releaseYear, setReleaseYear] = useState('');
  const [displayInStore, setDisplayInStore] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [albumId, setAlbumId] = useState('');
  const [songId, setSongId] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toasts, setToasts] = useState([]);
  
  // Edit State
  const [editingId, setEditingId] = useState(null);

  // Delete State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [vinylToDelete, setVinylToDelete] = useState(null);

  const showToast = (message, type = 'success', duration = 3000) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type, duration }]);
  };
  const removeToast = (id) => setToasts(prev => prev.filter(t => t.id !== id));

  const load = async () => {
    setLoading(true);
    try {
      const [res, albumsRes, songsRes] = await Promise.all([
        apiService.getVinyls(1, 100),
        apiService.getAlbums(1, 1000),
        apiService.getSongs(1, 1000)
      ]);
      
      const list = Array.isArray(res?.vinyls) ? res.vinyls : Array.isArray(res) ? res : [];
      setVinyls(list);
      setAlbums(albumsRes?.albums || []);
      setSongs(songsRes?.songs || []);
    } catch (err) {
      console.error(err);
      showToast('Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleAlbumChange = (id) => {
    setAlbumId(id);
    if (id) {
      const selectedAlbum = albums.find(a => a._id === id);
      if (selectedAlbum) {
        setName(selectedAlbum.name);
        setArtist(selectedAlbum.artist);
        if (selectedAlbum.release_date) {
          setReleaseYear(new Date(selectedAlbum.release_date).getFullYear());
        }
      }
    }
  };

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result || '';
        const base64 = String(result).split(',')[1] || '';
        resolve({ base64, mime: file.type || 'image/png' });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const resetForm = () => {
    setName('');
    setArtist('');
    setDescription('');
    setPrice('');
    setReleaseYear('');
    setDisplayInStore(false);
    setImageFile(null);
    setAlbumId('');
    setSongId('');
    setEditingId(null);
  };

  const handleSubmit = async () => {
    if (!name.trim() || (!editingId && !imageFile)) return;
    setSubmitting(true);
    try {
      let imageData = {};
      if (imageFile) {
        const { base64, mime } = await fileToBase64(imageFile);
        imageData = { image_base64: base64, mime_type: mime };
      }

      const payload = {
        name: name.trim(),
        artist: artist.trim(),
        description: description.trim(),
        price: parseFloat(price) || 0,
        release_year: parseInt(releaseYear) || undefined,
        display_in_store: displayInStore,
        albumId: albumId.trim() || undefined,
        songId: songId.trim() || undefined,
        ...imageData
      };

      if (editingId) {
        await apiService.updateVinyl(editingId, payload);
        showToast('Vinyl updated', 'success');
      } else {
        await apiService.createVinyl(payload);
        showToast('Vinyl created', 'success');
      }
      
      resetForm();
      await load();
    } catch (err) {
      showToast(err?.message || 'Failed to save vinyl', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (v) => {
    setEditingId(v._id || v.id);
    setName(v.name || '');
    setArtist(v.artist || '');
    setDescription(v.description || '');
    setPrice(v.price?.toString() || '');
    setReleaseYear(v.release_year?.toString() || '');
    setDisplayInStore(v.display_in_store || false);
    setAlbumId(v.albumId?._id || v.albumId || '');
    setSongId(v.songId?._id || v.songId || '');
    setImageFile(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteClick = (vinyl) => {
    setVinylToDelete(vinyl);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!vinylToDelete) return;
    try {
      await apiService.deleteVinyl(vinylToDelete._id || vinylToDelete.id);
      showToast('Vinyl deleted', 'success');
      await load();
    } catch (err) {
      showToast(err?.message || 'Failed to delete', 'error');
    } finally {
      setDeleteModalOpen(false);
      setVinylToDelete(null);
    }
  };

  return (
    <AdminLayout>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-white">Vinyl Management</h2>
          {editingId && (
            <button onClick={resetForm} className="text-sm text-gray-400 hover:text-white underline">
              Cancel Editing
            </button>
          )}
        </div>

        <div className="p-6 bg-dark-gray/40 rounded-xl border border-gray-800 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs text-gray-400">Vinyl Name</label>
              <input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. God Did" className="w-full px-3 py-2 rounded-lg bg-light-gray/50 text-white border border-gray-700 focus:border-neon-blue outline-none" />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-gray-400">Artist</label>
              <input value={artist} onChange={e=>setArtist(e.target.value)} placeholder="e.g. DJ Khaled" className="w-full px-3 py-2 rounded-lg bg-light-gray/50 text-white border border-gray-700 focus:border-neon-blue outline-none" />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-gray-400">Price ($)</label>
              <input type="number" value={price} onChange={e=>setPrice(e.target.value)} placeholder="29.99" className="w-full px-3 py-2 rounded-lg bg-light-gray/50 text-white border border-gray-700 focus:border-neon-blue outline-none" />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-gray-400">Release Year</label>
              <input type="number" value={releaseYear} onChange={e=>setReleaseYear(e.target.value)} placeholder="2022" className="w-full px-3 py-2 rounded-lg bg-light-gray/50 text-white border border-gray-700 focus:border-neon-blue outline-none" />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-gray-400">Link to Album</label>
              <select value={albumId} onChange={e=>handleAlbumChange(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-light-gray/50 text-white border border-gray-700 focus:border-neon-blue outline-none appearance-none">
                <option value="">None</option>
                {albums.map(album => <option key={album._id} value={album._id}>{album.name}</option>)}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-gray-400">Link to Song</label>
              <select value={songId} onChange={e=>setSongId(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-light-gray/50 text-white border border-gray-700 focus:border-neon-blue outline-none appearance-none">
                <option value="">None</option>
                {songs.map(song => <option key={song._id} value={song._id}>{song.name}</option>)}
              </select>
            </div>

            <div className="md:col-span-2 lg:col-span-3 space-y-1">
              <label className="text-xs text-gray-400">Description</label>
              <textarea value={description} onChange={e=>setDescription(e.target.value)} placeholder="Tell us more about this vinyl..." rows="3" className="w-full px-3 py-2 rounded-lg bg-light-gray/50 text-white border border-gray-700 focus:border-neon-blue outline-none resize-none" />
            </div>

            <div className="flex items-center space-x-3 p-2 bg-light-gray/20 rounded-lg border border-gray-700">
              <input type="checkbox" id="displayInStore" checked={displayInStore} onChange={e=>setDisplayInStore(e.target.checked)} className="w-4 h-4 rounded border-gray-700 text-neon-blue focus:ring-neon-blue" />
              <label htmlFor="displayInStore" className="text-sm text-gray-200 cursor-pointer">Display in Store</label>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-gray-400">Vinyl Image {editingId && '(Optional if not changing)'}</label>
              <input type="file" accept="image/*" onChange={e=>setImageFile(e.target.files[0])} className="w-full text-xs text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-neon-blue/10 file:text-neon-blue hover:file:bg-neon-blue/20 cursor-pointer" />
            </div>
          </div>

          <div className="pt-2">
            <button onClick={handleSubmit} disabled={submitting || !name.trim()} className="px-6 py-2 rounded-lg bg-neon-blue text-dark-bg font-bold disabled:opacity-50 transition-all hover:scale-105 active:scale-95">
              {submitting ? 'Processing...' : editingId ? 'Update Vinyl' : 'Create Vinyl'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {vinyls.map(v => (
            <div key={v._id || v.id} className={`p-4 rounded-xl bg-light-gray/30 border ${v.display_in_store ? 'border-neon-blue/30' : 'border-gray-800'} space-y-3 relative overflow-hidden group`}>
              {!v.display_in_store && (
                <div className="absolute top-2 right-2 px-2 py-1 bg-gray-900/80 text-[10px] text-gray-400 rounded uppercase tracking-wider border border-gray-700">Hidden</div>
              )}
              {v.display_in_store && (
                <div className="absolute top-2 right-2 px-2 py-1 bg-neon-blue/20 text-[10px] text-neon-blue rounded uppercase tracking-wider border border-neon-blue/30">In Store</div>
              )}
              
              <div className="w-full aspect-square rounded-lg overflow-hidden bg-black/40 border border-gray-700">
                <img
                  src={v.image_base64 ? `data:${v.mime_type || 'image/png'};base64,${v.image_base64}` : v.image_url || '/src/assets/album_art_placeholder.svg'}
                  alt={v.name}
                  className="w-full h-full object-cover transition-transform group-hover:scale-110"
                />
              </div>
              
              <div>
                <div className="font-bold text-white truncate">{v.name}</div>
                <div className="text-xs text-gray-400 truncate">{v.artist}</div>
                <div className="text-sm text-neon-blue font-medium mt-1">${v.price || '0.00'}</div>
              </div>

              <div className="flex gap-2 pt-2">
                <button onClick={() => handleEdit(v)} className="flex-1 px-3 py-1.5 rounded bg-gray-700 text-white text-sm hover:bg-gray-600 transition-colors">Edit</button>
                <button onClick={() => handleDeleteClick(v)} className="px-3 py-1.5 rounded bg-red-600/20 text-red-500 text-sm hover:bg-red-600/40 transition-colors border border-red-600/30">Delete</button>
              </div>
            </div>
          ))}
        </div>

        {vinyls.length === 0 && !loading && (
          <div className="text-center py-20 bg-dark-gray/20 rounded-2xl border border-dashed border-gray-800">
            <p className="text-gray-500">No vinyls found. Create your first one above!</p>
          </div>
        )}

        <ConfirmModal
          isOpen={deleteModalOpen}
          onClose={() => setDeleteModalOpen(false)}
          onConfirm={confirmDelete}
          title="Delete Vinyl"
          message={`Are you sure you want to delete "${vinylToDelete?.name}"?`}
          confirmText="Delete Vinyl"
          isDangerous={true}
        />
      </motion.section>
    </AdminLayout>
  );
}
