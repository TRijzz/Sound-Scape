import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import SongCard from '../components/ui/SongCard';
import AlbumCard from '../components/ui/AlbumCard';
import ArtistCard from '../components/ui/ArtistCard';
import UserCard from '../components/ui/UserCard';
import { useSearch } from '../hooks/useMusicData';
import { useMusic } from '../contexts/MusicContext';
import { useNavigate } from 'react-router-dom';
import { SearchIcon, HeartIcon, PlayIcon, MusicNoteIcon } from '../components/ui/Icons';
import apiService from '../services/api';

const SearchResultsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('songs');
  const query = searchParams.get('q') || '';
  const tabParam = searchParams.get('tab') || '';
  const { playTrack, isAuthenticated } = useMusic();
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [genre, setGenre] = useState('');
  const [genreSongs, setGenreSongs] = useState([]);
  const [genreLoading, setGenreLoading] = useState(false);
  const [genreError, setGenreError] = useState(null);
  const [genreApplied, setGenreApplied] = useState(false);
  const [genreOptions, setGenreOptions] = useState([]);
  const [genreOptionsLoading, setGenreOptionsLoading] = useState(false);
  const [genreOptionsError, setGenreOptionsError] = useState(null);
  const [category, setCategory] = useState('');
  const [categorySongs, setCategorySongs] = useState([]);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [categoryError, setCategoryError] = useState(null);
  const [categoryApplied, setCategoryApplied] = useState(false);
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [categoryOptionsLoading, setCategoryOptionsLoading] = useState(false);
  const [categoryOptionsError, setCategoryOptionsError] = useState(null);
  
  // Use the search hook to get real API data
  const { searchResults, searchLoading, searchError, search } = useSearch();

  // Trigger search when query changes
  useEffect(() => {
    if (query.trim()) {
      search(query, 20);
    }
  }, [query, search]);

  useEffect(() => {
    const allowedTabs = new Set(['songs', 'artists', 'albums', 'users']);
    if (allowedTabs.has(tabParam)) {
      setActiveTab(tabParam);
    } else {
      setActiveTab('songs');
    }
  }, [tabParam]);

  useEffect(() => {
    let mounted = true;
    const loadGenres = async () => {
      setGenreOptionsLoading(true);
      setGenreOptionsError(null);
      try {
        const genres = await apiService.getGenres(50);
        const list = (Array.isArray(genres) ? genres : []).map(g => String(g).trim()).filter(Boolean);
        if (mounted) setGenreOptions(list.length ? list : []);
      } catch (e) {
        if (mounted) {
          setGenreOptionsError(e.message || 'Failed to load genres');
          setGenreOptions([]);
        }
      } finally {
        if (mounted) setGenreOptionsLoading(false);
      }
    };
    loadGenres();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadCategories = async () => {
      setCategoryOptionsLoading(true);
      setCategoryOptionsError(null);
      try {
        const categories = await apiService.getCategories();
        const list = (Array.isArray(categories?.categories) ? categories.categories : Array.isArray(categories) ? categories : [])
          .map((item) => String(item?.name || '').trim())
          .filter(Boolean);
        if (mounted) setCategoryOptions(list);
      } catch (e) {
        if (mounted) {
          setCategoryOptionsError(e.message || 'Failed to load categories');
          setCategoryOptions([]);
        }
      } finally {
        if (mounted) setCategoryOptionsLoading(false);
      }
    };
    loadCategories();
    return () => { mounted = false; };
  }, []);

  const applyGenreFilter = async () => {
    if (!genre.trim()) {
      setGenreSongs([]);
      setGenreApplied(false);
      return;
    }
    try {
      setGenreLoading(true);
      setGenreError(null);
      const selected = genre.trim();
      let songs = [];
      const limit = 24;
      const normalize = (g) => String(g || '')
        .toLowerCase()
        .replace(/[\s_]+/g, '-')
        .trim();
      const selectedNorm = normalize(selected);

      // Try specific genre endpoint first (exact case)
      try {
        const byExact = await apiService.getSongsByGenre(selected, limit);
        songs = Array.isArray(byExact) ? byExact : (byExact?.songs || []);
      } catch {}

      // Fallback: try lowercase variant
      if (!songs || songs.length === 0) {
        try {
          const byLower = await apiService.getSongsByGenre(selected.toLowerCase(), limit);
          songs = Array.isArray(byLower) ? byLower : (byLower?.songs || []);
        } catch {}
      }

      // Fallback: generic songs API with genre filter (exact)
      if (!songs || songs.length === 0) {
        try {
          const resExact = await apiService.getSongs(1, limit, '', selected, '', '', '', '-popularity');
          songs = resExact?.songs || resExact || [];
        } catch {}
      }

      // Fallback: generic songs API with genre filter (lowercase)
      if (!songs || songs.length === 0) {
        try {
          const resLower = await apiService.getSongs(1, limit, '', selected.toLowerCase(), '', '', '', '-popularity');
          songs = resLower?.songs || resLower || [];
        } catch {}
      }

      // Strict filter: keep only songs whose genre matches selection
      songs = (Array.isArray(songs) ? songs : []).filter(s => {
        const sg = s?.genre;
        const sgs = s?.genres;
        if (sg) return normalize(sg) === selectedNorm;
        if (Array.isArray(sgs)) return sgs.map(normalize).includes(selectedNorm);
        return false;
      });

      const dedup = [];
      const seen = new Set();
      (Array.isArray(songs) ? songs : []).forEach(s => {
        const id = s?._id || s?.id;
        if (id && !seen.has(id)) {
          seen.add(id);
          dedup.push(s);
        }
      });

      setGenreSongs(dedup);
      setCategoryApplied(false);
      setCategorySongs([]);
      setActiveTab('songs');
      setGenreApplied(true);
    } catch (err) {
      setGenreError(err.message || 'Failed to load songs');
      setGenreSongs([]);
      setGenreApplied(true);
    } finally {
      setGenreLoading(false);
    }
  };

  const applyCategoryFilter = async () => {
    if (!category.trim()) {
      setCategorySongs([]);
      setCategoryApplied(false);
      return;
    }
    try {
      setCategoryLoading(true);
      setCategoryError(null);
      const selected = category.trim();
      const response = await apiService.getSongs(1, 24, '', '', '', '', '', '-popularity', '', '', '', selected);
      const songs = Array.isArray(response?.songs) ? response.songs : Array.isArray(response) ? response : [];
      setCategorySongs(songs);
      setGenreApplied(false);
      setGenreSongs([]);
      setActiveTab('songs');
      setCategoryApplied(true);
    } catch (err) {
      setCategoryError(err.message || 'Failed to load songs');
      setCategorySongs([]);
      setCategoryApplied(true);
    } finally {
      setCategoryLoading(false);
    }
  };

  const handleTrackSelect = async (track) => {
    const name = String(track?.name || '').toLowerCase();
    const artists = (track?.artists || []).map(a => String(a?.name || '').toLowerCase());
    const hasLocal = String(track?.audio_url || '').startsWith('/songs/');
    const isShape = name.includes('shape of you') || (name.includes('shape') && artists.includes('ed sheeran')) || 
                   name.includes('god did');

    if (!isAuthenticated && !(hasLocal || isShape)) {
      setShowAuthPrompt(true);
      return;
    }
    await playTrack(track);
  };

  const trending = ['Taylor Swift', 'Rock', 'Ed Sheeran', 'Nepali Pop', 'Jazz', 'Classical'];
  const quickCategories = [
    { label: 'Top Songs', icon: PlayIcon },
    { label: 'Popular Artists', icon: HeartIcon },
    { label: 'New Albums', icon: MusicNoteIcon }
  ];

  const handleQuickSearch = (term) => {
    setSearchParams({ q: term });
  };

  const tabs = [
    { id: 'songs', label: 'Songs', count: genreApplied ? genreSongs.length : categoryApplied ? categorySongs.length : searchResults.songs.length },
    { id: 'artists', label: 'Artists', count: searchResults.artists.length },
    { id: 'albums', label: 'Albums', count: searchResults.albums.length },
    { id: 'users', label: 'Users', count: searchResults.users?.length || 0 }
  ];

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    const nextParams = new URLSearchParams(searchParams);
    if (tabId === 'songs') {
      nextParams.delete('tab');
    } else {
      nextParams.set('tab', tabId);
    }
    setSearchParams(nextParams);
  };

  const renderContent = () => {
    if (searchLoading || (genreApplied && genreLoading && activeTab === 'songs') || (categoryApplied && categoryLoading && activeTab === 'songs')) {
      if (activeTab === 'songs') {
        return (
          <div className="space-y-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center space-x-3 p-3 rounded-lg bg-light-gray/30 animate-pulse">
                <div className="w-12 h-12 rounded bg-gray-700" />
                <div className="flex-1">
                  <div className="h-3 bg-gray-700 rounded w-1/3 mb-2" />
                  <div className="h-3 bg-gray-700 rounded w-1/4" />
                </div>
                <div className="h-3 bg-gray-700 rounded w-12" />
              </div>
            ))}
          </div>
        );
      }
      return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="aspect-square rounded-xl bg-light-gray/30 animate-pulse" />
          ))}
        </div>
      );
    }

    if (searchError) {
      return (
        <div className="text-center py-12">
          <div className="text-red-400">Error: {searchError}</div>
        </div>
      );
    }

    switch (activeTab) {
      case 'songs':
        {
          const songsToRender = genreApplied ? genreSongs : categoryApplied ? categorySongs : searchResults.songs;
          if (!songsToRender || songsToRender.length === 0) {
            return (
              <div className="text-center py-8 text-gray-400">
                {genreApplied ? 'No songs found for selected genre' : categoryApplied ? 'No songs found for selected category' : 'No songs found'}
              </div>
            );
          }
          return (
            <div className="space-y-2">
              {songsToRender.map((song, index) => (
                <div key={song._id || song.id}>
                  <SongCard
                    song={song}
                    index={index}
                    showAlbum={true}
                    onClick={() => handleTrackSelect(song)}
                  />
                </div>
              ))}
            </div>
          );
        }
      case 'artists':
        return (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {searchResults.artists.map((artist, index) => (
              <ArtistCard
                key={artist._id || artist.id}
                artist={artist}
                index={index}
              />
            ))}
          </div>
        );
      case 'albums':
        return (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {searchResults.albums.map((album, index) => (
              <AlbumCard
                key={album._id || album.id}
                album={album}
                index={index}
              />
            ))}
          </div>
        );
      case 'users':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(searchResults.users || []).map((user, index) => (
              <UserCard
                key={user._id || user.id}
                user={user}
                index={index}
              />
            ))}
          </div>
        );
      default:
        return null;
    }
  };

  if (!query.trim()) {
    return (
      <div className="p-6">
        <motion.div
          className="mb-8 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-neon-blue/20 border border-neon-blue/30 mb-4">
            <SearchIcon className="w-6 h-6 text-neon-blue" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Search</h1>
          <p className="text-gray-400">Start typing in the search bar to find songs, artists, albums, and users</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-8"
        >
          <h2 className="text-lg font-semibold text-white mb-3">Trending searches</h2>
          <div className="flex flex-wrap gap-2">
            {trending.map((t) => (
              <button
                key={t}
                onClick={() => handleQuickSearch(t)}
                className="px-3 py-2 text-sm rounded-full bg-light-gray/40 text-gray-300 hover:bg-neon-blue/20 hover:text-white border border-gray-700 hover:border-neon-blue/30 transition-all"
              >
                {t}
              </button>
            ))}
          </div>
        </motion.div>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="mb-8"
        >
          <h2 className="text-lg font-semibold text-white mb-3">Filter songs by genre</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <select
              className="px-3 py-2 rounded-lg bg-light-gray/50 text-white border border-gray-700"
              value={genre}
              onChange={e => setGenre(e.target.value)}
            >
              <option value="">Select genre</option>
              {genreOptions.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
            <button
              onClick={applyGenreFilter}
              className="px-3 py-2 rounded-lg bg-neon-blue text-dark-bg"
            >
              Apply
            </button>
            {genreLoading && <div className="px-3 py-2 text-sm text-gray-400">Loading...</div>}
            {genreOptionsLoading && <div className="px-3 py-2 text-sm text-gray-400">Loading genres...</div>}
          </div>
          {genreError && <div className="text-sm text-red-400">{genreError}</div>}
          {genreOptionsError && <div className="text-sm text-red-400">{genreOptionsError}</div>}
          {genreApplied && !genreLoading && (
            <div className="mt-4 bg-light-gray/50 rounded-xl p-4">
              {genreSongs.length > 0 ? (
                <div className="space-y-2">
                  {genreSongs.map((song, index) => (
                    <SongCard
                      key={song._id || song.id}
                      song={song}
                      index={index}
                      showAlbum={true}
                      onClick={() => handleTrackSelect(song)}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">No songs found for selected genre</div>
              )}
            </div>
          )}
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.18 }}
          className="mb-8"
        >
          <h2 className="text-lg font-semibold text-white mb-3">Filter songs by category</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <select
              className="px-3 py-2 rounded-lg bg-light-gray/50 text-white border border-gray-700"
              value={category}
              onChange={e => setCategory(e.target.value)}
            >
              <option value="">Select category</option>
              {categoryOptions.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <button
              onClick={applyCategoryFilter}
              className="px-3 py-2 rounded-lg bg-neon-blue text-dark-bg"
            >
              Apply
            </button>
            {categoryLoading && <div className="px-3 py-2 text-sm text-gray-400">Loading...</div>}
            {categoryOptionsLoading && <div className="px-3 py-2 text-sm text-gray-400">Loading categories...</div>}
          </div>
          {categoryError && <div className="text-sm text-red-400">{categoryError}</div>}
          {categoryOptionsError && <div className="text-sm text-red-400">{categoryOptionsError}</div>}
          {categoryApplied && !categoryLoading && (
            <div className="mt-4 bg-light-gray/50 rounded-xl p-4">
              {categorySongs.length > 0 ? (
                <div className="space-y-2">
                  {categorySongs.map((song, index) => (
                    <SongCard
                      key={song._id || song.id}
                      song={song}
                      index={index}
                      showAlbum={true}
                      onClick={() => handleTrackSelect(song)}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">No songs found for selected category</div>
              )}
            </div>
          )}
        </motion.section>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <h2 className="text-lg font-semibold text-white mb-3">Browse</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {quickCategories.map(({ label, icon: Icon }, index) => (
              <motion.button
                key={label}
                whileHover={{ scale: 1.02 }}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className="flex items-center space-x-3 p-5 rounded-xl bg-gradient-to-r from-neon-blue/20 to-purple-500/20 border border-gray-700 text-left"
                onClick={() => setActiveTab(label.includes('Songs') ? 'songs' : label.includes('Artists') ? 'artists' : 'albums')}
              >
                <div className="w-10 h-10 rounded-lg bg-black/30 border border-gray-700 flex items-center justify-center">
                  <Icon className="w-6 h-6 text-neon-blue" />
                </div>
                <div>
                  <p className="text-white font-medium">{label}</p>
                  <p className="text-gray-400 text-sm">Explore curated {label.toLowerCase()}</p>
                </div>
              </motion.button>
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <motion.div
        className="mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-2xl font-bold text-white mb-2">
          Search results for "{query}"
        </h1>
        <p className="text-gray-400">
          Found {searchResults.songs.length + searchResults.artists.length + searchResults.albums.length + (searchResults.users?.length || 0)} results
        </p>
      </motion.div>

      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.05 }}
        className="mb-6"
      >
        <h2 className="text-lg font-semibold text-white mb-3">Filter songs by genre</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
          <select
            className="px-3 py-2 rounded-lg bg-light-gray/50 text-white border border-gray-700"
            value={genre}
            onChange={e => setGenre(e.target.value)}
          >
            <option value="">Select genre</option>
            {genreOptions.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
          <button
            onClick={applyGenreFilter}
            className="px-3 py-2 rounded-lg bg-neon-blue text-dark-bg"
          >
            Apply
          </button>
          {genreLoading && <div className="px-3 py-2 text-sm text-gray-400">Loading...</div>}
          {genreOptionsLoading && <div className="px-3 py-2 text-sm text-gray-400">Loading genres...</div>}
        </div>
        {genreError && <div className="text-sm text-red-400">{genreError}</div>}
        {genreOptionsError && <div className="text-sm text-red-400">{genreOptionsError}</div>}
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.06 }}
        className="mb-6"
      >
        <h2 className="text-lg font-semibold text-white mb-3">Filter songs by category</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
          <select
            className="px-3 py-2 rounded-lg bg-light-gray/50 text-white border border-gray-700"
            value={category}
            onChange={e => setCategory(e.target.value)}
          >
            <option value="">Select category</option>
            {categoryOptions.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <button
            onClick={applyCategoryFilter}
            className="px-3 py-2 rounded-lg bg-neon-blue text-dark-bg"
          >
            Apply
          </button>
          {categoryLoading && <div className="px-3 py-2 text-sm text-gray-400">Loading...</div>}
          {categoryOptionsLoading && <div className="px-3 py-2 text-sm text-gray-400">Loading categories...</div>}
        </div>
        {categoryError && <div className="text-sm text-red-400">{categoryError}</div>}
        {categoryOptionsError && <div className="text-sm text-red-400">{categoryOptionsError}</div>}
      </motion.section>

      {/* Tabs */}
      <motion.div
        className="mb-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <div className="flex space-x-1 bg-light-gray/30 rounded-xl p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-neon-blue text-dark-bg'
                  : 'text-gray-400 hover:text-white hover:bg-light-gray/50'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>
      </motion.div>

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        key={activeTab}
      >
        {renderContent()}
      </motion.div>

      {/* No Results */}
      {query && !searchLoading && !searchError && (
        searchResults.songs.length === 0 && 
        searchResults.artists.length === 0 && 
        searchResults.albums.length === 0 &&
        (searchResults.users?.length || 0) === 0
      ) && (
        <motion.div
          className="text-center py-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <h3 className="text-lg font-medium text-gray-400 mb-2">
            No results found for "{query}"
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            Try a different keyword or pick one below
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            {trending.map((t) => (
              <button
                key={t}
                onClick={() => handleQuickSearch(t)}
                className="px-3 py-2 text-sm rounded-full bg-light-gray/40 text-gray-300 hover:bg-neon-blue/20 hover:text-white border border-gray-700 hover:border-neon-blue/30 transition-all"
              >
                {t}
              </button>
            ))}
          </div>
        </motion.div>
      )}

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
            <p className="text-gray-300 mb-4">You need to sign in first to play songs.</p>
            <div className="flex items-center justify-center space-x-3">
              <button
                onClick={() => setShowAuthPrompt(false)}
                className="px-4 py-2 rounded-lg bg-light-gray/50 text-white hover:bg-light-gray"
              >
                Cancel
              </button>
              <button
                onClick={() => navigate(`/login`, { state: { from: `/search?q=${encodeURIComponent(query)}` } })}
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

export default SearchResultsPage;
