import React from 'react';
import { motion } from 'framer-motion';
import SongCard from '../components/ui/SongCard';
import AlbumCard from '../components/ui/AlbumCard';
import ArtistCard from '../components/ui/ArtistCard';
import { useMusic } from '../contexts/MusicContext';
import { usePopularArtists, usePopularSongs, usePopularAlbums } from '../hooks/useMusicData';
import { PlayIcon, SearchIcon, HeartIcon } from '../components/ui/Icons';
import apiService from '../services/api';

const HomePage = () => {
  const { playTrack } = useMusic();
  const [categorySections, setCategorySections] = React.useState([]);
  const [sectionsLoading, setSectionsLoading] = React.useState(false);
  
  // Use API hooks to fetch real data
  const { artists: topArtists, loading: artistsLoading, error: artistsError } = usePopularArtists(6);
  const { songs: popularSongs, loading: songsLoading, error: songsError } = usePopularSongs(3);
  const { albums: newReleases, loading: albumsLoading, error: albumsError } = usePopularAlbums(6);

  const handleTrackSelect = async (track) => {
    await playTrack(track);
  };

  // Sample featured playlists (keeping these as they're UI elements, not API data)
  const featuredPlaylists = [
    {
      id: 1,
      name: 'Today\'s Top Hits',
      description: 'The most played songs right now',
      icon: PlayIcon,
      tracks: 50
    },
    {
      id: 2,
      name: 'Discover Weekly',
      description: 'Your weekly mixtape of fresh music',
      icon: SearchIcon,
      tracks: 30
    },
    {
      id: 3,
      name: 'Made For You',
      description: 'Songs picked just for you',
      icon: HeartIcon,
      tracks: 25
    }
  ];

  React.useEffect(() => {
    const loadSections = async () => {
      try {
        setSectionsLoading(true);
        
        // 1. Get available genres from API
        const genresRes = await apiService.getGenres(50);
        let availableGenres = Array.isArray(genresRes) ? genresRes : (genresRes?.genres || []);
        
        // Fallback if API returns empty or few genres
        if (availableGenres.length < 5) {
            availableGenres = [...new Set([...availableGenres, 'Pop', 'Rock', 'Hip Hop', 'R&B', 'Electronic', 'Jazz', 'Classical', 'Indie', 'Alternative'])];
        }

        // 2. Shuffle and pick 3-4 genres
        const shuffled = availableGenres.sort(() => 0.5 - Math.random());
        const selectedGenres = shuffled.slice(0, 4);

        // 3. Fetch songs for each selected genre
        const sectionsData = await Promise.all(selectedGenres.map(async (genre) => {
            const name = typeof genre === 'string' ? genre : genre.name;
            try {
                // Try fetching by genre
                let res = await apiService.getSongsByGenre(name, 6);
                let songs = res?.songs || res || [];
                
                // If empty, try searching (fallback for broad terms like "Chill")
                if (!Array.isArray(songs) || songs.length === 0) {
                     res = await apiService.searchSongs(name, 6);
                     songs = res?.songs || res || [];
                }
                
                return {
                    title: name,
                    songs: Array.isArray(songs) ? songs : []
                };
            } catch (e) {
                return { title: name, songs: [] };
            }
        }));

        // 4. Filter out empty sections and take top 3
        const validSections = sectionsData.filter(s => s.songs.length > 0).slice(0, 3);
        
        // If we still don't have enough, fill with generic popular/latest
        if (validSections.length < 3) {
             const popRes = await apiService.getPopularSongs(6);
             const popSongs = popRes?.songs || popRes || [];
             if (popSongs.length > 0 && !validSections.some(s => s.title === 'Trending Now')) {
                 validSections.push({ title: 'Trending Now', songs: popSongs });
             }
        }

        setCategorySections(validSections);

      } catch (err) {
        console.error('Failed to load category sections:', err);
      } finally {
        setSectionsLoading(false);
      }
    };
    loadSections();
  }, []);

  return (
    <div className="p-6 space-y-8">
      {/* Welcome Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-3xl font-bold text-white mb-2">
          Welcome to Sound Scape
        </h1>
        <p className="text-gray-400">
          Discover new music and enjoy your favorites
        </p>
      </motion.div>

      {/* Vinyl Experience Hint */}
      <motion.div
        className="text-center py-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <p className="text-gray-400 text-sm">
          💡 Click the vinyl icon in the player below to experience the immersive vinyl animation
        </p>
      </motion.div>

      {/* Featured Playlists */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <h2 className="text-xl font-bold text-white mb-4">Made for you</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {featuredPlaylists.map((playlist, index) => {
            const Icon = playlist.icon;
            return (
              <motion.div
                key={playlist.id}
                className="bg-gradient-to-r from-neon-blue/20 to-purple-500/20 rounded-xl p-6 cursor-pointer hover:from-neon-blue/30 hover:to-purple-500/30 transition-all duration-300"
                whileHover={{ scale: 1.02 }}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <div className="flex items-center space-x-4">
                  {/* Icon tile replacing placeholder image */}
                  <div className="w-16 h-16 rounded-lg bg-black/30 border border-gray-700 flex items-center justify-center">
                    <Icon className="w-8 h-8 text-neon-blue" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      {playlist.name}
                    </h3>
                    <p className="text-sm text-gray-400">
                      {playlist.description}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {playlist.tracks} songs
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.section>

      {/* Browse by Category - Dynamic Sections */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
      >
        <h2 className="text-xl font-bold text-white mb-4">Browse by category</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {sectionsLoading ? (
                 // Loading Placeholders
                 [1, 2, 3].map(i => (
                    <div key={i} className="bg-light-gray/40 rounded-xl p-4 h-64 animate-pulse">
                        <div className="h-6 w-1/3 bg-gray-700 rounded mb-4"></div>
                        <div className="space-y-3">
                            {[1,2,3,4].map(j => <div key={j} className="h-12 bg-gray-700/50 rounded"></div>)}
                        </div>
                    </div>
                 ))
            ) : categorySections.length > 0 ? (
                categorySections.map((section, idx) => (
                    <div key={idx} className="bg-light-gray/40 rounded-xl p-4">
                        <h3 className="text-lg font-semibold mb-3 capitalize">{section.title}</h3>
                        <div className="space-y-2">
                        {section.songs.slice(0, 6).map((song, index) => (
                            <SongCard key={song._id || song.id} song={song} index={index} showAlbum={true} onClick={() => handleTrackSelect(song)} />
                        ))}
                        </div>
                    </div>
                ))
            ) : (
                <div className="col-span-3 text-center text-gray-400 py-8">
                    No categories available at the moment.
                </div>
            )}
        </div>
      </motion.section>

      {/* Popular Songs */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <h2 className="text-xl font-bold text-white mb-4">Popular songs</h2>
        <div className="bg-light-gray/50 rounded-xl p-4">
          {songsLoading ? (
            <div className="text-center py-8 text-gray-400">Loading songs...</div>
          ) : songsError ? (
            <div className="text-center py-8 text-red-400">Error loading songs: {songsError}</div>
          ) : (
            popularSongs.map((song, index) => (
              <SongCard
                key={song._id || song.id}
                song={song}
                index={index}
                showAlbum={true}
                onClick={() => handleTrackSelect(song)}
              />
            ))
          )}
        </div>
      </motion.section>

      {/* Top Artists */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <h2 className="text-xl font-bold text-white mb-4">Top artists</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
          {artistsLoading ? (
            <div className="col-span-full text-center py-8 text-gray-400">Loading artists...</div>
          ) : artistsError ? (
            <div className="col-span-full text-center py-8 text-red-400">Error loading artists: {artistsError}</div>
          ) : (
            topArtists.map((artist, index) => (
              <ArtistCard
                key={artist._id || artist.id}
                artist={artist}
                index={index}
              />
            ))
          )}
        </div>
      </motion.section>

      {/* New Releases */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <h2 className="text-xl font-bold text-white mb-4">New releases</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
          {albumsLoading ? (
            <div className="col-span-full text-center py-8 text-gray-400">Loading albums...</div>
          ) : albumsError ? (
            <div className="col-span-full text-center py-8 text-red-400">Error loading albums: {albumsError}</div>
          ) : (
            newReleases.map((album, index) => (
              <AlbumCard
                key={album._id || album.id}
                album={album}
                index={index}
              />
            ))
          )}
        </div>
      </motion.section>
    </div>
  );
};

export default HomePage;
