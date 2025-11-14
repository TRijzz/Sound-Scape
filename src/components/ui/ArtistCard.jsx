import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PlayIcon, MoreIcon, FollowIcon, FollowingIcon } from './Icons';
import { useMusic } from '../../contexts/MusicContext';

const ArtistCard = ({ artist, index, isFollowing = false }) => {
  const { playTrack } = useMusic();

  const handlePlay = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Play the artist's top track
    if (artist.top_tracks && artist.top_tracks.length > 0) {
      playTrack(artist.top_tracks[0]);
    }
  };

  const handleFollow = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Toggle follow state
    console.log('Toggle follow:', artist.name);
  };

  return (
    <motion.div
      className="group cursor-pointer"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      whileHover={{ scale: 1.05 }}
    >
      <Link to={`/artist/${artist._id || artist.id}`}>
        <div className="relative">
          {/* Artist Image */}
          <div className="relative overflow-hidden rounded-full bg-light-gray">
            <img
              src={artist.images?.[0]?.url || '/api/placeholder/200/200'}
              alt={artist.name}
              className="w-full aspect-square object-cover group-hover:scale-110 transition-transform duration-300"
            />
            
            {/* Play Button Overlay */}
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

            {/* Follow Button */}
            <button 
              onClick={handleFollow}
              className="absolute top-3 right-3 p-2 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            >
              {isFollowing ? (
                <FollowingIcon className="w-4 h-4 text-neon-blue" />
              ) : (
                <FollowIcon className="w-4 h-4 text-white" />
              )}
            </button>

            {/* More Options */}
            <button className="absolute top-3 left-3 p-2 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <MoreIcon className="w-4 h-4 text-white" />
            </button>
          </div>

          {/* Artist Info */}
          <div className="mt-4 text-center">
            <h3 className="text-sm font-medium text-white truncate group-hover:text-neon-blue transition-colors duration-200">
              {artist.name}
            </h3>
            <p className="text-xs text-gray-400 mt-1">
              Artist
            </p>
            {artist.followers && (
              <p className="text-xs text-gray-500 mt-1">
                {artist.followers.total.toLocaleString()} followers
              </p>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default ArtistCard;
