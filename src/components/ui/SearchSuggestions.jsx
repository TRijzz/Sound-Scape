import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SearchIcon } from './Icons';
import albumArtPlaceholder from '../../assets/album_art_placeholder.svg';
import apiService from '../../services/api';

const SearchSuggestions = ({ 
  suggestions, 
  isLoading, 
  isVisible, 
  onSuggestionClick, 
  onClose 
}) => {
  if (!isVisible) return null;

  const handleSelect = (event, type, item) => {
    event.preventDefault();
    onSuggestionClick(type, item);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2 }}
        className="absolute top-full left-0 right-0 mt-2 bg-dark-gray border border-gray-700 rounded-xl shadow-2xl z-50 max-h-96 overflow-y-auto"
      >
        {isLoading ? (
          <div className="p-4 text-center text-gray-400">
            <div className="animate-spin w-5 h-5 border-2 border-neon-blue border-t-transparent rounded-full mx-auto mb-2"></div>
            Searching...
          </div>
        ) : (suggestions.artists?.length > 0 || suggestions.songs?.length > 0 || suggestions.albums?.length > 0 || suggestions.users?.length > 0) ? (
          <div className="py-2">
            {suggestions.users && suggestions.users.length > 0 && (
              <div className="px-4 py-2">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Users
                </h4>
                {suggestions.users.slice(0, 3).map((user) => (
                  <motion.div
                    key={user._id || user.id}
                    className="flex items-center space-x-3 p-2 hover:bg-light-gray/50 rounded-lg cursor-pointer transition-colors"
                    onMouseDown={(event) => handleSelect(event, 'user', user)}
                    role="button"
                    tabIndex={0}
                    whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
                  >
                    <div className="w-8 h-8 rounded-full bg-light-gray overflow-hidden">
                      <img
                        src={apiService.resolveMediaUrl(user.avatar_url || albumArtPlaceholder)}
                        alt={user.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {user.name}
                      </p>
                      <p className="text-xs text-gray-400 truncate">
                        {user.username ? `@${user.username}` : 'User'}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Artists Section */}
            {suggestions.artists && suggestions.artists.length > 0 && (
              <div className="px-4 py-2">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Artists
                </h4>
                {suggestions.artists.slice(0, 3).map((artist) => (
                  <motion.div
                    key={artist._id || artist.id}
                    className="flex items-center space-x-3 p-2 hover:bg-light-gray/50 rounded-lg cursor-pointer transition-colors"
                    onMouseDown={(event) => handleSelect(event, 'artist', artist)}
                    role="button"
                    tabIndex={0}
                    whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
                  >
                    <div className="w-8 h-8 rounded-full bg-light-gray overflow-hidden">
                      <img
                        src={apiService.resolveMediaUrl(artist.images?.[0]?.url || albumArtPlaceholder)}
                        alt={artist.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {artist.name}
                      </p>
                      <p className="text-xs text-gray-400">Artist</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Songs Section */}
            {suggestions.songs && suggestions.songs.length > 0 && (
              <div className="px-4 py-2">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Songs
                </h4>
                {suggestions.songs.slice(0, 3).map((song) => (
                  <motion.div
                    key={song._id || song.id}
                    className="flex items-center space-x-3 p-2 hover:bg-light-gray/50 rounded-lg cursor-pointer transition-colors"
                    onMouseDown={(event) => handleSelect(event, 'song', song)}
                    role="button"
                    tabIndex={0}
                    whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
                  >
                    <div className="w-8 h-8 rounded bg-light-gray overflow-hidden">
                      <img
                        src={apiService.resolveMediaUrl(song.album?.images?.[0]?.url || albumArtPlaceholder)}
                        alt={song.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {song.name}
                      </p>
                      <p className="text-xs text-gray-400 truncate">
                        {song.search_match_type === 'lyrics' && song.lyrics_preview
                          ? `Lyrics match: ${song.lyrics_preview}`
                          : song.artists?.map(artist => artist.name).join(', ')}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Albums Section */}
            {suggestions.albums && suggestions.albums.length > 0 && (
              <div className="px-4 py-2">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Albums
                </h4>
                {suggestions.albums.slice(0, 3).map((album) => (
                  <motion.div
                    key={album._id || album.id}
                    className="flex items-center space-x-3 p-2 hover:bg-light-gray/50 rounded-lg cursor-pointer transition-colors"
                    onMouseDown={(event) => handleSelect(event, 'album', album)}
                    role="button"
                    tabIndex={0}
                    whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
                  >
                    <div className="w-8 h-8 rounded bg-light-gray overflow-hidden">
                      <img
                        src={apiService.resolveMediaUrl(album.images?.[0]?.url || albumArtPlaceholder)}
                        alt={album.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {album.name}
                      </p>
                      <p className="text-xs text-gray-400 truncate">
                        {album.artists?.map(artist => artist.name).join(', ')}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 text-center text-gray-400">
            <SearchIcon className="w-6 h-6 mx-auto mb-2 opacity-50" />
            No results found
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default SearchSuggestions;
