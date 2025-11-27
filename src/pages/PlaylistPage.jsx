import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import SongCard from '../components/ui/SongCard';
import { useMusic } from '../contexts/MusicContext';
import apiService from '../services/api';

const PlaylistPage = () => {
  const { id } = useParams();
  const { playTrack, isAuthenticated, setShowAuthPrompt } = useMusic();
  const [playlist, setPlaylist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await apiService.getPlaylist(id);
        setPlaylist(data || null);
      } catch (err) {
        setError(err.message || 'Failed to load playlist');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handlePlay = (track) => {
    if (!isAuthenticated) { setShowAuthPrompt(true); return; }
    playTrack(track);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-neon-blue"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center py-12 text-red-400">{error}</div>
      </div>
    );
  }

  if (!playlist) {
    return (
      <div className="p-6">
        <div className="text-center py-12 text-gray-400">Playlist not found</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-6"
      >
        <h1 className="text-2xl font-bold text-white mb-2">{playlist.name}</h1>
        {playlist.description && (
          <p className="text-gray-400">{playlist.description}</p>
        )}
      </motion.div>

      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        {Array.isArray(playlist.songs) && playlist.songs.length > 0 ? (
          <div className="space-y-2">
            {playlist.songs.map((song, index) => (
              <SongCard
                key={song._id || song.id}
                song={song}
                index={index}
                showAlbum={true}
                onClick={() => handlePlay(song)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-400">No songs in this playlist yet</div>
        )}
      </motion.section>
    </div>
  );
};

export default PlaylistPage;

