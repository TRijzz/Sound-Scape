import React, { createContext, useContext, useState, useReducer, useEffect, useRef, useCallback } from 'react';
import apiService from '../services/api';
import useAudioPlayer from '../hooks/useAudioPlayer';
import { getVinylImageSrc, vinylContainsTrack } from '../utils/vinyl';

const MusicContext = createContext();

const normalizeIdSet = (value) => new Set(
  (Array.isArray(value) ? value : []).map(String).filter(Boolean)
);

const getFollowedArtistsFromUser = (user) => {
  if (!user) return new Set();
  return normalizeIdSet(user.followedArtists || user.followed_artists);
};

const getFollowedUsersFromUser = (user) => {
  if (!user) return new Set();
  return normalizeIdSet(user.followedUsers || user.followed_users);
};

const initialState = {
  currentTrack: null,
  isPlaying: false,
  progress: 0,
  duration: 0,
  volume: 60,
  queue: [],
  currentIndex: 0,
  shuffleEnabled: false,
  user: null,
  isAuthenticated: false,
  repeatMode: 'off',
  likedSongs: new Set(),
  followedArtists: new Set(),
  followedUsers: new Set(),
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
    case 'SET_SHUFFLE':
      return { ...state, shuffleEnabled: action.payload };
    case 'SET_USER':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: !!action.payload,
        likedSongs: action.payload?.likedSongs ? new Set(action.payload.likedSongs) : new Set(),
        followedArtists: getFollowedArtistsFromUser(action.payload),
        followedUsers: getFollowedUsersFromUser(action.payload),
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
    case 'TOGGLE_FOLLOW_ARTIST': {
      const artistId = String(action.payload || '');
      const newFollowedArtists = new Set(state.followedArtists);
      if (newFollowedArtists.has(artistId)) {
        newFollowedArtists.delete(artistId);
      } else if (artistId) {
        newFollowedArtists.add(artistId);
      }
      return { ...state, followedArtists: newFollowedArtists };
    }
    case 'SET_FOLLOWED_ARTISTS':
      return {
        ...state,
        followedArtists: normalizeIdSet(action.payload)
      };
    case 'TOGGLE_FOLLOW_USER': {
      const userId = String(action.payload || '');
      const newFollowedUsers = new Set(state.followedUsers);
      if (newFollowedUsers.has(userId)) {
        newFollowedUsers.delete(userId);
      } else if (userId) {
        newFollowedUsers.add(userId);
      }
      return { ...state, followedUsers: newFollowedUsers };
    }
    case 'SET_FOLLOWED_USERS':
      return {
        ...state,
        followedUsers: normalizeIdSet(action.payload)
      };
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
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const setQueue = useCallback((queue, currentIndex = 0) => {
    const normalizedQueue = Array.isArray(queue) ? queue.filter(Boolean) : [];
    const safeIndex = normalizedQueue.length
      ? Math.max(0, Math.min(currentIndex, normalizedQueue.length - 1))
      : 0;
    dispatch({ type: 'SET_QUEUE', payload: normalizedQueue });
    dispatch({ type: 'SET_CURRENT_INDEX', payload: safeIndex });
  }, []);

  const setShuffleEnabled = useCallback((enabled) => {
    dispatch({ type: 'SET_SHUFFLE', payload: Boolean(enabled) });
  }, []);

  const toggleShuffle = useCallback(() => {
    dispatch({ type: 'SET_SHUFFLE', payload: !stateRef.current.shuffleEnabled });
  }, []);

  const addToQueue = useCallback((tracks) => {
    const incoming = (Array.isArray(tracks) ? tracks : [tracks]).filter(Boolean);
    if (!incoming.length) return;

    const currentQueue = Array.isArray(stateRef.current.queue) ? stateRef.current.queue : [];
    const existingIds = new Set(
      currentQueue.map((song) => String(song?._id || song?.id || ''))
    );

    const mergedQueue = [...currentQueue];
    incoming.forEach((track) => {
      const trackId = String(track?._id || track?.id || '');
      if (trackId && existingIds.has(trackId)) return;
      if (trackId) existingIds.add(trackId);
      mergedQueue.push(track);
    });

    setQueue(mergedQueue, stateRef.current.currentIndex || 0);
  }, [setQueue]);

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

  const setUser = useCallback((user) => {
    dispatch({ type: 'SET_USER', payload: user });
  }, []);

  const playTrack = useCallback(async (track, options = {}) => {
    if (!track) return;

    const {
      queue,
      currentIndex,
      preserveQueue = false,
      shuffle,
    } = options;

    if (Array.isArray(queue)) {
      setQueue(queue, currentIndex ?? queue.findIndex((item) => String(item?._id || item?.id || '') === String(track?._id || track?.id || '')));
    } else if (!preserveQueue) {
      setQueue([track], 0);
    }

    if (typeof shuffle === 'boolean') {
      setShuffleEnabled(shuffle);
    }

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
  }, [player, setQueue, setShuffleEnabled]);

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

  const getRandomQueueIndex = (queue, currentIndex) => {
    if (!Array.isArray(queue) || queue.length === 0) return -1;
    if (queue.length === 1) return 0;

    let nextIndex = currentIndex;
    while (nextIndex === currentIndex) {
      nextIndex = Math.floor(Math.random() * queue.length);
    }
    return nextIndex;
  };

  const playRandomTrack = useCallback(async ({ excludeTrackId = null } = {}) => {
    try {
      const response = await apiService.getSongs(1, 50, '', '', '', '', '', '-popularity', '', '', '', '', true);
      const songs = Array.isArray(response?.songs) ? response.songs : Array.isArray(response) ? response : [];
      const candidates = songs.filter((song) => String(song?._id || song?.id || '') !== String(excludeTrackId || ''));

      if (!candidates.length) return;

      const nextTrack = candidates[Math.floor(Math.random() * candidates.length)];
      await playTrack(nextTrack, { queue: [nextTrack], currentIndex: 0, preserveQueue: false });
    } catch (error) {
      console.error('Failed to play a random follow-up track:', error);
    }
  }, [playTrack]);

  const nextTrack = useCallback(async ({ triggeredByEnd = false } = {}) => {
    const snapshot = stateRef.current;
    if (snapshot.previewSession?.queue?.length) {
      const nextIndex = snapshot.previewSession.currentIndex < snapshot.previewSession.queue.length - 1
        ? snapshot.previewSession.currentIndex + 1
        : 0;
      const nextPreviewTrack = snapshot.previewSession.queue[nextIndex];
      dispatch({
        type: 'SET_PREVIEW_SESSION',
        payload: {
          ...snapshot.previewSession,
          currentIndex: nextIndex,
          currentTrack: nextPreviewTrack,
          progress: 0,
          duration: Number(nextPreviewTrack?.duration_seconds || nextPreviewTrack?.duration || 0),
        }
      });
      return;
    }

    if (!snapshot.queue.length) {
      await playRandomTrack({ excludeTrackId: snapshot.currentTrack?._id || snapshot.currentTrack?.id });
      return;
    }

    let nextIndex = -1;
    if (snapshot.shuffleEnabled) {
      nextIndex = getRandomQueueIndex(snapshot.queue, snapshot.currentIndex);
    } else if (snapshot.currentIndex < snapshot.queue.length - 1) {
      nextIndex = snapshot.currentIndex + 1;
    } else if (snapshot.repeatMode === 'all') {
      nextIndex = 0;
    }

    if (nextIndex === -1 || !snapshot.queue[nextIndex]) {
      await playRandomTrack({ excludeTrackId: snapshot.currentTrack?._id || snapshot.currentTrack?.id });
      return;
    }

    dispatch({ type: 'SET_CURRENT_INDEX', payload: nextIndex });
    await playTrack(snapshot.queue[nextIndex], { preserveQueue: true });
  }, [playRandomTrack, playTrack]);

  const previousTrack = useCallback(async () => {
    const snapshot = stateRef.current;
    if (snapshot.previewSession?.queue?.length) {
      const prevIndex = snapshot.previewSession.currentIndex > 0
        ? snapshot.previewSession.currentIndex - 1
        : snapshot.previewSession.queue.length - 1;
      const prevPreviewTrack = snapshot.previewSession.queue[prevIndex];
      dispatch({
        type: 'SET_PREVIEW_SESSION',
        payload: {
          ...snapshot.previewSession,
          currentIndex: prevIndex,
          currentTrack: prevPreviewTrack,
          progress: 0,
          duration: Number(prevPreviewTrack?.duration_seconds || prevPreviewTrack?.duration || 0),
        }
      });
      return;
    }

    if (!snapshot.queue.length) {
      player.previousTrack && player.previousTrack();
      return;
    }

    const prevIndex = snapshot.currentIndex > 0
      ? snapshot.currentIndex - 1
      : snapshot.repeatMode === 'all'
        ? snapshot.queue.length - 1
        : 0;
    dispatch({ type: 'SET_CURRENT_INDEX', payload: prevIndex });
    await playTrack(snapshot.queue[prevIndex], { preserveQueue: true });
  }, [playTrack, player]);

  const handleTrackEnded = useCallback(async () => {
    const snapshot = stateRef.current;
    if (snapshot.repeatMode === 'one' && snapshot.currentTrack) {
      await playTrack(snapshot.currentTrack, { preserveQueue: true });
      return;
    }
    await nextTrack({ triggeredByEnd: true });
  }, [nextTrack, playTrack]);

  useEffect(() => {
    const audioElement = player.audioElement;
    if (!audioElement) return undefined;

    const onEnded = () => {
      handleTrackEnded();
    };

    audioElement.addEventListener('ended', onEnded);
    return () => {
      audioElement.removeEventListener('ended', onEnded);
    };
  }, [handleTrackEnded, player.audioElement]);

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

  const toggleFollowArtist = async (artistId) => {
    const normalizedArtistId = String(artistId || '');
    if (!normalizedArtistId) return;

    if (!stateRef.current.isAuthenticated) {
      setShowAuthPrompt(true);
      return;
    }

    const currentFollowedArtists = Array.from(stateRef.current.followedArtists).map(String).filter(Boolean);
    const isCurrentlyFollowing = stateRef.current.followedArtists.has(normalizedArtistId);
    const nextFollowedArtists = isCurrentlyFollowing
      ? currentFollowedArtists.filter((followedArtistId) => followedArtistId !== normalizedArtistId)
      : Array.from(new Set([...currentFollowedArtists, normalizedArtistId]));

    dispatch({ type: 'TOGGLE_FOLLOW_ARTIST', payload: normalizedArtistId });

    try {
      let response;
      try {
        response = isCurrentlyFollowing
          ? await apiService.unfollowArtist(normalizedArtistId)
          : await apiService.followArtist(normalizedArtistId);
      } catch (endpointError) {
        const snapshot = stateRef.current;
        if (!snapshot.user?._id && !snapshot.user?.id) {
          throw endpointError;
        }

        const updatedUser = await apiService.updateUser(snapshot.user._id || snapshot.user.id, {
          followed_artists: nextFollowedArtists
        });
        response = { followedArtists: updatedUser?.followedArtists || nextFollowedArtists };
      }

      if (Array.isArray(response?.followedArtists)) {
        dispatch({ type: 'SET_FOLLOWED_ARTISTS', payload: response.followedArtists });
      } else if (Array.isArray(response?.followed_artists)) {
        dispatch({ type: 'SET_FOLLOWED_ARTISTS', payload: response.followed_artists });
      } else {
        dispatch({ type: 'SET_FOLLOWED_ARTISTS', payload: nextFollowedArtists });
      }

      try {
        const refreshedUser = await apiService.getCurrentUser();
        if (refreshedUser) {
          const refreshedFollowedArtists = getFollowedArtistsFromUser(refreshedUser);
          dispatch({
            type: 'SET_USER',
            payload: refreshedFollowedArtists.size || !stateRef.current.followedArtists.size
              ? refreshedUser
              : { ...refreshedUser, followedArtists: nextFollowedArtists }
          });
        }
      } catch (refreshError) {
        console.error('Failed to refresh user after updating followed artists:', refreshError);
      }
    } catch (error) {
      console.error('Failed to toggle artist follow state:', error);
      dispatch({ type: 'TOGGLE_FOLLOW_ARTIST', payload: normalizedArtistId });
    }
  };

  const toggleFollowUser = async (userId) => {
    const normalizedUserId = String(userId || '');
    if (!normalizedUserId) return;

    if (!stateRef.current.isAuthenticated) {
      setShowAuthPrompt(true);
      return;
    }

    const currentUserId = String(stateRef.current.user?._id || stateRef.current.user?.id || '');
    if (!currentUserId || currentUserId === normalizedUserId) {
      return;
    }

    const currentFollowedUsers = Array.from(stateRef.current.followedUsers).map(String).filter(Boolean);
    const isCurrentlyFollowing = stateRef.current.followedUsers.has(normalizedUserId);
    const nextFollowedUsers = isCurrentlyFollowing
      ? currentFollowedUsers.filter((followedUserId) => followedUserId !== normalizedUserId)
      : Array.from(new Set([...currentFollowedUsers, normalizedUserId]));

    dispatch({ type: 'TOGGLE_FOLLOW_USER', payload: normalizedUserId });

    try {
      let response;
      try {
        response = isCurrentlyFollowing
          ? await apiService.unfollowUser(normalizedUserId)
          : await apiService.followUser(normalizedUserId);
      } catch (endpointError) {
        const snapshot = stateRef.current;
        if (!snapshot.user?._id && !snapshot.user?.id) {
          throw endpointError;
        }

        const updatedUser = await apiService.updateUser(snapshot.user._id || snapshot.user.id, {
          followed_users: nextFollowedUsers
        });
        response = {
          followedUsers: updatedUser?.followedUsers || updatedUser?.followed_users || nextFollowedUsers
        };
      }

      if (Array.isArray(response?.followedUsers)) {
        dispatch({ type: 'SET_FOLLOWED_USERS', payload: response.followedUsers });
      } else if (Array.isArray(response?.followed_users)) {
        dispatch({ type: 'SET_FOLLOWED_USERS', payload: response.followed_users });
      } else {
        dispatch({ type: 'SET_FOLLOWED_USERS', payload: nextFollowedUsers });
      }

      try {
        const refreshedUser = await apiService.getCurrentUser();
        if (refreshedUser) {
          const refreshedFollowedUsers = getFollowedUsersFromUser(refreshedUser);
          dispatch({
            type: 'SET_USER',
            payload: refreshedFollowedUsers.size || !stateRef.current.followedUsers.size
              ? refreshedUser
              : { ...refreshedUser, followedUsers: nextFollowedUsers }
          });
        }
      } catch (refreshError) {
        console.error('Failed to refresh user after updating followed users:', refreshError);
      }
    } catch (error) {
      console.error('Failed to toggle user follow state:', error);
      dispatch({ type: 'TOGGLE_FOLLOW_USER', payload: normalizedUserId });
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
    toggleFollowArtist,
    toggleFollowUser,
    setRepeatMode,
    shuffleEnabled: state.shuffleEnabled,
    setShuffleEnabled,
    toggleShuffle,
    addToQueue,
    isLiked: (songId) => state.likedSongs.has(songId),
    isFollowingArtist: (artistId) => state.followedArtists.has(String(artistId || '')),
    isFollowingUser: (userId) => state.followedUsers.has(String(userId || '')),
    likedSongsIds: Array.from(state.likedSongs),
    followedArtistIds: Array.from(state.followedArtists),
    followedUserIds: Array.from(state.followedUsers),
    setQueue,
    login,
    logout,
    checkAuth,
    syncCurrentUser,
    setUser,
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
