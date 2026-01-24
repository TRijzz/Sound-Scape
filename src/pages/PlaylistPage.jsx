import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import SongCard from '../components/ui/SongCard';
import { useMusic } from '../contexts/MusicContext';
import apiService from '../services/api';
import { PlayIcon, ShuffleIcon, MoreIcon } from '../components/ui/Icons';
import { usePlaylistActions } from '../hooks/usePlaylists';

const PlaylistPage = () => {
  const { id } = useParams();
  const { playTrack, isAuthenticated, setShowAuthPrompt } = useMusic();
  const [playlist, setPlaylist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editColor, setEditColor] = useState('#0B0F1A');
  const [editImage, setEditImage] = useState('');
  const [dragIndex, setDragIndex] = useState(null);
  const { handleEditPlaylist, handleRemoveFromPlaylist } = usePlaylistActions();

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await apiService.getPlaylist(id);
        setPlaylist(data || null);
      } catch (err) {
        setError(err.message || 'Failed to load playlist');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handlePlay = (track) => {
    if (!isAuthenticated) { setShowAuthPrompt(true); return; }
    playTrack(track);
  };

  const handleShuffleAll = () => {
    if (!playlist || !Array.isArray(playlist.songs) || playlist.songs.length === 0) return;
    const shuffled = [...playlist.songs].sort(() => Math.random() - 0.5);
    playTrack(shuffled[0]);
  };

  const startEdit = () => {
    if (!playlist) return;
    setEditMode(true);
    setEditName(playlist.name || '');
    setEditDescription(playlist.description || '');
    setEditColor(playlist.color || '#0B0F1A');
    setEditImage(playlist.image || '');
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setEditImage(ev.target.result);
    reader.readAsDataURL(file);
  };

  const saveEdits = async () => {
    if (!playlist) return;
    const updates = {
      name: editName.trim() || playlist.name,
      description: editDescription.trim(),
      color: editColor,
      image: editImage
    };
    const updated = await handleEditPlaylist(playlist._id || playlist.id, updates);
    setPlaylist(updated || { ...playlist, ...updates });
    setEditMode(false);
  };

  const cancelEdits = () => {
    setEditMode(false);
  };

  const onDragStart = (index) => setDragIndex(index);
  const onDragOver = (e) => e.preventDefault();
  const onDrop = async (index) => {
    if (dragIndex === null || dragIndex === index || !playlist || !Array.isArray(playlist.songs)) return;
    const newSongs = [...playlist.songs];
    const [moved] = newSongs.splice(dragIndex, 1);
    newSongs.splice(index, 0, moved);
    const updates = { songs: newSongs.map(s => s._id || s.id) };
    await handleEditPlaylist(playlist._id || playlist.id, updates);
    setPlaylist({ ...playlist, songs: newSongs });
    setDragIndex(null);
  };

  const removeSong = async (songId) => {
    if (!playlist) return;
    const updated = await handleRemoveFromPlaylist(playlist._id || playlist.id, songId);
    setPlaylist(updated || { ...playlist, songs: (playlist.songs || []).filter(s => (s._id || s.id) !== songId) });
  };

  const heroStyle = useMemo(() => {
    const color = (playlist?.color) || '#0B0F1A';
    return { background: `linear-gradient(135deg, rgba(0,0,0,0.8), ${color}80)` };
  }, [playlist?.color]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-neon-blue"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center py-12 text-red-400">{error}</div>
      </div>
    );
  }

  if (!playlist) {
    return (
      <div className="p-6">
        <div className="text-center py-12 text-gray-400">Playlist not found</div>
      </div>
    );
  }

  return (
    <div className="p-0">
      <div className="p-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="relative overflow-hidden rounded-2xl p-8 md:p-10 border border-gray-700" style={heroStyle}>
            <div className="absolute inset-0 pointer-events-none" />
            <div className="flex items-end justify-between gap-6">
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 md:w-28 md:h-28 rounded-xl overflow-hidden border border-gray-700 shadow-lg">
                  {playlist.image ? (
                    <img src={playlist.image} alt={playlist.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-white" style={{ background: 'linear-gradient(135deg, rgba(0,255,255,0.2), rgba(128,0,128,0.2))' }}>
                      {(playlist.name || 'P').charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold text-white">{playlist.name}</h1>
                  <p className="text-gray-300 mt-1">Created by You • {(playlist.songs || []).length} {((playlist.songs || []).length === 1) ? 'song' : 'songs'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={()=>playTrack((playlist.songs || [])[0])} className="px-4 py-2 rounded-lg bg-neon-blue text-dark-bg hover:bg-neon-blue/80 transition-colors flex items-center gap-2">
                  <PlayIcon className="w-5 h-5" />
                  <span>Play</span>
                </button>
                <button onClick={handleShuffleAll} className="px-4 py-2 rounded-lg bg-light-gray/50 text-white hover:bg-light-gray transition-colors flex items-center gap-2">
                  <ShuffleIcon className="w-5 h-5" />
                  <span>Shuffle</span>
                </button>
                <button onClick={startEdit} className="px-4 py-2 rounded-lg bg-light-gray/50 text-white hover:bg-light-gray transition-colors flex items-center gap-2">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 20h9" strokeWidth="2" /><path d="M16.5 3.5l4 4L7 21H3v-4L16.5 3.5z" strokeWidth="2" /></svg>
                  <span>Edit</span>
                </button>
                <button className="px-4 py-2 rounded-lg bg-light-gray/50 text-white hover:bg-light-gray transition-colors flex items-center gap-2">
                  <MoreIcon className="w-5 h-5" />
                  <span>More</span>
                </button>
              </div>
            </div>
            <div className="mt-4 text-gray-300">{playlist.description}</div>
          </div>
        </motion.div>
      </div>

      {editMode && (
        <div className="px-6">
          <div className="rounded-xl border border-gray-700 p-4 bg-dark-gray">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="mb-2 text-white font-semibold">Playlist details</div>
                <input value={editName} onChange={(e)=>setEditName(e.target.value)} placeholder="Name" className="w-full px-3 py-2 rounded-lg bg-light-gray text-white border border-gray-700 mb-2" />
                <input value={editDescription} onChange={(e)=>setEditDescription(e.target.value)} placeholder="Description" className="w-full px-3 py-2 rounded-lg bg-light-gray text-white border border-gray-700 mb-2" />
                <div className="mb-2">
                  <div className="text-sm text-gray-400 mb-1">Background color</div>
                  <div className="flex items-center gap-2">
                    {['#0B0F1A','#1E2A78','#00FFFF','#B83280','#0F5132'].map((c)=>(
                      <button key={c} onClick={()=>setEditColor(c)} className="w-8 h-8 rounded-lg border border-gray-700" style={{ background: c }} />
                    ))}
                    <input type="color" value={editColor} onChange={(e)=>setEditColor(e.target.value)} className="w-10 h-10 rounded-lg border border-gray-700 bg-light-gray" />
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-400 mb-1">Image</div>
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="w-full text-sm text-gray-300" />
                </div>
              </div>
              <div className="md:col-span-2">
                <div className="mb-2 text-white font-semibold">Live preview</div>
                <div className="relative overflow-hidden rounded-xl p-6 border border-gray-700" style={{ background: `linear-gradient(135deg, rgba(0,0,0,0.8), ${editColor}80)` }}>
                  <div className="flex items-end justify-between gap-6">
                    <div className="flex items-center gap-6">
                      <div className="w-20 h-20 rounded-xl overflow-hidden border border-gray-700 shadow-lg">
                        {editImage ? (
                          <img src={editImage} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-white" style={{ background: 'linear-gradient(135deg, rgba(0,255,255,0.2), rgba(128,0,128,0.2))' }}>
                            {(editName || 'P').charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-white">{editName || 'New Playlist'}</div>
                        <div className="text-gray-300 mt-1">Created by You • {(playlist.songs || []).length} {(playlist.songs || []).length === 1 ? 'song' : 'songs'}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-3">
              <button onClick={cancelEdits} className="px-4 py-2 rounded-lg bg-light-gray/50 text-white hover:bg-light-gray">Cancel</button>
              <button onClick={saveEdits} className="px-4 py-2 rounded-lg bg-neon-blue text-dark-bg hover:bg-neon-blue/80">Save</button>
            </div>
          </div>
        </div>
      )}

      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        {Array.isArray(playlist.songs) && playlist.songs.length > 0 ? (
          <div className="space-y-2 px-6">
            {playlist.songs.map((song, index) => (
              <div
                key={song._id || song.id}
                draggable
                onDragStart={() => onDragStart(index)}
                onDragOver={onDragOver}
                onDrop={() => onDrop(index)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  const id = song._id || song.id;
                  if (id) removeSong(id);
                }}
              >
                <SongCard
                  song={song}
                  index={index}
                  showAlbum={false}
                  onClick={() => handlePlay(song)}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-400">No songs in this playlist yet</div>
        )}
      </motion.section>
    </div>
  );
};

export default PlaylistPage;
