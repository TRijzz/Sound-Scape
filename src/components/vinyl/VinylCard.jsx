import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import vinylDisc from '../../assets/vinyl.svg';

export default function VinylCard({ vinyl }) {
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);

  const imageSrc = vinyl.image_base64 
    ? `data:${vinyl.mime_type || 'image/png'};base64,${vinyl.image_base64}` 
    : vinyl.image_url || '/src/assets/album_art_placeholder.svg';

  return (
    <motion.div 
      className="group relative cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => navigate(`/vinyl/${vinyl._id || vinyl.id}`)}
      whileHover={{ y: -5 }}
      transition={{ duration: 0.3 }}
    >
      {/* Vinyl Disc Animation Background */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[85%] aspect-square -z-10 transition-all duration-500 ease-out"
           style={{ 
             transform: isHovered ? 'translate(-30%, -10px)' : 'translate(-50%, 0)',
             opacity: isHovered ? 1 : 0 
           }}>
        <div className="w-full h-full">
          <img 
            src={vinylDisc} 
            alt="" 
            className="w-full h-full object-contain drop-shadow-2xl spinning"
            style={{ animationPlayState: isHovered ? 'running' : 'paused' }}
          />
        </div>
      </div>

      {/* Main Card */}
      <div className="bg-[#18181B] rounded-2xl p-4 border border-gray-800/50 group-hover:border-neon-blue/30 transition-colors shadow-xl">
        <div className="relative aspect-square rounded-xl overflow-hidden mb-4 shadow-lg">
          <img 
            src={imageSrc} 
            alt={vinyl.name} 
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          
          <div className="absolute bottom-3 right-3 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
            <div className="bg-neon-blue text-dark-bg p-2 rounded-full shadow-lg">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm4.5-9H13V7.5c0-.28-.22-.5-.5-.5s-.5.22-.5.5V11H7.5c-.28 0-.5.22-.5.5s.22.5.5.5H12v3.5c0 .28.22.5.5.5s.5-.22.5-.5V12h3.5c.28 0 .5-.22.5-.5s-.22-.5-.5-.5z"/>
              </svg>
            </div>
          </div>
        </div>

        <div className="space-y-1">
          <h3 className="font-bold text-white truncate text-lg group-hover:text-neon-blue transition-colors">
            {vinyl.name}
          </h3>
          <p className="text-gray-400 text-sm truncate">
            {vinyl.artist}
          </p>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-800/50">
            <span className="text-neon-blue font-bold text-lg">
              ${vinyl.price?.toFixed(2) || '0.00'}
            </span>
            <span className="text-[10px] uppercase tracking-wider text-gray-500 font-bold px-2 py-0.5 bg-gray-800/50 rounded">
              Vinyl Edition
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
