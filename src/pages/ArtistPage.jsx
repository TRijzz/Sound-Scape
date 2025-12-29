import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PlayIcon, FollowIcon, FollowingIcon, MoreIcon } from '../components/ui/Icons';
import SongCard from '../components/ui/SongCard';
import AlbumCard from '../components/ui/AlbumCard';
import { useMusic } from '../contexts/MusicContext';
import { useArtist } from '../hooks/useMusicData';
import albumArtPlaceholder from '../assets/album_art_placeholder.svg';

const ArtistPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { playTrack, isAuthenticated } = useMusic();
  const [isFollowing, setIsFollowing] = useState(false);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  
  // Use the API hook to get real artist data
  const { artist, artistAlbums, artistTopTracks, loading, error } = useArtist(id);

  const handlePlayAll = () => {
    if (artistTopTracks.length > 0) {
      playTrack(artistTopTracks[0]);
    }
  };

  const handleFollow = () => {
    if (!isAuthenticated) {
      setShowAuthPrompt(true);
      return;
    }
    setIsFollowing(!isFollowing);
  };

  const handleSignInRedirect = () => {
    navigate('/login', { state: { from: `/artist/${id}` } });
  };

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400">Loading artist...</div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-400">Error loading artist: {error}</div>
      </div>
    );
  }

  // Show not found state
  if (!artist) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400">Artist not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-28">
      {/* Artist Banner */}
      <motion.div
        className="relative h-80 bg-gradient-to-b from-neon-blue/20 to-dark-bg"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-dark-bg via-dark-bg/50 to-transparent pointer-events-none" />
        
        <div className="relative z-10 flex items-end h-full p-6">
          <div className="flex items-end space-x-6">
          {/* Artist Image */}
          <motion.img
            src={
              (artist.images && Array.isArray(artist.images) && artist.images.length > 0 && artist.images[0]?.url)
                ? artist.images[0].url
                : artist.image_url
                ? artist.image_url
                : albumArtPlaceholder
            }
            alt={artist.name}
            className="w-48 h-48 rounded-full object-cover shadow-2xl"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            onError={(e) => {
              if (e.target.src !== albumArtPlaceholder) {
                console.warn('Failed to load artist image for:', artist.name, 'URL:', e.target.src);
                e.target.src = albumArtPlaceholder;
              }
            }}
            onLoad={() => {
              if (process.env.NODE_ENV === 'development') {
                console.log('Successfully loaded artist page image for:', artist.name);
              }
            }}
          />
            
            {/* Artist Info */}
            <div className="flex-1">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <h1 className="text-5xl font-bold text-white mb-2">
                  {artist.name}
                </h1>
                <p className="text-gray-400 mb-4">
                  {artist.followers?.total ? artist.followers.total.toLocaleString() : '0'} followers
                </p>
                <div className="flex items-center space-x-2 mb-6 relative z-20">
                  {(() => {
                    const list = Array.isArray(artist.genres) && artist.genres.length ? artist.genres : (() => {
                      const counts = {};
                      (artistTopTracks || []).forEach(t => {
                        const g = String(t.genre || '').trim();
                        if (g) counts[g] = (counts[g] || 0) + 1;
                      });
                      const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([g]) => g);
                      return sorted.length ? [sorted[0]] : [];
                    })();
                    return list.length > 0 ? list.map((genre, index) => (
                      <Link
                        key={index}
                        to={`/genre/${encodeURIComponent(genre)}`}
                        className="px-3 py-1 bg-light-gray/50 text-gray-300 rounded-full text-sm hover:bg-light-gray hover:text-white transition-colors"
                      >
                        {genre}
                      </Link>
                    )) : (
                      <Link
                        to={`/genre/${encodeURIComponent('Music')}`}
                        className="px-3 py-1 bg-light-gray/50 text-gray-300 rounded-full text-sm hover:bg-light-gray hover:text-white transition-colors"
                      >
                        Music
                      </Link>
                    );
                  })()}
                </div>
                
                {/* Action Buttons */}
                <div className="flex items-center space-x-4">
                  <button
                    onClick={handlePlayAll}
                    className="flex items-center space-x-2 px-6 py-3 bg-neon-blue text-dark-bg rounded-full font-medium hover:bg-neon-blue/80 transition-all duration-200 hover:scale-105"
                  >
                    <PlayIcon className="w-5 h-5" />
                    <span>Play All</span>
                  </button>
                  
                  <button
                    onClick={handleFollow}
                    className={`flex items-center space-x-2 px-6 py-3 rounded-full font-medium transition-all duration-200 hover:scale-105 ${
                      isFollowing
                        ? 'bg-neon-blue/20 text-neon-blue border border-neon-blue/30'
                        : 'bg-light-gray/50 text-white hover:bg-light-gray'
                    }`}
                  >
                    {isFollowing ? (
                      <FollowingIcon className="w-5 h-5" />
                    ) : (
                      <FollowIcon className="w-5 h-5" />
                    )}
                    <span>{isFollowing ? 'Following' : 'Follow'}</span>
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

      {/* Content */}
      <div className="p-6 space-y-8">
        {/* Popular Songs */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <h2 className="text-2xl font-bold text-white mb-4">Popular Songs</h2>
          <div className="bg-light-gray/30 rounded-xl p-4">
            {artistTopTracks.length > 0 ? artistTopTracks.map((song, index) => (
              <SongCard
                key={song._id || song.id}
                song={song}
                index={index}
                showAlbum={true}
                onClick={() => playTrack(song)}
              />
            )) : (
              <div className="text-center py-8 text-gray-400">No tracks available</div>
            )}
          </div>
        </motion.section>

        {/* Albums */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <h2 className="text-2xl font-bold text-white mb-4">Albums</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {artistAlbums.length > 0 ? artistAlbums.map((album, index) => (
              <AlbumCard
                key={album._id || album.id}
                album={album}
                index={index}
              />
            )) : (
              <div className="col-span-full text-center py-8 text-gray-400">No albums available</div>
            )}
          </div>
        </motion.section>

        {/* About */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <h2 className="text-2xl font-bold text-white mb-4">About {artist.name}</h2>
          <div className="bg-light-gray/30 rounded-xl p-6 border border-gray-700">
            <p className="text-gray-300 leading-relaxed">
              {artist.bio && artist.bio.trim()
                ? artist.bio
                : `${artist.name} is an artist associated with ${
                    artist.genres && artist.genres.length > 0
                      ? artist.genres.join(', ')
                      : 'various genres'
                  }. ${artist.followers?.total ? `${artist.followers.total.toLocaleString()} followers` : 'Followers data not available'} and a popularity score of ${
                    typeof artist.popularity === 'number' ? artist.popularity : 'N/A'
                  }.`}
            </p>
          </div>
        </motion.section>
      </div>

      {showAuthPrompt && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowAuthPrompt(false)} />
          <motion.div
            className="relative z-10 w-full max-w-md bg-dark-gray border border-gray-700 rounded-xl p-6 text-center"
            initial={{ scale: 0.95, y: 10 }}
            animate={{ scale: 1, y: 0 }}
          >
            <h3 className="text-xl font-semibold text-white mb-2">Sign in required</h3>
            <p className="text-gray-300 mb-4">You need to sign in first to follow an artist.</p>
            <div className="flex items-center justify-center space-x-3">
              <button
                onClick={() => setShowAuthPrompt(false)}
                className="px-4 py-2 rounded-lg bg-light-gray/50 text-white hover:bg-light-gray"
              >
                Cancel
              </button>
              <button
                onClick={handleSignInRedirect}
                className="px-4 py-2 rounded-lg bg-neon-blue text-dark-bg hover:bg-neon-blue/80"
              >
                Sign in
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

export default ArtistPage;
