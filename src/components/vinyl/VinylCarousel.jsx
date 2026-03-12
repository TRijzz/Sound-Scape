import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

export default function VinylCarousel({ items }) {
  const [index, setIndex] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (!items || items.length === 0) return;
    const timer = setInterval(() => {
      setIndex(prevIndex => (prevIndex + 1) % items.length);
    }, 8000);
    return () => clearInterval(timer);
  }, [items?.length]);

  const handleNext = (e) => {
    if (e) e.stopPropagation();
    setIndex((index + 1) % items.length);
  };

  const handlePrev = (e) => {
    if (e) e.stopPropagation();
    setIndex((index - 1 + items.length) % items.length);
  };

  if (!items || items.length === 0) return null;

  const v = items[index];
  const imageSrc = v.image_base64
    ? `data:${v.mime_type || 'image/png'};base64,${v.image_base64}`
    : v.image_url || '/src/assets/album_art_placeholder.svg';

  return (
    <div className="relative w-full h-[400px] md:h-[450px] bg-gradient-to-br from-gray-900 to-[#050505] rounded-[2rem] overflow-hidden border border-white/5 shadow-2xl group">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-neon-blue/10 blur-[120px] rounded-full -z-0" />

      <div className="absolute inset-x-6 top-1/2 -translate-y-1/2 flex justify-between items-center z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <button onClick={handlePrev} className="w-12 h-12 flex items-center justify-center rounded-full bg-black/40 text-white hover:bg-neon-blue hover:text-dark-bg transition-all backdrop-blur-md border border-white/10">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <button onClick={handleNext} className="w-12 h-12 flex items-center justify-center rounded-full bg-black/40 text-white hover:bg-neon-blue hover:text-dark-bg transition-all backdrop-blur-md border border-white/10">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          className="relative z-10 w-full h-full flex flex-col md:flex-row items-center justify-center px-8 md:px-20 gap-8 md:gap-16 cursor-pointer"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          onClick={() => navigate(`/vinyl/${v._id || v.id}`)}
        >
          <div className="relative w-48 h-48 md:w-80 md:h-80 flex-shrink-0">
            <div className="absolute inset-0 rounded-[2rem] bg-[#18181B] border border-white/10 shadow-2xl" />
            <motion.img
              src={imageSrc}
              alt={v.name}
              className="relative z-10 w-full h-full object-contain p-6 drop-shadow-[0_20px_50px_rgba(0,0,0,0.8)]"
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 15, ease: 'linear' }}
            />
          </div>

          <div className="flex-1 text-center md:text-left space-y-4 max-w-xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <span className="text-neon-blue text-xs font-black uppercase tracking-[0.3em] mb-4 block">
                Featured Spotlight
              </span>
              <h2 className="text-4xl md:text-6xl font-black text-white leading-tight mb-2">
                {v.name}
              </h2>
              <p className="text-xl md:text-2xl text-gray-400 font-medium mb-6">
                by {v.artist}
              </p>
              <div className="flex flex-col md:flex-row items-center md:items-start gap-4">
                <button className="px-8 py-3 bg-neon-blue text-dark-bg font-black rounded-full hover:scale-105 transition-transform">
                  View Edition
                </button>
                <div className="text-gray-500 text-sm italic py-3">
                  Starting from ${v.price?.toFixed(2) || '0.00'}
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex space-x-2 z-20">
        {items.map((_, i) => (
          <button
            key={i}
            onClick={(e) => { e.stopPropagation(); setIndex(i); }}
            className={`h-1.5 rounded-full transition-all duration-300 ${i === index ? 'w-8 bg-neon-blue' : 'w-2 bg-gray-700 hover:bg-gray-600'}`}
          />
        ))}
      </div>
    </div>
  );
}
