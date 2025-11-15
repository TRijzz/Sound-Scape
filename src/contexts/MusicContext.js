import React, { createContext, useContext, useState, useReducer, useEffect } from 'react';
import apiService from '../services/api';

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
      return { ...state, user: action.payload, isAuthenticated: !!action.payload };
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

  const playTrack = (track) => {
    dispatch({ type: 'PLAY_TRACK', payload: track });
  };

  const pauseTrack = () => {
    dispatch({ type: 'PAUSE_TRACK' });
  };

  const resumeTrack = () => {
    dispatch({ type: 'RESUME_TRACK' });
  };

  const nextTrack = () => {
    dispatch({ type: 'NEXT_TRACK' });
  };

  const previousTrack = () => {
    dispatch({ type: 'PREVIOUS_TRACK' });
  };

  const setProgress = (progress) => {
    dispatch({ type: 'SET_PROGRESS', payload: progress });
  };

  const setVolume = (volume) => {
    dispatch({ type: 'SET_VOLUME', payload: volume });
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

  const value = {
    ...state,
    playTrack,
    pauseTrack,
    resumeTrack,
    nextTrack,
    previousTrack,
    setProgress,
    setVolume,
    setQueue,
    login,
    logout,
    checkAuth,
    isLoading,
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
