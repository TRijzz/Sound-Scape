import React from 'react';
import { motion } from 'framer-motion';

const LibraryPage = () => {
  return (
    <div className="p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="bg-light-gray/50 rounded-2xl p-10 border border-gray-700 text-center"
      >
        <h1 className="text-2xl font-bold text-white mb-3">Your Library</h1>
        <p className="text-gray-300">No playlists yet — start adding your favorites!</p>
      </motion.div>
    </div>
  );
};

export default LibraryPage;