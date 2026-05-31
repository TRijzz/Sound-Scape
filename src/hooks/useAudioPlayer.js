import { useState, useEffect, useRef, useCallback } from 'react';

export const useAudioPlayer = ({ onEnded } = {}) => {
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.6); // Default volume (60%)
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const audioRef = useRef(null);
  const onEndedRef = useRef(onEnded);
  const currentTrackRef = useRef(currentTrack);
  const durationRef = useRef(duration);

  useEffect(() => {
    onEndedRef.current = onEnded;
  }, [onEnded]);

  useEffect(() => {                          /*Audio element */
    currentTrackRef.current = currentTrack;
  }, [currentTrack]);

  useEffect(() => {
    durationRef.current = duration;
  }, [duration]);

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();      /*Creates audio element*/
      audioRef.current.preload = 'metadata';
    }

    const audio = audioRef.current;

    const syncDurationFromAudio = () => {       // Reads real duration from audio metadata
      const audioDuration = Number(audio.duration);
      const metadataSeconds = Number.isFinite(audioDuration) && audioDuration > 0
        ? Math.floor(audioDuration)
        : 0;
      const track = currentTrackRef.current;
      const fallbackSeconds = Math.floor(Number(track?.duration_ms || track?.duration || 0) / 1000);
      const nextDuration = metadataSeconds > 0 ? metadataSeconds : fallbackSeconds;

      setDuration(nextDuration >= 0 ? nextDuration : 0);  
      setIsLoading(false);
      setError(null);
    };

    const handleTimeUpdate = () => {   //Updates Playbacks
      const currentTime = Number(audio.currentTime) || 0;
      const safeDuration = Number(audio.duration) || durationRef.current || 0;
      setProgress(safeDuration > 0 ? Math.min(currentTime, safeDuration) : currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setProgress(0);
      onEndedRef.current?.();
    };

    const handlePlay = () => {
      setIsPlaying(true);
      setError(null);
      setIsLoading(false);
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    const handleError = async (e) => {   //Hanldes audio loading errors
      console.error('Audio error:', e);
      console.log('Current audio src:', audioRef.current?.src);
      setError('Failed to load audio - trying fallback...');
      setIsLoading(false);
      setIsPlaying(false);

      if (audioRef.current && currentTrackRef.current) {
        const fallbackUrl = 'https://actions.google.com/sounds/v1/alarms/beep_short.ogg';  //Audio Error if failed to load track
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
      syncDurationFromAudio();
      console.log('Audio loaded successfully:', audioRef.current?.src);
    };

    audio.addEventListener('loadedmetadata', syncDurationFromAudio);
    audio.addEventListener('durationchange', syncDurationFromAudio);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('error', handleError);
    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('canplay', handleCanPlay);

    return () => {
      audio.removeEventListener('loadedmetadata', syncDurationFromAudio);
      audio.removeEventListener('durationchange', syncDurationFromAudio);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('canplay', handleCanPlay);
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  useEffect(() => {
    let animationFrameId;

    const updateProgress = () => {
      if (audioRef.current) {
        setProgress(audioRef.current.currentTime || 0);
      }
      if (isPlaying) {
        animationFrameId = requestAnimationFrame(updateProgress);
      }
    };

    if (isPlaying) {
      updateProgress();
    } else if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [isPlaying]);

  const playTrack = useCallback(async (track) => {    //Main play function, handles track changes and playback
    if (!audioRef.current || !track) {
      console.warn('Cannot play track: audio element or track is missing');
      return;
    }

    try {
      setError(null);
      setIsLoading(true);

      const isSameTrack = currentTrack && (
        (currentTrack._id && track._id && currentTrack._id === track._id) ||
        (currentTrack.id && track.id && currentTrack.id === track.id) ||
        (currentTrack.name === track.name && currentTrack.artists?.[0]?.name === track.artists?.[0]?.name)
      );

      if (isSameTrack && audioRef.current.paused) {
        if (audioRef.current.ended || audioRef.current.currentTime >= Math.max((audioRef.current.duration || 0) - 0.25, 0)) {
          audioRef.current.currentTime = 0;
          setProgress(0);
        }
        await audioRef.current.play();
        setIsPlaying(true);
        setIsLoading(false);
        return;
      }

      setCurrentTrack(track);
      currentTrackRef.current = track;
      setProgress(0);

      const fallbackDur = Math.floor(Number(track?.duration_ms || track?.duration || 0) / 1000);
      setDuration(fallbackDur > 0 ? fallbackDur : 0);

      const audioUrl = getAudioUrl(track);
      if (!audioUrl) {
        throw new Error('No audio URL available for this track');
      }

      if (!audioRef.current.paused) {
        audioRef.current.pause();
      }

      audioRef.current.src = audioUrl;
      audioRef.current.currentTime = 0;
      audioRef.current.load();

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

  const pauseTrack = useCallback(() => {                //Pauses playback
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  const resumeTrack = useCallback(async () => {        //Resumes playback if paused
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

  const stopTrack = useCallback(() => {        //Stops playback and resets progress
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setProgress(0);
      setIsPlaying(false);
    }
  }, []);

  // Fully tears the player down — used on logout so the play bar disappears.
  const clearTrack = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      try { audioRef.current.removeAttribute('src'); audioRef.current.load(); } catch { /* ignore */ }
    }
    setCurrentTrack(null);
    currentTrackRef.current = null;
    setIsPlaying(false);
    setProgress(0);
    setDuration(0);
    setIsLoading(false);
    setError(null);
  }, []);

  const seekTo = useCallback((time) => {      //Used to jump from duration to duration of song
    if (!audioRef.current) {
      return;
    }

    const safeTime = Math.max(0, Number(time) || 0);
    const audioDuration = Number(audioRef.current.duration) || durationRef.current || 0;
    const maxSeekTime = audioDuration > 1 ? Math.max(audioDuration - 0.25, 0) : audioDuration;
    const clampedTime = audioDuration > 0 ? Math.min(safeTime, maxSeekTime) : safeTime;

    audioRef.current.currentTime = clampedTime;
    setProgress(clampedTime);
  }, []);

  const setVolumeLevel = useCallback((newVolume) => {    /*Set Volume*/
    setVolume(Math.max(0, Math.min(1, newVolume)));
  }, []);

  const toggleMute = useCallback(() => {        /*Mute toggle*/
    setIsMuted(!isMuted);
  }, [isMuted]);

  const nextTrack = useCallback(() => {
    console.log('Next track - implement queue functionality');
  }, []);

  const previousTrack = useCallback(() => {
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
    clearTrack,
    seekTo,
    setVolumeLevel,
    toggleMute,
    nextTrack,
    previousTrack,
    audioElement: audioRef.current
  };
};

const getAudioUrl = (track) => {             /*Audio Source*/
  if (!track) {
    console.warn('No track provided to getAudioUrl');
    return null;
  }

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

  const audioSources = [
    track.audio_url,
    track.preview_url,
    track.stream_url,
    track.sample_url,
    track.preview_mp3,
    track.preview_wav,
  ]
    .map(toAbsoluteUrl)
    .filter(Boolean);

  if (audioSources.length > 0) {
    const selectedUrl = audioSources[0];
    console.log('Using audio URL:', selectedUrl, 'for track:', track.name);
    return selectedUrl;
  }

  if (track.name) {
    if (track.name.toLowerCase().includes('god did') && track.artists?.some((a) => a.name.toLowerCase().includes('dj khaled'))) {
      return '/songs/god-did.mp3';
    }

    const sanitizedName = track.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const localUrl = `/songs/${sanitizedName}.mp3`;
    console.log('No audio URL found, trying local file:', localUrl);
    return localUrl;
  }

  console.warn('No audio URL found for track:', track.name, '- using fallback');
  return '/songs/shape-of-you.mp3';
};

export default useAudioPlayer;
