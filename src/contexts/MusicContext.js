import React, { createContext, useContext, useState, useReducer, useEffect } from 'react';
import apiService from '../services/api';
import useAudioPlayer from '../hooks/useAudioPlayer';
import { getVinylImageSrc, vinylContainsTrack } from '../utils/vinyl';

const MusicContext = createContext();

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
  repeatMode: 'off',
  likedSongs: new Set(),
  purchasedVinyls: [],
  activeVinyl: null,
  showVinylOverlay: false,
  previewSession: null,
};

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
        likedSongs: action.payload?.likedSongs ? new Set(action.payload.likedSongs) : new Set(),
        purchasedVinyls: action.payload?.purchased_vinyls || [],
        activeVinyl: action.payload?.active_vinyl || null,
        showVinylOverlay: false,
      };
    case 'SET_ACTIVE_VINYL':
      return { ...state, activeVinyl: action.payload };
    case 'SET_VINYL_OVERLAY':
      return { ...state, showVinylOverlay: action.payload };
    case 'SET_PREVIEW_SESSION':
      return { ...state, previewSession: action.payload };
    case 'TOGGLE_LIKE': {
      const newLikedSongs = new Set(state.likedSongs);
      if (newLikedSongs.has(action.payload)) {
        newLikedSongs.delete(action.payload);
      } else {
        newLikedSongs.add(action.payload);
      }
      return { ...state, likedSongs: newLikedSongs };
    }
    case 'SET_REPEAT_MODE':
      return { ...state, repeatMode: action.payload };
    default:
      return state;
  }
}

export function MusicProvider({ children }) {
  const [state, dispatch] = useReducer(musicReducer, initialState);
  const [isLoading, setIsLoading] = useState(true);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const player = useAudioPlayer();

  const userOwnsVinyl = (vinyl) => {
    if (!vinyl) return false;
    const vinylId = String(vinyl._id || vinyl.id || '');
    return state.purchasedVinyls.some((ownedVinyl) => String(ownedVinyl?._id || ownedVinyl?.id || ownedVinyl) === vinylId);
  };

  const syncCurrentUser = async () => {
    try {
      const user = await apiService.getCurrentUser();
      if (user) {
        dispatch({ type: 'SET_USER', payload: user });
      }
      return user;
    } catch (error) {
      console.error('Failed to sync user:', error);
      return null;
    }
  };

  const playTrack = async (track) => {
    if (!track) return;

    try {
      dispatch({ type: 'SET_CURRENT_TRACK', payload: track });
      dispatch({ type: 'SET_PLAYING', payload: true });

      await player.playTrack(track);

      if (track._id) {
        apiService.playSong(track._id).catch((err) => {
          console.error('Failed to record play event:', err);
        });
      }
    } catch (error) {
      console.error('Error playing track:', error);
      dispatch({ type: 'SET_CURRENT_TRACK', payload: track });
      dispatch({ type: 'SET_PLAYING', payload: false });
    }
  };

  const pauseTrack = async () => {
    if (state.previewSession) {
      dispatch({
        type: 'SET_PREVIEW_SESSION',
        payload: {
          ...state.previewSession,
          isPlaying: false,
        }
      });
      return;
    }

    try {
      player.pauseTrack();
      dispatch({ type: 'SET_PLAYING', payload: false });
    } catch (error) {
      console.error('Error pausing track:', error);
    }
  };

  const resumeTrack = async () => {
    if (state.previewSession) {
      dispatch({
        type: 'SET_PREVIEW_SESSION',
        payload: {
          ...state.previewSession,
          isPlaying: true,
        }
      });
      return;
    }

    try {
      await player.resumeTrack();
      dispatch({ type: 'SET_PLAYING', payload: true });
    } catch (error) {
      console.error('Error resuming track:', error);
    }
  };

  const setQueue = (queue, currentIndex = 0) => {
    dispatch({ type: 'SET_QUEUE', payload: queue });
    dispatch({ type: 'SET_CURRENT_INDEX', payload: currentIndex });
  };

  const nextTrack = async () => {
    if (state.previewSession?.queue?.length) {
      const nextIndex = state.previewSession.currentIndex < state.previewSession.queue.length - 1
        ? state.previewSession.currentIndex + 1
        : 0;
      const nextPreviewTrack = state.previewSession.queue[nextIndex];
      dispatch({
        type: 'SET_PREVIEW_SESSION',
        payload: {
          ...state.previewSession,
          currentIndex: nextIndex,
          currentTrack: nextPreviewTrack,
          progress: 0,
          duration: Number(nextPreviewTrack?.duration_seconds || nextPreviewTrack?.duration || 0),
        }
      });
      return;
    }

    if (!state.queue.length) {
      player.nextTrack && player.nextTrack();
      return;
    }

    const nextIndex = state.currentIndex < state.queue.length - 1 ? state.currentIndex + 1 : 0;
    dispatch({ type: 'SET_CURRENT_INDEX', payload: nextIndex });
    await playTrack(state.queue[nextIndex]);
  };

  const previousTrack = async () => {
    if (state.previewSession?.queue?.length) {
      const prevIndex = state.previewSession.currentIndex > 0
        ? state.previewSession.currentIndex - 1
        : state.previewSession.queue.length - 1;
      const prevPreviewTrack = state.previewSession.queue[prevIndex];
      dispatch({
        type: 'SET_PREVIEW_SESSION',
        payload: {
          ...state.previewSession,
          currentIndex: prevIndex,
          currentTrack: prevPreviewTrack,
          progress: 0,
          duration: Number(prevPreviewTrack?.duration_seconds || prevPreviewTrack?.duration || 0),
        }
      });
      return;
    }

    if (!state.queue.length) {
      player.previousTrack && player.previousTrack();
      return;
    }

    const prevIndex = state.currentIndex > 0 ? state.currentIndex - 1 : state.queue.length - 1;
    dispatch({ type: 'SET_CURRENT_INDEX', payload: prevIndex });
    await playTrack(state.queue[prevIndex]);
  };

  const setProgress = (progress) => {
    if (state.previewSession) {
      dispatch({
        type: 'SET_PREVIEW_SESSION',
        payload: {
          ...state.previewSession,
          progress,
        }
      });
      return;
    }

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

  const openVinylOverlay = () => {
    dispatch({ type: 'SET_VINYL_OVERLAY', payload: true });
  };

  const closeVinylOverlay = () => {
    dispatch({ type: 'SET_VINYL_OVERLAY', payload: false });
    dispatch({ type: 'SET_PREVIEW_SESSION', payload: null });
  };

  const setActiveVinyl = async (vinyl, { persist = true } = {}) => {
    if (!vinyl) {
      dispatch({ type: 'SET_ACTIVE_VINYL', payload: null });

      if (!persist || !state.isAuthenticated) {
        return null;
      }

      try {
        await apiService.setActiveVinyl(null);
      } catch (error) {
        console.error('Failed to clear active vinyl:', error);
      }

      return null;
    }

    if (!userOwnsVinyl(vinyl)) {
      const error = new Error('You must purchase this vinyl before using it.');
      error.status = 403;
      throw error;
    }

    dispatch({ type: 'SET_ACTIVE_VINYL', payload: vinyl });

    if (!persist || !state.isAuthenticated) {
      return vinyl;
    }

    try {
      const vinylId = vinyl._id || vinyl.id || null;
      const response = await apiService.setActiveVinyl(vinylId);
      if (response?.active_vinyl) {
        dispatch({ type: 'SET_ACTIVE_VINYL', payload: response.active_vinyl });
        return response.active_vinyl;
      }
      return vinyl;
    } catch (error) {
      console.error('Failed to persist active vinyl:', error);
      dispatch({ type: 'SET_ACTIVE_VINYL', payload: state.activeVinyl || null });
      throw error;
    }
  };

  const playVinylTrack = async ({ track, vinyl = null, queue = [], trackIndex = 0, openOverlay = true, persistActive = true }) => {
    const playbackQueue = Array.isArray(queue) && queue.length > 0 ? queue : (track ? [track] : []);
    const safeIndex = Math.max(0, Math.min(trackIndex, Math.max(playbackQueue.length - 1, 0)));
    const selectedTrack = track || playbackQueue[safeIndex];

    if (!selectedTrack) {
      return;
    }

    dispatch({ type: 'SET_PREVIEW_SESSION', payload: null });

    if (playbackQueue.length > 0) {
      setQueue(playbackQueue, safeIndex);
    }

    if (vinyl) {
      await setActiveVinyl(vinyl, { persist: persistActive });
    }

    await playTrack(selectedTrack);

    if (openOverlay) {
      openVinylOverlay();
    }
  };

  const previewVinylExperience = ({ track, vinyl = null, queue = [], trackIndex = 0 } = {}) => {
    const previewQueue = Array.isArray(queue) && queue.length > 0 ? queue : (track ? [track] : []);
    const safeIndex = Math.max(0, Math.min(trackIndex, Math.max(previewQueue.length - 1, 0)));
    const selectedTrack = track || previewQueue[safeIndex];

    if (!selectedTrack) {
      return;
    }

    player.pauseTrack();
    dispatch({
      type: 'SET_PREVIEW_SESSION',
      payload: {
        queue: previewQueue,
        currentIndex: safeIndex,
        currentTrack: selectedTrack,
        vinyl,
        isPlaying: false,
        progress: 0,
        duration: Number(selectedTrack?.duration_seconds || selectedTrack?.duration || 0),
      }
    });

    if (vinyl) {
      dispatch({ type: 'SET_ACTIVE_VINYL', payload: vinyl });
    }

    openVinylOverlay();
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
    dispatch({ type: 'SET_ACTIVE_VINYL', payload: null });
    dispatch({ type: 'SET_VINYL_OVERLAY', payload: false });
  };

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

      apiService.setAuthToken(accessToken);

      const user = await syncCurrentUser();
      return user;
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('authTokens');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (player.currentTrack) {
      const currentId = player.currentTrack._id || player.currentTrack.id;
      const stateId = state.currentTrack?._id || state.currentTrack?.id;
      if (currentId !== stateId) {
        dispatch({ type: 'SET_CURRENT_TRACK', payload: player.currentTrack });
      }
    }

    if (player.isPlaying !== state.isPlaying) {
      dispatch({ type: 'SET_PLAYING', payload: player.isPlaying });
    }

    if (Math.abs((player.progress || 0) - (state.progress || 0)) > 0.01) {
      dispatch({ type: 'SET_PROGRESS', payload: player.progress || 0 });
    }

    if (player.duration !== state.duration) {
      dispatch({ type: 'SET_DURATION', payload: player.duration || 0 });
    }

    const volPercent = Math.round((player.volume || 0) * 100);
    if (!Number.isNaN(volPercent) && Math.abs(volPercent - (state.volume || 0)) > 1) {
      dispatch({ type: 'SET_VOLUME', payload: volPercent });
    }
  }, [player.currentTrack, player.isPlaying, player.progress, player.duration, player.volume, state.currentTrack, state.duration, state.isPlaying, state.progress, state.volume]);

  const getVinylForSong = (song) => {
    if (!song) return null;

    if (state.activeVinyl && vinylContainsTrack(state.activeVinyl, song)) {
      return getVinylImageSrc(state.activeVinyl, null);
    }

    const matchedVinyl = state.purchasedVinyls.find((vinyl) => vinylContainsTrack(vinyl, song));
    return matchedVinyl ? getVinylImageSrc(matchedVinyl, null) : null;
  };

  const value = {
    ...state,
    playTrack,
    playVinylTrack,
    previewVinylExperience,
    pauseTrack,
    resumeTrack,
    nextTrack,
    previousTrack,
    setProgress,
    setVolume,
    toggleLike,
    setRepeatMode,
    isLiked: (songId) => state.likedSongs.has(songId),
    likedSongsIds: Array.from(state.likedSongs),
    setQueue,
    login,
    logout,
    checkAuth,
    syncCurrentUser,
    isLoading,
    showAuthPrompt,
    setShowAuthPrompt,
    getVinylForSong,
    openVinylOverlay,
    closeVinylOverlay,
    setActiveVinyl,
    previewSession: state.previewSession,
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
