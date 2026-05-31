  import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useScroll, useSpring, useTransform } from 'framer-motion';
import { useMusic } from '../contexts/MusicContext';
import apiService from '../services/api';
import { getVinylImageSrc } from '../utils/vinyl';

const quotes = [
  'Music is the gravity that keeps memories in orbit.',
  'Every record is a small universe waiting for a needle.',
  'Sound turns time into something you can feel.',
  'Find the frequency that makes the night glow.',
  'The future of listening still starts with a heartbeat.'
];

const vinylStories = [
  {
    title: 'Neon cyberpunk vinyl',
    kicker: 'Signal 01',
    copy: 'Electric grooves pulse through a city-lit disc, built for late nights and luminous headphones.',
    className: 'vinyl-cyberpunk',
    align: 'lg:items-start',
    motion: { x: ['-16vw', '8vw', '2vw'], y: ['8vh', '-4vh', '0vh'], rotate: [-20, 14, 4] },
    gradient: 'from-[#001526] via-[#050816] to-[#18002d]'
  },
  {
    title: 'Transparent glass vinyl',
    kicker: 'Signal 02',
    copy: 'A crystalline record catches blue light like rain on a studio window.',
    className: 'vinyl-glass',
    align: 'lg:items-end',
    motion: { x: ['18vw', '-6vw', '1vw'], y: ['-7vh', '4vh', '0vh'], rotate: [22, -12, 2] },
    gradient: 'from-[#03181f] via-[#061016] to-[#111827]'
  },
  {
    title: 'Retro synthwave vinyl',
    kicker: 'Signal 03',
    copy: 'Warm magenta reflections, midnight basslines, and motion that feels pulled from an analog dream.',
    className: 'vinyl-synthwave',
    align: 'lg:items-start',
    motion: { x: ['-14vw', '10vw', '-2vw'], y: ['-6vh', '7vh', '0vh'], rotate: [-18, 18, -3] },
    gradient: 'from-[#1b0627] via-[#100817] to-[#2b0b15]'
  },
  {
    title: 'Liquid chrome vinyl',
    kicker: 'Signal 04',
    copy: 'Mirror-bright sound architecture that bends the room around every chorus.',
    className: 'vinyl-chrome',
    align: 'lg:items-end',
    motion: { x: ['16vw', '-9vw', '3vw'], y: ['6vh', '-6vh', '0vh'], rotate: [16, -18, 5] },
    gradient: 'from-[#071115] via-[#090d12] to-[#101827]'
  },
  {
    title: 'Minimal matte black vinyl',
    kicker: 'Signal 05',
    copy: 'Quiet, tactile, and deep. A premium black disc where the smallest glow feels intentional.',
    className: 'vinyl-matte',
    align: 'lg:items-start',
    motion: { x: ['-10vw', '6vw', '0vw'], y: ['5vh', '-3vh', '0vh'], rotate: [-10, 8, 0] },
    gradient: 'from-[#02050a] via-[#06080d] to-[#00131d]'
  }
];

const particleSeeds = Array.from({ length: 30 }, (_, index) => ({
  id: index,
  left: `${(index * 37) % 100}%`,
  top: `${(index * 19) % 100}%`,
  delay: (index % 10) * 0.35,
  duration: 6 + (index % 7)
}));

const waveformBars = Array.from({ length: 38 }, (_, index) => ({
  id: index,
  height: 18 + ((index * 23) % 64),
  delay: (index % 11) * 0.08
}));

const VinylRecord = ({ className = '', imageSrc = '', size = 'large' }) => {
  if (imageSrc) {
    return (
      <div className={`vinyl-record vinyl-record-image ${size === 'hero' ? 'vinyl-record-hero' : ''} ${className}`}>
        <img className="vinyl-artwork" src={imageSrc} alt="" />
      </div>
    );
  }
  return (
    <div className={`vinyl-record ${size === 'hero' ? 'vinyl-record-hero' : ''} ${className}`}>
      <div className="vinyl-grooves" />
      <div className="vinyl-ring vinyl-ring-one" />
      <div className="vinyl-ring vinyl-ring-two" />
      <div className="vinyl-label" />
      <div className="vinyl-hole" />
    </div>
  );
};

const MusicStationLanding = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useMusic();
  const [quote] = React.useState(() => quotes[Math.floor(Math.random() * quotes.length)]);
  const [cursor, setCursor] = React.useState({ x: 50, y: 50 });
  const [vinyls, setVinyls] = React.useState([]);
  const containerRef = React.useRef(null);
  const { scrollYProgress } = useScroll();
  const smoothProgress = useSpring(scrollYProgress, { stiffness: 110, damping: 24, mass: 0.2 });
  const heroVinylX = useTransform(smoothProgress, [0, 0.18], ['0vw', '72vw']);
  const heroVinylY = useTransform(smoothProgress, [0, 0.18], ['0vh', '34vh']);
  const heroVinylRotate = useTransform(smoothProgress, [0, 0.18], [0, 145]);
  const glowX = useTransform(smoothProgress, [0, 1], ['8%', '78%']);
  const glowY = useTransform(smoothProgress, [0, 1], ['14%', '82%']);

  const handleMouseMove = (event) => {
    // .cursor-glow and the ::before backdrop are position: fixed, so the
    // CSS variables need to be viewport-relative — NOT relative to the
    // (multi-screen-tall) scrollable container.
    const vw = window.innerWidth || 1;
    const vh = window.innerHeight || 1;
    setCursor({
      x: (event.clientX / vw) * 100,
      y: (event.clientY / vh) * 100
    });
  };

  React.useEffect(() => {
    let cancelled = false;

    const loadVinyls = async () => {
      try {
        const response = await apiService.getVinyls(1, 8, '', true);
        const items = Array.isArray(response?.vinyls) ? response.vinyls : Array.isArray(response) ? response : [];
        if (!cancelled) setVinyls(items);
      } catch (error) {
        console.error('Failed to load landing vinyls:', error);
        if (!cancelled) setVinyls([]);
      }
    };

    loadVinyls();
    return () => {
      cancelled = true;
    };
  }, []);

  const enterListening = () => {
    navigate(isAuthenticated ? '/home' : '/signup');
  };

  const exploreMusic = () => {
    navigate('/home');
  };

  const openVinylStore = () => {
    navigate('/store');
  };

  const heroVinyl = vinyls[0] || null;
  const heroVinylImage = getVinylImageSrc(heroVinyl, '');
  const displayStories = vinylStories.map((story, index) => {
    const vinyl = vinyls[index] || null;
    return {
      ...story,
      vinyl,
      title: vinyl?.name || story.title,
      copy: vinyl?.description || (vinyl?.artist ? `A custom Sound Scape vinyl by ${vinyl.artist}, pulled straight from the store collection.` : story.copy),
      imageSrc: getVinylImageSrc(vinyl, '')
    };
  });

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="music-station-landing min-h-screen overflow-hidden bg-[#02040a] text-white"
      style={{ '--cursor-x': `${cursor.x}%`, '--cursor-y': `${cursor.y}%` }}
    >
      <motion.div className="scroll-progress" style={{ scaleX: smoothProgress }} />
      <div className="cursor-glow" />
      <motion.div className="ambient-orbit" style={{ left: glowX, top: glowY }} />

      <header className="fixed left-0 right-0 top-0 z-40 px-5 py-5 sm:px-8">
        <nav className="mx-auto flex max-w-7xl items-center justify-between rounded-full border border-white/10 bg-black/35 px-4 py-3 shadow-2xl shadow-cyan-500/10 backdrop-blur-2xl sm:px-6">
          <Link to="/" className="flex items-center gap-3">
            <span className="brand-disc" />
            <span className="text-sm font-black uppercase tracking-[0.34em] text-white sm:text-base">Sound Scape</span>
          </Link>
          <div className="hidden items-center gap-8 text-sm font-semibold text-white/60 md:flex">
            <a href="#vinyls" className="transition hover:text-cyan-300">Vinyls</a>
            <a href="#experience" className="transition hover:text-cyan-300">Experience</a>
            <button type="button" onClick={exploreMusic} className="transition hover:text-cyan-300">Explore</button>
          </div>
          <button
            type="button"
            onClick={enterListening}
            disabled={isLoading}
            className="rounded-full border border-cyan-300/40 bg-cyan-300/10 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-cyan-200 shadow-lg shadow-cyan-400/10 transition hover:border-cyan-200 hover:bg-cyan-300 hover:text-black"
          >
            Enter
          </button>
        </nav>
      </header>

      <section className="relative flex min-h-screen items-center justify-center px-5 pt-28 sm:px-8">
        <div className="noise-layer" />
        <div className="hero-gradient" />
        <div className="particle-field">
          {particleSeeds.map((particle) => (
            <span
              key={particle.id}
              className="music-particle"
              style={{
                left: particle.left,
                top: particle.top,
                animationDelay: `${particle.delay}s`,
                animationDuration: `${particle.duration}s`
              }}
            />
          ))}
        </div>

        <motion.div
          className="absolute z-10 hidden lg:block"
          style={{ x: heroVinylX, y: heroVinylY, rotate: heroVinylRotate }}
        >
          <div
            className="vinyl-cursor-parallax"
            style={{
              transform: `translate3d(${(cursor.x - 50) * 0.12}px, ${(cursor.y - 50) * 0.12}px, 0)`
            }}
          >
            <button
              type="button"
              onClick={openVinylStore}
              aria-label="Open vinyl store"
              className="vinyl-hover-button"
            >
              <VinylRecord className="vinyl-hero-main" imageSrc={heroVinylImage} size="hero" />
            </button>
          </div>
        </motion.div>

        <div className="relative z-20 mx-auto grid w-full min-w-0 max-w-7xl items-center gap-12 lg:grid-cols-[1fr_0.95fr]">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            className="w-full min-w-0 text-center lg:text-left"
          >
            <p className="mb-5 text-xs font-black uppercase tracking-[0.5em] text-cyan-300/90">Future Frequency</p>
            <h1 className="mx-auto max-w-5xl text-5xl font-black leading-[0.9] tracking-normal text-white sm:text-7xl lg:mx-0 lg:text-8xl">
              Sound Scape
            </h1>
            <motion.p
              key={quote}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="mx-auto mt-8 w-full max-w-[20.5rem] text-2xl font-semibold leading-tight text-white/85 sm:max-w-2xl sm:text-3xl lg:mx-0"
            >
              "{quote}"
            </motion.p>
            <p className="mx-auto mt-6 w-full max-w-[20rem] text-base leading-8 text-slate-300 sm:max-w-xl lg:mx-0">
              A cinematic home for albums, playlists, and vinyl culture. Built for listeners who want music to feel alive before the first note starts.
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row lg:justify-start">
              <button type="button" onClick={enterListening} disabled={isLoading} className="landing-cta landing-cta-primary">Start Listening</button>
              <button type="button" onClick={exploreMusic} className="landing-cta landing-cta-secondary">Explore Music</button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.88, rotate: -8 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 1, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="relative mx-auto block lg:hidden"
          >
            <button
              type="button"
              onClick={openVinylStore}
              aria-label="Open vinyl store"
              className="vinyl-hover-button"
            >
              <VinylRecord className="vinyl-hero-main" imageSrc={heroVinylImage} size="hero" />
            </button>
          </motion.div>

          <div className="pointer-events-none relative hidden min-h-[560px] lg:block" aria-hidden="true" />
        </div>
      </section>

      <section id="vinyls" className="relative">
        {displayStories.map((story, index) => (
          <StoryPanel key={`${story.title}-${index}`} story={story} index={index} />
        ))}
      </section>

      <LiveExperience />
      <LandingFooter />
    </div>
  );
};

const LandingFooter = () => {
  const navigate = useNavigate();
  const quickLinks = [
    { label: 'Log In', to: '/login' },
    { label: 'Create Account', to: '/signup' },
    { label: 'Explore Music', to: '/home' },
    { label: 'Vinyl Store', to: '/store' }
  ];

  return (
    <footer className="relative border-t border-white/10 bg-[#02040a] px-5 py-16 sm:px-8">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />
      <div className="mx-auto grid max-w-7xl gap-10 sm:grid-cols-2 lg:grid-cols-3">
        {/* Brand */}
        <div>
          <div className="flex items-center gap-3">
            <span className="brand-disc" />
            <span className="text-base font-black uppercase tracking-[0.3em] text-white">Sound Scape</span>
          </div>
          <p className="mt-4 max-w-xs text-sm leading-7 text-slate-400">
            A cinematic home for albums, playlists and vinyl culture — built for listeners who want music to feel alive before the first note starts.
          </p>
        </div>

        {/* Contact */}
        <div>
          <h3 className="text-sm font-black uppercase tracking-[0.26em] text-cyan-300">Contact</h3>
          <ul className="mt-5 space-y-3 text-sm text-slate-400">
            <li>Email: support@soundscape.app</li>
            <li>Phone: +977-01-0000000</li>
          </ul>
        </div>

        {/* Quick Links */}
        <div>
          <h3 className="text-sm font-black uppercase tracking-[0.26em] text-cyan-300">Quick Links</h3>
          <ul className="mt-5 space-y-3 text-sm">
            {quickLinks.map((link) => (
              <li key={link.to}>
                <button
                  type="button"
                  onClick={() => navigate(link.to)}
                  className="text-slate-400 transition hover:text-white"
                >
                  {link.label}
                </button>
              </li>
            ))}
          </ul>
        </div>

      </div>

      <div className="mx-auto mt-12 flex max-w-7xl flex-col items-center gap-2 border-t border-white/10 pt-6 text-xs text-slate-500 sm:flex-row sm:justify-between">
        <span>&copy; {new Date().getFullYear()} Sound Scape. All rights reserved.</span>
        <span>Stream. Discover. Collect.</span>
      </div>
    </footer>
  );
};

// GOD DID song implemented 
const GOD_DID_SRC = encodeURI('/songs/DJ Khaled/GOD DID/GOD DID (feat. Rick Ross, Lil Wayne, Jay-Z, John Legend & Fridayy).mp3');
const SEGMENT_START = 138;
const SEGMENT_END = 160;
const FADE_DURATION = 3;

const LiveExperience = () => {
  const sectionRef = React.useRef(null);
  const audioRef = React.useRef(null);          //Audio Tag 
  const audioCtxRef = React.useRef(null);
  const analyserRef = React.useRef(null);
  const sourceRef = React.useRef(null);
  const barsRef = React.useRef([]);
  const rafRef = React.useRef(null);
  const inViewRef = React.useRef(false);
  const userPausedRef = React.useRef(false);
  const hasPlayedRef = React.useRef(false);
  const [isLive, setIsLive] = React.useState(false);
  const [needsUnlock, setNeedsUnlock] = React.useState(false);

  const ensureAudioGraph = React.useCallback(() => {
    const audio = audioRef.current;
    if (!audio || sourceRef.current) return;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const source = ctx.createMediaElementSource(audio);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.78;
      source.connect(analyser);
      analyser.connect(ctx.destination);
      audioCtxRef.current = ctx;
      analyserRef.current = analyser;
      sourceRef.current = source;
    } catch (err) {
      console.warn('Audio graph setup failed:', err);
    }
  }, []);

  const attemptPlay = React.useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;
    ensureAudioGraph();
    const ctx = audioCtxRef.current;
    if (ctx && ctx.state === 'suspended') {
      await ctx.resume().catch(() => {});
    }
    if (audio.currentTime < SEGMENT_START || audio.currentTime >= SEGMENT_END - 0.05) {
      audio.currentTime = SEGMENT_START;
      audio.volume = 1;
    }
    try {
      await audio.play();
      setIsLive(true);
      setNeedsUnlock(false);
    } catch (err) {
      setIsLive(false);
      setNeedsUnlock(true);
    }
  }, [ensureAudioGraph]);

  const togglePlay = React.useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      userPausedRef.current = false;
      hasPlayedRef.current = false;
      audio.volume = 1;
      attemptPlay();
    } else {
      userPausedRef.current = true;
      audio.pause();
      setIsLive(false);
    }
  }, [attemptPlay]);

  React.useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const visible = entry.isIntersecting && entry.intersectionRatio >= 0.45;        //Triggers when scrolling 45% of the section is visible 
        inViewRef.current = visible;
        if (visible) {
          if (!userPausedRef.current && !hasPlayedRef.current) attemptPlay();       //Plays Audio when section is visible.
        } else {
          audio.pause();
          setIsLive(false);
        }
      },
      { threshold: [0, 0.45, 0.85] }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);

    const tick = () => {
      if (!audio.paused) {
        const remaining = SEGMENT_END - audio.currentTime;
        if (remaining <= 0) {
          audio.pause();
          audio.volume = 1;
          hasPlayedRef.current = true;
          setIsLive(false);
        } else if (remaining <= FADE_DURATION) {
          const t = remaining / FADE_DURATION;
          audio.volume = Math.max(0, Math.min(1, t * t));
        } else {
          audio.volume = 1;
        }
      }

      const analyser = analyserRef.current;
      const bars = barsRef.current;
      if (analyser && bars.length) {
        const data = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(data);
        const step = Math.max(1, Math.floor(data.length / bars.length));
        for (let i = 0; i < bars.length; i++) {
          const bar = bars[i];
          if (!bar) continue;
          const raw = data[i * step] / 255;
          const scale = Math.max(0.16, Math.min(1, raw * 1.25));
          bar.style.transform = `scaleY(${scale})`;
          bar.style.opacity = `${Math.max(0.5, raw)}`;
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      observer.disconnect();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      audio.pause();
    };
  }, [attemptPlay]);

  return (
    <section
      id="experience"
      ref={sectionRef}
      className="relative overflow-hidden px-5 py-28 sm:px-8 lg:py-36"
    >
      <audio ref={audioRef} src={GOD_DID_SRC} preload="auto" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(0,191,255,0.18),transparent_34%),linear-gradient(180deg,#02040a,#000)]" />
      <div className="relative z-10 mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.5em] text-cyan-300">Live Atmosphere</p>
          <h2 className="mt-5 text-4xl font-black leading-none text-white sm:text-6xl">Every scroll has a rhythm.</h2>
          <p className="mt-6 max-w-xl text-base leading-8 text-slate-300">
            Ambient waveforms, glowing particles, rolling records, and glass layers move together to make discovery feel tactile and premium.
          </p>
        </div>
        <div className="glass-console">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.32em] text-cyan-200/70">Now visualizing</p>
              <h3 className="mt-2 text-2xl font-black text-white">GOD DID</h3>
              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.28em] text-white/55">DJ Khaled</p>
            </div>
            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.22em] ${isLive ? 'border-cyan-300/40 bg-cyan-300/10 text-cyan-200' : 'border-white/15 bg-white/5 text-white/55'}`}>
                <span className={`h-2 w-2 rounded-full ${isLive ? 'bg-cyan-300 animate-pulse' : 'bg-white/40'}`} />
                {isLive ? 'Live' : needsUnlock ? 'Muted' : 'Paused'}
              </div>
              <button
                type="button"
                onClick={togglePlay}
                aria-label={isLive ? 'Pause GOD DID preview' : 'Play GOD DID preview'}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-cyan-300/40 bg-cyan-300/15 text-cyan-100 transition hover:scale-105 hover:border-cyan-200 hover:bg-cyan-300 hover:text-black"
              >
                {isLive ? (
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <rect x="6" y="5" width="4" height="14" rx="1" />
                    <rect x="14" y="5" width="4" height="14" rx="1" />
                  </svg>
                ) : (
                  <svg className="h-4 w-4 translate-x-[1px]" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M8 5v14l11-7L8 5z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
          <div className={`waveform mt-10 ${isLive ? 'is-live' : ''}`}>
            {waveformBars.map((bar, index) => (
              <span
                key={bar.id}
                ref={(el) => { barsRef.current[index] = el; }}
                style={{ height: `${bar.height}px`, animationDelay: `${bar.delay}s` }}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

const StoryPanel = ({ story, index }) => {
  const navigate = useNavigate();
  const ref = React.useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const x = useTransform(scrollYProgress, [0, 0.5, 1], story.motion.x);
  const y = useTransform(scrollYProgress, [0, 0.5, 1], story.motion.y);
  const rotate = useTransform(scrollYProgress, [0, 0.5, 1], story.motion.rotate);
  const scale = useTransform(scrollYProgress, [0, 0.48, 1], [0.78, 1.08, 0.82]);
  const opacity = useTransform(scrollYProgress, [0, 0.16, 0.82, 1], [0.25, 1, 1, 0.28]);

  return (
    <section ref={ref} className={`story-panel relative min-h-screen overflow-hidden bg-gradient-to-br ${story.gradient} px-5 py-24 sm:px-8`}>
      <div className="noise-layer" />
      <div className="panel-grid" />
      <div className="mx-auto flex min-h-[calc(100vh-12rem)] max-w-7xl flex-col justify-center gap-10 lg:grid lg:grid-cols-2 lg:gap-16">
        <motion.div
          initial={{ opacity: 0, y: 36 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false, amount: 0.35 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className={`relative z-10 flex flex-col justify-center ${story.align}`}
        >
          <div className="w-full min-w-0 max-w-[21rem] rounded-[2rem] border border-white/10 bg-white/[0.055] p-7 text-left shadow-2xl shadow-black/40 backdrop-blur-2xl sm:max-w-xl sm:p-9">
            <p className="text-xs font-black uppercase tracking-[0.46em] text-cyan-200">{story.kicker}</p>
            <h2 className="mt-5 text-4xl font-black leading-none text-white sm:text-6xl">{story.title}</h2>
            <p className="mt-6 break-words text-base leading-8 text-slate-300">{story.copy}</p>
          </div>
        </motion.div>

        <div className="relative z-10 flex min-h-[420px] items-center justify-center">
          <motion.div
            className="story-vinyl-wrap"
            style={{ x, y, rotate, scale, opacity }}
          >
            <button
              type="button"
              onClick={() => navigate('/store')}
              aria-label="Open vinyl store"
              className="vinyl-hover-button"
            >
              <VinylRecord className={story.className} imageSrc={story.imageSrc} />
            </button>
          </motion.div>
        </div>
      </div>
      <div className={`section-index ${index % 2 ? 'right-8' : 'left-8'}`}>0{index + 1}</div>
    </section>
  );
};

export default MusicStationLanding;
