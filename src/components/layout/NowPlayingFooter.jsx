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
import { usePlaylistActions } from '../../hooks/usePlaylists';
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
    toggleLike,
    isLiked,
    repeatMode,
    setRepeatMode,
    isAuthenticated,
    setShowAuthPrompt,
  } = useMusic();

  const [showVinylPlayer, setShowVinylPlayer] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [showAddToPlaylist, setShowAddToPlaylist] = useState(false);
  const { playlists, handleAddToPlaylist, handleCreatePlaylist } = usePlaylistActions();

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
    const newProgress = parseInt(e.target.value, 10);
    if (!isNaN(newProgress) && newProgress >= 0) {
      setProgress(newProgress);
    }
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

  const handleToggleShuffle = () => {
    setIsShuffle(prev => !prev);
  };

  const cycleRepeat = () => {
    const next = repeatMode === 'off' ? 'all' : repeatMode === 'all' ? 'one' : 'off';
    setRepeatMode(next);
  };

  const handleToggleLike = () => {
    if (!currentTrack) return;
    const id = currentTrack._id || currentTrack.id;
    if (id) toggleLike(id);
  };

  const handleAddCurrentTrackToPlaylist = (playlistId) => {
    if (!currentTrack) return;
    if (!isAuthenticated) { setShowAuthPrompt(true); return; }
    handleAddToPlaylist(playlistId, [currentTrack]);
    setShowAddToPlaylist(false);
    setShowMore(false);
  };

  const handleCreateDefaultPlaylistAndAdd = () => {
    if (!isAuthenticated) { setShowAuthPrompt(true); return; }
    const pl = handleCreatePlaylist({ name: 'My Playlist', songs: [] });
    Promise.resolve(pl).then((created)=>{
      handleAddCurrentTrackToPlaylist(created._id || created.id);
    });
  };

  if (!currentTrack) {
    return null;
  }

  return (
    <>
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
            <button 
              onClick={handleToggleLike}
              className="transition-colors"
              style={{ color: isLiked(currentTrack?._id || currentTrack?.id) ? '#00ffff' : '#9CA3AF' }}
            >
              {isLiked(currentTrack?._id || currentTrack?.id) ? (
                <LikedIcon className="w-4 h-4" />
              ) : (
                <LikeIcon className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Player Controls */}
          <div className="flex flex-col items-center space-y-2 w-1/2">
            {/* Control Buttons */}
            <div className="flex items-center space-x-4">
              <button 
                onClick={(e)=>{ e.stopPropagation(); handleToggleShuffle(); }}
                className="transition-colors"
                style={{ color: isShuffle ? '#00ffff' : '#9CA3AF' }}
              >
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
              <button 
                onClick={(e)=>{ e.stopPropagation(); cycleRepeat(); }}
                className="relative transition-colors"
                style={{ color: repeatMode !== 'off' ? '#00ffff' : '#9CA3AF' }}
                title={repeatMode === 'one' ? 'Repeat one' : repeatMode === 'all' ? 'Repeat all' : 'Repeat off'}
              >
                <RepeatIcon className="w-4 h-4" />
                {repeatMode === 'one' && (
                  <span className="absolute -right-2 -top-1 text-[10px] font-bold" style={{ color: '#00ffff' }}>1</span>
                )}
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
          <div className="flex items-center w-1/4 justify-end space-x-5 relative">
            <button 
              onClick={()=>setShowMore(prev=>!prev)}
              className="text-gray-400 hover:text-white transition-colors" title="More options" aria-label="More options">
              <MoreIcon className="w-4 h-4" />
            </button>
            {showMore && (
              <div className="absolute bottom-10 right-0 bg-dark-gray border border-gray-700 rounded-lg shadow-lg w-56 z-50">
                <button 
                  onClick={()=>{ setShowAddToPlaylist(true); }}
                  className="w-full text-left px-4 py-3 text-sm text-gray-300 hover:bg-gray-800"
                >
                  Add to playlist
                </button>
              </div>
            )}
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

    {showAddToPlaylist && (
        <motion.div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={()=>setShowAddToPlaylist(false)} />
          <motion.div className="relative z-10 w-full max-w-md bg-dark-gray border border-gray-700 rounded-xl p-6" initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }}>
            <h3 className="text-xl font-semibold text-white mb-3">Add to playlist</h3>
            {playlists.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {playlists.map(pl => (
                  <button key={pl._id || pl.id} onClick={()=>handleAddCurrentTrackToPlaylist(pl._id || pl.id)} className="w-full text-left px-4 py-2 rounded-lg bg-light-gray/30 text-gray-300 hover:bg-light-gray/50">
                    {pl.name}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 mb-3">No playlists yet.</p>
            )}
            <div className="mt-4 flex justify-end space-x-3">
              <button onClick={()=>setShowAddToPlaylist(false)} className="px-4 py-2 rounded-lg bg-light-gray/50 text-white hover:bg-light-gray">Cancel</button>
              <button onClick={handleCreateDefaultPlaylistAndAdd} className="px-4 py-2 rounded-lg bg-neon-blue text-dark-bg hover:bg-neon-blue/80">Create playlist</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </>
  );
};

export default NowPlayingFooter;
