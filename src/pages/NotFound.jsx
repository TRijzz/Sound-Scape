import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

export default function NotFound() {
  const navigate = useNavigate();
  const shards = [
    { x: 130, y: 30 },
    { x: 140, y: 50 },
    { x: 120, y: 70 },
    { x: 145, y: 95 },
    { x: 115, y: 120 },
    { x: 150, y: 150 },
    { x: 110, y: 180 },
    { x: 130, y: 230 },
  ];
  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-bg text-white p-6">
      <div className="w-full max-w-xl text-center space-y-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <h1 className="text-4xl font-bold">404 page not found</h1>
          <p className="text-gray-400 mt-2">Looks like this track doesn’t exist.</p>
        </motion.div>

        <div className="flex items-center justify-center">
          <svg width="260" height="260" viewBox="0 0 260 260" className="drop-shadow-xl">
            <defs>
              <radialGradient id="disk" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#1e3a8a" />
                <stop offset="60%" stopColor="#2563eb" />
                <stop offset="100%" stopColor="#1d4ed8" />
              </radialGradient>
              <clipPath id="leftHalf">
                <rect x="0" y="0" width="130" height="260" />
              </clipPath>
              <clipPath id="rightHalf">
                <rect x="130" y="0" width="130" height="260" />
              </clipPath>
            </defs>

            <motion.g
              initial={{ x: 0, rotate: 0 }}
              animate={{ x: [0, -2, 2, -2, 0, -6, -12, -18, -24, -30], rotate: [0, -0.5, 0.5, -0.5, 0, -2, -4, -6, -7, -8] }}
              transition={{ duration: 2, times: [0, 0.1, 0.2, 0.3, 0.4, 0.55, 0.7, 0.85, 0.95, 1], ease: 'easeInOut' }}
              clipPath="url(#leftHalf)"
            >
              <circle cx="130" cy="130" r="110" fill="url(#disk)" />
              <circle cx="130" cy="130" r="18" fill="#0f172a" />
              <circle cx="130" cy="130" r="6" fill="#93c5fd" />
            </motion.g>

            <motion.g
              initial={{ x: 0, rotate: 0 }}
              animate={{ x: [0, 2, -2, 2, 0, 6, 12, 18, 24, 30], rotate: [0, 0.5, -0.5, 0.5, 0, 2, 4, 6, 7, 8] }}
              transition={{ duration: 2, times: [0, 0.1, 0.2, 0.3, 0.4, 0.55, 0.7, 0.85, 0.95, 1], ease: 'easeInOut' }}
              clipPath="url(#rightHalf)"
            >
              <circle cx="130" cy="130" r="110" fill="url(#disk)" />
              <circle cx="130" cy="130" r="18" fill="#0f172a" />
              <circle cx="130" cy="130" r="6" fill="#93c5fd" />
            </motion.g>

            <motion.path
              d="M 130 30 L 140 50 L 120 70 L 145 95 L 115 120 L 150 150 L 110 180 L 130 230"
              stroke="#c084fc"
              strokeWidth="3"
              strokeLinecap="round"
              fill="none"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 1.6, ease: 'easeInOut', delay: 0.2 }}
            />

            {shards.map((p, i) => (
              <motion.circle
                key={i}
                cx={p.x}
                cy={p.y}
                r="2.5"
                fill="#93c5fd"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: [0, 1, 0], y: [0, -6, 18], x: [0, (i % 2 ? -4 : 4), (i % 2 ? -8 : 8)], scale: [0.6, 1, 0.8] }}
                transition={{ duration: 1, delay: 0.5 + i * 0.06, ease: 'easeOut' }}
              />
            ))}
          </svg>
        </div>

        <div className="flex items-center justify-center gap-3">
          <button onClick={() => navigate(-1)} className="px-4 py-2 rounded-lg bg-light-gray/50 text-white border border-gray-700 hover:bg-light-gray">Go back</button>
          <button onClick={() => navigate('/')} className="px-4 py-2 rounded-lg bg-neon-blue text-dark-bg hover:bg-neon-blue/80">Go home</button>
        </div>
      </div>
    </div>
  );
}

