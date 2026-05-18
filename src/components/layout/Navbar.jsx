import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { SearchIcon, UserIcon, MoreIcon } from '../ui/Icons';
import { useMusic } from '../../contexts/MusicContext';
import SearchSuggestions from '../ui/SearchSuggestions';
import { useSearchSuggestions } from '../../hooks/useSearchSuggestions';
import useEscapeKey from '../../hooks/useEscapeKey';

const Navbar = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, logout } = useMusic();
  const { suggestions, isLoading, searchSuggestions, clearSuggestions } = useSearchSuggestions();
  const searchRef = useRef(null);
  const suggestionsRef = useRef(null);
  const searchPlaceholder = location.pathname.startsWith('/store') ? 'Search vinyl by album name' : "What's playing in your head?";

  useEscapeKey(showSuggestions || showDropdown || isSearchFocused, () => {
    setShowSuggestions(false);
    setShowDropdown(false);
    setIsSearchFocused(false);
    searchRef.current?.querySelector('input')?.blur();
  });

  // Keep input in sync with URL query when on /search
  useEffect(() => {
    if (location.pathname.startsWith('/search') || location.pathname.startsWith('/store')) {
      const params = new URLSearchParams(location.search);
      const q = params.get('q') || '';
      setSearchQuery(q);
    }
  }, [location.pathname, location.search]);

  useEffect(() => {
    setShowSuggestions(false);
    setIsSearchFocused(false);
    clearSuggestions();
  }, [location.pathname, location.search, clearSuggestions]);

  // Live update search results by updating URL as user types on /search
  useEffect(() => {
    if (!location.pathname.startsWith('/search') && !location.pathname.startsWith('/store')) return;
    const timeoutId = setTimeout(() => {
      const nextPath = location.pathname.startsWith('/store') ? '/store' : '/search';
      navigate(`${nextPath}?q=${encodeURIComponent(searchQuery)}`, { replace: true });
    }, 250);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, location.pathname, navigate]);

  // Debounced search suggestions
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const allowSuggestions = !location.pathname.startsWith('/search') && !location.pathname.startsWith('/store');
      if (!allowSuggestions) {
        clearSuggestions();
        setShowSuggestions(false);
        return;
      }
      if (isSearchFocused && searchQuery.trim().length >= 2) {
        searchSuggestions(searchQuery, 5);
        setShowSuggestions(true);
      } else {
        clearSuggestions();
        setShowSuggestions(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, searchSuggestions, clearSuggestions, location.pathname, isSearchFocused]);

  // Close suggestions and dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        searchRef.current && 
        !searchRef.current.contains(event.target) &&
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target)
      ) {
        setShowSuggestions(false);
        setShowDropdown(false);
        setIsSearchFocused(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      const nextPath = location.pathname.startsWith('/store') ? '/store' : '/search';
      navigate(`${nextPath}?q=${encodeURIComponent(searchQuery)}`);
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (type, item) => {
    setShowSuggestions(false);
    setSearchQuery('');
    
    if (type === 'artist') {
      navigate(`/artist/${item._id || item.id}`);
    } else if (type === 'user') {
      navigate(`/user/${item._id || item.id}`);
    } else if (type === 'album') {
      navigate(`/album/${item._id || item.id}`);
    } else if (type === 'song') {
      const albumId = item.album?._id || item.album?.id || item.albumId?._id || item.albumId || '';
      navigate(albumId ? `/album/${albumId}` : `/search?q=${encodeURIComponent(item.name || item.title || '')}`);
    }
  };

  const handleInputChange = (e) => {
    const nextValue = e.target.value;
    setSearchQuery(nextValue);
    const onResultsPage = location.pathname.startsWith('/search') || location.pathname.startsWith('/store');
    if (onResultsPage) {
      setShowSuggestions(false);
      return;
    }

    setShowSuggestions(nextValue.trim().length >= 2 && isSearchFocused);
  };

  const handleInputFocus = () => {
    setIsSearchFocused(true);
    const allowSuggestions = !location.pathname.startsWith('/search') && !location.pathname.startsWith('/store');
    if (!allowSuggestions) {
      setShowSuggestions(false);
      return;
    }
    if (searchQuery.trim().length >= 2) {
      setShowSuggestions(true);
    }
  };

  return (
    <motion.nav 
      className="bg-dark-gray/80 backdrop-blur-md border-b border-gray-800 px-4 lg:px-6 py-4 relative z-50"
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center justify-between">
        {/* Search Bar */}
        <div className="flex-1 max-w-2xl mx-4 lg:mx-8 relative" ref={searchRef}>
          <form onSubmit={handleSearch} className="relative">
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={handleInputChange}
              onFocus={handleInputFocus}
              onBlur={() => {
                window.setTimeout(() => {
                  setIsSearchFocused(false);
                  setShowSuggestions(false);
                }, 120);
              }}
              className="w-full py-2 lg:py-3 pl-10 lg:pl-12 pr-4 rounded-xl bg-light-gray text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-neon-blue focus:bg-dark-gray transition-all duration-200 text-sm lg:text-base"
            />
            <SearchIcon className="absolute left-3 lg:left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 lg:w-5 lg:h-5 text-gray-400" />
          </form>
          
          {/* Search Suggestions */}
          <div ref={suggestionsRef}>
            <SearchSuggestions
              suggestions={suggestions}
              isLoading={isLoading}
              isVisible={
                showSuggestions &&
                searchQuery.trim().length >= 2 &&
                !location.pathname.startsWith('/search') &&
                !location.pathname.startsWith('/store')
              }
              onSuggestionClick={handleSuggestionClick}
              onClose={() => setShowSuggestions(false)}
            />
          </div>
        </div>

        {/* User Actions */}
        <div className="flex items-center space-x-2 lg:space-x-4 relative" ref={dropdownRef}>
          {isAuthenticated ? (
            <>
              <div 
                className="flex items-center space-x-2 cursor-pointer"
                onClick={() => setShowDropdown(!showDropdown)}
              >
                <div className="w-8 h-8 lg:w-9 lg:h-9 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden">
                  {(user?.avatar_url || user?.avatar) ? (
                    <img
                      src={user.avatar_url || user.avatar}
                      alt={user?.name || 'User'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <UserIcon className="w-4 h-4 text-gray-300" />
                  )}
                </div>
                {user?.name && (
                  <span className="hidden lg:inline text-sm font-medium text-gray-300">
                    {user.name}
                  </span>
                )}
              </div>

              {/* Dropdown Menu */}
              {showDropdown && (
                <motion.div 
                  className="absolute right-0 top-full mt-2 w-48 bg-dark-gray border border-gray-700 rounded-lg shadow-lg z-50 overflow-hidden"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.2 }}
                >
                  <Link
                    to="/profile"
                    className="block px-4 py-3 text-sm text-gray-300 hover:bg-gray-800 transition-colors"
                    onClick={() => setShowDropdown(false)}
                  >
                    Profile
                  </Link>
                  <Link
                    to="/account"
                    className="block px-4 py-3 text-sm text-gray-300 hover:bg-gray-800 transition-colors border-t border-gray-800"
                    onClick={() => setShowDropdown(false)}
                  >
                    Account
                  </Link>
                  <Link
                    to="/settings"
                    className="block px-4 py-3 text-sm text-gray-300 hover:bg-gray-800 transition-colors border-t border-gray-800"
                    onClick={() => setShowDropdown(false)}
                  >
                    Settings
                  </Link>
                  <button
                    onClick={() => {
                      logout();
                      setShowDropdown(false);
                      navigate('/');
                    }}
                    className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-gray-800 transition-colors border-t border-gray-800"
                  >
                    Log Out
                  </button>
                </motion.div>
              )}
            </>
          ) : (
            <div className="flex items-center space-x-2 lg:space-x-3">
              <Link
                to="/login"
                className="px-3 lg:px-4 py-2 text-gray-300 hover:text-white transition-colors text-sm lg:text-base"
              >
                Log In
              </Link>
              <Link
                to="/signup"
                className="px-4 lg:px-6 py-2 bg-neon-blue text-dark-bg rounded-xl font-medium hover:bg-neon-blue/80 transition-all duration-200 hover:shadow-lg hover:shadow-neon-blue/25 text-sm lg:text-base"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </div>
    </motion.nav>
  );
};

export default Navbar;

