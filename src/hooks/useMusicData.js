import { useState, useEffect } from 'react';
import apiService from '../services/api.js';

// Custom hook for managing music data
export const useMusicData = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = async (fetchFunction, ...args) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchFunction(...args);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { loading, error, fetchData };
};

// Hook for popular artists
export const usePopularArtists = (limit = 20) => {
  const [artists, setArtists] = useState([]);
  const { loading, error, fetchData } = useMusicData();

  useEffect(() => {
    const loadArtists = async () => {
      try {
        const data = await fetchData(apiService.getPopularArtists, limit);
        setArtists(data);
      } catch (err) {
        console.error('Failed to load popular artists:', err);
      }
    };

    loadArtists();
  }, [limit]);

  return { artists, loading, error };
};

// Hook for popular songs
export const usePopularSongs = (limit = 20) => {
  const [songs, setSongs] = useState([]);
  const { loading, error, fetchData } = useMusicData();

  useEffect(() => {
    const loadSongs = async () => {
      try {
        const data = await fetchData(apiService.getPopularSongs, limit);
        setSongs(data);
      } catch (err) {
        console.error('Failed to load popular songs:', err);
      }
    };

    loadSongs();
  }, [limit]);

  return { songs, loading, error };
};

// Hook for popular albums
export const usePopularAlbums = (limit = 20) => {
  const [albums, setAlbums] = useState([]);
  const { loading, error, fetchData } = useMusicData();

  useEffect(() => {
    const loadAlbums = async () => {
      try {
        const data = await fetchData(apiService.getPopularAlbums, limit);
        // Fallback: if no popular albums (popularity can be 0 from Spotify search),
        // load recent albums instead
        if (Array.isArray(data) && data.length === 0) {
          const recent = await fetchData(apiService.getAlbums.bind(apiService), 1, limit, '', '', '', '-release_date');
          setAlbums(recent.albums || recent || []);
        } else {
          setAlbums(data);
        }
      } catch (err) {
        console.error('Failed to load popular albums:', err);
      }
    };

    loadAlbums();
  }, [limit]);

  return { albums, loading, error };
};

// Hook for search functionality
export const useSearch = () => {
  const [searchResults, setSearchResults] = useState({ artists: [], songs: [], albums: [] });
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState(null);

  const search = async (query, limit = 20) => {
    if (!query.trim()) {
      setSearchResults({ artists: [], songs: [], albums: [] });
      return;
    }

    setSearchLoading(true);
    setSearchError(null);

    try {
      const results = await apiService.searchAll(query, limit);
      setSearchResults(results);
    } catch (err) {
      setSearchError(err.message);
      console.error('Search failed:', err);
    } finally {
      setSearchLoading(false);
    }
  };

  return { searchResults, searchLoading, searchError, search };
};

// Hook for current playing track
export const useCurrentTrack = () => {
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  const playTrack = async (track) => {
    try {
      // Increment play count
      await apiService.incrementPlayCount(track._id);
      
      setCurrentTrack(track);
      setDuration(track.duration_ms ? Math.floor(track.duration_ms / 1000) : 0);
      setProgress(0);
      setIsPlaying(true);
    } catch (err) {
      console.error('Failed to play track:', err);
    }
  };

  const pauseTrack = () => {
    setIsPlaying(false);
  };

  const resumeTrack = () => {
    setIsPlaying(true);
  };

  const stopTrack = () => {
    setIsPlaying(false);
    setProgress(0);
  };

  return {
    currentTrack,
    isPlaying,
    progress,
    duration,
    playTrack,
    pauseTrack,
    resumeTrack,
    stopTrack,
    setProgress,
  };
};
