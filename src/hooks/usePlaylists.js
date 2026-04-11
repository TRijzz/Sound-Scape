import { useState, useEffect } from 'react';
import { useMusic } from '../contexts/MusicContext';
import apiService from '../services/api';

const PLAYLISTS_UPDATED_EVENT = 'playlists:updated';
const getPlaylistId = (playlist) => String(playlist?._id || playlist?.id || '');

const broadcastPlaylistUpdate = (detail) => {
  window.dispatchEvent(new CustomEvent(PLAYLISTS_UPDATED_EVENT, { detail }));
};

export const usePlaylists = () => {                  //Loads Playlists of the user and loads it.
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

  useEffect(() => {
    const handlePlaylistSync = (event) => {
      const detail = event?.detail;
      if (!detail?.type) return;

      if (detail.type === 'replace' && Array.isArray(detail.playlists)) {
        setPlaylists(detail.playlists);
        return;
      }

      if (detail.type === 'create' && detail.playlist) {
        setPlaylists((prev) => {
          const nextId = String(detail.playlist._id || detail.playlist.id || '');
          if (!nextId) return prev;
          if (prev.some((playlist) => String(playlist._id || playlist.id || '') === nextId)) {
            return prev;
          }
          return [...prev, detail.playlist];
        });
        return;
      }

      if (detail.type === 'update' && detail.playlist) {
        setPlaylists((prev) =>
          prev.map((playlist) =>
            String(playlist._id || playlist.id || '') === String(detail.playlist._id || detail.playlist.id || '')
              ? detail.playlist
              : playlist
          )
        );
        return;
      }

      if (detail.type === 'delete' && detail.playlistId) {
        setPlaylists((prev) =>
          prev.filter((playlist) => String(playlist._id || playlist.id || '') !== String(detail.playlistId))
        );
      }
    };

    window.addEventListener(PLAYLISTS_UPDATED_EVENT, handlePlaylistSync);
    return () => window.removeEventListener(PLAYLISTS_UPDATED_EVENT, handlePlaylistSync);
  }, []);

  const createPlaylist = async (playlistData) => {                //Creates Playlist
    const createdResponse = await apiService.createPlaylist({
      name: playlistData.name,
      description: playlistData.description || '',
      color: playlistData.color || '#0B0F1A',
      image: playlistData.image || '',
      is_public: playlistData.is_public ?? (playlistData.visibility === 'public'),
    });
    const createdId = getPlaylistId(createdResponse);
    const created = createdResponse;

    setPlaylists((prev) => {
      if (prev.some((playlist) => getPlaylistId(playlist) === getPlaylistId(created))) {
        return prev;
      }
      return [...prev, created];
    });
    broadcastPlaylistUpdate({ type: 'create', playlist: created });

    if (createdId) {
      apiService.getPlaylist(createdId)
        .then((fullPlaylist) => {
          setPlaylists((prev) =>
            prev.map((playlist) => (getPlaylistId(playlist) === createdId ? fullPlaylist : playlist))
          );
          broadcastPlaylistUpdate({ type: 'update', playlist: fullPlaylist });
        })
        .catch((error) => {
          console.error('Failed to hydrate created playlist:', error);
        });
    }

    return created;
  };

  const updatePlaylist = async (playlistId, updates) => {
    const updated = await apiService.updatePlaylist(playlistId, updates);
    setPlaylists(prev => prev.map(p => (getPlaylistId(p) === getPlaylistId(updated) ? updated : p)));
    broadcastPlaylistUpdate({ type: 'update', playlist: updated });
    return updated;
  };

  const deletePlaylist = async (playlistId) => {
    await apiService.deletePlaylist(playlistId);
    setPlaylists(prev => prev.filter(p => getPlaylistId(p) !== String(playlistId)));
    broadcastPlaylistUpdate({ type: 'delete', playlistId });
  };

  const addSongsToPlaylist = async (playlistId, songs) => {         //Adds songs to the playlist
    let latest = null;
    for (const song of songs) {
      const id = song._id || song.id;
      latest = await apiService.addSongToPlaylist(playlistId, id);
    }
    if (latest) {
      setPlaylists(prev => prev.map(p => (getPlaylistId(p) === getPlaylistId(latest) ? latest : p)));
      broadcastPlaylistUpdate({ type: 'update', playlist: latest });
    }
    return latest;
  };

  const removeSongFromPlaylist = async (playlistId, songId) => {                //Removes songs from the playlist
    const updated = await apiService.removeSongFromPlaylist(playlistId, songId);
    setPlaylists(prev => prev.map(p => (getPlaylistId(p) === getPlaylistId(updated) ? updated : p)));
    broadcastPlaylistUpdate({ type: 'update', playlist: updated });
    return updated;
  };

  const getPlaylistById = (playlistId) => {
    return playlists.find(p => getPlaylistId(p) === String(playlistId));
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
