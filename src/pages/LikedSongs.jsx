import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import apiService from '../services/api';
import SongCard from '../components/ui/SongCard';
import { useMusic } from '../contexts/MusicContext';

const LikedSongs = () => {
  const [songs, setSongs] = useState([]);
  const { isAuthenticated, likedSongsIds } = useMusic();

  useEffect(() => {
    const load = async () => {
      try {
        const data = await apiService.getLikedSongs();
        setSongs(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Failed to load liked songs:', err);
      }
    };
    load();
  }, [isAuthenticated, likedSongsIds.length]);

  if (!songs.length) {
    return (
      <div className="p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-light-gray/50 rounded-2xl p-10 border border-gray-700 text-center"
        >
          <h1 className="text-2xl font-bold text-white mb-3">Liked Songs</h1>
          <p className="text-gray-300">No liked songs yet — start adding your favorites!</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-white mb-4">Liked Songs</h1>
      <div className="space-y-2">
        {songs.map((song, index) => (
          <SongCard key={song._id || song.id} song={song} index={index} showAlbum={true} isLiked={true} />
        ))}
      </div>
    </div>
  );
};

export default LikedSongs;
