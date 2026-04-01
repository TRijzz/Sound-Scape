import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import SongCard from '../components/ui/SongCard';
import { useMusic } from '../contexts/MusicContext';
import apiService from '../services/api';
import { PlayIcon, ShuffleIcon, MoreIcon } from '../components/ui/Icons';
import { usePlaylistActions } from '../hooks/usePlaylists';

const PlaylistPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { playTrack, isAuthenticated, setShowAuthPrompt, user, queue, setQueue, setShuffleEnabled } = useMusic();
  const [playlist, setPlaylist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editColor, setEditColor] = useState('#0B0F1A');
  const [editImage, setEditImage] = useState('');
  const [editIsPublic, setEditIsPublic] = useState(false);
  const [dragIndex, setDragIndex] = useState(null);
  const [shareMessage, setShareMessage] = useState('');
  const [showManageMenu, setShowManageMenu] = useState(false);
  const [moveSong, setMoveSong] = useState(null);
  const { playlists, handleEditPlaylist, handleRemoveFromPlaylist, handleDeletePlaylist, handleAddToPlaylist } = usePlaylistActions();

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
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

  useEffect(() => {
    if (!shareMessage) return undefined;

    const timeout = window.setTimeout(() => setShareMessage(''), 2400);
    return () => window.clearTimeout(timeout);
  }, [shareMessage]);

  useEffect(() => {
    if (!showManageMenu) return undefined;

    const handleClickOutside = () => setShowManageMenu(false);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, [showManageMenu]);

  const playlistId = playlist?._id || playlist?.id;
  const ownerId = playlist?.user?._id || playlist?.user?.id || playlist?.user;
  const currentUserId = user?._id || user?.id;
  const isOwner = useMemo(
    () => String(ownerId || '') === String(currentUserId || ''),
    [ownerId, currentUserId]
  );

  const creatorName = useMemo(() => {
    if (isOwner) return 'You';
    return playlist?.user?.name || playlist?.user?.username || playlist?.user?.email || 'Unknown user';
  }, [isOwner, playlist?.user]);

  const handlePlay = (track) => {
    if (!track) return;
    if (!isAuthenticated) {
      setShowAuthPrompt(true);
      return;
    }
    const songs = Array.isArray(playlist?.songs) ? playlist.songs : [track];
    const trackIndex = songs.findIndex((item) => String(item?._id || item?.id || '') === String(track?._id || track?.id || ''));
    setShuffleEnabled(false);
    playTrack(track, {
      queue: songs,
      currentIndex: trackIndex >= 0 ? trackIndex : 0,
      shuffle: false
    });
  };

  const handleShuffleAll = () => {
    if (!playlist || !Array.isArray(playlist.songs) || playlist.songs.length === 0) return;
    const firstIndex = Math.floor(Math.random() * playlist.songs.length);
    playTrack(playlist.songs[firstIndex], {
      queue: playlist.songs,
      currentIndex: firstIndex,
      shuffle: true
    });
  };

  const startEdit = () => {
    if (!playlist || !isOwner) return;
    setEditMode(true);
    setEditName(playlist.name || '');
    setEditDescription(playlist.description || '');
    setEditColor(playlist.color || '#0B0F1A');
    setEditImage(playlist.image || '');
    setEditIsPublic(Boolean(playlist.is_public));
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setEditImage(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setEditImage('');
  };

  const saveEdits = async () => {
    if (!playlist || !isOwner) return;

    const updates = {
      name: editName.trim() || playlist.name,
      description: editDescription.trim(),
      color: editColor,
      image: editImage,
      is_public: editIsPublic
    };

    const updated = await handleEditPlaylist(playlistId, updates);
    setPlaylist(updated || { ...playlist, ...updates });
    setEditMode(false);
  };

  const cancelEdits = () => {
    setEditMode(false);
  };

  const onDragStart = (index) => setDragIndex(index);
  const onDragOver = (e) => e.preventDefault();
  const onDrop = async (index) => {
    if (!isOwner || dragIndex === null || dragIndex === index || !playlist || !Array.isArray(playlist.songs)) return;

    const newSongs = [...playlist.songs];
    const [moved] = newSongs.splice(dragIndex, 1);
    newSongs.splice(index, 0, moved);
    const updates = { songs: newSongs.map((song) => song._id || song.id) };

    await handleEditPlaylist(playlistId, updates);
    setPlaylist({ ...playlist, songs: newSongs });
    setDragIndex(null);
  };

  const removeSong = async (songId) => {
    if (!playlist || !isOwner) return;
    const updated = await handleRemoveFromPlaylist(playlistId, songId);
    setPlaylist(updated || { ...playlist, songs: (playlist.songs || []).filter((song) => (song._id || song.id) !== songId) });
  };

  const moveSongToPlaylist = async (targetPlaylistId) => {
    if (!moveSong || !playlistId || !targetPlaylistId) return;

    try {
      await handleAddToPlaylist(targetPlaylistId, [moveSong]);
      await removeSong(moveSong._id || moveSong.id);
      setMoveSong(null);
    } catch (err) {
      console.error('Failed to move song to playlist:', err);
    }
  };

  const copyShareLink = async () => {
    if (!playlist?.is_public) {
      setShareMessage('Make this playlist public to share it.');
      return;
    }

    const shareUrl = `${window.location.origin}/playlist/${playlistId}`;

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        setShareMessage('Share link copied.');
        return;
      }
    } catch (copyError) {
      console.error('Failed to copy share link:', copyError);
    }

    setShareMessage(shareUrl);
  };

  const handleDownloadPlaylist = async () => {
    const songs = Array.isArray(playlist?.songs) ? playlist.songs : [];
    for (const song of songs) {
      const url = song.audio_url || song.preview_url || song.stream_url;
      if (!url) continue;

      const link = document.createElement('a');
      link.href = url;
      link.download = `${(song.name || 'track').replace(/[^a-z0-9]+/gi, '_')}.mp3`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    setShowManageMenu(false);
  };

  const handleAddPlaylistToQueue = () => {
    const songs = Array.isArray(playlist?.songs) ? playlist.songs : [];
    if (songs.length === 0) return;

    const existingIds = new Set((Array.isArray(queue) ? queue : []).map((song) => String(song?._id || song?.id || '')));
    const mergedQueue = [...(Array.isArray(queue) ? queue : [])];
    songs.forEach((song) => {
      const songId = String(song?._id || song?.id || '');
      if (songId && !existingIds.has(songId)) {
        existingIds.add(songId);
        mergedQueue.push(song);
      }
    });

    setQueue(mergedQueue, 0);
    setShareMessage('Playlist added to queue.');
    setShowManageMenu(false);
  };

  const handleDeleteCurrentPlaylist = async () => {
    if (!isOwner || !playlistId) return;
    await handleDeletePlaylist(playlistId);
    navigate('/library');
  };

  const heroStyle = useMemo(() => {
    const color = playlist?.color || '#0B0F1A';
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
          <div className="relative overflow-visible rounded-2xl p-8 md:p-10 border border-gray-700" style={heroStyle}>
            <div className="absolute inset-0 pointer-events-none" />
            <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
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
                  <p className="text-gray-300 mt-1">
                    Created by {creatorName} - {(playlist.songs || []).length} {((playlist.songs || []).length === 1) ? 'song' : 'songs'}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                    <span className={`px-3 py-1 rounded-full border ${playlist.is_public ? 'border-green-400/30 bg-green-500/10 text-green-300' : 'border-yellow-400/30 bg-yellow-500/10 text-yellow-200'}`}>
                      {playlist.is_public ? 'Public playlist' : 'Private playlist'}
                    </span>
                    {shareMessage ? (
                      <span className="px-3 py-1 rounded-full border border-neon-blue/20 bg-neon-blue/10 text-neon-blue">
                        {shareMessage}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button onClick={() => handlePlay((playlist.songs || [])[0])} disabled={!Array.isArray(playlist.songs) || playlist.songs.length === 0} className="px-4 py-2 rounded-lg bg-neon-blue text-dark-bg hover:bg-neon-blue/80 transition-colors flex items-center gap-2 disabled:bg-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed">
                  <PlayIcon className="w-5 h-5" />
                  <span>Play</span>
                </button>
                <button onClick={handleShuffleAll} disabled={!Array.isArray(playlist.songs) || playlist.songs.length === 0} className="px-4 py-2 rounded-lg bg-light-gray/50 text-white hover:bg-light-gray transition-colors flex items-center gap-2 disabled:bg-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed">
                  <ShuffleIcon className="w-5 h-5" />
                  <span>Shuffle</span>
                </button>
                <button onClick={copyShareLink} className="px-4 py-2 rounded-lg bg-light-gray/50 text-white hover:bg-light-gray transition-colors flex items-center gap-2">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M15 8a3 3 0 1 0-3-3" strokeWidth="2" />
                    <path d="M6 13a3 3 0 1 0 3 3" strokeWidth="2" />
                    <path d="M8.6 14.4l6.8-4.8" strokeWidth="2" />
                  </svg>
                  <span>Share</span>
                </button>
                {isOwner ? (
                  <button onClick={startEdit} className="px-4 py-2 rounded-lg bg-light-gray/50 text-white hover:bg-light-gray transition-colors flex items-center gap-2">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path d="M12 20h9" strokeWidth="2" />
                      <path d="M16.5 3.5l4 4L7 21H3v-4L16.5 3.5z" strokeWidth="2" />
                    </svg>
                    <span>Edit</span>
                  </button>
                ) : null}
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowManageMenu((prev) => !prev);
                    }}
                    className="px-4 py-2 rounded-lg bg-light-gray/50 text-white hover:bg-light-gray transition-colors flex items-center gap-2"
                  >
                    <MoreIcon className="w-5 h-5" />
                    <span>{isOwner ? 'Manage' : 'Browse'}</span>
                  </button>
                  {showManageMenu ? (
                    <div
                      className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-gray-700 bg-dark-gray/95 shadow-2xl z-30 overflow-hidden"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {isOwner ? (
                        <button
                          onClick={handleDeleteCurrentPlaylist}
                          className="w-full px-4 py-3 text-left text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                          Delete Playlist
                        </button>
                      ) : null}
                      <button
                        onClick={handleDownloadPlaylist}
                        className="w-full px-4 py-3 text-left text-sm text-white hover:bg-light-gray/60 transition-colors"
                      >
                        Download
                      </button>
                      <button
                        onClick={handleAddPlaylistToQueue}
                        className="w-full px-4 py-3 text-left text-sm text-white hover:bg-light-gray/60 transition-colors"
                      >
                        Add to Queue
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
            <div className="mt-4 text-gray-300">{playlist.description}</div>
          </div>
        </motion.div>
      </div>

      {editMode ? (
        <div className="px-6">
          <div className="rounded-xl border border-gray-700 p-4 bg-dark-gray">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="mb-2 text-white font-semibold">Playlist details</div>
                <input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Name" className="w-full px-3 py-2 rounded-lg bg-light-gray text-white border border-gray-700 mb-2" />
                <input value={editDescription} onChange={(e) => setEditDescription(e.target.value)} placeholder="Description" className="w-full px-3 py-2 rounded-lg bg-light-gray text-white border border-gray-700 mb-2" />
                <div className="mb-3">
                  <div className="text-sm text-gray-400 mb-1">Visibility</div>
                  <select value={editIsPublic ? 'public' : 'private'} onChange={(e) => setEditIsPublic(e.target.value === 'public')} className="w-full px-3 py-2 rounded-lg bg-light-gray text-white border border-gray-700">
                    <option value="private">Private</option>
                    <option value="public">Public</option>
                  </select>
                </div>
                <div className="mb-2">
                  <div className="text-sm text-gray-400 mb-1">Background color</div>
                  <div className="flex items-center gap-2">
                    {['#0B0F1A', '#1E2A78', '#00FFFF', '#B83280', '#0F5132'].map((color) => (
                      <button key={color} onClick={() => setEditColor(color)} className="w-8 h-8 rounded-lg border border-gray-700" style={{ background: color }} />
                    ))}
                    <input type="color" value={editColor} onChange={(e) => setEditColor(e.target.value)} className="w-10 h-10 rounded-lg border border-gray-700 bg-light-gray" />
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-400 mb-1">Image</div>
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="w-full text-sm text-gray-300" />
                  {editImage ? (
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="mt-3 inline-flex items-center justify-center px-4 py-2 rounded-lg border border-red-500/40 bg-red-500/10 text-sm font-medium text-red-300 hover:bg-red-500/20 hover:text-red-200 transition-colors"
                    >
                      Remove image
                    </button>
                  ) : null}
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
                        <div className="text-gray-300 mt-1">Created by You - {(playlist.songs || []).length} {(playlist.songs || []).length === 1 ? 'song' : 'songs'}</div>
                        <div className="mt-2 text-xs text-gray-400">{editIsPublic ? 'Public and shareable' : 'Private and only visible to you'}</div>
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
      ) : null}

      <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
        {Array.isArray(playlist.songs) && playlist.songs.length > 0 ? (
          <div className="px-6">
            <div className="mb-3 hidden md:grid grid-cols-[48px_minmax(0,1fr)_minmax(180px,0.5fr)_minmax(140px,0.4fr)_72px] items-center gap-4 border-b border-white/10 px-3 pb-3 text-sm text-gray-400">
              <div className="text-center">#</div>
              <div>Title</div>
              <div>Album</div>
              <div>Date added</div>
              <div className="text-right">
                <svg className="ml-auto w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <circle cx="12" cy="12" r="9" strokeWidth="2" />
                  <path d="M12 7v5l3 2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
            <div className="space-y-2">
            {playlist.songs.map((song, index) => (
              <div
                key={song._id || song.id}
                draggable={isOwner}
                onDragStart={() => {
                  if (isOwner) onDragStart(index);
                }}
                onDragOver={onDragOver}
                onDrop={() => onDrop(index)}
                onContextMenu={(e) => {
                  if (!isOwner) return;
                  e.preventDefault();
                  const songId = song._id || song.id;
                  if (songId) removeSong(songId);
                }}
              >
                <SongCard
                  song={song}
                  index={index}
                  showAlbum={true}
                  onClick={() => handlePlay(song)}
                  menuItems={isOwner ? [
                    {
                      label: 'Move to playlist',
                      onClick: () => setMoveSong(song)
                    },
                    {
                      label: 'Remove',
                      variant: 'danger',
                      onClick: () => removeSong(song._id || song.id)
                    }
                  ] : []}
                />
              </div>
            ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-400">
            {isOwner ? 'No songs in this playlist yet' : 'This playlist does not have any songs yet'}
          </div>
        )}
      </motion.section>

      {moveSong ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-gray-700 bg-dark-gray p-6 shadow-2xl">
            <div className="mb-4">
              <p className="text-xs uppercase tracking-[0.35em] text-neon-blue/80">Move Song</p>
              <h3 className="mt-2 text-2xl font-semibold text-white">{moveSong.name}</h3>
              <p className="mt-1 text-sm text-gray-400">
                Move this song from {playlist?.name} to another playlist.
              </p>
            </div>
            <div className="max-h-72 space-y-2 overflow-y-auto">
              {playlists.filter((item) => String(item._id || item.id) !== String(playlistId)).length ? (
                playlists
                  .filter((item) => String(item._id || item.id) !== String(playlistId))
                  .map((item) => (
                    <button
                      key={item._id || item.id}
                      onClick={() => moveSongToPlaylist(item._id || item.id)}
                      className="w-full rounded-xl border border-gray-700 bg-black/20 px-4 py-3 text-left transition-colors hover:border-neon-blue/40 hover:bg-neon-blue/10"
                    >
                      <div className="text-sm font-medium text-white">{item.name}</div>
                      <div className="text-xs text-gray-400">
                        {(item.songs || []).length} {((item.songs || []).length === 1) ? 'song' : 'songs'}
                      </div>
                    </button>
                  ))
              ) : (
                <div className="rounded-xl border border-gray-700 bg-black/20 px-4 py-4 text-sm text-gray-400">
                  No other playlists available yet.
                </div>
              )}
            </div>
            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setMoveSong(null)}
                className="rounded-lg bg-light-gray/60 px-4 py-2 text-white transition-colors hover:bg-light-gray"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default PlaylistPage;
