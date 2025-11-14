import { useState, useEffect } from 'react';

const PLAYLIST_STORAGE_KEY = 'music_station_playlists';

export const usePlaylists = () => {
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(false);

  // Load playlists from localStorage on mount
  useEffect(() => {
    const savedPlaylists = localStorage.getItem(PLAYLIST_STORAGE_KEY);
    if (savedPlaylists) {
      try {
        setPlaylists(JSON.parse(savedPlaylists));
      } catch (error) {
        console.error('Failed to load playlists from localStorage:', error);
      }
    }
  }, []);

  // Save playlists to localStorage whenever playlists change
  useEffect(() => {
    localStorage.setItem(PLAYLIST_STORAGE_KEY, JSON.stringify(playlists));
  }, [playlists]);

  const createPlaylist = (playlistData) => {
    const newPlaylist = {
      id: Date.now().toString(),
      name: playlistData.name,
      description: playlistData.description || '',
      songs: playlistData.songs || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setPlaylists(prev => [...prev, newPlaylist]);
    return newPlaylist;
  };

  const updatePlaylist = (playlistId, updates) => {
    setPlaylists(prev => 
      prev.map(playlist => 
        playlist.id === playlistId 
          ? { ...playlist, ...updates, updatedAt: new Date().toISOString() }
          : playlist
      )
    );
  };

  const deletePlaylist = (playlistId) => {
    setPlaylists(prev => prev.filter(playlist => playlist.id !== playlistId));
  };

  const addSongsToPlaylist = (playlistId, songs) => {
    setPlaylists(prev => 
      prev.map(playlist => {
        if (playlist.id === playlistId) {
          const existingSongIds = new Set(playlist.songs.map(song => song._id || song.id));
          const newSongs = songs.filter(song => !existingSongIds.has(song._id || song.id));
          return {
            ...playlist,
            songs: [...playlist.songs, ...newSongs],
            updatedAt: new Date().toISOString()
          };
        }
        return playlist;
      })
    );
  };

  const removeSongFromPlaylist = (playlistId, songId) => {
    setPlaylists(prev => 
      prev.map(playlist => {
        if (playlist.id === playlistId) {
          return {
            ...playlist,
            songs: playlist.songs.filter(song => (song._id || song.id) !== songId),
            updatedAt: new Date().toISOString()
          };
        }
        return playlist;
      })
    );
  };

  const getPlaylistById = (playlistId) => {
    return playlists.find(playlist => playlist.id === playlistId);
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

  const handleCreatePlaylist = (playlistData) => {
    return createPlaylist(playlistData);
  };

  const handleAddToPlaylist = (playlistId, songs) => {
    addSongsToPlaylist(playlistId, songs);
  };

  const handleRemoveFromPlaylist = (playlistId, songId) => {
    removeSongFromPlaylist(playlistId, songId);
  };

  const handleDeletePlaylist = (playlistId) => {
    deletePlaylist(playlistId);
  };

  const handleEditPlaylist = (playlistId, updates) => {
    updatePlaylist(playlistId, updates);
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
