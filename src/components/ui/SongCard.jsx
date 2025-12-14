import React from 'react';
import { motion } from 'framer-motion';
import { PlayIcon, MoreIcon, LikeIcon, LikedIcon } from './Icons';
import { useMusic } from '../../contexts/MusicContext';

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
        <img
          src={song.album?.images?.[0]?.url || '/api/placeholder/40/40'}
          alt={song.album?.name || song.name}
          className="w-10 h-10 rounded object-cover"
        />
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
        <div className="w-1/4 min-w-0">
          <p className="text-xs text-gray-400 truncate">
            {song.album?.name}
          </p>
        </div>
      )}

      {/* Duration */}
      <div className="w-16 text-right">
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
