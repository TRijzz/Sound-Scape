import { useState, useEffect } from 'react';
import { useMusic } from '../contexts/MusicContext';
import apiService from '../services/api';

export const usePlaylists = () => {
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(false);
  const { isAuthenticated, user } = useMusic();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        if (!isAuthenticated) {
          setPlaylists([]);
          return;
        }
        const data = await apiService.getMyPlaylists();
        setPlaylists(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Failed to fetch playlists:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isAuthenticated, user?._id]);

  const createPlaylist = async (playlistData) => {
    const created = await apiService.createPlaylist({
      name: playlistData.name,
      description: playlistData.description || '',
      color: playlistData.color || '#0B0F1A',
      image: playlistData.image || '',
      is_public: playlistData.is_public ?? (playlistData.visibility === 'public'),
    });
    setPlaylists(prev => [...prev, created]);
    return created;
  };

  const updatePlaylist = async (playlistId, updates) => {
    const updated = await apiService.updatePlaylist(playlistId, updates);
    setPlaylists(prev => prev.map(p => (p._id === updated._id ? updated : p)));
    return updated;
  };

  const deletePlaylist = async (playlistId) => {
    await apiService.deletePlaylist(playlistId);
    setPlaylists(prev => prev.filter(p => p._id !== playlistId));
  };

  const addSongsToPlaylist = async (playlistId, songs) => {
    let latest = null;
    for (const song of songs) {
      const id = song._id || song.id;
      latest = await apiService.addSongToPlaylist(playlistId, id);
    }
    if (latest) {
      setPlaylists(prev => prev.map(p => (p._id === latest._id ? latest : p)));
    }
    return latest;
  };

  const removeSongFromPlaylist = async (playlistId, songId) => {
    const updated = await apiService.removeSongFromPlaylist(playlistId, songId);
    setPlaylists(prev => prev.map(p => (p._id === updated._id ? updated : p)));
    return updated;
  };

  const getPlaylistById = (playlistId) => {
    return playlists.find(p => p._id === playlistId);
  };

  return {
    playlists,
    loading,
    createPlaylist,
    updatePlaylist,
    deletePlaylist,
    addSongsToPlaylist,
    removeSongFromPlaylist,
    getPlaylistById
  };
};

export const usePlaylistActions = () => {
  const {
    playlists,
    createPlaylist,
    updatePlaylist,
    deletePlaylist,
    addSongsToPlaylist,
    removeSongFromPlaylist,
    getPlaylistById
  } = usePlaylists();

  const handleCreatePlaylist = async (playlistData) => {
    return await createPlaylist(playlistData);
  };

  const handleAddToPlaylist = async (playlistId, songs) => {
    return await addSongsToPlaylist(playlistId, songs);
  };

  const handleRemoveFromPlaylist = async (playlistId, songId) => {
    return await removeSongFromPlaylist(playlistId, songId);
  };

  const handleDeletePlaylist = async (playlistId) => {
    return await deletePlaylist(playlistId);
  };

  const handleEditPlaylist = async (playlistId, updates) => {
    return await updatePlaylist(playlistId, updates);
  };

  return {
    playlists,
    getPlaylistById,
    handleCreatePlaylist,
    handleAddToPlaylist,
    handleRemoveFromPlaylist,
    handleDeletePlaylist,
    handleEditPlaylist
  };
};
