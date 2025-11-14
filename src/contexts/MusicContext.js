import React, { createContext, useContext, useState, useReducer } from 'react';

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

  const login = (user) => {
    dispatch({ type: 'SET_USER', payload: user });
  };

  const logout = () => {
    dispatch({ type: 'SET_USER', payload: null });
  };

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
