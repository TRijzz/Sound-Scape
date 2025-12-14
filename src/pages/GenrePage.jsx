import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import apiService from '../services/api.js';
import ArtistCard from '../components/ui/ArtistCard';
import SongCard from '../components/ui/SongCard';
import { useMusic } from '../contexts/MusicContext';

const GenrePage = () => {
  const { name } = useParams();
  const { playTrack } = useMusic();
  const [artists, setArtists] = useState([]);
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const [artistsRes, songsRes] = await Promise.all([
          apiService.getArtists(1, 100, '', name),
          apiService.getSongsByGenre(name, 50)
        ]);
        if (!mounted) return;
        setArtists(Array.isArray(artistsRes?.artists) ? artistsRes.artists : Array.isArray(artistsRes) ? artistsRes : []);
        setSongs(Array.isArray(songsRes) ? songsRes : []);
      } catch (e) {
        if (!mounted) return;
        setError(e.message || 'Failed to load genre');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [name]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400">Loading genre...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-400">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-28">
      <motion.div
        className="relative h-56 bg-gradient-to-b from-neon-blue/20 to-dark-bg"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-dark-bg via-dark-bg/50 to-transparent pointer-events-none" />
        <div className="relative z-10 h-full p-6 flex items-end">
          <div>
            <motion.h1
              className="text-4xl font-bold text-white mb-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              {String(name || '').toUpperCase()}
            </motion.h1>
            <p className="text-gray-400">{artists.length} artists • {songs.length} songs</p>
          </div>
        </div>
      </motion.div>

      <div className="p-6 space-y-8">
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }}>
          <h2 className="text-2xl font-bold text-white mb-4">Artists</h2>
          {artists.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
              {artists.map((artist, index) => (
                <ArtistCard key={artist._id || artist.id} artist={artist} index={index} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">No artists found</div>
          )}
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.3 }}>
          <h2 className="text-2xl font-bold text-white mb-4">Songs</h2>
          <div className="bg-light-gray/30 rounded-xl p-4">
            {songs.length > 0 ? (
              songs.map((song, index) => (
                <SongCard key={song._id || song.id} song={song} index={index} showAlbum={true} onClick={() => playTrack(song)} />
              ))
            ) : (
              <div className="text-center py-8 text-gray-400">No songs found</div>
            )}
          </div>
        </motion.section>
      </div>
    </div>
  );
};

export default GenrePage;

