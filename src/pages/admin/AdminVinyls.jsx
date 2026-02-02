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
  const [imageFile, setImageFile] = useState(null);
  const [albumId, setAlbumId] = useState('');
  const [songId, setSongId] = useState('');
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [toasts, setToasts] = useState([]);
  
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
        apiService.getVinyls(),
        apiService.getAlbums(1, 1000),
        apiService.getSongs(1, 1000)
      ]);
      
      const list = Array.isArray(res?.vinyls) ? res.vinyls : Array.isArray(res) ? res : [];
      setVinyls(list);

      // Handle albums response
      const albumsList = albumsRes?.albums || (Array.isArray(albumsRes) ? albumsRes : []);
      setAlbums(albumsList);

      // Handle songs response
      const songsList = songsRes?.songs || (Array.isArray(songsRes) ? songsRes : []);
      setSongs(songsList);

    } catch (err) {
      console.error(err);
      setVinyls([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

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

  const createVinyl = async () => {
    if (!name.trim() || !imageFile) return;
    setCreating(true);
    try {
      const { base64, mime } = await fileToBase64(imageFile);
      await apiService.createVinyl({
        name: name.trim(),
        image_base64: base64,
        mime_type: mime,
        albumId: albumId.trim() || undefined,
        songId: songId.trim() || undefined
      });
      setName(''); setImageFile(null); setAlbumId(''); setSongId('');
      showToast('Vinyl saved to database', 'success');
      await load();
    } catch (err) {
      showToast(err?.message || 'Failed to save vinyl', 'error');
    } finally {
      setCreating(false);
    }
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
      <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        <div className="p-4 bg-dark-gray/40 rounded-xl border border-gray-800 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input value={name} onChange={e=>setName(e.target.value)} placeholder="Vinyl name" className="px-3 py-2 rounded-lg bg-light-gray/50 text-white border border-gray-700" />
            
            <select 
              value={albumId} 
              onChange={e=>setAlbumId(e.target.value)} 
              className="px-3 py-2 rounded-lg bg-light-gray/50 text-white border border-gray-700 appearance-none"
            >
              <option value="">Select Album (Optional)</option>
              {albums.map(album => (
                <option key={album._id} value={album._id}>
                  {album.name}
                </option>
              ))}
            </select>

            <select 
              value={songId} 
              onChange={e=>setSongId(e.target.value)} 
              className="px-3 py-2 rounded-lg bg-light-gray/50 text-white border border-gray-700 appearance-none"
            >
              <option value="">Select Song (Optional)</option>
              {songs.map(song => (
                <option key={song._id} value={song._id}>
                  {song.name}
                </option>
              ))}
            </select>

            <div className="md:col-span-3">
              <label className="block text-xs text-gray-400 mb-1">Vinyl Image</label>
              <input type="file" accept="image/*" onChange={e=>setImageFile(e.target.files[0])} className="w-full text-xs text-gray-300" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={createVinyl} disabled={creating || !name.trim() || !imageFile} className="px-4 py-2 rounded-lg bg-neon-blue text-dark-bg disabled:opacity-50">Save Vinyl</button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {vinyls.map(v => (
            <div key={v._id || v.id} className="p-3 rounded-lg bg-light-gray/30 space-y-2">
              <div className="font-medium">{v.name}</div>
              <div className="w-full aspect-square rounded-lg overflow-hidden bg-black/40 border border-gray-700">
                <img
                  src={`data:${v.mime_type || 'image/png'};base64,${v.image_base64}`}
                  alt={v.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleDeleteClick(v)} className="px-3 py-1 rounded bg-red-600/80 text-white">Delete</button>
              </div>
            </div>
          ))}
        </div>

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
