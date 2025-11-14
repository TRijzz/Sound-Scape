import React from 'react';
import ReactDOM from 'react-dom';
import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import vinylSvg from '../../assets/vinyl.svg';
import { ReactComponent as Tonearm } from '../../assets/tonearm.svg';
import { useMusic } from '../../contexts/MusicContext';
import { 
  PlayIcon, 
  PauseIcon, 
  SkipNextIcon, 
  SkipPrevIcon, 
  RepeatIcon,
  ShuffleIcon,
  MoreIcon,
  SpeakerIcon,
  MuteIcon
} from '../ui/Icons';

function VinylOverlay({ isOpen, onClose }) {
  const { isPlaying } = useMusic();

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev || '';
    };
  }, [isOpen]);

  if (!isOpen) {
    return (
      <AnimatePresence>{false}</AnimatePresence>
    );
  }

  const overlay = (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Full-screen overlay */}
          <motion.div
            className="fixed inset-0 flex items-center justify-center backdrop-blur-sm"
            style={{ zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.85)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Close Button */}
            <motion.button
              onClick={(e) => { e.stopPropagation(); onClose(); }}
              className="fixed top-6 right-6 z-[101] w-10 h-10 rounded-full flex items-center justify-center border border-neon-blue text-neon-blue bg-black/40 backdrop-blur-sm hover:bg-black/60 hover:shadow-[0_0_20px_#00FFFF] transition"
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.94 }}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.25, delay: 0.15 }}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </motion.button>

            {/* Vinyl Animation Container */}
            <div className="w-full h-full flex items-center justify-center">
              <motion.div
                className="relative"
                style={{ y: -38 }}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Vinyl Disc */}
                <motion.img
                  src={vinylSvg}
                  alt="Vinyl record"
                  className="w-[560px] h-[560px] flex-shrink-0 vinyl-spinning"
                  style={{
                    filter: 'drop-shadow(0 0 12px rgba(0, 255, 255, 0.45)) drop-shadow(0 0 30px rgba(0, 255, 255, 0.25))',
                    animationPlayState: isPlaying ? 'running' : 'paused',
                  }}
                />

                {/* Tone Arm */}
                <TonearmAnimator />
                
                {/* Previously inline tonearm removed in favor of animated component */}
              </motion.div>
            </div>

            {/* Overlay Play Bar */}
            <OverlayPlayBar onOuterClick={(e) => e.stopPropagation()} />
          </motion.div>

          {/* Keyframes for vinyl spin */}
          <style>{`
            @keyframes vinyl-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            .vinyl-spinning { animation: vinyl-spin 8s linear infinite; }
          `}</style>
        </>
      )}
    </AnimatePresence>
  );

  return ReactDOM.createPortal(overlay, document.body);
};

// Animated tonearm tied to playback state
function TonearmAnimator() {
  const { isPlaying } = useMusic();
  const spring = { type: 'spring', stiffness: 60, damping: 20, duration: 2.5 };
  // Playing pose is the current tuned position
  const playingPose = { top: 72, left: -190, rotate: 10 };
  // Paused pose: park the arm further left and lifted to avoid touching vinyl
  const pausedPose = { top: 20, left: -280, rotate: -25 };

  return (
    <motion.div
      className="absolute w-[628.533px] h-[353.55px] flex-shrink-0 pointer-events-none"
      style={{ transformOrigin: '104.8px 235.7px' }}
      initial={{ opacity: 0, ...pausedPose }}
      animate={{ opacity: 1, ...(isPlaying ? playingPose : pausedPose) }}
      exit={{ opacity: 0 }}
      transition={spring}
    >
      <Tonearm />
    </motion.div>
  );
}

// Inline component: simple play bar for overlay
function OverlayPlayBar({ onOuterClick }) {
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
      const s = Math.max(0, Math.floor(seconds || 0));
      const mins = Math.floor(s / 60);
      const secs = s % 60;
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
      onClick={onOuterClick}
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[101] w-[min(96vw,1100px)] px-6 py-3 rounded-xl bg-dark-gray/95 backdrop-blur-md border border-gray-800"
    >
      <div className="flex items-center justify-between">
        {/* Track info (image, name, artists) */}
        <div className="w-1/4 flex items-center space-x-3 overflow-hidden">
          {currentTrack && (
            <>
              <img
                src={currentTrack.album?.images?.[0]?.url || '/src/assets/album_art_placeholder.svg'}
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

export default VinylOverlay;
