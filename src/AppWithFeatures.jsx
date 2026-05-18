import React, { useState, useEffect } from 'react';

import vinylSvg from './assets/vinyl.svg';
import { ReactComponent as Tonearm } from './assets/tonearm.svg';
import albumArtPlaceholder from './assets/album_art_placeholder.svg';
import homeIcon from './assets/home_icon.svg';
import heartIcon from './assets/heart_icon.svg';
import ellipsisIcon from './assets/ellipsis_icon.svg';
import userAvatar from './assets/user_avatar.svg';

// Import our custom hooks and API service
import { usePopularArtists, usePopularSongs, usePopularAlbums, useSearch, useCurrentTrack } from './hooks/useMusicData.js';
import apiService from './services/api.js';

// Import new components
import PlaylistModal from './Components/PlaylistModal.jsx';
import PlaylistList from './Components/PlaylistList.jsx';
import PlaylistView from './Components/PlaylistView.jsx';
import AuthModal from './Components/AuthModal.jsx';
import EnhancedMusicPlayer from './Components/EnhancedMusicPlayer.jsx';
import EnhancedSearch from './Components/EnhancedSearch.jsx';

// Import new hooks
import { usePlaylistActions } from './hooks/usePlaylists.js';
import { useAuth, useAuthActions } from './hooks/useAuth.js';

const MusicStationApp = () => {
  // Use our custom hooks to get real data
  const { artists: popularArtists, loading: artistsLoading } = usePopularArtists(5);
  const { songs: popularSongs, loading: songsLoading } = usePopularSongs(5);
  const { albums: popularAlbums, loading: albumsLoading } = usePopularAlbums(5);
  const { searchResults, searchLoading, search } = useSearch();
  const { 
    currentTrack, 
    isPlaying, 
    progress, 
    duration, 
    playTrack, 
    pauseTrack, 
    resumeTrack, 
    stopTrack, 
    setProgress 
  } = useCurrentTrack();

  // Authentication
  const { user, isAuthenticated } = useAuth();
  const { handleLogin, handleSignup, handleLogout, isLoading: authLoading } = useAuthActions();

  // Playlist management
  const {
    playlists,
    getPlaylistById,
    handleCreatePlaylist,
    handleAddToPlaylist,
    handleRemoveFromPlaylist,
    handleDeletePlaylist,
    handleEditPlaylist
  } = usePlaylistActions();

  // Local state
  const [playerState, setPlayerState] = useState('stopped');
  const [volume, setVolume] = useState(60);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [selectedSongs, setSelectedSongs] = useState([]);
  const [currentPlaylist, setCurrentPlaylist] = useState(null);
  const [showPlaylists, setShowPlaylists] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);
  const [isLiked, setIsLiked] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);
  const [repeatMode, setRepeatMode] = useState('none'); // 'none', 'one', 'all'

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('music_station_recent_searches');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (error) {
        console.error('Failed to load recent searches:', error);
      }
    }
  }, []);

  // Save recent searches to localStorage
  useEffect(() => {
    localStorage.setItem('music_station_recent_searches', JSON.stringify(recentSearches));
  }, [recentSearches]);

  const progressPercent = duration > 0 ? Math.min(100, Math.max(0, (progress / duration) * 100)) : 0;

  const handlePlayPause = () => {
    if (!isPlaying) {
      setPlayerState('swinging');
      setTimeout(() => {
        setPlayerState('playing');
        resumeTrack();
      }, 2000);
    } else {
      setPlayerState('paused');
      pauseTrack();
    }
  };

  const handleNext = () => {
    // TODO: Implement next track logic
    console.log('Next track');
  };

  const handlePrevious = () => {
    // TODO: Implement previous track logic
    console.log('Previous track');
  };

  const handleSeek = (newProgress) => {
    setProgress(newProgress);
  };

  const handleVolumeChange = (newVolume) => {
    setVolume(newVolume);
  };

  const handleToggleMute = () => {
    // Mute/unmute logic handled in EnhancedMusicPlayer
  };

  const handleToggleShuffle = () => {
    setIsShuffled(!isShuffled);
  };

  const handleToggleRepeat = () => {
    const modes = ['none', 'all', 'one'];
    const currentIndex = modes.indexOf(repeatMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setRepeatMode(modes[nextIndex]);
  };

  const handleToggleLike = (track) => {
    setIsLiked(!isLiked);
    // TODO: Implement like/unlike API call
    console.log('Toggle like for track:', track);
  };

  const handleAddToPlaylist = (track) => {
    setSelectedSongs([track]);
    setShowPlaylistModal(true);
  };

  // Handle search
  const handleSearch = (query) => {
    setSearchQuery(query);
    if (query.trim()) {
      search(query);
      setShowSearchResults(true);
      
      // Add to recent searches
      if (!recentSearches.includes(query)) {
        setRecentSearches(prev => [query, ...prev].slice(0, 10));
      }
    } else {
      setShowSearchResults(false);
    }
  };

  const handleClearRecent = () => {
    setRecentSearches([]);
  };

  const handleRemoveRecent = (index) => {
    setRecentSearches(prev => prev.filter((_, i) => i !== index));
  };

  // Handle track selection
  const handleTrackSelect = async (track) => {
    await playTrack(track);
    setPlayerState('swinging');
    setTimeout(() => {
      setPlayerState('playing');
    }, 2000);
  };

  const handleArtistSelect = (artist) => {
    console.log('Artist selected:', artist);
    // TODO: Navigate to artist page or show artist details
  };

  const handleAlbumSelect = (album) => {
    console.log('Album selected:', album);
    // TODO: Navigate to album page or show album details
  };

  // Playlist handlers
  const handlePlaylistSave = (playlistData) => {
    if (playlistData.type === 'create') {
      handleCreatePlaylist(playlistData);
    } else if (playlistData.type === 'addToExisting') {
      handleAddToPlaylist(playlistData.playlistId, playlistData.songs);
    }
    setShowPlaylistModal(false);
  };

  const handlePlaylistSelect = (playlist) => {
    setCurrentPlaylist(playlist);
    setShowPlaylists(false);
  };

  const handlePlaylistBack = () => {
    setCurrentPlaylist(null);
    setShowPlaylists(true);
  };

  const handlePlaylistTrackPlay = (track) => {
    handleTrackSelect(track);
  };

  const handleRemoveFromPlaylist = (playlistId, songId) => {
    handleRemoveFromPlaylist(playlistId, songId);
  };

  // Auth handlers
  const handleAuthLogin = async (credentials) => {
    const result = await handleLogin(credentials);
    if (result.success) {
      setShowAuthModal(false);
    } else {
      alert('Login failed: ' + result.error);
    }
  };

  const handleAuthSignup = async (userData) => {
    const result = await handleSignup(userData);
    if (result.success) {
      setShowAuthModal(false);
    } else {
      alert('Signup failed: ' + result.error);
    }
  };

  useEffect(() => {
    let interval;
    if (isPlaying && playerState === 'playing') {
      interval = setInterval(() => {
        setProgress((prev) => (prev < duration ? prev + 1 : prev));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, playerState, duration, setProgress]);

  const isSpinning = playerState === 'playing';
  const isTonearmPlaying = playerState === 'swinging' || playerState === 'playing';
  const isTonearmPausing = playerState === 'paused' || playerState === 'stopped';

  // Transform API data for display
  const matchVibeWith = popularArtists.map(artist => ({
    id: artist._id,
    img: apiService.getImageUrl(artist.images, 'medium'),
    name: artist.name,
    data: artist
  }));

  const mostPlayedMusic = popularSongs.map(song => ({
    id: song._id,
    img: apiService.getImageUrl(song.album?.images, 'medium'),
    name: song.name,
    artist: song.artists?.[0]?.name || 'Unknown Artist',
    data: song
  }));

  const recommendedArtists = popularAlbums.map(album => ({
    id: album._id,
    img: apiService.getImageUrl(album.images, 'medium'),
    name: album.name,
    artist: album.artists?.[0]?.name || 'Unknown Artist',
    data: album
  }));

  return (
    <div
      className="relative flex h-screen w-screen bg-gray-900 text-white font-sans overflow-hidden"
      style={{
        backgroundImage: 'radial-gradient(circle at top right, #4a0e4c, #21212b 70%)',
      }}
    >
      {/* Sidebar */}
      <div className="w-20 bg-gray-950 flex flex-col items-center py-6 space-y-8 border-r border-gray-800">
        <div className="font-bold text-lg mb-8" style={{ color: '#00D1FF' }}>Sound Scape</div>
        <img src={heartIcon} alt="Liked" className="w-6 h-6 cursor-pointer text-white hover:text-red-500 transition-colors duration-200" />
        
        {/* Playlist Icons */}
        {playlists.slice(0, 3).map(playlist => (
          <div
            key={playlist.id}
            className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => handlePlaylistSelect(playlist)}
            title={playlist.name}
          >
            <span className="text-xs font-bold text-white">
              {playlist.name.charAt(0).toUpperCase()}
            </span>
          </div>
        ))}
        
        <div 
          className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-sm font-bold mt-4 cursor-pointer hover:bg-blue-600 transition-colors"
          onClick={() => setShowPlaylists(true)}
          title="View all playlists"
        >
          <span className="text-white">+</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar">
        <div className="flex items-center justify-between p-6 bg-transparent z-20">
          <div className="flex items-center space-x-2">
            <img src={homeIcon} alt="Home" className="w-6 h-6 cursor-pointer text-white" />
          </div>
          
          <EnhancedSearch
            onSearch={handleSearch}
            searchResults={searchResults}
            isLoading={searchLoading}
            onTrackSelect={handleTrackSelect}
            onArtistSelect={handleArtistSelect}
            onAlbumSelect={handleAlbumSelect}
            recentSearches={recentSearches}
            onClearRecent={handleClearRecent}
            onRemoveRecent={handleRemoveRecent}
          />
          
          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-300">{user?.username}</span>
                <img src={userAvatar} alt="User" className="w-8 h-8 rounded-full cursor-pointer" />
                <button
                  onClick={handleLogout}
                  className="text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Logout
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Sign In
              </button>
            )}
            <img src={ellipsisIcon} alt="Options" className="w-6 h-6 cursor-pointer text-white" />
          </div>
        </div>

        {/* Content Area */}
        {currentPlaylist ? (
          <PlaylistView
            playlist={currentPlaylist}
            onBack={handlePlaylistBack}
            onPlayTrack={handlePlaylistTrackPlay}
            onRemoveTrack={handleRemoveFromPlaylist}
            currentTrack={currentTrack}
            isPlaying={isPlaying}
          />
        ) : showPlaylists ? (
          <div className="flex-1 p-6">
            <PlaylistList
              playlists={playlists}
              onPlaylistSelect={handlePlaylistSelect}
              onDeletePlaylist={handleDeletePlaylist}
              onEditPlaylist={handleEditPlaylist}
              onCreatePlaylist={() => setShowPlaylistModal(true)}
            />
          </div>
        ) : (
          <div className="flex-1 relative p-6 grid grid-cols-1 md:grid-cols-2 gap-8 z-10">
            <div className="flex flex-col space-y-8">
              <Section 
                title="Match Your Vibe With" 
                items={matchVibeWith} 
                loading={artistsLoading}
                onItemClick={(item) => handleArtistSelect(item.data)}
              />
              <Section 
                title="Most Played Music" 
                items={mostPlayedMusic} 
                loading={songsLoading}
                onItemClick={(item) => handleTrackSelect(item.data)}
              />
              <Section 
                title="Recommended Albums" 
                items={recommendedArtists} 
                loading={albumsLoading}
                onItemClick={(item) => handleAlbumSelect(item.data)}
              />
            </div>

            <div className="relative flex items-center justify-center">
              <img
                src={vinylSvg}
                alt="Vinyl record"
                className={`w-[550px] h-[550px] ${isSpinning ? 'spinning' : ''}`}
                style={{ animationPlayState: isSpinning ? 'running' : 'paused' }}
              />

              <div
                className={`absolute w-[600px] h-[600px] ${isTonearmPlaying ? 'is-playing' : ''} ${isTonearmPausing ? 'is-paused' : ''} ${playerState !== 'swinging' ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                style={{ top: '0', left: '0' }}
                role="button"
                aria-label="Tonearm play/pause toggle"
                title="Toggle play/pause"
                onClick={() => {
                  if (playerState !== 'swinging') {
                    handlePlayPause();
                  }
                }}
              >
                <Tonearm />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Enhanced Music Player */}
      <EnhancedMusicPlayer
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        progress={progress}
        duration={duration}
        volume={volume}
        onPlayPause={handlePlayPause}
        onNext={handleNext}
        onPrevious={handlePrevious}
        onSeek={handleSeek}
        onVolumeChange={handleVolumeChange}
        onToggleMute={handleToggleMute}
        onAddToPlaylist={handleAddToPlaylist}
        onToggleLike={handleToggleLike}
        isLiked={isLiked}
        isShuffled={isShuffled}
        repeatMode={repeatMode}
        onToggleShuffle={handleToggleShuffle}
        onToggleRepeat={handleToggleRepeat}
      />

      {/* Modals */}
      <PlaylistModal
        isOpen={showPlaylistModal}
        onClose={() => setShowPlaylistModal(false)}
        onSave={handlePlaylistSave}
        playlists={playlists}
        selectedSongs={selectedSongs}
      />

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onLogin={handleAuthLogin}
        onSignup={handleAuthSignup}
        isLoading={authLoading}
      />
    </div>
  );
};

const Section = ({ title, items, loading, onItemClick }) => (
  <div className="text-left">
    <h2 className="text-xl font-bold mb-4">{title}</h2>
    {loading ? (
      <div className="grid grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex flex-col items-center">
            <div className="w-24 h-24 rounded-lg bg-gray-700 animate-pulse" />
            <div className="mt-2 h-4 w-16 bg-gray-700 rounded animate-pulse" />
          </div>
        ))}
      </div>
    ) : (
      <div className="grid grid-cols-5 gap-4">
        {items.map(item => (
          <div 
            key={item.id} 
            className="flex flex-col items-center cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => onItemClick && onItemClick(item)}
          >
            <img 
              src={item.img} 
              alt={item.name} 
              className="w-24 h-24 rounded-lg object-cover" 
            />
            <p className="mt-2 text-sm text-center">{item.name}</p>
            {item.artist && (
              <p className="text-xs text-gray-400 text-center">{item.artist}</p>
            )}
          </div>
        ))}
      </div>
    )}
  </div>
);

export default MusicStationApp;
