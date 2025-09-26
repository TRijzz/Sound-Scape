import React, { useState, useEffect } from 'react';

import vinylSvg from './assets/vinyl.svg';
import { ReactComponent as Tonearm } from './assets/tonearm.svg';
import albumArtPlaceholder from './assets/album_art_placeholder.svg';
import homeIcon from './assets/home_icon.svg';
import searchIcon from './assets/search_icon.svg';
import heartIcon from './assets/heart_icon.svg';
import ellipsisIcon from './assets/ellipsis_icon.svg';
import userAvatar from './assets/user_avatar.svg';

export default function App() {
  const [playerState, setPlayerState] = useState('stopped');
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(240); // Total duration in seconds (e.g., 4 minutes)
  const [volume, setVolume] = useState(60);
  const progressPercent = duration > 0 ? Math.min(100, Math.max(0, (progress / duration) * 100)) : 0;

  const handlePlayPause = () => {
    if (!isPlaying) {
      setPlayerState('swinging');
      setTimeout(() => {
        setPlayerState('playing');
        setIsPlaying(true);
      }, 2000);
    } else {
      setPlayerState('paused');
      setIsPlaying(false);
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
  }, [isPlaying, playerState, duration]);

  const isSpinning = playerState === 'playing';
  const isTonearmPlaying = playerState === 'swinging' || playerState === 'playing';
  const isTonearmPausing = playerState === 'paused' || playerState === 'stopped';

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const matchVibeWith = [
    { id: 1, img: albumArtPlaceholder, name: 'Artist 1' },
    { id: 2, img: albumArtPlaceholder, name: 'Artist 2' },
    { id: 3, img: albumArtPlaceholder, name: 'Artist 3' },
    { id: 4, img: albumArtPlaceholder, name: 'Artist 4' },
    { id: 5, img: albumArtPlaceholder, name: 'Artist 5' },
  ];

  const mostPlayedMusic = [
    { id: 1, img: albumArtPlaceholder, name: 'Song 1' },
    { id: 2, img: albumArtPlaceholder, name: 'Song 2' },
    { id: 3, img: albumArtPlaceholder, name: 'Song 3' },
    { id: 4, img: albumArtPlaceholder, name: 'Song 4' },
    { id: 5, img: albumArtPlaceholder, name: 'Song 5' },
  ];

  const recommendedArtists = [
    { id: 1, img: albumArtPlaceholder, name: 'Rec Artist 1' },
    { id: 2, img: albumArtPlaceholder, name: 'Rec Artist 2' },
    { id: 3, img: albumArtPlaceholder, name: 'Rec Artist 3' },
    { id: 4, img: albumArtPlaceholder, name: 'Rec Artist 4' },
    { id: 5, img: albumArtPlaceholder, name: 'Rec Artist 5' },
  ];

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
        <img src={albumArtPlaceholder} alt="Playlist 1" className="w-8 h-8 rounded-full opacity-70 cursor-pointer" />
        <img src={albumArtPlaceholder} alt="Playlist 2" className="w-8 h-8 rounded-full opacity-70 cursor-pointer" />
        <img src={albumArtPlaceholder} alt="Playlist 3" className="w-8 h-8 rounded-full opacity-70 cursor-pointer" />
        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-sm font-bold mt-4 cursor-pointer">
          <img src={albumArtPlaceholder} alt="Playlists" className="w-5 h-5 text-white" />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar">
        <div className="flex items-center justify-between p-6 bg-transparent z-20">
          <div className="flex items-center space-x-2">
            <img src={homeIcon} alt="Home" className="w-6 h-6 cursor-pointer text-white" />
          </div>
          <div className="relative flex-1 mx-8 max-w-2xl">
            <input
              type="text"
              placeholder="What's playing in your head?"
              className="w-full py-2 pl-10 pr-4 rounded-full bg-gray-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <img src={searchIcon} alt="Search" className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          </div>
          <div className="flex items-center space-x-4">
            <img src={userAvatar} alt="User" className="w-8 h-8 rounded-full cursor-pointer" />
            <img src={ellipsisIcon} alt="Options" className="w-6 h-6 cursor-pointer text-white" />
          </div>
        </div>

        <div className="flex-1 relative p-6 grid grid-cols-1 md:grid-cols-2 gap-8 z-10">
          <div className="flex flex-col space-y-8">
            <Section title="Match Your Vibe With" items={matchVibeWith} />
            <Section title="Most Played Music" items={mostPlayedMusic} />
            <Section title="Recommended Artists" items={recommendedArtists} />
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
      </div>

      {/* Bottom Player - Restructured to match the requested layout */}
      <div className="fixed bottom-0 left-0 right-0 bg-black border-t border-gray-700 z-30">
        <div className="px-4 py-2">
          {/* Two-row layout with album+info on left, controls on right */}
          <div className="flex flex-col">
            {/* First row: Album Art + Song Info | Controls Row */}
            <div className="flex items-center justify-between mb-0">
              {/* Album Art + Info (Left) */}
              <div className="flex items-center space-x-3 w-1/4">
                <img src={albumArtPlaceholder} alt="Current Album Art" className="w-12 h-12 rounded" />
                <div className="text-left">
                  <p className="font-medium text-sm">Perfect</p>
                  <p className="text-xs text-gray-400">Ed Sheeran</p>
                </div>
              </div>
              
              {/* Controls (Right) */}
              <div className="flex items-center justify-center space-x-6 w-1/2">
                <svg
                  className="w-6 h-6 cursor-pointer text-gray-400 hover:text-white transition-colors duration-200"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  onClick={() => alert('Previous clicked')}
                >
                  <polygon points="18,4 18,20 14,12" />
                  <polygon points="10,4 10,20 6,12" />
                </svg>
                <button
                  onClick={handlePlayPause}
                  className="flex items-center justify-center w-12 h-12 rounded-full bg-gray-300 hover:bg-white text-black transition-colors duration-200 disabled:opacity-50"
                  disabled={playerState === 'swinging'}
                >
                  <svg
                    className="w-6 h-6 transition-all duration-300"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    stroke="none"
                  >
                    {isPlaying ? (
                      <g>
                        <rect x="7" y="6" width="3" height="12" />
                        <rect x="14" y="6" width="3" height="12" />
                      </g>
                    ) : (
                      <polygon points="8,6 18,12 8,18" />
                    )}
                  </svg>
                </button>
                <svg
                  className="w-6 h-6 cursor-pointer text-gray-400 hover:text-white transition-colors duration-200"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  onClick={() => alert('Next clicked')}
                >
                  <polygon points="6,4 6,20 10,12" />
                  <polygon points="14,4 14,20 18,12" />
                </svg>
                <svg
                  className="w-6 h-6 cursor-pointer text-gray-400 hover:text-white transition-colors duration-200"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  onClick={() => alert('Repeat clicked')}
                >
                  <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" />
                </svg>
                {/* Lyrics icon moved next to volume on the right */}
              </div>
              
              {/* Right column left intentionally empty now that volume moved next to playbar */}
              <div className="w-1/4" />
            </div>
            
            {/* Second row: Progress Bar + Timers */}
            <div className="relative w-full mt-1 h-8">
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[850px] h-5 flex items-center">
                <div className="flex items-center w-full">
                  <span className="text-xs text-gray-400 mr-3">{formatTime(progress)}</span>
                  <input
                    type="range"
                    min="0"
                    max={duration}
                    value={progress}
                    onChange={(e) => setProgress(parseInt(e.target.value))}
                    className="flex-1 h-[2px] rounded-full appearance-none"
                    style={{
                      background: `linear-gradient(to right, #ffffff 0%, #ffffff ${progressPercent}%, #4a4a4a ${progressPercent}%, #4a4a4a 100%)`,
                    }}
                  />
                  <span className="text-xs text-gray-400 ml-3">{formatTime(duration)}</span>
                </div>
              </div>
              <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center h-5 space-x-5">
                {/* Lyrics */}
                <svg
                  className="w-6 h-6 cursor-pointer text-gray-400 hover:text-white transition-colors duration-200"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  onClick={() => alert('Lyrics clicked')}
                >
                  <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                </svg>
                <svg
                  className="w-6 h-6 cursor-pointer text-gray-400 hover:text-white transition-colors duration-200"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  onClick={() => alert('Volume clicked')}
                >
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
                </svg>
                <input
                  aria-label="Volume"
                  type="range"
                  min="0"
                  max="100"
                  value={volume}
                  onChange={(e) => setVolume(parseInt(e.target.value))}
                  className="w-28 h-[2px] my-0 rounded-full appearance-none"
                  style={{
                    background: `linear-gradient(to right, #ffffff 0%, #ffffff ${volume}%, #4a4a4a ${volume}%, #4a4a4a 100%)`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const Section = ({ title, items }) => (
  <div className="text-left">
    <h2 className="text-xl font-bold mb-4">{title}</h2>
    <div className="grid grid-cols-5 gap-4">
      {items.map(item => (
        <div key={item.id} className="flex flex-col items-center">
          <img src={item.img} alt={item.name} className="w-24 h-24 rounded-lg object-cover cursor-pointer" />
          <p className="mt-2 text-sm">{item.name}</p>
        </div>
      ))}
    </div>
  </div>
);
