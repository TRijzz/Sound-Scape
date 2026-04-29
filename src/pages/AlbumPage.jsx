import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PlayIcon, LikeIcon, LikedIcon, MoreIcon, ShuffleIcon } from '../components/ui/Icons';
import SongCard from '../components/ui/SongCard';
import { useMusic } from '../contexts/MusicContext';
import { useAlbum } from '../hooks/useMusicData';
import { usePlaylistActions } from '../hooks/usePlaylists';
import useEscapeKey from '../hooks/useEscapeKey';

const AlbumPage = () => {
  const { id } = useParams();
  const { playTrack, isAuthenticated, setShowAuthPrompt, addToQueue } = useMusic();
  const { playlists, handleAddToPlaylist, handleCreatePlaylist } = usePlaylistActions();
  const [isLiked, setIsLiked] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [showAddToPlaylist, setShowAddToPlaylist] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  
  // Use the API hook to get real album data
  const { album, albumTracks, loading, error } = useAlbum(id);

  const handlePlayAll = () => {
    if (albumTracks.length > 0) {
      playTrack(albumTracks[0], {
        queue: albumTracks,
        currentIndex: 0,
        shuffle: false
      });
    }
  };

  const handleShuffleAll = () => {
    if (albumTracks.length > 0) {
      const firstIndex = Math.floor(Math.random() * albumTracks.length);
      playTrack(albumTracks[firstIndex], {
        queue: albumTracks,
        currentIndex: firstIndex,
        shuffle: true
      });
    }
  };

  const handleLike = () => {
    setIsLiked(!isLiked);
  };

  const closePlaylistModal = () => {
    setShowAddToPlaylist(false);
    setShowMore(false);
    setNewPlaylistName('');
  };

  useEscapeKey(showMore || showAddToPlaylist, closePlaylistModal);

  const handleAddAlbumToQueue = () => {
    if (!albumTracks.length) return;
    addToQueue(albumTracks);
    setShowMore(false);
  };

  const handleShareAlbum = async () => {
    const shareUrl = `${window.location.origin}/album/${album._id || album.id || id}`;
    const artistNames = album.artists?.map((artist) => artist.name).join(', ') || 'Unknown Artist';

    try {
      if (navigator.share) {
        await navigator.share({
          title: album.name || 'Album',
          text: `Listen to ${album.name || 'this album'} by ${artistNames}`,
          url: shareUrl
        });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      }
    } catch (error) {
      console.error('Failed to share album:', error);
    } finally {
      setShowMore(false);
    }
  };

  const handleAddAlbumToPlaylist = async (playlistId) => {
    if (!isAuthenticated) {
      setShowAuthPrompt(true);
      return;
    }

    await handleAddToPlaylist(playlistId, albumTracks);
    closePlaylistModal();
  };

  const handleCreatePlaylistAndAdd = async () => {
    if (!isAuthenticated) {
      setShowAuthPrompt(true);
      return;
    }

    const playlistName = newPlaylistName.trim() || `${album.name || 'Album'} Mix`;
    const created = await handleCreatePlaylist({ name: playlistName, songs: [] });
    await handleAddAlbumToPlaylist(created._id || created.id);
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
                <div className="flex items-center space-x-4 relative">
                  <button
                    onClick={handlePlayAll}
                    className="flex items-center space-x-2 px-6 py-3 bg-neon-blue text-dark-bg rounded-full font-medium hover:bg-neon-blue/80 transition-all duration-200 hover:scale-105"
                  >
                    <PlayIcon className="w-5 h-5" />
                    <span>Play</span>
                  </button>

                  <button
                    onClick={handleShuffleAll}
                    className="flex items-center space-x-2 px-6 py-3 bg-light-gray/50 text-white rounded-full font-medium hover:bg-light-gray transition-all duration-200 hover:scale-105"
                  >
                    <ShuffleIcon className="w-5 h-5" />
                    <span>Shuffle</span>
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
                  
                  <button
                    onClick={() => {
                      if (!isAuthenticated) {
                        setShowAuthPrompt(true);
                        return;
                      }
                      setShowMore((prev) => !prev);
                    }}
                    className="p-3 text-gray-400 hover:text-white transition-colors"
                  >
                    <MoreIcon className="w-5 h-5" />
                  </button>
                  {showMore ? (
                    <div className="absolute left-full top-full z-30 mt-2 ml-[-3rem] w-56 overflow-hidden rounded-xl border border-gray-700 bg-dark-gray/95 shadow-2xl">
                      <button
                        onClick={handleAddAlbumToQueue}
                        className="w-full px-4 py-3 text-left text-sm text-white hover:bg-light-gray/60 transition-colors"
                      >
                        Add to queue
                      </button>
                      <button
                        onClick={() => {
                          setNewPlaylistName('');
                          setShowAddToPlaylist(true);
                        }}
                        className="w-full px-4 py-3 text-left text-sm text-white hover:bg-light-gray/60 transition-colors border-t border-gray-800"
                      >
                        Add to playlist
                      </button>
                      <button
                        onClick={handleShareAlbum}
                        className="w-full px-4 py-3 text-left text-sm text-white hover:bg-light-gray/60 transition-colors border-t border-gray-800"
                      >
                        Share
                      </button>
                    </div>
                  ) : null}
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
                onClick={() => playTrack(song, {
                  queue: albumTracks,
                  currentIndex: index,
                  shuffle: false
                })}
              />
            )) : (
              <div className="text-center py-8 text-gray-400">No tracks available</div>
            )}
          </div>
        </motion.section>
      </div>

      {showAddToPlaylist ? (
        <motion.div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={closePlaylistModal} />
          <motion.div className="relative z-10 w-full max-w-md bg-dark-gray border border-gray-700 rounded-xl p-6" initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }}>
            <h3 className="text-xl font-semibold text-white mb-3">Add album to playlist</h3>
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
                  <button key={playlist._id || playlist.id} onClick={() => handleAddAlbumToPlaylist(playlist._id || playlist.id)} className="w-full text-left px-4 py-2 rounded-lg bg-light-gray/30 text-gray-300 hover:bg-light-gray/50">
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
    </div>
  );
};

export default AlbumPage;
