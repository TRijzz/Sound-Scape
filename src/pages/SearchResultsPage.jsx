import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import SongCard from '../components/ui/SongCard';
import AlbumCard from '../components/ui/AlbumCard';
import ArtistCard from '../components/ui/ArtistCard';
import { useSearch } from '../hooks/useMusicData';
import { useMusic } from '../contexts/MusicContext';

const SearchResultsPage = () => {
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('songs');
  const query = searchParams.get('q') || '';
  const { playTrack } = useMusic();
  
  // Use the search hook to get real API data
  const { searchResults, searchLoading, searchError, search } = useSearch();

  // Trigger search when query changes
  useEffect(() => {
    if (query.trim()) {
      search(query, 20);
    }
  }, [query, search]);

  const handleTrackSelect = async (track) => {
    await playTrack(track);
  };

  const tabs = [
    { id: 'songs', label: 'Songs', count: searchResults.songs.length },
    { id: 'artists', label: 'Artists', count: searchResults.artists.length },
    { id: 'albums', label: 'Albums', count: searchResults.albums.length }
  ];

  const renderContent = () => {
    if (searchLoading) {
      return (
        <div className="text-center py-12">
          <div className="text-gray-400">Searching...</div>
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
        return (
          <div className="space-y-2">
            {searchResults.songs.map((song, index) => (
              <SongCard
                key={song._id || song.id}
                song={song}
                index={index}
                showAlbum={true}
                onClick={() => handleTrackSelect(song)}
              />
            ))}
          </div>
        );
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
      default:
        return null;
    }
  };

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
          Found {searchResults.songs.length + searchResults.artists.length + searchResults.albums.length} results
        </p>
      </motion.div>

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
              onClick={() => setActiveTab(tab.id)}
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
        searchResults.albums.length === 0
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
          <p className="text-sm text-gray-500">
            Try searching for something else
          </p>
        </motion.div>
      )}
    </div>
  );
};

export default SearchResultsPage;
