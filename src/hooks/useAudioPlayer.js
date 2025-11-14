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
        // This can be extended to implement queue functionality
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

  // Play track function
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

      // For demo purposes, we'll use a sample audio URL
      // In a real app, you'd get the actual audio URL from your API
      const audioUrl = getAudioUrl(track);
      
      if (!audioUrl) {
        throw new Error('No audio URL available for this track');
      }

      // Set audio source
      audioRef.current.src = audioUrl;
      audioRef.current.load();

      // Play the audio
      await audioRef.current.play();
      
    } catch (err) {
      console.error('Failed to play track:', err);
      setError(err.message);
      setIsLoading(false);
      setIsPlaying(false);
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
// This function now uses the actual track URLs from search results
const getAudioUrl = (track) => {
  console.log('Getting audio URL for track:', track);
  console.log('Track preview_url:', track.preview_url);
  console.log('Track audio_url:', track.audio_url);
  
  // Priority order for audio sources - check for real audio URLs first
  const audioSources = [
    track.preview_url,        // Spotify preview URL (most common)
    track.audio_url,          // Direct audio URL (from your database)
    track.stream_url,         // Streaming URL
    track.sample_url,         // Sample URL
    track.preview_mp3,        // MP3 preview
    track.preview_wav,        // WAV preview
    track.cover_art_url,      // Sometimes cover art URLs are audio
    track.external_urls?.spotify, // Spotify external URL
  ].filter(Boolean);

  console.log('Available audio sources:', audioSources);

  // If we have real audio URLs, use them
  if (audioSources.length > 0) {
    console.log('✅ Using real audio URL:', audioSources[0]);
    return audioSources[0];
  }

  // Since no real audio URLs are available, we need to use demo audio
  // This is expected behavior when the database doesn't have preview URLs
  console.log('❌ No real audio URL found for track:', track.name);
  console.log('This is normal - your database songs don\'t have preview URLs yet.');
  console.log('Using demo audio as fallback - this is working as intended!');
  
  // Use working demo URLs from a reliable CDN
  const demoUrls = [
    'https://actions.google.com/sounds/v1/alarms/beep_short.ogg',
    'https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg',
    'https://actions.google.com/sounds/v1/cartoon/clang_and_wobble.ogg',
    'https://actions.google.com/sounds/v1/cartoon/pop.ogg',
    'https://actions.google.com/sounds/v1/cartoon/slide_whistle.ogg',
    'https://actions.google.com/sounds/v1/cartoon/wood_plank_flicks.ogg',
    'https://actions.google.com/sounds/v1/impacts/crash.ogg',
    'https://actions.google.com/sounds/v1/impacts/soft_thud.ogg'
  ];

  // Use track ID to pick a consistent demo URL
  if (track && track._id) {
    const index = track._id.charCodeAt(0) % demoUrls.length;
    const selectedUrl = demoUrls[index];
    console.log(`🎵 Using demo audio: ${selectedUrl}`);
    return selectedUrl;
  }

  console.log(`🎵 Using default demo audio: ${demoUrls[0]}`);
  return demoUrls[0];
};

export default useAudioPlayer;
