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
import { usePlaylistActions } from '../../hooks/usePlaylists';

function Sidebar() {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [playlistName, setPlaylistName] = useState('');
  const { playlists, handleCreatePlaylist, handleEditPlaylist, handleDeletePlaylist } = usePlaylistActions();
  const [editTarget, setEditTarget] = useState(null);
  const [showItemMenuId, setShowItemMenuId] = useState(null);

  const menuItems = [
    { path: '/', icon: HomeIcon, label: 'Home' },
    { path: '/search', icon: SearchIcon, label: 'Search' },
    { path: '/liked', icon: HeartIcon, label: 'Liked Songs' },
    { path: '/library', icon: MusicNoteIcon, label: 'Your Library' },
  ];

  const handleCreate = () => {
    const name = playlistName.trim() || 'My Playlist';
    const pl = handleCreatePlaylist({ name });
    setShowCreate(false);
    setPlaylistName('');
  };

  const handleRename = async () => {
    if (!editTarget) return;
    const name = playlistName.trim();
    if (!name) return;
    await handleEditPlaylist(editTarget._id || editTarget.id, { name });
    setShowCreate(false);
    setPlaylistName('');
    setEditTarget(null);
  };

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
        className={`w-64 bg-dark-gray h-screen flex flex-col border-r border-gray-800 fixed top-0 left-0 z-50 overflow-y-auto ${
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
              <button onClick={() => setShowCreate(true)} className="text-gray-400 hover:text-neon-blue transition-colors">
                <PlusIcon className="w-4 h-4" />
              </button>
            </div>
            
            <ul className="mt-2 space-y-1">
              {playlists.length === 0 ? (
                <li className="px-4 py-2 text-gray-500 text-sm">No playlists yet</li>
              ) : playlists.map((playlist) => (
                <li key={playlist._id || playlist.id} className="relative">
                  <Link
                    to={`/playlist/${playlist._id || playlist.id}`}
                    className="flex items-center space-x-3 px-4 py-2 rounded-lg text-gray-300 hover:text-white hover:bg-light-gray transition-all duration-200"
                  >
                    <div className="w-8 h-8 rounded bg-gradient-to-br from-neon-blue/30 to-purple-500/30 flex items-center justify-center">
                      <MusicNoteIcon className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-sm truncate">{playlist.name}</span>
                    <button 
                      onClick={(e)=>{ e.preventDefault(); e.stopPropagation(); setShowItemMenuId(showItemMenuId === (playlist._id || playlist.id) ? null : (playlist._id || playlist.id)); }}
                      className="ml-auto text-gray-400 hover:text-white"
                      title="Options"
                      aria-label="Options"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>
                    </button>
                  </Link>
                  {showItemMenuId === (playlist._id || playlist.id) && (
                    <div className="absolute right-2 top-full mt-1 bg-dark-gray border border-gray-700 rounded-lg shadow-lg z-50 w-40">
                      <button 
                        onClick={(e)=>{ e.stopPropagation(); setEditTarget(playlist); setPlaylistName(playlist.name || ''); setShowCreate(true); setShowItemMenuId(null); }}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-800"
                      >
                        Rename
                      </button>
                      <button 
                        onClick={async (e)=>{ e.stopPropagation(); await handleDeletePlaylist(playlist._id || playlist.id); setShowItemMenuId(null); }}
                        className="block w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-800"
                      >
                        Delete
                      </button>
                    </div>
                  )}
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
      {showCreate && (
        <motion.div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowCreate(false)} />
          <motion.div className="relative z-10 w-full max-w-md bg-dark-gray border border-gray-700 rounded-xl p-6" initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }}>
            <h3 className="text-xl font-semibold text-white mb-3">{editTarget ? 'Rename playlist' : 'New playlist'}</h3>
            <input
              type="text"
              value={playlistName}
              onChange={(e)=>setPlaylistName(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-light-gray/50 text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-neon-blue"
              placeholder="Playlist name"
            />
            <div className="mt-4 flex justify-end space-x-3">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-lg bg-light-gray/50 text-white hover:bg-light-gray">Cancel</button>
              {editTarget ? (
                <button onClick={handleRename} className="px-4 py-2 rounded-lg bg-neon-blue text-dark-bg hover:bg-neon-blue/80">Save</button>
              ) : (
                <button onClick={handleCreate} className="px-4 py-2 rounded-lg bg-neon-blue text-dark-bg hover:bg-neon-blue/80">Create</button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </>
  );
}
export default Sidebar;
