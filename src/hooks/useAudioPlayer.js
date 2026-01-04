import { useState, useEffect, useRef, useCallback } from 'react';

export const useAudioPlayer = () => {
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.6); // Default volume (60%)
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Audio element reference
  const audioRef = useRef(null);

  // Initialize audio element
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.preload = 'metadata';
      
      // Set up event listeners
      const audio = audioRef.current;
      
      const handleLoadedMetadata = () => {
        const meta = Math.floor(audio.duration);
        const fallback = Math.floor(((currentTrack?.duration_ms) || 0) / 1000);
        setDuration(meta > 0 ? meta : fallback);
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
        // This can be extended to implement queue functionality
      };

      const handlePlay = () => {
        setIsPlaying(true);
        setError(null);
        setIsLoading(false);
      };

      const handlePause = () => {
        setIsPlaying(false);
      };

      const handleError = async (e) => {
        console.error('Audio error:', e);
        console.log('Current audio src:', audioRef.current?.src);
        setError('Failed to load audio - trying fallback...');
        setIsLoading(false);
        setIsPlaying(false);
        
        // Try a fallback URL if the current one fails
        if (audioRef.current && currentTrack) {
          const fallbackUrl = 'https://actions.google.com/sounds/v1/alarms/beep_short.ogg';
          console.log('Trying fallback URL:', fallbackUrl);
          audioRef.current.src = fallbackUrl;
          audioRef.current.load();
          try {
            await audioRef.current.play();
          } catch (err) {
            console.error('Failed to play fallback audio:', err);
          }
        }
      };

      const handleLoadStart = () => {
        setIsLoading(true);
        setError(null);
      };

      const handleCanPlay = () => {
        setIsLoading(false);
        setError(null);
        console.log('✅ Audio loaded successfully:', audioRef.current?.src);
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
      };
    }
  }, []);

  // Update volume when volume state changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  useEffect(() => {
    let intervalId;
    if (isPlaying && audioRef.current) {
      intervalId = setInterval(() => {
        const t = Math.floor(audioRef.current.currentTime || 0);
        setProgress(t);
      }, 500);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isPlaying]);

  // Play track function
  const playTrack = useCallback(async (track) => {
    if (!audioRef.current || !track) {
      console.warn('Cannot play track: audio element or track is missing');
      return;
    }

    try {
      setError(null);
      setIsLoading(true);

      // Check if it's the same track - if so, just resume if paused
      const isSameTrack = currentTrack && (
        (currentTrack._id && track._id && currentTrack._id === track._id) ||
        (currentTrack.id && track.id && currentTrack.id === track.id) ||
        (currentTrack.name === track.name && currentTrack.artists?.[0]?.name === track.artists?.[0]?.name)
      );

      if (isSameTrack && audioRef.current.paused) {
        // Same track, just resume
        await audioRef.current.play();
        setIsPlaying(true);
        setIsLoading(false);
        return;
      }

      // New track - set it up
      setCurrentTrack(track);
      setProgress(0);
      
      // Set duration from track data if available
      const fallbackDur = Math.floor(((track?.duration_ms) || track?.duration || 0) / 1000);
      if (fallbackDur > 0) {
        setDuration(fallbackDur);
      }

      const audioUrl = getAudioUrl(track);
      
      if (!audioUrl) {
        throw new Error('No audio URL available for this track');
      }

      // Pause current audio if playing
      if (!audioRef.current.paused) {
        audioRef.current.pause();
      }

      // Set audio source
      audioRef.current.src = audioUrl;
      audioRef.current.currentTime = 0;
      audioRef.current.load();

      // Play the audio
      await audioRef.current.play();
      setIsPlaying(true);
      setIsLoading(false);
      
    } catch (err) {
      console.error('Failed to play track:', err);
      setError(err.message || 'Failed to play track');
      setIsLoading(false);
      setIsPlaying(false);
    }
  }, [currentTrack]);

  // Pause track
  const pauseTrack = useCallback(() => {
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  // Resume track
  const resumeTrack = useCallback(async () => {
    if (audioRef.current && audioRef.current.paused) {
      try {
        setIsLoading(true);
        await audioRef.current.play();
        setIsPlaying(true);
        setIsLoading(false);
      } catch (err) {
        console.error('Failed to resume track:', err);
        setError(err.message || 'Failed to resume track');
        setIsPlaying(false);
        setIsLoading(false);
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

  // Next track (placeholder - can be extended with queue functionality)
  const nextTrack = useCallback(() => {
    // This would typically play the next track in a queue
    console.log('Next track - implement queue functionality');
  }, []);

  // Previous track (placeholder - can be extended with queue functionality)
  const previousTrack = useCallback(() => {
    // This would typically play the previous track in a queue
    console.log('Previous track - implement queue functionality');
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
    playTrack,
    pauseTrack,
    resumeTrack,
    stopTrack,
    seekTo,
    setVolumeLevel,
    toggleMute,
    nextTrack,
    previousTrack,
    audioElement: audioRef.current
  };
};

// Helper function to get audio URL
// This function uses the actual track URLs from the database
const getAudioUrl = (track) => {
  if (!track) {
    console.warn('No track provided to getAudioUrl');
    return null;
  }

  // Helper to convert relative URLs to absolute
  const toAbsoluteUrl = (url) => {
    if (!url || typeof url !== 'string') return null;
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    if (url.startsWith('/')) {
      return new URL(url, window.location.origin).toString();
    }
    return url;
  };

  // Priority order for audio sources
  const audioSources = [
    track.audio_url,                    // Direct audio URL (highest priority)
    track.preview_url,                  // Spotify preview URL
    track.stream_url,                   // Streaming URL
    track.sample_url,                   // Sample URL
    track.preview_mp3,                  // MP3 preview
    track.preview_wav,                  // WAV preview
  ]
    .map(toAbsoluteUrl)
    .filter(Boolean);

  // If we have real audio URLs, use the first one
  if (audioSources.length > 0) {
    const selectedUrl = audioSources[0];
    console.log('✅ Using audio URL:', selectedUrl, 'for track:', track.name);
    return selectedUrl;
  }

  // Fallback: Check for local files in /songs/ directory
  if (track.name) {
    // Special handling for God Did to match user's file
    if (track.name.toLowerCase().includes('god did') && track.artists?.some(a => a.name.toLowerCase().includes('dj khaled'))) {
       return '/songs/god-did.mp3';
    }

    const sanitizedName = track.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const localUrl = `/songs/${sanitizedName}.mp3`;
    console.log('⚠️ No audio URL found, trying local file:', localUrl);
    return localUrl;
  }

  // Last resort: Use a demo audio file
  console.warn('❌ No audio URL found for track:', track.name, '- using fallback');
  return '/songs/shape-of-you.mp3'; // Fallback to existing demo file
};

export default useAudioPlayer;
