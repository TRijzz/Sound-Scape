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
  MuteIcon,
  MicIcon
} from '../ui/Icons';
import VinylOverlay from '../ui/VinylOverlay';
import LyricsOverlay from '../ui/LyricsOverlay';
import { usePlaylistActions } from '../../hooks/usePlaylists';
import { useMusic } from '../../contexts/MusicContext';
import albumArtPlaceholder from '../../assets/album_art_placeholder.svg';

const NowPlayingFooter = () => {
  const {
    currentTrack,
    isPlaying,
    progress,
    duration,
    volume,
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
    shuffleEnabled,
    toggleShuffle,
    addToQueue,
    isAuthenticated,
    setShowAuthPrompt,
    showVinylOverlay,
    openVinylOverlay,
    closeVinylOverlay,
    previewSession,
  } = useMusic();

  const [showMore, setShowMore] = useState(false);
  const [showAddToPlaylist, setShowAddToPlaylist] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const { playlists, handleAddToPlaylist, handleCreatePlaylist } = usePlaylistActions();
  const displayTrack = previewSession?.currentTrack || currentTrack;

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handlePlayPause = () => {
    if (isPlaying) {
      pauseTrack();
    } else {
      resumeTrack();
    }
  };

  const handleProgressChange = (e) => {
    const newProgress = parseInt(e.target.value, 10);
    if (!Number.isNaN(newProgress) && newProgress >= 0) {
      setProgress(newProgress);
    }
  };

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

  const cycleRepeat = () => {
    const next = repeatMode === 'off' ? 'all' : repeatMode === 'all' ? 'one' : 'off';
    setRepeatMode(next);
  };

  const handleToggleLike = () => {
    if (!displayTrack) return;
    const id = displayTrack._id || displayTrack.id;
    if (id) toggleLike(id);
  };

  const handleShareCurrentTrack = async () => {
    if (!displayTrack) return;

    const shareUrl = `${window.location.origin}/search?q=${encodeURIComponent(displayTrack.name || '')}`;
    const artistNames = displayTrack.artists?.map((artist) => artist.name).join(', ') || 'Unknown Artist';

    try {
      if (navigator.share) {
        await navigator.share({
          title: displayTrack.name || 'Song',
          text: `Listen to ${displayTrack.name || 'this song'} by ${artistNames}`,
          url: shareUrl
        });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      }
    } catch (error) {
      console.error('Failed to share track:', error);
    } finally {
      setShowMore(false);
    }
  };

  const closePlaylistModal = () => {
    setShowAddToPlaylist(false);
    setShowMore(false);
    setNewPlaylistName('');
  };

  const handleAddCurrentTrackToPlaylist = async (playlistId) => {
    if (!currentTrack) return;
    if (!isAuthenticated) {
      setShowAuthPrompt(true);
      return;
    }
    await handleAddToPlaylist(playlistId, [currentTrack]);
    closePlaylistModal();
  };

  const handleCreatePlaylistAndAdd = async () => {
    if (!isAuthenticated) {
      setShowAuthPrompt(true);
      return;
    }

    const playlistName = newPlaylistName.trim() || 'My Playlist';
    const created = await handleCreatePlaylist({ name: playlistName, songs: [] });
    await handleAddCurrentTrackToPlaylist(created._id || created.id);
  };

  if (!displayTrack && !previewSession) {
    return (
      <VinylOverlay
        isOpen={showVinylOverlay}
        onClose={closeVinylOverlay}
      />
    );
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
            <div className="flex items-center space-x-4 w-1/4">
              <img
                src={displayTrack?.album?.images?.[0]?.url || displayTrack?.cover_art_url || displayTrack?._vinylImage || albumArtPlaceholder}
                alt={displayTrack?.name || 'Preview track'}
                className="w-14 h-14 rounded object-cover"
              />
              <div className="min-w-0">
                <h4 className="text-sm font-medium text-white truncate">
                  {displayTrack?.name || 'Preview track'}
                </h4>
                <p className="text-xs text-gray-400 truncate">
                  {displayTrack?.artists?.map((artist) => artist.name).join(', ') || 'Unknown Artist'}
                </p>
              </div>
              <button
                onClick={handleToggleLike}
                className="transition-colors"
                style={{ color: isLiked(displayTrack?._id || displayTrack?.id) ? '#00ffff' : '#9CA3AF' }}
              >
                {isLiked(displayTrack?._id || displayTrack?.id) ? (
                  <LikedIcon className="w-4 h-4" />
                ) : (
                  <LikeIcon className="w-4 h-4" />
                )}
              </button>
            </div>

            <div className="flex flex-col items-center space-y-2 w-1/2">
              <div className="flex items-center space-x-4">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleShuffle();
                  }}
                  className="transition-colors"
                  style={{ color: shuffleEnabled ? '#00ffff' : '#9CA3AF' }}
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
                  onClick={(e) => {
                    e.stopPropagation();
                    cycleRepeat();
                  }}
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

              <div className="flex items-center space-x-3 w-full max-w-md">
                <span className="text-xs text-gray-400 w-8">{formatTime(progress)}</span>
                <input
                  type="range"
                  min="0"
                  max={duration}
                  value={progress}
                  onChange={handleProgressChange}
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
                />
                <span className="text-xs text-gray-400 w-8">{formatTime(duration)}</span>
              </div>
            </div>

            <div className="flex items-center w-1/4 justify-end space-x-5 relative">
              <button
                onClick={() => {
                  if (!isAuthenticated) {
                    setShowAuthPrompt(true);
                    return;
                  }
                  setShowMore((prev) => !prev);
                }}
                className="text-gray-400 hover:text-white transition-colors"
                title="More options"
                aria-label="More options"
              >
                <MoreIcon className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowLyrics(true);
                }}
                className="text-gray-400 hover:text-[#00FFFF] transition-colors"
                title="Show Lyrics"
                aria-label="Show Lyrics"
              >
                <MicIcon className="w-4 h-4" />
              </button>
              {showMore && (
                <div className="absolute bottom-10 right-0 bg-dark-gray border border-gray-700 rounded-lg shadow-lg w-56 z-50">
                  <button
                    onClick={() => {
                      if (displayTrack) {
                        addToQueue(displayTrack);
                      }
                      setShowMore(false);
                    }}
                    className="w-full text-left px-4 py-3 text-sm text-gray-300 hover:bg-gray-800"
                  >
                    Add to queue
                  </button>
                  <button
                    onClick={() => {
                      setNewPlaylistName('');
                      setShowAddToPlaylist(true);
                    }}
                    className="w-full text-left px-4 py-3 text-sm text-gray-300 hover:bg-gray-800 border-t border-gray-800"
                  >
                    Add to playlist
                  </button>
                  <button
                    onClick={handleShareCurrentTrack}
                    className="w-full text-left px-4 py-3 text-sm text-gray-300 hover:bg-gray-800 border-t border-gray-800"
                  >
                    Share
                  </button>
                </div>
              )}
              <button
                onClick={openVinylOverlay}
                className="text-gray-400 hover:text-neon-blue transition-colors"
                title="Open Vinyl Player"
                aria-label="Open Vinyl Player"
              >
                <VinylIcon className="w-4 h-4" />
              </button>
              <div className="flex items-center space-x-4 border-l border-gray-700 pl-4">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleMute();
                  }}
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

        <VinylOverlay
          isOpen={showVinylOverlay}
          onClose={closeVinylOverlay}
        />

        <LyricsOverlay
          isOpen={showLyrics}
          onClose={() => setShowLyrics(false)}
        />
      </motion.div>

      {showAddToPlaylist && (
        <motion.div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowAddToPlaylist(false)} />
          <motion.div className="relative z-10 w-full max-w-md bg-dark-gray border border-gray-700 rounded-xl p-6" initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }}>
            <h3 className="text-xl font-semibold text-white mb-3">Add to playlist</h3>
            <div className="text-sm text-gray-400 mb-2">Create new playlist</div>
            <input
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              placeholder="Enter playlist name"
              className="w-full px-1 py-3 bg-transparent text-white border-0 border-b border-gray-600 mb-4 focus:outline-none focus:border-neon-blue placeholder:text-gray-500"
            />
            <div className="text-sm text-gray-400 mb-3">Playlists</div>
            {playlists.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {playlists.map((pl) => (
                  <button key={pl._id || pl.id} onClick={() => handleAddCurrentTrackToPlaylist(pl._id || pl.id)} className="w-full text-left px-4 py-2 rounded-lg bg-light-gray/30 text-gray-300 hover:bg-light-gray/50">
                    {pl.name}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 mb-3">No playlists yet.</p>
            )}
            <div className="mt-4 flex justify-end space-x-3">
              <button onClick={closePlaylistModal} className="px-4 py-2 rounded-lg bg-light-gray/50 text-white hover:bg-light-gray">Cancel</button>
              <button onClick={handleCreatePlaylistAndAdd} className="px-4 py-2 rounded-lg bg-neon-blue text-dark-bg hover:bg-neon-blue/80">Create playlist</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </>
  );
};

export default NowPlayingFooter;
