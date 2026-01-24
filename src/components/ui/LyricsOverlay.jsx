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
  MicIcon
} from '../ui/Icons';

const parseLRC = (lrcString) => {
  if (!lrcString) return [];
  const lines = lrcString.split('\n');
  const regex = /^\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/;
  return lines.map(line => {
    const match = line.match(regex);
    if (match) {
      const min = parseInt(match[1]);
      const sec = parseInt(match[2]);
      // Handle 2 or 3 digit milliseconds
      const msStr = match[3];
      const ms = parseInt(msStr.length === 3 ? msStr : msStr + (msStr.length === 2 ? '0' : '00')); 
      // safely: if len is 2, multiply by 10.
      const msVal = msStr.length === 2 ? parseInt(msStr) * 10 : parseInt(msStr);
      
      // Return time in seconds for frontend usage
      return {
        time: min * 60 + sec + msVal / 1000,
        text: match[4].trim()
      };
    }
    return { time: null, text: line.trim() };
  }).filter(l => l.text);
};

const LyricsOverlay = ({ isOpen, onClose }) => {
  const { currentTrack, progress, setProgress } = useMusic();
  const [lyrics, setLyrics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [syncMode, setSyncMode] = useState(true);
  const [activeIndex, setActiveIndex] = useState(-1);
  const scrollContainerRef = useRef(null);
  const activeLineRef = useRef(null);

  const handleLineClick = (time) => {
    if (time !== null && time !== undefined) {
      setProgress(time);
    }
  };

  // Fetch lyrics
  useEffect(() => {
    if (isOpen && currentTrack) {
      setLoading(true);
      setError(null);
      const id = currentTrack._id || currentTrack.id;
      
      console.log('Fetching lyrics for ID:', id, 'Name:', currentTrack.name);

      apiService.getLyrics(id)
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
          setLyrics(parsed);
          
          // Auto-disable sync if no timestamps found
          if (parsed.length > 0 && parsed.every(l => l.time === null)) {
            setSyncMode(false);
          } else {
            setSyncMode(true);
          }
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
  }, [isOpen, currentTrack]);

  // Sync logic
  useEffect(() => {
    if (!syncMode || !lyrics.length || !isOpen) return;

    // progress from useAudioPlayer is usually in seconds (e.g. 1.25)
    // If progress is somehow in ms, we detect it.
    const currentTime = progress > 10000 ? progress / 1000 : progress;

    const index = lyrics.findIndex((line, i) => {
      const nextLine = lyrics[i + 1];
      // Current line is active if currentTime >= line.time AND currentTime < nextLine.time
      if (!nextLine) return currentTime >= line.time;
      return currentTime >= line.time && currentTime < nextLine.time;
    });

    if (index !== -1 && index !== activeIndex) {
      setActiveIndex(index);
    }
  }, [progress, syncMode, lyrics, isOpen, activeIndex]);

  // Auto-scroll effect - DISABLED per user request
  // useEffect(() => {
  //   if (syncMode && activeIndex !== -1 && activeLineRef.current && scrollContainerRef.current) {
  //     const container = scrollContainerRef.current;
  //     const activeLine = activeLineRef.current;
  //     
  //     // Calculate center position
  //     const containerHeight = container.clientHeight;
  //     const activeLineHeight = activeLine.clientHeight;
  //     const activeLineTop = activeLine.offsetTop;
  //     
  //     const targetScrollTop = activeLineTop - (containerHeight / 2) + (activeLineHeight / 2);

  //     container.scrollTo({
  //       top: targetScrollTop,
  //       behavior: 'smooth'
  //     });
  //   }
  // }, [activeIndex, syncMode]);

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
          {/* Lyrics Body */}
          <div 
            className="flex-1 overflow-y-auto p-8 pt-16 space-y-8 text-center scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent relative mb-24"
            ref={scrollContainerRef}
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

            {!loading && !error && lyrics.map((line, i) => (
              <motion.p
                key={i}
                ref={i === activeIndex ? activeLineRef : null}
                onClick={() => handleLineClick(line.time)}
                initial={false}
                animate={{
                  scale: i === activeIndex ? 1.05 : 1,
                  opacity: i === activeIndex ? 1 : 0.4,
                  color: i === activeIndex ? '#00FFFF' : '#9CA3AF',
                  textShadow: i === activeIndex ? '0 0 15px rgba(0, 255, 255, 0.4)' : 'none'
                }}
                transition={{ duration: 0.3 }}
                className={`text-2xl md:text-3xl font-bold cursor-pointer transition-colors duration-300 py-2 hover:opacity-80`}
              >
                {line.text}
              </motion.p>
            ))}
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
