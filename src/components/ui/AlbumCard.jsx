import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PlayIcon, MoreIcon, LikeIcon, LikedIcon } from './Icons';
import { useMusic } from '../../contexts/MusicContext';
import albumArtPlaceholder from '../../assets/album_art_placeholder.svg';

const getAlbumDisplayName = (album) => {
  if (album?.name === '\u00F7 (Deluxe)') return 'Divide Deluxe';
  return album?.name;
};

const AlbumCard = ({ album, index, isLiked = false }) => {
  const { playTrack, isAuthenticated, setShowAuthPrompt } = useMusic();

  const handlePlay = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (album.tracks && album.tracks.length > 0) {
      playTrack(album.tracks[0]);
    }
  };

  return (
    <motion.div
      className="group cursor-pointer"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      whileHover={{ scale: 1.05 }}
    >
      <Link to={`/album/${album._id || album.id}`}>
        <div className="relative">
          <div className="relative overflow-hidden rounded-xl bg-light-gray">
            <img
              src={album.images?.[0]?.url || albumArtPlaceholder}
              alt={getAlbumDisplayName(album)}
              className="w-full aspect-square object-cover group-hover:scale-110 transition-transform duration-300"
            />

            <motion.div
              className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
              initial={{ scale: 0 }}
              whileHover={{ scale: 1 }}
              transition={{ duration: 0.2 }}
            >
              <button
                onClick={handlePlay}
                className="w-12 h-12 bg-neon-blue text-dark-bg rounded-full flex items-center justify-center hover:scale-110 transition-transform duration-200"
              >
                <PlayIcon className="w-5 h-5 ml-0.5" />
              </button>
            </motion.div>

            <button className="absolute top-3 right-3 p-2 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              {isLiked ? (
                <LikedIcon className="w-4 h-4 text-neon-blue" />
              ) : (
                <LikeIcon className="w-4 h-4 text-white" />
              )}
            </button>

            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!isAuthenticated) {
                  setShowAuthPrompt(true);
                }
              }}
              className="absolute top-3 left-3 p-2 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            >
              <MoreIcon className="w-4 h-4 text-white" />
            </button>
          </div>

          <div className="mt-3">
            <h3 className="text-sm font-medium text-white truncate group-hover:text-neon-blue transition-colors duration-200">
              {getAlbumDisplayName(album)}
            </h3>
            <p className="text-xs text-gray-400 truncate mt-1">
              {album.artists?.map((artist) => artist.name).join(', ')}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {album.release_date ? new Date(album.release_date).getFullYear() : ''}
              {album.total_tracks ? ` - ${album.total_tracks} tracks` : ''}
            </p>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default AlbumCard;
