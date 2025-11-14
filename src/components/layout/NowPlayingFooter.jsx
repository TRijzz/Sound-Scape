import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  PlayIcon, 
  PauseIcon, 
  SkipNextIcon, 
  SkipPrevIcon, 
  RepeatIcon, 
  ShuffleIcon, 
  LikeIcon, 
  LikedIcon, 
  MoreIcon,
  VinylIcon,
  SpeakerIcon,
  MuteIcon
} from '../ui/Icons';
import VinylOverlay from '../ui/VinylOverlay';
import { useMusic } from '../../contexts/MusicContext';

const NowPlayingFooter = () => {
  const {
    currentTrack,
    isPlaying,
    progress,
    duration,
    volume,
    playTrack,
    pauseTrack,
    resumeTrack,
    nextTrack,
    previousTrack,
    setProgress,
    setVolume,
  } = useMusic();

  const [showVinylPlayer, setShowVinylPlayer] = useState(false);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const progressPercent = duration > 0 ? (progress / duration) * 100 : 0;

  const handlePlayPause = () => {
    if (isPlaying) {
      pauseTrack();
    } else {
      resumeTrack();
    }
  };

  const handleProgressChange = (e) => {
    const newProgress = parseInt(e.target.value);
    setProgress(newProgress);
  };

  // Enable mute toggle
  const lastVolumeRef = React.useRef(60);
  const isMuted = volume === 0;

  const handleVolumeChange = (e) => {
    const newVolume = parseInt(e.target.value, 10);
    setVolume(newVolume);
    if (newVolume > 0) lastVolumeRef.current = newVolume;
  };

  const handleToggleMute = () => {
    if (volume > 0) {
      lastVolumeRef.current = volume;
      setVolume(0);
    } else {
      setVolume(Math.max(1, lastVolumeRef.current || 60));
    }
  };

  if (!currentTrack) {
    return null;
  }

  return (
    <motion.div
      className="fixed bottom-0 left-0 right-0 bg-dark-gray/95 backdrop-blur-md border-t border-gray-800 z-50"
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 80, opacity: 0 }}
    >
      <div className="max-w-[1200px] mx-auto px-6 py-3">
        <div className="flex items-center justify-between">
          {/* Track Info */}
          <div className="flex items-center space-x-4 w-1/4">
            <img
              src={currentTrack.album?.images?.[0]?.url || '/api/placeholder/56/56'}
              alt={currentTrack.name}
              className="w-14 h-14 rounded object-cover"
            />
            <div className="min-w-0">
              <h4 className="text-sm font-medium text-white truncate">
                {currentTrack.name}
              </h4>
              <p className="text-xs text-gray-400 truncate">
                {currentTrack.artists?.map(artist => artist.name).join(', ')}
              </p>
            </div>
            <button className="text-gray-400 hover:text-neon-blue transition-colors">
              <LikeIcon className="w-4 h-4" />
            </button>
          </div>

          {/* Player Controls */}
          <div className="flex flex-col items-center space-y-2 w-1/2">
            {/* Control Buttons */}
            <div className="flex items-center space-x-4">
              <button className="text-gray-400 hover:text-white transition-colors">
                <ShuffleIcon className="w-4 h-4" />
              </button>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  previousTrack();
                }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <SkipPrevIcon className="w-5 h-5" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handlePlayPause();
                }}
                className="w-10 h-10 bg-white text-dark-bg rounded-full flex items-center justify-center hover:scale-105 transition-transform"
              >
                {isPlaying ? (
                  <PauseIcon className="w-5 h-5" />
                ) : (
                  <PlayIcon className="w-5 h-5 ml-0.5" />
                )}
              </button>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  nextTrack();
                }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <SkipNextIcon className="w-5 h-5" />
              </button>
              <button className="text-gray-400 hover:text-white transition-colors">
                <RepeatIcon className="w-4 h-4" />
              </button>
            </div>

            {/* Progress Bar */}
            <div className="flex items-center space-x-3 w-full max-w-md">
              <span className="text-xs text-gray-400 w-8">
                {formatTime(progress)}
              </span>
                        <input
                          type="range"
                          min="0"
                          max={duration}
                          value={progress}
                          onChange={handleProgressChange}
                          onClick={(e) => e.stopPropagation()}
                          className="flex-1 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
                        />
              <span className="text-xs text-gray-400 w-8">
                {formatTime(duration)}
              </span>
            </div>
          </div>

          {/* Volume Control */}
          <div className="flex items-center w-1/4 justify-end space-x-5">
            <button className="text-gray-400 hover:text-white transition-colors" title="More options" aria-label="More options">
              <MoreIcon className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setShowVinylPlayer(true)}
              className="text-gray-400 hover:text-neon-blue transition-colors"
              title="Open Vinyl Player"
              aria-label="Open Vinyl Player"
            >
              <VinylIcon className="w-4 h-4" />
            </button>
            <div className="flex items-center space-x-4 border-l border-gray-700 pl-4">
              <button
                onClick={(e) => { e.stopPropagation(); handleToggleMute(); }}
                className="transition-colors"
                title={isMuted ? 'Unmute' : 'Mute'}
                aria-label={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? (
                  <MuteIcon className="w-5 h-5 text-red-400 hover:text-white" />
                ) : (
                  <SpeakerIcon className="w-5 h-5 text-gray-400 hover:text-white" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={handleVolumeChange}
                onClick={(e) => e.stopPropagation()}
                className="w-24 h-1.5 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
              />
              <span className="text-xs text-gray-400 w-10">{volume}%</span>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #00FFFF;
          cursor: pointer;
          border: 2px solid #0A0A0A;
        }
        
        .slider::-moz-range-thumb {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #00FFFF;
          cursor: pointer;
          border: 2px solid #0A0A0A;
        }
      `}</style>

      {/* Vinyl Overlay */}
      <VinylOverlay 
        isOpen={showVinylPlayer} 
        onClose={() => setShowVinylPlayer(false)} 
      />
    </motion.div>
  );
};

export default NowPlayingFooter;