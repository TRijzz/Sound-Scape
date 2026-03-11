import React, { useEffect, useState, useRef } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useMusic } from '../../contexts/MusicContext';
import apiService from '../../services/api';
import albumArtPlaceholder from '../../assets/album_art_placeholder.svg';
import { 
  PlayIcon, 
  PauseIcon, 
  SkipNextIcon, 
  SkipPrevIcon, 
  RepeatIcon,
  ShuffleIcon,
  MoreIcon,
  SpeakerIcon,
  MuteIcon,
  MicIcon,
  SyncIcon
} from '../ui/Icons';

const parseLRC = (lrcString) => {
  if (!lrcString) return [];
  const lines = lrcString.split('\n');
  const regex = /\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/;
  return lines.map(line => {
    const match = line.match(regex);
    if (match) {
      const min = parseInt(match[1], 10);
      const sec = parseInt(match[2], 10);
      const msStr = match[3];
      const msVal = msStr.length === 2 ? parseInt(msStr, 10) * 10 : parseInt(msStr, 10);
      
      return {
        time: min * 60 + sec + msVal / 1000,
        text: match[4].trim()
      };
    }
    return { time: null, text: line.trim() };
  }).filter(l => l.text);
};

const LyricsOverlay = ({ isOpen, onClose }) => {
  const { currentTrack, progress, setProgress, duration, isAuthenticated, showAuthPrompt, setShowAuthPrompt } = useMusic();
  const [lyrics, setLyrics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [syncMode, setSyncMode] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const [userIsScrolling, setUserIsScrolling] = useState(false);
  const scrollContainerRef = useRef(null);
  const activeLineRef = useRef(null);
  const scrollTimeoutRef = useRef(null);
  const isProgrammaticScrollRef = useRef(false);
  const programmaticScrollTimeoutRef = useRef(null);

  const handleScroll = () => {
    // If we're performing an auto-scroll, don't let it trigger "manual" mode
    if (isProgrammaticScrollRef.current) return;

    // Detect manual scrolling
    if (syncMode) {
      setUserIsScrolling(true);
      
      // If user stops scrolling for a while, we'll keep it detached
      // to match Spotify's behavior until they click the "Sync" button
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    }
  };

  const scrollToActiveLine = (behavior = 'smooth') => {
    const container = scrollContainerRef.current;
    const activeLine = activeLineRef.current;
    
    if (container && activeLine) {
      // Mark this as a programmatic scroll
      isProgrammaticScrollRef.current = true;
      
      // Clear any existing timeout for resetting the flag
      if (programmaticScrollTimeoutRef.current) {
        clearTimeout(programmaticScrollTimeoutRef.current);
      }

      const containerHeight = container.clientHeight;
      const lineTop = activeLine.offsetTop;
      const lineHeight = activeLine.clientHeight;
      
      const targetScrollTop = lineTop - (containerHeight / 2) + (lineHeight / 2);

      container.scrollTo({
        top: targetScrollTop,
        behavior: behavior
      });

      // Reset the programmatic scroll flag after the animation completes
      const delay = behavior === 'smooth' ? 600 : 50;
      programmaticScrollTimeoutRef.current = setTimeout(() => {
        isProgrammaticScrollRef.current = false;
      }, delay);
    }
  };

  const handleLineClick = (time) => {
    if (time !== null && time !== undefined) {
      setProgress(time);
      setUserIsScrolling(false);
      // Immediately scroll to the line we just clicked
      setTimeout(() => scrollToActiveLine('smooth'), 50);
    }
  };

  const handleSyncToActiveLine = () => {
    setUserIsScrolling(false);
    setSyncMode(true);
    // Use a small delay to ensure the active index is updated if needed
    setTimeout(() => scrollToActiveLine('smooth'), 50);
  };

  const handleSyncLyrics = async () => {
    if (!currentTrack || lyrics.length === 0) return;

    if (!isAuthenticated) {
      setShowAuthPrompt(true);
      setSyncMessage('Error: Please log in to sync lyrics.');
      setTimeout(() => setSyncMessage(''), 5000);
      return;
    }
    
    setIsSyncing(true);
    setSyncMessage('Automatically aligning lyrics...');
    
    try {
      const songId = currentTrack._id || currentTrack.id;
      const trackDuration = duration || (currentTrack.duration_ms ? currentTrack.duration_ms / 1000 : 180);
      const timePerLine = trackDuration / lyrics.length;
      
      const estimatedLines = lyrics.map((line, idx) => ({
        time: Math.round(idx * timePerLine * 1000), // convert to ms for backend
        text: line.text
      }));

      await apiService.updateLyrics(songId, estimatedLines, true);
      
      // Update local state to reflect new timings
      const newLyrics = estimatedLines.map(l => ({ time: l.time / 1000, text: l.text }));
      setLyrics(newLyrics);
      setSyncMode(true);
      setUserIsScrolling(false);
      setSyncMessage('Lyrics synchronized automatically!');
      setTimeout(() => setSyncMessage(''), 3000);
    } catch (err) {
      console.error('Failed to auto-sync lyrics:', err);
      setSyncMessage(`Error: ${err.message}`);
      setTimeout(() => setSyncMessage(''), 5000);
    } finally {
      setIsSyncing(false);
    }
  };

  const toggleSyncMode = () => {
    const nextMode = !syncMode;
    setSyncMode(nextMode);
    if (nextMode) setUserIsScrolling(false);
  };

  // Fetch lyrics
  useEffect(() => {                 // overlay opens
    if (isOpen && currentTrack) {
      setLoading(true);
      setError(null);
      const id = currentTrack._id || currentTrack.id;
      
      console.log('Fetching lyrics for ID:', id, 'Name:', currentTrack.name);

      apiService.getLyrics(id)   // API is called
        .then(data => {
          console.log('Lyrics fetched:', data);
          let parsed = [];
          
          if (data.lines && Array.isArray(data.lines)) {
            // Backend provides pre-parsed lines
            // Backend time is in ms. Frontend uses seconds for progress comparison.
            parsed = data.lines.map(l => ({
              time: l.time / 1000, 
              text: l.text
            }));
          } else if (data.lyrics) {
             // Fallback to client-side parsing if raw string provided
            parsed = parseLRC(data.lyrics || '');
          }

          console.log('Parsed lyrics:', parsed);
          
          // Auto-sync estimation if no timestamps provided
          if (parsed.length > 0 && parsed.every(l => l.time === null || l.time === 0)) {
            const trackDuration = duration || (currentTrack.duration_ms ? currentTrack.duration_ms / 1000 : 180);
            const timePerLine = trackDuration / parsed.length;
            parsed = parsed.map((line, idx) => ({
              ...line,
              time: idx * timePerLine
            }));
          }

          setLyrics(parsed);
          setSyncMode(true);
        })
        .catch(err => {
          console.error('Lyrics fetch error:', err);
          // Don't show error immediately, maybe track just has no lyrics
          if (err.status === 404) {
             setLyrics([]);
          } else {
             setError('Could not load lyrics');
          }
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, currentTrack, duration]);

  // Sync logic
  useEffect(() => {
    if (!syncMode || lyrics.length === 0 || !isOpen) return;

    const currentTime = progress > 10000 ? progress / 1000 : progress;

    // Find the current active line
    let foundIndex = -1;
    for (let i = 0; i < lyrics.length; i++) {
      if (currentTime >= lyrics[i].time) {
        foundIndex = i;
      } else {
        break;
      }
    }

    // Default to first line
    if (foundIndex === -1) foundIndex = 0;

    if (foundIndex !== activeIndex) {
      setActiveIndex(foundIndex);
    }
  }, [progress, syncMode, lyrics, isOpen]); // Removed activeIndex from deps to avoid extra loops

  // Auto-scroll effect
  useEffect(() => {
    if (syncMode && activeIndex !== -1 && isOpen && !userIsScrolling) {
      // Small delay to ensure refs are correctly positioned after layout updates
      const timeoutId = setTimeout(() => {
        scrollToActiveLine('smooth');
      }, 50);
      return () => clearTimeout(timeoutId);
    }
  }, [activeIndex, syncMode, isOpen, userIsScrolling]);

  if (!isOpen && !lyrics.length) {
    // console.log('LyricsOverlay: Not open and no lyrics');
    return null;
  }

  // console.log('LyricsOverlay: Rendering. isOpen:', isOpen, 'Lyrics count:', lyrics.length);

  return ReactDOM.createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed inset-0 z-[10000] bg-gray-900/95 backdrop-blur-xl flex flex-col"
        >
          {/* Lyrics Header Actions */}
          <div className="absolute top-6 right-6 z-50 flex items-center space-x-4">
            {syncMessage && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${syncMessage.includes('Error') ? 'bg-red-500/20 text-red-400' : 'bg-neon-blue/20 text-neon-blue'}`}
              >
                {syncMessage}
              </motion.div>
            )}
            
            {/* Spotify-style Sync Button */}
            {userIsScrolling && (
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={handleSyncToActiveLine}
                className="bg-neon-blue text-dark-bg px-4 py-2 rounded-full font-bold flex items-center space-x-2 shadow-lg shadow-neon-blue/20 hover:scale-105 transition-transform"
              >
                <SyncIcon className="w-5 h-5" />
                <span>Sync to active line</span>
              </motion.button>
            )}
            
            <button
              onClick={handleSyncLyrics}
              disabled={isSyncing || lyrics.length === 0}
              className={`p-3 rounded-full bg-white/10 hover:bg-white/20 transition-all flex items-center space-x-2 group ${isSyncing ? 'animate-pulse' : ''}`}
              title="Automatically align lyrics to song duration"
            >
              <SyncIcon className={`w-6 h-6 ${isSyncing ? 'animate-spin text-neon-blue' : 'text-white'}`} />
              <span className="text-white text-sm font-medium whitespace-nowrap px-2">
                {isSyncing ? "Syncing..." : "Auto-Align"}
              </span>
            </button>

            <button
              onClick={toggleSyncMode}
              className={`p-3 rounded-full transition-all flex items-center space-x-2 ${syncMode ? 'text-neon-blue' : 'text-gray-500'}`}
              title={syncMode ? "Turn off auto-scroll" : "Turn on auto-scroll"}
            >
              <span className="text-xs font-bold uppercase tracking-widest">
                Auto-Scroll: {syncMode ? 'ON' : 'OFF'}
              </span>
            </button>
          </div>

          <div 
            className="flex-1 overflow-y-auto p-8 pt-24 space-y-8 text-left scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent relative mb-24"
            ref={scrollContainerRef}
            onScroll={handleScroll}
          >
            {loading && (
              <div className="h-full flex items-center justify-center">
                 <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00FFFF]"></div>
              </div>
            )}
            
            {error && (
              <div className="h-full flex items-center justify-center text-red-400">
                {error}
              </div>
            )}

            {!loading && !error && lyrics.length === 0 && (
              <div className="h-full flex items-center justify-center text-gray-500">
                No lyrics available for this track.
              </div>
            )}

            {!loading && !error && lyrics.map((line, i) => {
              const isActive = i === activeIndex;
              const isPast = i < activeIndex;
              const isFuture = i > activeIndex;

              return (
                <motion.p
                  key={i}
                  ref={isActive ? activeLineRef : null}
                  onClick={() => handleLineClick(line.time)}
                  initial={false}
                  animate={{
                    scale: isActive ? 1.05 : 1,
                    opacity: isActive ? 1 : (isPast ? 0.3 : 0.45),
                    color: isActive ? '#00FFFF' : '#FFFFFF',
                    filter: isActive ? 'blur(0px)' : (isPast ? 'blur(0.5px)' : 'blur(0.5px)'),
                    textShadow: isActive ? '0 0 20px rgba(0, 255, 255, 0.5)' : 'none'
                  }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                  className={`text-2xl md:text-4xl font-bold cursor-pointer transition-all duration-300 py-4 px-2 hover:opacity-90 line-item select-none`}
                >
                  {line.text}
                </motion.p>
              );
            })}
          </div>
          
          {/* Overlay Play Bar */}
          <LyricsPlayBar onClose={onClose} />
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

// Play bar specifically for Lyrics Overlay
function LyricsPlayBar({ onClose }) {
  const {
    currentTrack,
    isPlaying,
    progress,
    duration,
    volume,
    previousTrack,
    nextTrack,
    pauseTrack,
    resumeTrack,
    setProgress,
    setVolume,
  } = useMusic();

  // Add a local time formatter
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const lastVolumeRef = React.useRef(60);
  const isMuted = volume === 0;

  const onPlayPause = (e) => {
    e.stopPropagation();
    isPlaying ? pauseTrack() : resumeTrack();
  };

  const onSeek = (e) => {
    e.stopPropagation();
    const val = parseInt(e.target.value, 10) || 0;
    setProgress(val);
  };

  const onPrev = (e) => { e.stopPropagation(); previousTrack(); };
  const onNext = (e) => { e.stopPropagation(); nextTrack(); };
  const onVolume = (e) => {
    e.stopPropagation();
    const v = parseInt(e.target.value, 10) || 0;
    setVolume(v);
    if (v > 0) lastVolumeRef.current = v;
  };
  const onToggleMute = (e) => {
    e.stopPropagation();
    if (volume > 0) {
      lastVolumeRef.current = volume;
      setVolume(0);
    } else {
      setVolume(Math.max(1, lastVolumeRef.current || 60));
    }
  };

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[101] w-[min(96vw,1100px)] px-6 py-3 rounded-xl bg-dark-gray/95 backdrop-blur-md border border-gray-800"
    >
      <div className="flex items-center justify-between">
        {/* Track info (image, name, artists) */}
        <div className="w-1/4 flex items-center space-x-3 overflow-hidden">
          {currentTrack && (
            <>
              <img
                src={currentTrack.album?.images?.[0]?.url || albumArtPlaceholder}
                alt={currentTrack.name || 'Current track'}
                className="w-10 h-10 rounded object-cover flex-shrink-0"
              />
              <div className="min-w-0">
                <p className="text-sm text-white truncate">
                  {currentTrack.name || 'Unknown Track'}
                </p>
                <p className="text-xs text-gray-400 truncate">
                  {currentTrack.artists?.map(a => a.name).join(', ') || 'Unknown Artist'}
                </p>
              </div>
            </>
          )}
        </div>

        {/* Center controls + progress */}
        <div className="flex flex-col items-center space-y-2 w-1/2">
          <div className="flex items-center space-x-4">
            <button className="text-gray-400 hover:text-white transition-colors" onClick={(e)=>e.stopPropagation()}>
              <ShuffleIcon className="w-4 h-4" />
            </button>
            <button onClick={onPrev} className="text-gray-400 hover:text-white transition-colors">
              <SkipPrevIcon className="w-5 h-5" />
            </button>
            <button onClick={onPlayPause} className="w-10 h-10 bg-white text-dark-bg rounded-full flex items-center justify-center hover:scale-105 transition-transform">
              {isPlaying ? <PauseIcon className="w-5 h-5" /> : <PlayIcon className="w-5 h-5 ml-0.5" />}
            </button>
            <button onClick={onNext} className="text-gray-400 hover:text-white transition-colors">
              <SkipNextIcon className="w-5 h-5" />
            </button>
            <button className="text-gray-400 hover:text-white transition-colors" onClick={(e)=>e.stopPropagation()}>
              <RepeatIcon className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center space-x-3 w-full max-w-md">
            <span className="text-xs text-gray-400 w-8">{formatTime(progress)}</span>
            <input
              type="range"
              min="0"
              max={Math.max(0, duration || 0)}
              value={Math.min(progress || 0, duration || 0)}
              onChange={onSeek}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
            />
            <span className="text-xs text-gray-400 w-8">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Right: volume */}
        <div className="flex items-center space-x-3 w-1/4 justify-end">
          <button 
            onClick={(e) => { e.stopPropagation(); onClose && onClose(); }}
            className="text-[#00FFFF] drop-shadow-[0_0_8px_rgba(0,255,255,0.5)] transition-colors"
            title="Hide Lyrics"
          >
            <MicIcon className="w-4 h-4" />
          </button>
          <button className="text-gray-400 hover:text-white transition-colors" onClick={(e)=>e.stopPropagation()}>
            <MoreIcon className="w-4 h-4" />
          </button>
          <button
            className="transition-colors"
            onClick={onToggleMute}
            title={isMuted ? 'Unmute' : 'Mute'}
            aria-label={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? (
              <MuteIcon className="w-4 h-4 text-red-400 hover:text-white" />
            ) : (
              <SpeakerIcon className="w-4 h-4 text-gray-400 hover:text-white" />
            )}
          </button>
          <input
            type="range"
            min="0"
            max="100"
            value={volume}
            onChange={onVolume}
            onClick={(e) => e.stopPropagation()}
            className="w-20 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
          />
        </div>
      </div>

      <style jsx>{`
        .slider::-webkit-slider-thumb { appearance: none; width: 12px; height: 12px; border-radius: 50%; background: #00FFFF; cursor: pointer; border: 2px solid #0A0A0A; }
        .slider::-moz-range-thumb { width: 12px; height: 12px; border-radius: 50%; background: #00FFFF; cursor: pointer; border: 2px solid #0A0A0A; }
      `}</style>
    </div>
  );
}

export default LyricsOverlay;
