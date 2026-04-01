import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { PlayIcon, MoreIcon, LikeIcon, LikedIcon } from './Icons';
import { useMusic } from '../../contexts/MusicContext';
import { usePlaylistActions } from '../../hooks/usePlaylists';
import albumArtPlaceholder from '../../assets/album_art_placeholder.svg';

const SongCard = ({ song, index, showAlbum = false, isLiked = false, onClick, menuItems = [] }) => {
  const {
    playTrack,
    currentTrack,
    isPlaying,
    isLiked: isSongLiked,
    toggleLike,
    addToQueue,
    isAuthenticated,
    setShowAuthPrompt
  } = useMusic();
  const { playlists, handleAddToPlaylist, handleCreatePlaylist } = usePlaylistActions();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showAddToPlaylist, setShowAddToPlaylist] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const menuRef = useRef(null);

  const isCurrentTrack = currentTrack && (
    (currentTrack._id && song._id && currentTrack._id === song._id) ||
    (currentTrack.id && song.id && currentTrack.id === song.id) ||
    (currentTrack._id === song.id) ||
    (currentTrack.id === song._id)
  );

  const handlePlay = () => {
    if (onClick) {
      onClick();
    } else {
      playTrack(song);
    }
  };

  useEffect(() => {
    if (!menuOpen) return undefined;

    const handleOutsideClick = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, [menuOpen]);

  const formatDuration = (ms) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatDateAdded = (value) => {
    if (!value) return '--';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '--';

    const now = new Date();
    const diffDays = Math.floor((now - parsed) / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return 'Today';
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;

    return parsed.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: parsed.getFullYear() === now.getFullYear() ? undefined : 'numeric'
    });
  };

  const closePlaylistModal = () => {
    setShowAddToPlaylist(false);
    setMenuOpen(false);
    setNewPlaylistName('');
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/search?q=${encodeURIComponent(song.name || '')}`;
    const artistNames = song.artists?.map((artist) => artist.name).join(', ') || 'Unknown Artist';

    try {
      if (navigator.share) {
        await navigator.share({
          title: song.name || 'Song',
          text: `Listen to ${song.name || 'this song'} by ${artistNames}`,
          url: shareUrl
        });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      }
    } catch (error) {
      console.error('Failed to share song:', error);
    }
  };

  const handleAddSongToPlaylist = async (playlistId) => {
    if (!isAuthenticated) {
      setShowAuthPrompt(true);
      return;
    }

    await handleAddToPlaylist(playlistId, [song]);
    closePlaylistModal();
  };

  const handleCreatePlaylistAndAdd = async () => {
    if (!isAuthenticated) {
      setShowAuthPrompt(true);
      return;
    }

    const playlistName = newPlaylistName.trim() || 'My Playlist';
    const created = await handleCreatePlaylist({ name: playlistName, songs: [] });
    await handleAddSongToPlaylist(created._id || created.id);
  };

  const combinedMenuItems = [
    {
      label: 'Add to queue',
      onClick: () => addToQueue(song)
    },
    {
      label: 'Add to playlist',
      onClick: () => {
        if (!isAuthenticated) {
          setShowAuthPrompt(true);
          return;
        }
        setShowAddToPlaylist(true);
      }
    },
    {
      label: 'Share',
      onClick: handleShare
    },
    ...menuItems
  ];

  const renderMenuButton = () => (
    <div ref={menuRef} className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setMenuOpen((prev) => !prev);
        }}
        className="hidden group-hover:block text-gray-400 hover:text-white transition-colors"
      >
        <MoreIcon className="w-4 h-4" />
      </button>
      {menuOpen ? (
        <div
          className="absolute right-0 top-full z-30 mt-2 min-w-[170px] overflow-hidden rounded-xl border border-gray-700 bg-dark-gray/95 shadow-2xl backdrop-blur-md"
          onClick={(e) => e.stopPropagation()}
        >
          {combinedMenuItems.map((item) => (
            <button
              key={item.label}
              onClick={() => {
                item.onClick?.();
                if (item.label !== 'Add to playlist') {
                  setMenuOpen(false);
                }
              }}
              className={`w-full px-4 py-3 text-left text-sm transition-colors ${
                item.variant === 'danger'
                  ? 'text-red-300 hover:bg-red-500/10'
                  : 'text-white hover:bg-light-gray/60'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );

  const actions = (
    <div className="flex items-center justify-end gap-3">
      <button
        onClick={(e) => {
          e.stopPropagation();
          toggleLike(song._id || song.id);
        }}
        className="hidden group-hover:block transition-colors"
        style={{ color: (isLiked || isSongLiked(song._id || song.id)) ? '#00ffff' : '#9CA3AF' }}
      >
        {(isLiked || isSongLiked(song._id || song.id)) ? (
          <LikedIcon className="w-4 h-4" />
        ) : (
          <LikeIcon className="w-4 h-4" />
        )}
      </button>
      <span className="text-xs text-gray-400">{formatDuration(song.duration_ms || 0)}</span>
      {renderMenuButton()}
    </div>
  );

  return (
    <>
      {showAlbum ? (
        <motion.div
          className={`grid grid-cols-[48px_minmax(0,1fr)_72px] md:grid-cols-[48px_minmax(0,1fr)_minmax(180px,0.5fr)_minmax(140px,0.4fr)_72px] items-center gap-4 px-3 py-3 rounded-xl hover:bg-light-gray transition-all duration-200 group cursor-pointer ${
            isCurrentTrack ? 'bg-neon-blue/10 border border-neon-blue/30' : ''
          }`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.05 }}
          whileHover={{ scale: 1.01 }}
          onClick={handlePlay}
        >
          <div className="flex items-center justify-center text-sm text-gray-400">
            {isCurrentTrack && isPlaying ? (
              <motion.div
                className="w-6 h-6 flex items-center justify-center"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                <div className="w-2 h-2 bg-neon-blue rounded-full" />
              </motion.div>
            ) : (
              <>
                <span className="group-hover:hidden">{index + 1}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePlay();
                  }}
                  className="hidden group-hover:flex items-center justify-center"
                >
                  <PlayIcon className="w-5 h-5 text-neon-blue" />
                </button>
              </>
            )}
          </div>

          <div className="min-w-0 flex items-center gap-3">
            <div className="w-12 h-12 shrink-0 rounded-md overflow-hidden bg-black/20 border border-gray-700">
              <img
                src={song.album?.images?.[0]?.url || song.cover_art_url || song._vinylImage || albumArtPlaceholder}
                alt={song.album?.name || song.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0">
              <h4 className={`text-sm font-medium truncate ${isCurrentTrack ? 'text-neon-blue' : 'text-white'}`}>
                {song.name}
              </h4>
              <p className="text-xs text-gray-400 truncate">
                {song.artists?.map((artist) => artist.name).join(', ')}
              </p>
            </div>
          </div>

          <div className="hidden md:block min-w-0">
            <p className="text-sm text-gray-300 truncate">
              {song.album?.name || song.album_name || 'Single'}
            </p>
          </div>

          <div className="hidden md:block min-w-0">
            <p className="text-sm text-gray-400 truncate">
              {formatDateAdded(song.added_at || song.liked_at || song.createdAt || song.updatedAt)}
            </p>
          </div>

          {actions}
        </motion.div>
      ) : (
        <motion.div
          className={`flex items-center space-x-4 p-3 rounded-xl hover:bg-light-gray transition-all duration-200 group cursor-pointer ${
            isCurrentTrack ? 'bg-neon-blue/10 border border-neon-blue/30' : ''
          }`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.05 }}
          whileHover={{ scale: 1.02 }}
          onClick={handlePlay}
        >
          <div className="w-8 flex justify-center">
            {isCurrentTrack && isPlaying ? (
              <motion.div
                className="w-6 h-6 flex items-center justify-center"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                <div className="w-2 h-2 bg-neon-blue rounded-full" />
              </motion.div>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handlePlay();
                }}
                className="opacity-0 group-hover:opacity-100 transition-opacity duration-200"
              >
                <PlayIcon className="w-5 h-5 text-neon-blue" />
              </button>
            )}
          </div>

          {showAlbum ? (
            <div className="w-12 h-12 shrink-0 rounded-md overflow-hidden bg-black/20 border border-gray-700">
              <img
                src={song.album?.images?.[0]?.url || song.cover_art_url || song._vinylImage || albumArtPlaceholder}
                alt={song.album?.name || song.name}
                className="w-full h-full object-cover"
              />
            </div>
          ) : null}

          <div className="flex-1 min-w-0">
            <h4 className={`text-sm font-medium truncate ${isCurrentTrack ? 'text-neon-blue' : 'text-white'}`}>
              {song.name}
            </h4>
            <p className="text-xs text-gray-400 truncate">
              {song.artists?.map((artist) => artist.name).join(', ')}
            </p>
          </div>

          {!showAlbum ? (
            <div className="hidden md:block w-1/4 min-w-0">
              <p className="text-xs text-gray-400 truncate">
                {song.album?.name}
              </p>
            </div>
          ) : null}

          {actions}
        </motion.div>
      )}

      {showAddToPlaylist ? (
        <motion.div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={closePlaylistModal} />
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
                {playlists.map((playlist) => (
                  <button key={playlist._id || playlist.id} onClick={() => handleAddSongToPlaylist(playlist._id || playlist.id)} className="w-full text-left px-4 py-2 rounded-lg bg-light-gray/30 text-gray-300 hover:bg-light-gray/50">
                    {playlist.name}
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
      ) : null}
    </>
  );
};

export default SongCard;
