import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const Playlists = () => {
  // In a real app, you would fetch the user's playlists here
  const playlists = []; // Empty array for now
  const isLoading = false; // Set to false for demo

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-neon-blue"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-3xl font-bold text-white mb-8">Your Playlists</h1>
        
        {playlists.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="max-w-md mx-auto">
              <div className="w-24 h-24 bg-dark-gray rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-12 h-12 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">No playlists yet</h2>
              <p className="text-gray-400 mb-6">Create your first playlist to get started</p>
              <Link 
                to="/create-playlist"
                className="inline-block px-6 py-2 bg-neon-blue text-dark-bg font-medium rounded-full hover:bg-opacity-90 transition-colors"
              >
                Create Playlist
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {/* Playlist cards would be mapped here */}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default Playlists;
