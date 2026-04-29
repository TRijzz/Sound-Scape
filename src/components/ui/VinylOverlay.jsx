import React from 'react';
import ReactDOM from 'react-dom';
import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import vinylSvg from '../../assets/vinyl.svg';
import { ReactComponent as Tonearm } from '../../assets/tonearm.svg';
import { useMusic } from '../../contexts/MusicContext';
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
import LyricsOverlay from './LyricsOverlay';
import useEscapeKey from '../../hooks/useEscapeKey';

const ROTATION_PER_SECOND = 22;
const SCRUB_RESISTANCE = 0.18;
const SCRUB_TIME_PER_DELTA = 0.013;
const SCRUB_ROTATION_PER_DELTA = 0.52;
const MAX_SCRUB_STEP = 7.5;
const RELEASE_INERTIA_MULTIPLIER = 14;
const POINTER_SCRUB_SENSITIVITY = 0.14;
const POINTER_ROTATION_MULTIPLIER = 1.25;
const MIN_POINTER_ANGLE_DELTA = 0.0035;

function VinylOverlay({ isOpen, onClose }) {
  const {
    isPlaying,
    currentTrack,
    previewSession,
    progress,
    duration,
    setProgress,
    pauseTrack,
    resumeTrack,
    getVinylForSong
  } = useMusic();
  const [showLyrics, setShowLyrics] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [rotationAngle, setRotationAngle] = useState(0);
  const [scrubVelocity, setScrubVelocity] = useState(0);
  const [releaseBoost, setReleaseBoost] = useState(0);

  const vinylAreaRef = useRef(null);
  const targetRotationRef = useRef(0);
  const currentRotationRef = useRef(0);
  const lastFrameRef = useRef(null);
  const scrubVelocityRef = useRef(0);
  const releaseBoostRef = useRef(0);
  const activePointerIdRef = useRef(null);
  const lastPointerAngleRef = useRef(null);

  const displayTrack = previewSession?.currentTrack || currentTrack;
  const displayIsPlaying = previewSession?.isPlaying ?? isPlaying;
  const displayProgress = previewSession?.progress ?? progress;
  const displayDuration = previewSession?.duration ?? duration;
  const scrubIntensity = Math.min(1, Math.abs(scrubVelocity) / 1.8 + Math.abs(releaseBoost) / 20);

  useEscapeKey(isOpen, () => {
    setShowLyrics(false);
    setIsActive(false);
    onClose();
  });

  const getVinylSrc = () => {
    if (previewSession?.vinyl) {
      return previewSession.vinyl.image_base64
        ? `data:${previewSession.vinyl.mime_type || 'image/png'};base64,${previewSession.vinyl.image_base64}`
        : previewSession.vinyl.image_url || vinylSvg;
    }

    const matchedVinylImage = getVinylForSong(displayTrack);
    if (matchedVinylImage) {
      return matchedVinylImage;
    }

    return vinylSvg;
  };

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev || '';
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setIsHovered(false);
      setIsActive(false);
      setRotationAngle(0);
      setScrubVelocity(0);
      setReleaseBoost(0);
      currentRotationRef.current = 0;
      targetRotationRef.current = 0;
      scrubVelocityRef.current = 0;
      releaseBoostRef.current = 0;
      lastFrameRef.current = null;
      activePointerIdRef.current = null;
      lastPointerAngleRef.current = null;
    }
  }, [isOpen]);

  useEffect(() => {
    targetRotationRef.current = (Number(displayProgress) || 0) * ROTATION_PER_SECOND + releaseBoostRef.current;
  }, [displayProgress]);

  useEffect(() => {
    if (!isOpen) return undefined;

    let frameId;

    const animate = (timestamp) => {
      lastFrameRef.current = timestamp;

      if (!isActive) {
        scrubVelocityRef.current *= 0.88;
        releaseBoostRef.current *= 0.9;
        if (Math.abs(scrubVelocityRef.current) < 0.01) scrubVelocityRef.current = 0;
        if (Math.abs(releaseBoostRef.current) < 0.05) releaseBoostRef.current = 0;
      }

      targetRotationRef.current = (Number(displayProgress) || 0) * ROTATION_PER_SECOND + releaseBoostRef.current;

      const current = currentRotationRef.current;
      const target = targetRotationRef.current;
      const distance = target - current;
      const easing = isActive ? 0.34 : 0.16;
      const nextRotation = current + distance * easing;

      currentRotationRef.current = nextRotation;
      setRotationAngle(nextRotation);
      setScrubVelocity(scrubVelocityRef.current);
      setReleaseBoost(releaseBoostRef.current);

      frameId = window.requestAnimationFrame(animate);
    };

    frameId = window.requestAnimationFrame(animate);

    return () => {
      if (frameId) window.cancelAnimationFrame(frameId);
      lastFrameRef.current = null;
    };
  }, [displayProgress, isActive, isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handlePointerDown = (event) => {
      if (!isActive) return;
      if (activePointerIdRef.current === event.pointerId) return;
      if (vinylAreaRef.current?.contains(event.target)) return;
      setIsActive(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [isActive, isOpen]);

  useEffect(() => {
    if (isActive) return undefined;

    releaseBoostRef.current += scrubVelocityRef.current * RELEASE_INERTIA_MULTIPLIER;
    setReleaseBoost(releaseBoostRef.current);
    scrubVelocityRef.current *= 0.45;
    setScrubVelocity(scrubVelocityRef.current);
    activePointerIdRef.current = null;
    lastPointerAngleRef.current = null;

    return undefined;
  }, [isActive]);

  const getVinylCenter = () => {
    const rect = vinylAreaRef.current?.getBoundingClientRect();
    if (!rect) {
      return null;
    }

    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
  };

  const getPointerAngle = (clientX, clientY) => {
    const center = getVinylCenter();
    if (!center) {
      return null;
    }

    return Math.atan2(clientY - center.y, clientX - center.x);
  };

  const normalizeAngleDelta = (delta) => {
    let nextDelta = delta;
    while (nextDelta > Math.PI) nextDelta -= Math.PI * 2;
    while (nextDelta < -Math.PI) nextDelta += Math.PI * 2;
    return nextDelta;
  };

  const applyScrubDelta = useCallback((directionalDelta, rotationMultiplier = SCRUB_ROTATION_PER_DELTA, timeMultiplier = SCRUB_TIME_PER_DELTA) => {
    if (!directionalDelta) return;

    const boundedDelta = Math.max(-MAX_SCRUB_STEP, Math.min(MAX_SCRUB_STEP, directionalDelta));
    const timeDelta = boundedDelta * timeMultiplier;
    const rotationDelta = boundedDelta * rotationMultiplier;
    const nextProgress = Math.max(
      0,
      Math.min((Number(displayDuration) || 0), (Number(displayProgress) || 0) + timeDelta)
    );

    scrubVelocityRef.current = scrubVelocityRef.current * 0.38 + rotationDelta * 0.62;
    currentRotationRef.current += rotationDelta * 0.92;
    setRotationAngle(currentRotationRef.current);
    releaseBoostRef.current += rotationDelta * 0.18;
    targetRotationRef.current = (Number(displayProgress) || 0) * ROTATION_PER_SECOND + releaseBoostRef.current;
    setScrubVelocity(scrubVelocityRef.current);
    setReleaseBoost(releaseBoostRef.current);
    setProgress(nextProgress);
  }, [displayDuration, displayProgress, setProgress]);

  const handleTonearmToggle = useCallback((event) => {
    event.stopPropagation();
    displayIsPlaying ? pauseTrack() : resumeTrack();
  }, [displayIsPlaying, pauseTrack, resumeTrack]);

  useEffect(() => {
    if (!isActive) return undefined;

    const handleWheel = (event) => {
      event.preventDefault();

      const dominantDelta = Math.abs(event.deltaY) >= Math.abs(event.deltaX)
        ? event.deltaY
        : event.deltaX;
      const resistedDelta = dominantDelta * SCRUB_RESISTANCE;
      applyScrubDelta(resistedDelta);
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      window.removeEventListener('wheel', handleWheel);
    };
  }, [applyScrubDelta, isActive]);

  if (!isOpen) {
    return <AnimatePresence>{false}</AnimatePresence>;
  }

  const overlay = (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 flex items-center justify-center backdrop-blur-sm"
            style={{ zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.85)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={() => {
              if (isActive) {
                setIsActive(false);
              }
            }}
          >
            <motion.button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
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

            <div className="w-full h-full flex items-center justify-center">
              <motion.div
                ref={vinylAreaRef}
                className="relative select-none"
                style={{ y: -38 }}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                onClick={(e) => e.stopPropagation()}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
              >
                <motion.img
                  src={getVinylSrc()}
                  alt="Vinyl record"
                  draggable={false}
                  className="w-[560px] h-[560px] flex-shrink-0 object-contain touch-none"
                  animate={{
                    scale: isActive ? 1.04 : isHovered ? 1.02 : 1,
                    rotate: rotationAngle,
                  }}
                  style={{
                    filter: isHovered || isActive
                      ? `drop-shadow(0 0 ${18 + scrubIntensity * 10}px rgba(0, 255, 255, 0.78)) drop-shadow(0 0 ${42 + scrubIntensity * 20}px rgba(0, 255, 255, 0.45))`
                      : 'drop-shadow(0 0 12px rgba(0, 255, 255, 0.45)) drop-shadow(0 0 30px rgba(0, 255, 255, 0.25))',
                    cursor: isActive ? 'grabbing' : isHovered ? 'grab' : 'default',
                  }}
                  transition={{
                    scale: { type: 'spring', stiffness: 210, damping: 18 },
                    rotate: { type: 'tween', ease: 'linear', duration: 0.04 },
                    filter: { duration: 0.2 },
                  }}
                  onClick={(event) => {
                    event.stopPropagation();
                    setIsActive(true);
                  }}
                  onPointerDown={(event) => {
                    event.stopPropagation();
                    if (!isActive) {
                      setIsActive(true);
                    }

                    activePointerIdRef.current = event.pointerId;
                    lastPointerAngleRef.current = getPointerAngle(event.clientX, event.clientY);
                    event.currentTarget.setPointerCapture?.(event.pointerId);
                  }}
                  onPointerMove={(event) => {
                    if (!isActive || activePointerIdRef.current !== event.pointerId) {
                      return;
                    }

                    const nextAngle = getPointerAngle(event.clientX, event.clientY);
                    if (nextAngle == null) {
                      return;
                    }

                    if (lastPointerAngleRef.current == null) {
                      lastPointerAngleRef.current = nextAngle;
                      return;
                    }

                    const rawDelta = normalizeAngleDelta(nextAngle - lastPointerAngleRef.current);
                    lastPointerAngleRef.current = nextAngle;

                    const clockwiseDelta = -rawDelta;
                    if (Math.abs(clockwiseDelta) < MIN_POINTER_ANGLE_DELTA) {
                      return;
                    }

                    const directionalDelta = clockwiseDelta * (180 / Math.PI) * POINTER_SCRUB_SENSITIVITY;
                    applyScrubDelta(
                      directionalDelta,
                      SCRUB_ROTATION_PER_DELTA * POINTER_ROTATION_MULTIPLIER,
                      SCRUB_TIME_PER_DELTA
                    );
                  }}
                  onPointerUp={(event) => {
                    if (activePointerIdRef.current !== event.pointerId) {
                      return;
                    }

                    activePointerIdRef.current = null;
                    lastPointerAngleRef.current = null;
                    event.currentTarget.releasePointerCapture?.(event.pointerId);
                  }}
                  onPointerCancel={(event) => {
                    if (activePointerIdRef.current !== event.pointerId) {
                      return;
                    }

                    activePointerIdRef.current = null;
                    lastPointerAngleRef.current = null;
                    event.currentTarget.releasePointerCapture?.(event.pointerId);
                  }}
                />

                <TonearmAnimator isPlaying={displayIsPlaying} onToggle={handleTonearmToggle} />

                <AnimatePresence>
                  {isHovered && !isActive && (
                    <motion.div
                      className="pointer-events-none absolute left-1/2 top-full mt-5 -translate-x-1/2 whitespace-nowrap rounded-full border border-cyan-400/30 bg-black/50 px-4 py-2 text-xs tracking-[0.18em] text-cyan-100/85 backdrop-blur-sm"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 6 }}
                      transition={{ duration: 0.2 }}
                    >
                      Click and rotate on trackpad to scrub
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {isActive && (
                    <motion.div
                      className="pointer-events-none absolute -right-8 top-8 rounded-2xl border border-cyan-400/25 bg-black/55 px-4 py-3 text-[11px] uppercase tracking-[0.28em] text-cyan-100/85 shadow-[0_0_32px_rgba(0,255,255,0.14)] backdrop-blur-md"
                      style={{
                        boxShadow: `0 0 ${32 + scrubIntensity * 14}px rgba(0,255,255,${0.14 + scrubIntensity * 0.16})`,
                      }}
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 8 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div>Scrub mode</div>
                      <div className="mt-1 text-cyan-100/55 normal-case tracking-[0.08em]">
                        Drag in a circle or scroll to rotate. Press Esc to release.
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </div>

            <LyricsOverlay
              isOpen={showLyrics}
              onClose={() => setShowLyrics(false)}
            />

            <OverlayPlayBar onOuterClick={(e) => e.stopPropagation()} onOpenLyrics={() => setShowLyrics(true)} />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return ReactDOM.createPortal(overlay, document.body);
}

function TonearmAnimator({ isPlaying, onToggle }) {
  const spring = { type: 'spring', stiffness: 60, damping: 20, duration: 2.5 };
  const playingPose = { top: 72, left: -190, rotate: 10 };
  const pausedPose = { top: 20, left: -280, rotate: -25 };

  return (
    <motion.div
      className="absolute w-[628.533px] h-[353.55px] flex-shrink-0"
      style={{ transformOrigin: '104.8px 235.7px' }}
      initial={{ opacity: 0, ...pausedPose }}
      animate={{ opacity: 1, ...(isPlaying ? playingPose : pausedPose) }}
      exit={{ opacity: 0 }}
      transition={spring}
      onClick={onToggle}
      role={onToggle ? 'button' : undefined}
      aria-label={onToggle ? (isPlaying ? 'Pause playback' : 'Resume playback') : undefined}
      title={onToggle ? (isPlaying ? 'Pause' : 'Play') : undefined}
    >
      <Tonearm className={onToggle ? 'pointer-events-auto' : 'pointer-events-none'} />
    </motion.div>
  );
}

function OverlayPlayBar({ onOuterClick, onOpenLyrics }) {
  const {
    currentTrack,
    isPlaying,
    previewSession,
    progress,
    duration,
    volume,
    previousTrack,
    nextTrack,
    pauseTrack,
    resumeTrack,
    setProgress,
    setVolume,
    isAuthenticated,
    setShowAuthPrompt,
  } = useMusic();
  const displayTrack = previewSession?.currentTrack || currentTrack;
  const displayIsPlaying = previewSession?.isPlaying ?? isPlaying;
  const displayProgress = previewSession?.progress ?? progress;
  const displayDuration = previewSession?.duration ?? duration;

  const formatTime = (seconds) => {
    const safeSeconds = Number(seconds || 0);
    const mins = Math.floor(safeSeconds / 60);
    const secs = Math.floor(safeSeconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const lastVolumeRef = React.useRef(60);
  const isMuted = volume === 0;

  const onPlayPause = (e) => {
    e.stopPropagation();
    displayIsPlaying ? pauseTrack() : resumeTrack();
  };

  const onSeek = (e) => {
    e.stopPropagation();
    const val = parseInt(e.target.value, 10) || 0;
    setProgress(val);
  };

  const onPrev = (e) => {
    e.stopPropagation();
    previousTrack();
  };
  const onNext = (e) => {
    e.stopPropagation();
    nextTrack();
  };
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
        <div className="w-1/4 flex items-center space-x-3 overflow-hidden">
          {displayTrack && (
            <>
              <img
                src={displayTrack.album?.images?.[0]?.url || displayTrack.cover_art_url || displayTrack._vinylImage || albumArtPlaceholder}
                alt={displayTrack.name || 'Current track'}
                className="w-10 h-10 rounded object-cover flex-shrink-0"
              />
              <div className="min-w-0">
                <p className="text-sm text-white truncate">{displayTrack.name || 'Unknown Track'}</p>
                <p className="text-xs text-gray-400 truncate">
                  {displayTrack.artists?.map((artist) => artist.name).join(', ') || 'Unknown Artist'}
                </p>
              </div>
            </>
          )}
        </div>

        <div className="flex flex-col items-center space-y-2 w-1/2">
          <div className="flex items-center space-x-4">
            <button className="text-gray-400 hover:text-white transition-colors" onClick={(e) => e.stopPropagation()}>
              <ShuffleIcon className="w-4 h-4" />
            </button>
            <button onClick={onPrev} className="text-gray-400 hover:text-white transition-colors">
              <SkipPrevIcon className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={onPlayPause}
              className="w-10 h-10 bg-white text-dark-bg rounded-full flex items-center justify-center hover:scale-105 transition-transform"
              title={displayIsPlaying ? 'Pause' : 'Play'}
              aria-label={displayIsPlaying ? 'Pause playback' : 'Resume playback'}
            >
              {displayIsPlaying ? <PauseIcon className="w-5 h-5" /> : <PlayIcon className="w-5 h-5 ml-0.5" />}
            </button>
            <button onClick={onNext} className="text-gray-400 hover:text-white transition-colors">
              <SkipNextIcon className="w-5 h-5" />
            </button>
            <button className="text-gray-400 hover:text-white transition-colors" onClick={(e) => e.stopPropagation()}>
              <RepeatIcon className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center space-x-3 w-full max-w-md">
            <span className="text-xs text-gray-400 w-8">{formatTime(displayProgress)}</span>
            <input
              type="range"
              min="0"
              max={Math.max(0, displayDuration || 0)}
              value={Math.min(displayProgress || 0, displayDuration || 0)}
              onChange={onSeek}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
            />
            <span className="text-xs text-gray-400 w-8">{formatTime(displayDuration)}</span>
          </div>
        </div>

        <div className="flex items-center space-x-3 w-1/4 justify-end">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenLyrics && onOpenLyrics();
            }}
            className="text-gray-400 hover:text-[#00FFFF] transition-colors"
            title="Show Lyrics"
          >
            <MicIcon className="w-4 h-4" />
          </button>
          <button
            className="text-gray-400 hover:text-white transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              if (!isAuthenticated) {
                setShowAuthPrompt(true);
              }
            }}
          >
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

