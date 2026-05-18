import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import AdminLayout from './AdminLayout';
import apiService from '../../services/api';
import { ToastContainer } from '../../components/ui/Toast';
import ConfirmModal from '../../components/ui/ConfirmModal';
import {
  getAdminEntityId,
  isAdminVisibleAlbum,
  isAdminVisibleArtist,
  isAdminVisibleSong
} from '../../utils/adminVisibility';

const getAlbumTrackCount = (counts, album) => counts[album._id || album.id] || 0;

export default function AdminVinyls() {
  const [vinyls, setVinyls] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [songs, setSongs] = useState([]);
  const [albumTrackCounts, setAlbumTrackCounts] = useState({});
  const [name, setName] = useState('');
  const [artist, setArtist] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [releaseYear, setReleaseYear] = useState('');
  const [displayInStore, setDisplayInStore] = useState(false);
  const [isAvailable, setIsAvailable] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);
  const [imageFiles, setImageFiles] = useState([]);
  const [albumId, setAlbumId] = useState('');
  const [songId, setSongId] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [vinylToDelete, setVinylToDelete] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [showHiddenArtistContent, setShowHiddenArtistContent] = useState(false);
  const hiddenArtistIds = useMemo(
    () => new Set(
      albums
        .flatMap((album) => Array.isArray(album?.artists) ? album.artists : [])
        .filter((artist) => !isAdminVisibleArtist(artist))
        .map((artist) => getAdminEntityId(artist))
        .filter(Boolean)
    ),
    [albums]
  );
  const stats = useMemo(() => ({
    total: vinyls.length,
    visible: vinyls.filter((vinyl) => vinyl.display_in_store).length,
    featured: vinyls.filter((vinyl) => vinyl.is_featured).length,
    available: vinyls.filter((vinyl) => vinyl.is_available !== false).length
  }), [vinyls]);

  const showToast = (message, type = 'success', duration = 3000) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type, duration }]);
  };
  const removeToast = (id) => setToasts((prev) => prev.filter((toast) => toast.id !== id));

  const isArtistAllowed = (artist) => {
    const artistId = getAdminEntityId(artist);
    if (artistId && hiddenArtistIds.has(artistId)) return false;
    return showHiddenArtistContent || isAdminVisibleArtist(artist);
  };

  const hasRestrictedArtistLink = (artistList) => Array.isArray(artistList) && artistList.some((artist) => !isArtistAllowed(artist));

  const getAlbumArtistLabel = (album) => {
    const names = Array.isArray(album?.artists) ? album.artists.filter(isArtistAllowed).map((artist) => artist.name).filter(Boolean) : [];
    return names.length > 0 ? names.join(', ') : 'Unknown artist';
  };

  const formatAlbumOption = (album, counts) => {
    const trackCount = getAlbumTrackCount(counts, album);
    const artistLabel = getAlbumArtistLabel(album);
    const releaseDate = album?.release_date || 'No date';
    return `${album.name} | ${artistLabel} | ${releaseDate} | ${trackCount} tracks`;
  };

  const sortedAlbums = useMemo(() => {
    return [...albums]
      .filter((album) => showHiddenArtistContent || !hasRestrictedArtistLink(album?.artists))
      .sort((left, right) => {
        const leftCount = getAlbumTrackCount(albumTrackCounts, left);
        const rightCount = getAlbumTrackCount(albumTrackCounts, right);
        if (leftCount !== rightCount) return rightCount - leftCount;
        return String(left.name || '').localeCompare(String(right.name || ''));
      });
  }, [albums, albumTrackCounts, showHiddenArtistContent]);

  const dropdownAlbums = useMemo(
    () => sortedAlbums.filter(isAdminVisibleAlbum),
    [sortedAlbums]
  );
  const dropdownSongs = useMemo(
    () => songs.filter(isAdminVisibleSong),
    [songs]
  );

  const filteredVinyls = useMemo(
    () => vinyls.filter((vinyl) => showHiddenArtistContent || !hasRestrictedArtistLink(vinyl?.albumId?.artists)),
    [vinyls, showHiddenArtistContent]
  );

  const existingAlbumVinylCount = useMemo(() => {
    if (!albumId) return 0;
    return vinyls.filter((vinyl) => String(vinyl.albumId?._id || vinyl.albumId || '') === String(albumId)).length;
  }, [albumId, vinyls]);

  const load = async () => {
    setLoading(true);
    try {
      const [res, albumsRes, songsRes] = await Promise.all([
        apiService.getVinyls(1, 200),
        apiService.getAlbums(1, 1000),
        apiService.getSongs(1, 2000),
      ]);

      const vinylList = Array.isArray(res?.vinyls) ? res.vinyls : Array.isArray(res) ? res : [];
      const albumList = albumsRes?.albums || [];
      const songList = songsRes?.songs || [];
      const counts = {};

      songList.forEach((song) => {
        const linkedAlbumId = typeof song.album === 'object' ? song.album?._id || song.album?.id : song.album;
        if (!linkedAlbumId) return;
        counts[linkedAlbumId] = (counts[linkedAlbumId] || 0) + 1;
      });

      setVinyls(vinylList);
      setAlbums(albumList);
      setSongs(songList);
      setAlbumTrackCounts(counts);
    } catch (err) {
      console.error(err);
      showToast('Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleAlbumChange = (id) => {
    setAlbumId(id);
    if (!id) return;
    const selectedAlbum = albums.find((album) => album._id === id || album.id === id);
    if (selectedAlbum) {
      setName(selectedAlbum.name || '');
      setArtist(getAlbumArtistLabel(selectedAlbum));
      if (selectedAlbum.release_date) {
        setReleaseYear(String(new Date(selectedAlbum.release_date).getFullYear()));
      }
    }
  };


  const resetForm = () => {
    setName('');
    setArtist('');
    setDescription('');
    setPrice('');
    setReleaseYear('');
    setDisplayInStore(false);
    setIsAvailable(true);
    setIsFeatured(false);
    setImageFiles([]);
    setAlbumId('');
    setSongId('');
    setEditingId(null);
  };

  const handleSubmit = async () => {
    if (!name.trim() || (!editingId && imageFiles.length === 0)) return;
    setSubmitting(true);
    try {
      const payload = new FormData();
      payload.append('name', name.trim());
      payload.append('artist', artist.trim());
      payload.append('description', description.trim());
      payload.append('price', String(parseFloat(price) || 0));
      if (releaseYear) payload.append('release_year', String(parseInt(releaseYear, 10) || ''));
      payload.append('display_in_store', String(displayInStore));
      payload.append('is_available', String(isAvailable));
      payload.append('is_featured', String(isFeatured));
      payload.append('albumId', albumId.trim() || '');
      payload.append('songId', songId.trim() || '');
      imageFiles.forEach((file) => payload.append('vinylImage', file));

      if (editingId) {
        const response = await apiService.updateVinyl(editingId, payload);
        const extraCreatedCount = Array.isArray(response?.created_vinyls) ? response.created_vinyls.length : 0;
        showToast(extraCreatedCount > 0 ? `Vinyl updated and ${extraCreatedCount} more edition${extraCreatedCount === 1 ? '' : 's'} created` : 'Vinyl updated', 'success');
      } else {
        const response = await apiService.createVinyl(payload);
        const createdCount = Array.isArray(response?.vinyls) ? response.vinyls.length : 1;
        showToast(createdCount > 1 ? `${createdCount} vinyl editions created` : 'Vinyl created', 'success');
      }

      resetForm();
      await load();
    } catch (err) {
      showToast(err?.message || 'Failed to save vinyl', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (vinyl) => {
    setEditingId(vinyl._id || vinyl.id);
    setName(vinyl.name || '');
    setArtist(vinyl.artist || '');
    setDescription(vinyl.description || '');
    setPrice(vinyl.price?.toString() || '');
    setReleaseYear(vinyl.release_year?.toString() || '');
    setDisplayInStore(Boolean(vinyl.display_in_store));
    setIsAvailable(vinyl.is_available !== false);
    setIsFeatured(Boolean(vinyl.is_featured));
    setAlbumId(vinyl.albumId?._id || vinyl.albumId || '');
    setSongId(vinyl.songId?._id || vinyl.songId || '');
    setImageFiles([]);
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

  const toggleVinylSelection = (vinylId) => {
    setSelectedIds((prev) => (
      prev.includes(vinylId)
        ? prev.filter((id) => id !== vinylId)
        : [...prev, vinylId]
    ));
  };

  const bulkDeleteVinyls = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Delete ${selectedIds.length} selected vinyl${selectedIds.length === 1 ? '' : 's'}?`)) return;
    try {
      await Promise.all(selectedIds.map((id) => apiService.deleteVinyl(id)));
      setVinyls((prev) => prev.filter((vinyl) => !selectedIds.includes(String(vinyl._id || vinyl.id))));
      setSelectedIds([]);
      showToast(`Deleted ${selectedIds.length} vinyl${selectedIds.length === 1 ? '' : 's'}.`, 'success');
    } catch (err) {
      showToast(err?.message || 'Failed to delete selected vinyls', 'error');
    }
  };

  return (
    <AdminLayout>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <div className="rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(61,180,255,0.18),_transparent_38%),linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-neon-blue/80">Vinyl Console</p>
              <h2 className="text-3xl font-semibold text-white">List, create, publish, feature</h2>
              <p className="max-w-2xl text-sm text-gray-300">Manage store visibility, pricing, availability, and featured vinyl releases from one focused panel.</p>
            </div>
            {editingId ? (
              <button onClick={resetForm} className="rounded-2xl border border-white/10 px-5 py-3 text-sm font-semibold text-white hover:bg-white/5">
                Cancel editing
              </button>
            ) : (
              <button onClick={() => document.querySelector('input[placeholder="e.g. God Did"]')?.focus()} className="rounded-2xl bg-neon-blue px-5 py-3 text-sm font-semibold text-dark-bg hover:bg-neon-blue/85">
                Add vinyl
              </button>
            )}
          </div>
          <div className="mt-6 grid gap-3 md:grid-cols-4">
            {[
              ['Total vinyls', stats.total],
              ['In store', stats.visible],
              ['Featured', stats.featured],
              ['Available', stats.available]
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-gray-400">{label}</p>
                <p className="mt-2 text-3xl font-semibold text-white">{value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 bg-dark-gray/40 rounded-xl border border-gray-800 space-y-4">
          <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-white">Hidden artist content</p>
              <p className="text-xs text-gray-400">Reveal vinyls tied to hidden artists only when you need to manage them.</p>
            </div>
            <label className="flex items-center gap-3 text-sm text-gray-200">
              <input type="checkbox" checked={showHiddenArtistContent} onChange={(e) => setShowHiddenArtistContent(e.target.checked)} />
              Show hidden artists' vinyls
            </label>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs text-gray-400">Vinyl Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. God Did" className="w-full px-3 py-2 rounded-lg bg-light-gray/50 text-white border border-gray-700 focus:border-neon-blue outline-none" />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-gray-400">Artist</label>
              <input value={artist} onChange={(e) => setArtist(e.target.value)} placeholder="e.g. DJ Khaled" className="w-full px-3 py-2 rounded-lg bg-light-gray/50 text-white border border-gray-700 focus:border-neon-blue outline-none" />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-gray-400">Price ($)</label>
              <input type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="29.99" className="w-full px-3 py-2 rounded-lg bg-light-gray/50 text-white border border-gray-700 focus:border-neon-blue outline-none" />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-gray-400">Release Year</label>
              <input type="number" value={releaseYear} onChange={(e) => setReleaseYear(e.target.value)} placeholder="2022" className="w-full px-3 py-2 rounded-lg bg-light-gray/50 text-white border border-gray-700 focus:border-neon-blue outline-none" />
            </div>

            <div className="space-y-1 lg:col-span-2">
              <label className="text-xs text-gray-400">Link to Album</label>
              <select value={albumId} onChange={(e) => handleAlbumChange(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-light-gray/50 text-white border border-gray-700 focus:border-neon-blue outline-none appearance-none">
                <option value="">None</option>
                {dropdownAlbums.map((album) => (
                  <option key={album._id} value={album._id}>{formatAlbumOption(album, albumTrackCounts)}</option>
                ))}
              </select>
              {albumId && (() => {
                const selectedAlbum = albums.find((album) => album._id === albumId || album.id === albumId);
                if (!selectedAlbum) return null;
                const count = getAlbumTrackCount(albumTrackCounts, selectedAlbum);
                return (
                  <p className="text-[11px] text-gray-500 mt-1">
                    Linked album will expose {count} {count === 1 ? 'track' : 'tracks'} on the vinyl page.
                  </p>
                );
              })()}
            </div>

            <div className="space-y-1">
              <label className="text-xs text-gray-400">Link to Song</label>
              <select value={songId} onChange={(e) => setSongId(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-light-gray/50 text-white border border-gray-700 focus:border-neon-blue outline-none appearance-none">
                <option value="">None</option>
                {dropdownSongs.map((song) => <option key={song._id} value={song._id}>{song.name}</option>)}
              </select>
            </div>

            <div className="md:col-span-2 lg:col-span-3 space-y-1">
              <label className="text-xs text-gray-400">Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Tell us more about this vinyl..." rows="3" className="w-full px-3 py-2 rounded-lg bg-light-gray/50 text-white border border-gray-700 focus:border-neon-blue outline-none resize-none" />
            </div>

            <div className="flex items-center space-x-3 p-2 bg-light-gray/20 rounded-lg border border-gray-700">
              <input type="checkbox" id="displayInStore" checked={displayInStore} onChange={(e) => setDisplayInStore(e.target.checked)} className="w-4 h-4 rounded border-gray-700 text-neon-blue focus:ring-neon-blue" />
              <label htmlFor="displayInStore" className="text-sm text-gray-200 cursor-pointer">Display in Store</label>
            </div>

            <div className="flex items-center space-x-3 p-2 bg-light-gray/20 rounded-lg border border-gray-700">
              <input type="checkbox" id="isAvailable" checked={isAvailable} onChange={(e) => setIsAvailable(e.target.checked)} className="w-4 h-4 rounded border-gray-700 text-neon-blue focus:ring-neon-blue" />
              <label htmlFor="isAvailable" className="text-sm text-gray-200 cursor-pointer">Available to Buy</label>
            </div>

            <div className="flex items-center space-x-3 p-2 bg-light-gray/20 rounded-lg border border-gray-700">
              <input type="checkbox" id="isFeatured" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} className="w-4 h-4 rounded border-gray-700 text-neon-blue focus:ring-neon-blue" />
              <label htmlFor="isFeatured" className="text-sm text-gray-200 cursor-pointer">Featured Release</label>
            </div>

            <div className="md:col-span-2 lg:col-span-3 space-y-1">
              <label className="text-xs text-gray-400">Vinyl Image {editingId ? '(Optional, and can add more editions)' : ''}</label>
              <input type="file" accept="image/*" multiple onChange={(e) => setImageFiles(Array.from(e.target.files || []))} className="w-full text-xs text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-neon-blue/10 file:text-neon-blue hover:file:bg-neon-blue/20 cursor-pointer" />
              {albumId && existingAlbumVinylCount > 0 ? (
                <p className="text-[11px] text-neon-blue">
                  This album already has {existingAlbumVinylCount} vinyl edition{existingAlbumVinylCount === 1 ? '' : 's'}. You can upload multiple image files here to add more editions in one go.
                </p>
              ) : null}
              {imageFiles.length > 0 ? (
                <p className="text-[11px] text-gray-500">
                  {imageFiles.length} file{imageFiles.length === 1 ? '' : 's'} selected
                </p>
              ) : null}
            </div>
          </div>

          <div className="pt-2">
            <button onClick={handleSubmit} disabled={submitting || !name.trim()} className="px-6 py-2 rounded-lg bg-neon-blue text-dark-bg font-bold disabled:opacity-50 transition-all hover:scale-105 active:scale-95">
              {submitting ? 'Processing...' : editingId ? 'Update Vinyl' : 'Create Vinyl'}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-[28px] border border-white/10 bg-white/5 p-5">
          <div className="text-sm text-gray-300">
            {loading ? 'Loading vinyls...' : `${filteredVinyls.length} vinyls shown of ${vinyls.length}${selectedIds.length ? ` - ${selectedIds.length} selected` : ''}`}
          </div>
          {selectedIds.length > 0 ? (
            <button onClick={bulkDeleteVinyls} className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-200 hover:bg-red-500/20">Delete selected</button>
          ) : null}
        </div>

        {loading ? (
          <div className="text-center py-16 text-gray-500">Loading vinyl inventory...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredVinyls.map((vinyl) => (
              <div key={vinyl._id || vinyl.id} className={`p-4 rounded-xl bg-light-gray/30 border ${vinyl.display_in_store ? 'border-neon-blue/30' : 'border-gray-800'} space-y-3 relative overflow-hidden group`}>
                <div className="absolute left-3 top-3 z-10">
                  <input type="checkbox" checked={selectedIds.includes(String(vinyl._id || vinyl.id))} onChange={() => toggleVinylSelection(String(vinyl._id || vinyl.id))} />
                </div>
                <div className="absolute top-2 right-2 flex gap-2 flex-wrap justify-end max-w-[70%]">
                  {vinyl.display_in_store ? (
                    <span className="px-2 py-1 bg-neon-blue/20 text-[10px] text-neon-blue rounded uppercase tracking-wider border border-neon-blue/30">In Store</span>
                  ) : (
                    <span className="px-2 py-1 bg-gray-900/80 text-[10px] text-gray-400 rounded uppercase tracking-wider border border-gray-700">Hidden</span>
                  )}
                  {vinyl.is_featured && <span className="px-2 py-1 bg-amber-500/20 text-[10px] text-amber-300 rounded uppercase tracking-wider border border-amber-500/30">Featured</span>}
                </div>

                <div className="w-full aspect-square rounded-lg overflow-hidden bg-black/40 border border-gray-700">
                  <img
                    src={vinyl.image_base64 ? `data:${vinyl.mime_type || 'image/png'};base64,${vinyl.image_base64}` : vinyl.image_url || '/src/assets/album_art_placeholder.svg'}
                    alt={vinyl.name}
                    className="w-full h-full object-cover transition-transform group-hover:scale-110"
                  />
                </div>

                <div>
                  <div className="font-bold text-white truncate">{vinyl.name}</div>
                  <div className="text-xs text-gray-400 truncate">{vinyl.artist}</div>
                  <div className="text-sm text-neon-blue font-medium mt-1">${Number(vinyl.price || 0).toFixed(2)}</div>
                  <div className="flex flex-wrap gap-2 mt-3 text-[10px] uppercase tracking-wider">
                    <span className={`px-2 py-1 rounded-full border ${vinyl.is_available ? 'bg-green-900/20 text-green-400 border-green-700/40' : 'bg-red-900/20 text-red-400 border-red-700/40'}`}>
                      {vinyl.is_available ? 'Available' : 'Sold Out'}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button onClick={() => handleEdit(vinyl)} className="flex-1 px-3 py-1.5 rounded bg-gray-700 text-white text-sm hover:bg-gray-600 transition-colors">Edit</button>
                  <button onClick={() => handleDeleteClick(vinyl)} className="px-3 py-1.5 rounded bg-red-600/20 text-red-500 text-sm hover:bg-red-600/40 transition-colors border border-red-600/30">Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {filteredVinyls.length === 0 && !loading && (
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
