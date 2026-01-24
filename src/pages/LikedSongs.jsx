import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import apiService from '../services/api';
import SongCard from '../components/ui/SongCard';
import { useMusic } from '../contexts/MusicContext';
import { PlayIcon, ShuffleIcon, MoreIcon } from '../components/ui/Icons';
import { useNavigate } from 'react-router-dom';

const LikedSongs = () => {
  const [songs, setSongs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  const [showSticky, setShowSticky] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const navigate = useNavigate();
  const { 
    isAuthenticated, 
    likedSongsIds,
    setQueue,
    playTrack 
  } = useMusic();

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

  useEffect(() => {
    const onScroll = () => {
      setShowSticky(window.scrollY > 120);
    };
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const filteredSortedSongs = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const filtered = term
      ? songs.filter(s => {
          const title = (s.name || '').toLowerCase();
          const artists = (s.artists || []).map(a => a.name?.toLowerCase()).join(' ');
          return title.includes(term) || artists.includes(term);
        })
      : songs.slice();
    switch (sortBy) {
      case 'artist':
        return filtered.sort((a, b) => {
          const aa = (a.artists?.[0]?.name || '').toLowerCase();
          const bb = (b.artists?.[0]?.name || '').toLowerCase();
          return aa.localeCompare(bb);
        });
      case 'duration':
        return filtered.sort((a, b) => (a.duration_ms || 0) - (b.duration_ms || 0));
      case 'recent':
      default:
        return filtered;
    }
  }, [songs, searchTerm, sortBy]);

  const handlePlayAll = () => {
    if (!filteredSortedSongs.length) return;
    setQueue(filteredSortedSongs);
    playTrack(filteredSortedSongs[0]);
  };

  const handleShuffleAll = () => {
    if (!filteredSortedSongs.length) return;
    const shuffled = [...filteredSortedSongs].sort(() => Math.random() - 0.5);
    setQueue(shuffled);
    playTrack(shuffled[0]);
  };

  const handleDownloadAll = async () => {
    const candidates = filteredSortedSongs.filter(s => s.audio_url || s.preview_url || s.stream_url);
    for (const s of candidates) {
      const url = s.audio_url || s.preview_url || s.stream_url;
      if (!url) continue;
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(s.name || 'track').replace(/[^a-z0-9]+/gi,'_')}.mp3`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  if (!songs.length) {
    return (
      <div className="p-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="relative overflow-hidden rounded-2xl p-10 border border-gray-700 bg-gradient-to-br from-black via-blue-900/60 to-neon-blue/20">
            <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-neon-blue/20 blur-3xl" />
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-neon-blue/20 border border-neon-blue/40 flex items-center justify-center animate-glow mb-3">
                <svg className="w-7 h-7 text-neon-blue" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
              </div>
              <h1 className="text-3xl font-bold text-white">Liked Songs</h1>
              <p className="text-gray-300 mt-2">No liked songs yet</p>
              <p className="text-gray-400">Heart the songs you love to see them here</p>
              <button onClick={() => navigate('/search')} className="mt-6 px-5 py-2.5 rounded-xl bg-neon-blue text-dark-bg hover:bg-neon-blue/80 transition-colors">
                Explore Music
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="p-0">
      <div className="relative">
        <div className="p-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="relative overflow-hidden rounded-2xl p-8 md:p-10 border border-gray-700 bg-gradient-to-br from-black via-blue-900/60 to-neon-blue/20">
              <div className="absolute -top-12 -left-12 w-56 h-56 rounded-full bg-neon-blue/20 blur-3xl" />
              <div className="flex flex-col md:flex-row md:items-end md:justify-between">
                <div>
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-neon-blue/20 border border-neon-blue/40 animate-glow mb-4">
                    <svg className="w-8 h-8 text-neon-blue" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                  </div>
                  <h1 className="text-3xl md:text-4xl font-bold text-white">Liked Songs</h1>
                  <p className="text-gray-300 mt-1">Your favorite tracks, all in one place</p>
                </div>
                <div className="mt-6 md:mt-0 flex items-center gap-2">
                  <button onClick={handlePlayAll} className="px-4 py-2 rounded-lg bg-neon-blue text-dark-bg hover:bg-neon-blue/80 transition-colors flex items-center gap-2">
                    <PlayIcon className="w-5 h-5" />
                    <span>Play All</span>
                  </button>
                  <button onClick={handleShuffleAll} className="px-4 py-2 rounded-lg bg-light-gray/50 text-white hover:bg-light-gray transition-colors flex items-center gap-2">
                    <ShuffleIcon className="w-5 h-5" />
                    <span>Shuffle</span>
                  </button>
                  <button onClick={handleDownloadAll} className="px-4 py-2 rounded-lg bg-light-gray/50 text-white hover:bg-light-gray transition-colors flex items-center gap-2">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 3v12m0 0l4-4m-4 4l-4-4M4 17h16v4H4z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    <span>Download</span>
                  </button>
                  <button onClick={() => setShowMore(v => !v)} className="px-4 py-2 rounded-lg bg-light-gray/50 text-white hover:bg-light-gray transition-colors flex items-center gap-2">
                    <MoreIcon className="w-5 h-5" />
                    <span>More</span>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {showSticky && (
          <div className="sticky top-0 z-40 bg-dark-gray/90 backdrop-blur-md border-b border-gray-800">
            <div className="max-w-[1200px] mx-auto px-6 py-3 flex items-center gap-3">
              <button onClick={handlePlayAll} className="px-3 py-1.5 rounded-lg bg-neon-blue text-dark-bg flex items-center gap-2">
                <PlayIcon className="w-4 h-4" />
                <span>Play</span>
              </button>
              <button onClick={handleShuffleAll} className="px-3 py-1.5 rounded-lg bg-light-gray/50 text-white hover:bg-light-gray flex items-center gap-2">
                <ShuffleIcon className="w-4 h-4" />
                <span>Shuffle</span>
              </button>
              <div className="flex-1" />
              <div className="flex items-center gap-2">
                <input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search liked songs"
                  className="px-3 py-1.5 rounded-lg bg-light-gray text-white border border-gray-700 w-52"
                />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-3 py-1.5 rounded-lg bg-light-gray text-white border border-gray-700"
                >
                  <option value="recent">Recently Added</option>
                  <option value="artist">Artist</option>
                  <option value="duration">Duration</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-6">
        <div className="mb-4 flex items-center gap-3">
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search within liked songs"
            className="px-3 py-2 rounded-lg bg-light-gray text-white border border-gray-700 w-full max-w-sm"
          />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 rounded-lg bg-light-gray text-white border border-gray-700"
          >
            <option value="recent">Recently Added</option>
            <option value="artist">Artist</option>
            <option value="duration">Duration</option>
          </select>
        </div>
        <div className="space-y-2">
          {filteredSortedSongs.map((song, index) => (
            <SongCard
              key={song._id || song.id}
              song={song}
              index={index}
              showAlbum={false}
              isLiked={true}
              onClick={() => playTrack(song)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default LikedSongs;
