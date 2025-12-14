import React, { createContext, useContext, useState, useReducer, useEffect } from 'react';
import apiService from '../services/api';
import useAudioPlayer from '../hooks/useAudioPlayer';

const MusicContext = createContext();

// Initial state
const initialState = {
  currentTrack: null,
  isPlaying: false,
  progress: 0,
  duration: 0,
  volume: 60,
  queue: [],
  currentIndex: 0,
  user: null,
  isAuthenticated: false,
  repeatMode: 'off', // 'off', 'all', 'one'
  likedSongs: new Set(),
};

// Reducer for music state
function musicReducer(state, action) {
  switch (action.type) {
    case 'SET_CURRENT_TRACK':
      return { ...state, currentTrack: action.payload };
    case 'SET_PLAYING':
      return { ...state, isPlaying: action.payload };
    case 'SET_PROGRESS':
      return { ...state, progress: action.payload };
    case 'SET_DURATION':
      return { ...state, duration: action.payload };
    case 'SET_VOLUME':
      return { ...state, volume: action.payload };
    case 'SET_QUEUE':
      return { ...state, queue: action.payload };
    case 'SET_CURRENT_INDEX':
      return { ...state, currentIndex: action.payload };
    case 'SET_USER':
      return { 
        ...state, 
        user: action.payload, 
        isAuthenticated: !!action.payload,
        // Initialize liked songs from user data if available
        likedSongs: action.payload?.likedSongs ? new Set(action.payload.likedSongs) : new Set()
      };
    case 'TOGGLE_LIKE':
      const newLikedSongs = new Set(state.likedSongs);
      if (newLikedSongs.has(action.payload)) {
        newLikedSongs.delete(action.payload);
      } else {
        newLikedSongs.add(action.payload);
      }
      // Here you would typically make an API call to update the backend
      return { ...state, likedSongs: newLikedSongs };
    case 'SET_REPEAT_MODE':
      return { ...state, repeatMode: action.payload };
    case 'PLAY_TRACK':
      return {
        ...state,
        currentTrack: action.payload,
        isPlaying: true,
        progress: 0,
      };
    case 'PAUSE_TRACK':
      return { ...state, isPlaying: false };
    case 'RESUME_TRACK':
      return { ...state, isPlaying: true };
    case 'NEXT_TRACK':
      const nextIndex = state.currentIndex < state.queue.length - 1 ? state.currentIndex + 1 : 0;
      return {
        ...state,
        currentIndex: nextIndex,
        currentTrack: state.queue[nextIndex],
        progress: 0,
      };
    case 'PREVIOUS_TRACK':
      const prevIndex = state.currentIndex > 0 ? state.currentIndex - 1 : state.queue.length - 1;
      return {
        ...state,
        currentIndex: prevIndex,
        currentTrack: state.queue[prevIndex],
        progress: 0,
      };
    default:
      return state;
  }
}

export function MusicProvider({ children }) {
  const [state, dispatch] = useReducer(musicReducer, initialState);
  const [isLoading, setIsLoading] = useState(true);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const player = useAudioPlayer();

  const playTrack = async (track) => {
    if (!track) return;
    
    // Remove authentication check for now - allow all songs to play
    // Users can still be prompted for auth if needed for other features
    
    try {
      // Set track in context first
      dispatch({ type: 'SET_CURRENT_TRACK', payload: track });
      dispatch({ type: 'SET_PLAYING', payload: true });
      
      // Play track using audio player
      await player.playTrack(track);
    } catch (error) {
      console.error('Error playing track:', error);
      // Still set the track even if play fails
      dispatch({ type: 'SET_CURRENT_TRACK', payload: track });
      dispatch({ type: 'SET_PLAYING', payload: false });
    }
  };

  const pauseTrack = async () => {
    try {
      player.pauseTrack();
      dispatch({ type: 'SET_PLAYING', payload: false });
    } catch (error) {
      console.error('Error pausing track:', error);
    }
  };

  const resumeTrack = async () => {
    try {
      await player.resumeTrack();
      dispatch({ type: 'SET_PLAYING', payload: true });
    } catch (error) {
      console.error('Error resuming track:', error);
    }
  };

  const nextTrack = () => {
    dispatch({ type: 'NEXT_TRACK' });
    player.nextTrack && player.nextTrack();
  };

  const previousTrack = () => {
    dispatch({ type: 'PREVIOUS_TRACK' });
    player.previousTrack && player.previousTrack();
  };

  const setProgress = (progress) => {
    dispatch({ type: 'SET_PROGRESS', payload: progress });
    player.seekTo(progress);
  };

  const setVolume = (volume) => {
    dispatch({ type: 'SET_VOLUME', payload: volume });
    const normalized = Math.max(0, Math.min(1, (volume || 0) / 100));
    player.setVolumeLevel(normalized);
  };

  const toggleLike = (songId) => {
    if (!state.isAuthenticated) {
      setShowAuthPrompt(true);
      return;
    }
    const currentlyLiked = state.likedSongs.has(songId);
    dispatch({ type: 'TOGGLE_LIKE', payload: songId });
    if (currentlyLiked) {
      apiService.unlikeSong(songId).catch(() => {});
    } else {
      apiService.likeSong(songId).catch(() => {});
    }
  };

  const setRepeatMode = (mode) => {
    dispatch({ type: 'SET_REPEAT_MODE', payload: mode });
  };

  const setQueue = (queue) => {
    dispatch({ type: 'SET_QUEUE', payload: queue });
  };

  const login = async (user, tokens) => {
    if (tokens) {
      localStorage.setItem('authTokens', JSON.stringify(tokens));
      if (tokens.accessToken) {
        apiService.setAuthToken(tokens.accessToken);
      }
    }
    dispatch({ type: 'SET_USER', payload: user });
    return user;
  };

  const logout = () => {
    localStorage.removeItem('authTokens');
    dispatch({ type: 'SET_USER', payload: null });
  };

  // Check if user is already authenticated on initial load
  const checkAuth = async () => {
    try {
      const storedTokens = localStorage.getItem('authTokens');
      if (!storedTokens) {
        setIsLoading(false);
        return null;
      }

      const { accessToken } = JSON.parse(storedTokens);
      if (!accessToken) {
        setIsLoading(false);
        return null;
      }

      // Set the auth header for all requests
      apiService.setAuthToken(accessToken);

      // Fetch the current user
      const user = await apiService.getCurrentUser();
      if (user) {
        dispatch({ type: 'SET_USER', payload: user });
      }
      return user;
    } catch (error) {
      console.error('Auth check failed:', error);
      // Clear invalid tokens
      localStorage.removeItem('authTokens');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Check authentication status on mount
  useEffect(() => {
    checkAuth();
  }, []);

  // Sync player state with context state
  useEffect(() => {
    // Sync current track
    if (player.currentTrack) {
      const currentId = player.currentTrack._id || player.currentTrack.id;
      const stateId = state.currentTrack?._id || state.currentTrack?.id;
      if (currentId !== stateId) {
        dispatch({ type: 'SET_CURRENT_TRACK', payload: player.currentTrack });
      }
    }
    
    // Sync playing state
    if (player.isPlaying !== state.isPlaying) {
      dispatch({ type: 'SET_PLAYING', payload: player.isPlaying });
    }
    
    // Sync progress (with threshold to avoid too many updates)
    if (Math.abs((player.progress || 0) - (state.progress || 0)) > 0.5) {
      dispatch({ type: 'SET_PROGRESS', payload: player.progress || 0 });
    }
    
    // Sync duration
    if (player.duration !== state.duration) {
      dispatch({ type: 'SET_DURATION', payload: player.duration || 0 });
    }
    
    // Sync volume
    const volPercent = Math.round((player.volume || 0) * 100);
    if (!Number.isNaN(volPercent) && Math.abs(volPercent - (state.volume || 0)) > 1) {
      dispatch({ type: 'SET_VOLUME', payload: volPercent });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player.currentTrack, player.isPlaying, player.progress, player.duration, player.volume]);

  const value = {
    ...state,
    playTrack,
    pauseTrack,
    resumeTrack,
    nextTrack,
    previousTrack,
    setProgress,
    setVolume,
    toggleLike,
    setRepeatMode,
    repeatMode: state.repeatMode,
    isLiked: (songId) => state.likedSongs.has(songId),
    likedSongsIds: Array.from(state.likedSongs),
    setQueue,
    login,
    logout,
    checkAuth,
    isLoading,
    showAuthPrompt,
    setShowAuthPrompt,
  };

  return (
    <MusicContext.Provider value={value}>
      {children}
    </MusicContext.Provider>
  );
}

export function useMusic() {
  const context = useContext(MusicContext);
  if (!context) {
    throw new Error('useMusic must be used within a MusicProvider');
  }
  return context;
}
