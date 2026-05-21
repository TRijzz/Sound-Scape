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
    const rect = event.currentTarget.getBoundingClientRect();
    setCursor({
      x: ((event.clientX - rect.left) / rect.width) * 100,
      y: ((event.clientY - rect.top) / rect.height) * 100
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

        <motion.button
          type="button"
          onClick={openVinylStore}
          className="absolute z-10 hidden cursor-pointer border-0 bg-transparent p-0 lg:block"
          aria-label="Open vinyl store"
          style={{
            x: heroVinylX,
            y: heroVinylY,
            rotate: heroVinylRotate,
            translateX: `${(cursor.x - 50) * 0.12}px`,
            translateY: `${(cursor.y - 50) * 0.12}px`
          }}
        >
          <VinylRecord className="vinyl-hero-main" imageSrc={heroVinylImage} size="hero" />
        </motion.button>

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

          <motion.button
            type="button"
            onClick={openVinylStore}
            initial={{ opacity: 0, scale: 0.88, rotate: -8 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 1, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="relative mx-auto block border-0 bg-transparent p-0 lg:hidden"
            aria-label="Open vinyl store"
          >
            <VinylRecord className="vinyl-hero-main" imageSrc={heroVinylImage} size="hero" />
          </motion.button>

          <div className="pointer-events-none relative hidden min-h-[560px] lg:block" aria-hidden="true" />
        </div>
      </section>

      <section id="vinyls" className="relative">
        {displayStories.map((story, index) => (
          <StoryPanel key={`${story.title}-${index}`} story={story} index={index} />
        ))}
      </section>

      <section id="experience" className="relative overflow-hidden px-5 py-28 sm:px-8 lg:py-36">
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
                <h3 className="mt-2 text-2xl font-black text-white">Blue Hour Transmission</h3>
              </div>
              <div className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-cyan-200">
                Live
              </div>
            </div>
            <div className="waveform mt-10">
              {waveformBars.map((bar) => (
                <span
                  key={bar.id}
                  style={{ height: `${bar.height}px`, animationDelay: `${bar.delay}s` }}
                />
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
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
          <motion.button
            type="button"
            onClick={() => navigate('/store')}
            className="story-vinyl-wrap"
            aria-label="Open vinyl store"
            style={{ x, y, rotate, scale, opacity }}
            whileHover={{ scale: 1.12, filter: 'drop-shadow(0 0 42px rgba(0,191,255,0.55))' }}
            transition={{ type: 'spring', stiffness: 160, damping: 18 }}
          >
            <VinylRecord className={story.className} imageSrc={story.imageSrc} />
          </motion.button>
        </div>
      </div>
      <div className={`section-index ${index % 2 ? 'right-8' : 'left-8'}`}>0{index + 1}</div>
    </section>
  );
};

export default MusicStationLanding;
