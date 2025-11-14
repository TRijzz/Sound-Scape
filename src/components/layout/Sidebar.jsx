import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  HomeIcon, 
  SearchIcon, 
  HeartIcon, 
  UserIcon,
  MusicNoteIcon,
  PlusIcon 
} from '../ui/Icons';

function Sidebar() {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const menuItems = [
    { path: '/', icon: HomeIcon, label: 'Home' },
    { path: '/search', icon: SearchIcon, label: 'Search' },
    { path: '/liked', icon: HeartIcon, label: 'Liked Songs' },
    { path: '/library', icon: MusicNoteIcon, label: 'Your Library' },
  ];

  const playlists = [
    { id: 1, name: 'My Playlist #1', image: '/api/placeholder/40/40' },
    { id: 2, name: 'My Playlist #2', image: '/api/placeholder/40/40' },
    { id: 3, name: 'My Playlist #3', image: '/api/placeholder/40/40' },
  ];

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-dark-gray rounded-lg text-white"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <motion.div 
        className={`w-64 bg-dark-gray h-screen flex flex-col border-r border-gray-800 fixed lg:relative z-50 ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } transition-transform duration-300`}
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {/* Logo */}
        <div className="p-6">
          <h1 className="text-2xl font-bold text-neon-blue font-poppins">
            Sound Scape
          </h1>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-4">
          <ul className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                      isActive 
                        ? 'bg-neon-blue/20 text-neon-blue border border-neon-blue/30' 
                        : 'text-gray-300 hover:text-white hover:bg-light-gray'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* Playlists Section */}
          <div className="mt-8">
            <div className="flex items-center justify-between px-4 py-2">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                Playlists
              </h3>
              <button className="text-gray-400 hover:text-neon-blue transition-colors">
                <PlusIcon className="w-4 h-4" />
              </button>
            </div>
            
            <ul className="mt-2 space-y-1">
              {playlists.map((playlist) => (
                <li key={playlist.id}>
                  <Link
                    to={`/playlist/${playlist.id}`}
                    className="flex items-center space-x-3 px-4 py-2 rounded-lg text-gray-300 hover:text-white hover:bg-light-gray transition-all duration-200"
                  >
                    {/* Music tone icon instead of generic image */}
                    <div className="w-8 h-8 rounded bg-gradient-to-br from-neon-blue/30 to-purple-500/30 flex items-center justify-center">
                      <MusicNoteIcon className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-sm truncate">{playlist.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        {/* User Section */}
        <div className="p-4 border-t border-gray-800">
          <Link
            to="/settings"
            className="flex items-center space-x-3 px-4 py-3 rounded-xl text-gray-300 hover:text-white hover:bg-light-gray transition-all duration-200"
          >
            <UserIcon className="w-5 h-5" />
            <span className="font-medium">Settings</span>
          </Link>
        </div>
      </motion.div>
    </>
  );
}
export default Sidebar;