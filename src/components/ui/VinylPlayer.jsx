import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import vinylSvg from '../../assets/vinyl.svg';
import { ReactComponent as Tonearm } from '../../assets/tonearm.svg';
import { PlayIcon, PauseIcon, SkipNextIcon, SkipPrevIcon, VolumeIcon, RepeatIcon, ShuffleIcon, HeartIcon, LikedIcon, MoreIcon } from './Icons';
import { useMusic } from '../../contexts/MusicContext';

const VinylPlayer = ({ isOpen, onClose }) => {
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
    toggleLike,
    setRepeatMode,
    repeatMode,
    isLiked,
  } = useMusic();

  const [playerState, setPlayerState] = useState('stopped');
  const [showPlaylistMenu, setShowPlaylistMenu] = useState(false);
  const [playlists, setPlaylists] = useState([
    { id: '1', name: 'My Playlist 1' },
    { id: '2', name: 'Workout Mix' },
    { id: '3', name: 'Chill Vibes' },
  ]);

  // Vinyl player states
  const isSpinning = playerState === 'playing';
  const isTonearmPlaying = playerState === 'swinging' || playerState === 'playing';
  const isTonearmPausing = playerState === 'paused' || playerState === 'stopped';

  const handlePlayPause = () => {
    if (!isPlaying) {
      setPlayerState('swinging');
      setTimeout(() => {
        setPlayerState('playing');
        resumeTrack();
      }, 2000);
    } else {
      setPlayerState('paused');
      pauseTrack();
    }
  };

  const handleTonearmClick = () => {
    if (playerState !== 'swinging') {
      handlePlayPause();
    }
  };

  const handleLikeClick = (e) => {
    e.stopPropagation();
    if (currentTrack) {
      toggleLike(currentTrack.id);
    }
  };

  const handleRepeatClick = (e) => {
    e.stopPropagation();
    const repeatModes = ['off', 'all', 'one'];
    const currentIndex = repeatModes.indexOf(repeatMode);
    const nextIndex = (currentIndex + 1) % repeatModes.length;
    setRepeatMode(repeatModes[nextIndex]);
  };

  const handleAddToPlaylist = (playlistId) => {
    // Here you would typically make an API call to add the song to the playlist
    console.log(`Adding ${currentTrack?.name} to playlist ${playlistId}`);
    setShowPlaylistMenu(false);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const progressPercent = duration > 0 ? (progress / duration) * 100 : 0;

  const handleProgressChange = (e) => {
    const newProgress = parseInt(e.target.value);
    setProgress(newProgress);
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseInt(e.target.value);
    setVolume(newVolume);
  };

  // Sync player state with music context
  useEffect(() => {
    if (isPlaying && playerState === 'stopped') {
      setPlayerState('playing');
    } else if (!isPlaying && playerState === 'playing') {
      setPlayerState('paused');
    }
  }, [isPlaying, playerState]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Full-screen backdrop with blurred album art */}
          <motion.div
            className="fixed inset-0 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          >
            {/* Blurred album art background */}
            {currentTrack?.album?.images?.[0]?.url && (
              <div 
                className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                style={{
                  backgroundImage: `url(${currentTrack.album.images[0].url})`,
                  filter: 'blur(20px) brightness(0.3)',
                  transform: 'scale(1.1)'
                }}
              />
            )}
            
            {/* Dark overlay */}
            <div className="absolute inset-0 bg-black/60" />
          </motion.div>

          {/* Full-screen Vinyl Player */}
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.3 }}
          >
            <div className="w-full h-full flex flex-col items-center justify-center relative">
              {/* Close Button */}
              <motion.button
                onClick={onClose}
                className="absolute top-8 right-8 z-10 w-12 h-12 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </motion.button>

              {/* Vinyl Player Content */}
              <div className="flex flex-col items-center space-y-8 max-w-4xl w-full">
                {/* Vinyl Record */}
                <motion.div
                  className="relative"
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                >
                  <img
                    src={vinylSvg}
                    alt="Vinyl record"
                    className={`w-[400px] h-[400px] ${isSpinning ? 'spinning' : ''}`}
                    style={{ animationPlayState: isSpinning ? 'running' : 'paused' }}
                  />

                  {/* Tonearm */}
                  <div
                    className={`absolute w-[450px] h-[450px] ${isTonearmPlaying ? 'is-playing' : ''} ${isTonearmPausing ? 'is-paused' : ''} ${playerState !== 'swinging' ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                    style={{ top: '0', left: '0' }}
                    role="button"
                    aria-label="Tonearm play/pause toggle"
                    title="Toggle play/pause"
                    onClick={handleTonearmClick}
                  >
                    <Tonearm />
                  </div>
                </motion.div>

                {/* Track Info */}
                {currentTrack && (
                  <motion.div
                    className="text-center mb-8"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.4 }}
                  >
                    <h1 className="text-4xl lg:text-5xl font-bold text-white mb-4">
                      {currentTrack.name}
                    </h1>
                    <p className="text-xl lg:text-2xl text-gray-300 mb-2">
                      {currentTrack.artists?.map(artist => artist.name).join(', ')}
                    </p>
                    {currentTrack.album && (
                      <p className="text-lg text-gray-400">
                        {currentTrack.album.name}
                      </p>
                    )}
                  </motion.div>
                )}

                {/* Player Controls */}
                <motion.div
                  className="flex flex-col items-center space-y-6 w-full max-w-2xl"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.6 }}
                >
                  {/* Control Buttons */}
                  <div className="flex items-center space-x-8">
                    <button 
                      className={`${repeatMode === 'off' ? 'text-gray-400' : 'text-neon-blue'} hover:text-white transition-colors`}
                      onClick={handleRepeatClick}
                      title={repeatMode === 'one' ? 'Repeat One' : 'Repeat All'}
                    >
                      <RepeatIcon className="w-6 h-6" />
                      {repeatMode === 'one' && (
                        <span className="absolute -mt-2 ml-1 text-xs">1</span>
                      )}
                    </button>
                    <button 
                      onClick={previousTrack}
                      className="text-gray-400 hover:text-white transition-colors"
                      title="Previous"
                    >
                      <SkipPrevIcon className="w-8 h-8" />
                    </button>
                    <button
                      onClick={handlePlayPause}
                      className="w-20 h-20 bg-neon-blue text-dark-bg rounded-full flex items-center justify-center hover:scale-105 transition-transform shadow-lg shadow-neon-blue/25"
                      title={isPlaying ? 'Pause' : 'Play'}
                    >
                      {isPlaying ? (
                        <PauseIcon className="w-10 h-10" />
                      ) : (
                        <PlayIcon className="w-10 h-10 ml-1" />
                      )}
                    </button>
                    <button 
                      onClick={nextTrack}
                      className="text-gray-400 hover:text-white transition-colors"
                      title="Next"
                    >
                      <SkipNextIcon className="w-8 h-8" />
                    </button>
                    <button 
                      onClick={handleLikeClick}
                      className={`${currentTrack && isLiked(currentTrack.id) ? 'text-neon-blue' : 'text-gray-400'} hover:text-white transition-colors`}
                      title={currentTrack && isLiked(currentTrack.id) ? 'Remove from Liked Songs' : 'Save to Liked Songs'}
                    >
                      {currentTrack && isLiked(currentTrack.id) ? (
                        <LikedIcon className="w-6 h-6" />
                      ) : (
                        <HeartIcon className="w-6 h-6" />
                      )}
                    </button>
                    <div className="relative">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowPlaylistMenu(!showPlaylistMenu);
                        }}
                        className="text-gray-400 hover:text-white transition-colors"
                        title="More options"
                      >
                        <MoreIcon className="w-6 h-6" />
                      </button>
                      {showPlaylistMenu && (
                        <div className="absolute bottom-full right-0 mb-2 w-48 bg-dark-gray rounded-lg shadow-xl z-50 overflow-hidden">
                          <div className="py-1">
                            <div className="px-4 py-2 text-sm text-gray-300 border-b border-gray-700">Add to playlist</div>
                            {playlists.map(playlist => (
                              <button
                                key={playlist.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAddToPlaylist(playlist.id);
                                }}
                                className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-light-gray/30 hover:text-white"
                              >
                                {playlist.name}
                              </button>
                            ))}
                            <div className="px-4 py-2 text-sm text-neon-blue hover:bg-light-gray/30 cursor-pointer border-t border-gray-700">
                              + New Playlist
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full max-w-2xl">
                    <div className="flex items-center space-x-4 mb-2">
                      <span className="text-sm text-gray-400 w-12">
                        {formatTime(progress)}
                      </span>
                      <div className="flex-1 relative">
                        <input
                          type="range"
                          min="0"
                          max={duration}
                          value={progress}
                          onChange={handleProgressChange}
                          className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer slider-fullscreen"
                        />
                      </div>
                      <span className="text-sm text-gray-400 w-12">
                        {formatTime(duration)}
                      </span>
                    </div>
                  </div>

                  {/* Volume Control */}
                  <div className="flex items-center space-x-4 w-full max-w-md">
                    <VolumeIcon className="w-5 h-5 text-gray-400" />
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={volume}
                      onChange={handleVolumeChange}
                      className="flex-1 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer slider-fullscreen"
                    />
                    <span className="text-sm text-gray-400 w-12">
                      {volume}%
                    </span>
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.div>

          <style jsx>{`
            .slider-fullscreen::-webkit-slider-thumb {
              appearance: none;
              width: 20px;
              height: 20px;
              border-radius: 50%;
              background: #00FFFF;
              cursor: pointer;
              border: 3px solid #0A0A0A;
              box-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
            }
            
            .slider-fullscreen::-moz-range-thumb {
              width: 20px;
              height: 20px;
              border-radius: 50%;
              background: #00FFFF;
              cursor: pointer;
              border: 3px solid #0A0A0A;
              box-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
            }
          `}</style>
        </>
      )}
    </AnimatePresence>
  );
};

export default VinylPlayer;
