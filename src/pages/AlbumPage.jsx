import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PlayIcon, LikeIcon, LikedIcon, MoreIcon } from '../components/ui/Icons';
import SongCard from '../components/ui/SongCard';
import { useMusic } from '../contexts/MusicContext';
import { useAlbum } from '../hooks/useMusicData';

const AlbumPage = () => {
  const { id } = useParams();
  const { playTrack } = useMusic();
  const [isLiked, setIsLiked] = useState(false);
  
  // Use the API hook to get real album data
  const { album, albumTracks, loading, error } = useAlbum(id);

  const handlePlayAll = () => {
    if (albumTracks.length > 0) {
      playTrack(albumTracks[0]);
    }
  };

  const handleLike = () => {
    setIsLiked(!isLiked);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400">Loading album...</div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-400">Error loading album: {error}</div>
      </div>
    );
  }

  // Show not found state
  if (!album) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400">Album not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Album Header */}
      <motion.div
        className="relative h-80 bg-gradient-to-b from-neon-blue/20 to-dark-bg"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-dark-bg via-dark-bg/50 to-transparent" />
        
        <div className="relative z-10 flex items-end h-full p-6">
          <div className="flex items-end space-x-6">
            {/* Album Cover */}
            <motion.img
              src={album.images && album.images.length > 0 ? album.images[0].url : '/src/assets/album_art_placeholder.svg'}
              alt={album.name}
              className="w-48 h-48 rounded-xl object-cover shadow-2xl"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            />
            
            {/* Album Info */}
            <div className="flex-1">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <h1 className="text-4xl font-bold text-white mb-2">
                  {album.name}
                </h1>
                <p className="text-gray-400 mb-2">
                  {album.artists && album.artists.length > 0 ? album.artists.map(artist => artist.name).join(', ') : 'Unknown Artist'}
                </p>
                <p className="text-gray-500 text-sm mb-6">
                  {formatDate(album.release_date)} • {albumTracks.length} songs
                </p>
                
                {/* Action Buttons */}
                <div className="flex items-center space-x-4">
                  <button
                    onClick={handlePlayAll}
                    className="flex items-center space-x-2 px-6 py-3 bg-neon-blue text-dark-bg rounded-full font-medium hover:bg-neon-blue/80 transition-all duration-200 hover:scale-105"
                  >
                    <PlayIcon className="w-5 h-5" />
                    <span>Play</span>
                  </button>
                  
                  <button
                    onClick={handleLike}
                    className={`flex items-center space-x-2 px-6 py-3 rounded-full font-medium transition-all duration-200 hover:scale-105 ${
                      isLiked
                        ? 'bg-neon-blue/20 text-neon-blue border border-neon-blue/30'
                        : 'bg-light-gray/50 text-white hover:bg-light-gray'
                    }`}
                  >
                    {isLiked ? (
                      <LikedIcon className="w-5 h-5" />
                    ) : (
                      <LikeIcon className="w-5 h-5" />
                    )}
                    <span>{isLiked ? 'Liked' : 'Like'}</span>
                  </button>
                  
                  <button className="p-3 text-gray-400 hover:text-white transition-colors">
                    <MoreIcon className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Tracklist */}
      <div className="p-6">
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <h2 className="text-2xl font-bold text-white mb-4">Tracklist</h2>
          <div className="bg-light-gray/30 rounded-xl p-4">
            {albumTracks.length > 0 ? albumTracks.map((song, index) => (
              <SongCard
                key={song._id || song.id}
                song={song}
                index={index}
                showAlbum={false}
                onClick={() => playTrack(song)}
              />
            )) : (
              <div className="text-center py-8 text-gray-400">No tracks available</div>
            )}
          </div>
        </motion.section>
      </div>
    </div>
  );
};

export default AlbumPage;
