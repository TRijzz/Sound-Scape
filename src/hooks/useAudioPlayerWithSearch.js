import { useState, useEffect, useRef, useCallback } from 'react';

export const useAudioPlayerWithSearch = () => {
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.6); // Default volume (60%)
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [playHistory, setPlayHistory] = useState([]);

  // Audio element reference
  const audioRef = useRef(null);

  // Initialize audio element
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.preload = 'metadata';
      audioRef.current.crossOrigin = 'anonymous'; // For CORS issues
      
      // Set up event listeners
      const audio = audioRef.current;
      
      const handleLoadedMetadata = () => {
        setDuration(Math.floor(audio.duration));
        setIsLoading(false);
        setError(null);
      };

      const handleTimeUpdate = () => {
        setProgress(Math.floor(audio.currentTime));
      };

      const handleEnded = () => {
        setIsPlaying(false);
        setProgress(0);
        // Auto-play next track if available
        playNextTrack();
      };

      const handlePlay = () => {
        setIsPlaying(true);
        setError(null);
      };

      const handlePause = () => {
        setIsPlaying(false);
      };

      const handleError = (e) => {
        console.error('Audio error:', e);
        setError('Failed to load audio. Please try another track.');
        setIsLoading(false);
        setIsPlaying(false);
      };

      const handleLoadStart = () => {
        setIsLoading(true);
        setError(null);
      };

      const handleCanPlay = () => {
        setIsLoading(false);
      };

      const handleWaiting = () => {
        setIsLoading(true);
      };

      const handleCanPlayThrough = () => {
        setIsLoading(false);
      };

      // Add event listeners
      audio.addEventListener('loadedmetadata', handleLoadedMetadata);
      audio.addEventListener('timeupdate', handleTimeUpdate);
      audio.addEventListener('ended', handleEnded);
      audio.addEventListener('play', handlePlay);
      audio.addEventListener('pause', handlePause);
      audio.addEventListener('error', handleError);
      audio.addEventListener('loadstart', handleLoadStart);
      audio.addEventListener('canplay', handleCanPlay);
      audio.addEventListener('waiting', handleWaiting);
      audio.addEventListener('canplaythrough', handleCanPlayThrough);

      // Cleanup function
      return () => {
        audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
        audio.removeEventListener('timeupdate', handleTimeUpdate);
        audio.removeEventListener('ended', handleEnded);
        audio.removeEventListener('play', handlePlay);
        audio.removeEventListener('pause', handlePause);
        audio.removeEventListener('error', handleError);
        audio.removeEventListener('loadstart', handleLoadStart);
        audio.removeEventListener('canplay', handleCanPlay);
        audio.removeEventListener('waiting', handleWaiting);
        audio.removeEventListener('canplaythrough', handleCanPlayThrough);
      };
    }
  }, []);

  // Update volume when volume state changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Play next track from history
  const playNextTrack = useCallback(() => {
    if (playHistory.length > 0) {
      const nextTrack = playHistory[0];
      setPlayHistory(prev => prev.slice(1));
      playTrack(nextTrack);
    }
  }, [playHistory]);

  // Play track function with enhanced error handling
  const playTrack = useCallback(async (track) => {
    if (!audioRef.current) return;

    try {
      setError(null);
      setIsLoading(true);

      // If it's the same track, just resume
      if (currentTrack && currentTrack._id === track._id) {
        await audioRef.current.play();
        return;
      }

      // Set new track
      setCurrentTrack(track);
      setProgress(0);

      // Get audio URL with fallback handling
      const audioUrl = await getAudioUrl(track);
      
      if (!audioUrl) {
        throw new Error('No audio URL available for this track');
      }

      // Validate URL
      if (!isValidUrl(audioUrl)) {
        throw new Error('Invalid audio URL format');
      }

      // Set audio source
      audioRef.current.src = audioUrl;
      audioRef.current.load();

      // Play the audio with user interaction requirement
      await audioRef.current.play();
      
      // Add to play history
      setPlayHistory(prev => [track, ...prev.slice(0, 9)]); // Keep last 10 tracks
      
    } catch (err) {
      console.error('Failed to play track:', err);
      setError(err.message);
      setIsLoading(false);
      setIsPlaying(false);
      
      // Try fallback audio if available
      if (track.fallback_url) {
        try {
          audioRef.current.src = track.fallback_url;
          audioRef.current.load();
          await audioRef.current.play();
          setError(null);
        } catch (fallbackErr) {
          console.error('Fallback audio also failed:', fallbackErr);
        }
      }
    }
  }, [currentTrack]);

  // Pause track
  const pauseTrack = useCallback(() => {
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause();
    }
  }, []);

  // Resume track
  const resumeTrack = useCallback(async () => {
    if (audioRef.current && audioRef.current.paused) {
      try {
        await audioRef.current.play();
      } catch (err) {
        console.error('Failed to resume track:', err);
        setError(err.message);
      }
    }
  }, []);

  // Stop track
  const stopTrack = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setProgress(0);
      setIsPlaying(false);
    }
  }, []);

  // Seek to specific time
  const seekTo = useCallback((time) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setProgress(time);
    }
  }, []);

  // Set volume
  const setVolumeLevel = useCallback((newVolume) => {
    setVolume(Math.max(0, Math.min(1, newVolume)));
  }, []);

  // Toggle mute
  const toggleMute = useCallback(() => {
    setIsMuted(!isMuted);
  }, [isMuted]);

  // Next track
  const nextTrack = useCallback(() => {
    playNextTrack();
  }, [playNextTrack]);

  // Previous track (placeholder)
  const previousTrack = useCallback(() => {
    // This would typically play the previous track in a queue
    console.log('Previous track - implement queue functionality');
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    currentTrack,
    isPlaying,
    progress,
    duration,
    volume,
    isMuted,
    isLoading,
    error,
    playHistory,
    playTrack,
    pauseTrack,
    resumeTrack,
    stopTrack,
    seekTo,
    setVolumeLevel,
    toggleMute,
    nextTrack,
    previousTrack,
    clearError,
    audioElement: audioRef.current
  };
};

// Enhanced audio URL resolver with multiple fallbacks
const getAudioUrl = async (track) => {
  // Priority order for audio sources
  const audioSources = [
    track.preview_url,        // Spotify preview
    track.audio_url,          // Direct audio URL
    track.stream_url,         // Streaming URL
    track.sample_url,         // Sample URL
    track.preview_mp3,        // MP3 preview
    track.preview_wav,        // WAV preview
  ].filter(Boolean);

  // If no sources available, use demo audio
  if (audioSources.length === 0) {
    return getDemoAudioUrl(track);
  }

  // Return the first available source
  return audioSources[0];
};

// Demo audio URLs for testing
const getDemoAudioUrl = (track) => {
  const demoUrls = [
    'https://www.bensound.com/bensound-music/bensound-sunny.mp3',
    'https://www.bensound.com/bensound-music/bensound-creativeminds.mp3',
    'https://www.bensound.com/bensound-music/bensound-ukulele.mp3',
    'https://www.bensound.com/bensound-music/bensound-slowmotion.mp3',
    'https://www.bensound.com/bensound-music/bensound-romantic.mp3',
    'https://www.bensound.com/bensound-music/bensound-acousticbreeze.mp3',
    'https://www.bensound.com/bensound-music/bensound-betterdays.mp3',
    'https://www.bensound.com/bensound-music/bensound-countryboy.mp3'
  ];

  // Use track ID to pick a consistent demo URL
  if (track && track._id) {
    const index = track._id.charCodeAt(0) % demoUrls.length;
    return demoUrls[index];
  }

  return demoUrls[0];
};

// URL validation
const isValidUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export default useAudioPlayerWithSearch;
