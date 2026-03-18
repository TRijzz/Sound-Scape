import React from 'react';
import { motion } from 'framer-motion';
import { PlayIcon, MoreIcon, LikeIcon, LikedIcon } from './Icons';
import { useMusic } from '../../contexts/MusicContext';
import albumArtPlaceholder from '../../assets/album_art_placeholder.svg';

const SongCard = ({ song, index, showAlbum = false, isLiked = false, onClick }) => {
  const { playTrack, currentTrack, isPlaying, isLiked: isSongLiked, toggleLike } = useMusic();
  // Check if this is the current track by comparing both _id and id
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

  if (showAlbum) {
    return (
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
          <button
            onClick={(e) => e.stopPropagation()}
            className="hidden group-hover:block text-gray-400 hover:text-white transition-colors"
          >
            <MoreIcon className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    );
  }

  return (
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
      {/* Track Number / Play Button */}
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

      {/* Album Art */}
      {showAlbum && (
        <div className="w-12 h-12 shrink-0 rounded-md overflow-hidden bg-black/20 border border-gray-700">
          <img
            src={song.album?.images?.[0]?.url || song.cover_art_url || song._vinylImage || albumArtPlaceholder}
            alt={song.album?.name || song.name}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Song Info */}
      <div className="flex-1 min-w-0">
        <h4 className={`text-sm font-medium truncate ${
          isCurrentTrack ? 'text-neon-blue' : 'text-white'
        }`}>
          {song.name}
        </h4>
        <p className="text-xs text-gray-400 truncate">
          {song.artists?.map(artist => artist.name).join(', ')}
        </p>
      </div>

      {/* Album Name (if not showing album art) */}
      {!showAlbum && (
        <div className="hidden md:block w-1/4 min-w-0">
          <p className="text-xs text-gray-400 truncate">
            {song.album?.name}
          </p>
        </div>
      )}

      {/* Duration */}
      <div className="w-16 shrink-0 text-right">
        <span className="text-xs text-gray-400">
          {formatDuration(song.duration_ms || 0)}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <button 
          onClick={(e) => { e.stopPropagation(); toggleLike(song._id || song.id); }}
          className="transition-colors"
          style={{ color: (isLiked || isSongLiked(song._id || song.id)) ? '#00ffff' : '#9CA3AF' }}
        >
          {(isLiked || isSongLiked(song._id || song.id)) ? (
            <LikedIcon className="w-4 h-4" />
          ) : (
            <LikeIcon className="w-4 h-4" />
          )}
        </button>
        <button 
          onClick={(e) => e.stopPropagation()}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <MoreIcon className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
};

export default SongCard;
