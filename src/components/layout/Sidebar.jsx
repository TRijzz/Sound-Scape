import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HomeIcon,
  SearchIcon,
  HeartIcon,
  UserIcon,
  MusicNoteIcon,
  PlusIcon,
  VinylIcon
} from '../ui/Icons';
import { usePlaylistActions } from '../../hooks/usePlaylists';
import { useSidebar } from '../../contexts/SidebarContext';
import albumArtPlaceholder from '../../assets/album_art_placeholder.svg';
import useEscapeKey from '../../hooks/useEscapeKey';

const EXPANDED_WIDTH = 256;
const COLLAPSED_WIDTH = 76;

const sidebarTransition = { duration: 0.3, ease: [0.22, 1, 0.36, 1] };
const labelVariants = {
  expanded: { opacity: 1, x: 0, transition: { duration: 0.2, delay: 0.05 } },
  collapsed: { opacity: 0, x: -8, transition: { duration: 0.15 } }
};

const AnalyticsIcon = ({ className = '' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 3v18h18" />
    <path d="M7 14l3-3 3 3 5-6" />
  </svg>
);

const ShieldIcon = ({ className = '' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2 4 5v7c0 4.5 3.2 8.5 8 10 4.8-1.5 8-5.5 8-10V5l-8-3z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

const SettingsIcon = ({ className = '' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const BurgerIcon = ({ open, className = '' }) => (
  <motion.svg
    className={className}
    viewBox="0 0 24 24"
    initial={false}
    animate={{ rotate: open ? 90 : 0 }}
    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
  >
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </motion.svg>
);

function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { collapsed, toggleCollapsed, mobileOpen, openMobile, closeMobile } = useSidebar();
  const [showCreate, setShowCreate] = useState(false);
  const [playlistName, setPlaylistName] = useState('');
  const { playlists, handleCreatePlaylist, handleEditPlaylist, handleDeletePlaylist } = usePlaylistActions();
  const [editTarget, setEditTarget] = useState(null);
  const [showItemMenuId, setShowItemMenuId] = useState(null);

  useEscapeKey(mobileOpen || showCreate || Boolean(showItemMenuId), () => {
    closeMobile();
    setShowCreate(false);
    setShowItemMenuId(null);
    setEditTarget(null);
    setPlaylistName('');
  });

  // Auto-close mobile drawer on route change
  React.useEffect(() => {
    closeMobile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const menuItems = [
    { path: '/home', icon: HomeIcon, label: 'Home' },
    { path: '/search', icon: SearchIcon, label: 'Search' },
    { path: '/store', icon: VinylIcon, label: 'Vinyl Store' },
    { path: '/liked', icon: HeartIcon, label: 'Liked Songs' },
    { path: '/library', icon: MusicNoteIcon, label: 'Your Library' },
    { path: '/analytics', icon: AnalyticsIcon, label: 'Analytics' }
  ];

  const handleCreate = async () => {
    const name = playlistName.trim() || 'My Playlist';
    const playlist = await handleCreatePlaylist({ name });
    setShowCreate(false);
    setPlaylistName('');
    if (playlist?._id || playlist?.id) {
      navigate(`/playlist/${playlist._id || playlist.id}`);
    }
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

  // The desktop sidebar uses fixed positioning; the mobile drawer slides in.
  const isMobileVisible = mobileOpen;

  return (
    <>
      {/* Burger button - always visible on mobile, expands/collapses on desktop */}
      <div className="fixed top-4 left-4 z-[55] flex items-center gap-2 lg:hidden">
        <button
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          onClick={() => (mobileOpen ? closeMobile() : openMobile())}
          className="relative h-11 w-11 rounded-2xl border border-white/10 bg-white/5 text-white backdrop-blur-xl shadow-lg shadow-black/40 transition hover:border-neon-blue/40 hover:bg-white/10 flex items-center justify-center"
        >
          <BurgerIcon open={mobileOpen} className="h-5 w-5" />
        </button>
      </div>

      {/* Mobile backdrop */}
      <AnimatePresence>
        {isMobileVisible && (
          <motion.div
            key="sidebar-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-md z-40"
            onClick={closeMobile}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{
          width: collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH,
          x: isMobileVisible ? 0 : undefined
        }}
        transition={sidebarTransition}
        className={`fixed top-0 left-0 h-screen z-50 flex flex-col overflow-hidden border-r border-white/[0.06]
          bg-[linear-gradient(180deg,rgba(10,10,16,0.92),rgba(6,8,14,0.88))] backdrop-blur-2xl shadow-[0_20px_60px_rgba(0,0,0,0.55)]
          ${isMobileVisible ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          transition-transform duration-300 ease-out`}
        style={{ width: collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH }}
      >
        {/* Decorative gradient */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-24 h-48 bg-[radial-gradient(circle_at_top,rgba(0,191,255,0.25),transparent_60%)]" />

        {/* Logo + burger */}
        <div className={`relative z-10 flex items-center ${collapsed ? 'justify-center px-3' : 'justify-between px-5'} py-5`}>
          <Link to="/home" className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-neon-blue/30 via-cyan-400/20 to-purple-500/30 border border-white/15 shadow-inner shadow-cyan-400/20">
              <VinylIcon className="h-5 w-5 text-neon-blue" />
            </div>
            <AnimatePresence initial={false}>
              {!collapsed && (
                <motion.span
                  key="logo"
                  variants={labelVariants}
                  initial="collapsed"
                  animate="expanded"
                  exit="collapsed"
                  className="font-poppins text-lg font-black tracking-tight text-white whitespace-nowrap"
                >
                  Sound Scape
                </motion.span>
              )}
            </AnimatePresence>
          </Link>

          {!collapsed && (
            <button
              type="button"
              onClick={toggleCollapsed}
              aria-label="Collapse sidebar"
              className="hidden lg:flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-gray-300 hover:text-white hover:border-neon-blue/40 hover:bg-white/10 transition"
            >
              <BurgerIcon open={false} className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* When collapsed, render the toggle as a centered icon below the logo */}
        {collapsed && (
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label="Expand sidebar"
            className="hidden lg:flex mx-3 mb-2 h-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-gray-300 hover:text-white hover:border-neon-blue/40 hover:bg-white/10 transition"
          >
            <BurgerIcon open={true} className="h-4 w-4" />
          </button>
        )}

        {/* Nav menu */}
        <nav className="relative z-10 flex-1 overflow-y-auto overflow-x-hidden px-3 pb-4">
          <ul className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
              return (
                <li key={item.path} className="relative">
                  {isActive && (
                    <span
                      aria-hidden
                      className="pointer-events-none absolute -left-3 top-1/2 -translate-y-1/2 h-6 w-[3px] rounded-r-full bg-neon-blue shadow-[0_0_12px_rgba(0,191,255,0.8)]"
                    />
                  )}
                  <Link
                    to={item.path}
                    title={collapsed ? item.label : undefined}
                    className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200 ${
                      isActive
                        ? 'bg-neon-blue/15 text-neon-blue shadow-[0_0_24px_-8px_rgba(0,191,255,0.6)] border border-neon-blue/30'
                        : 'text-gray-300 hover:text-white hover:bg-white/[0.06] border border-transparent hover:border-white/10'
                    }`}
                  >
                    <Icon className={`h-5 w-5 shrink-0 ${isActive ? '' : 'group-hover:text-white'}`} />
                    <AnimatePresence initial={false}>
                      {!collapsed && (
                        <motion.span
                          key={`${item.path}-label`}
                          variants={labelVariants}
                          initial="collapsed"
                          animate="expanded"
                          exit="collapsed"
                          className="text-sm font-medium whitespace-nowrap"
                        >
                          {item.label}
                        </motion.span>
                      )}
                    </AnimatePresence>
                    {collapsed && (
                      <span className="pointer-events-none absolute left-full ml-3 hidden whitespace-nowrap rounded-md border border-white/10 bg-black/85 px-2.5 py-1 text-xs font-medium text-white opacity-0 shadow-lg shadow-black/40 backdrop-blur-md transition-opacity duration-150 group-hover:opacity-100 lg:block">
                        {item.label}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* Playlists */}
          <div className="mt-6">
            <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between px-3'} py-2`}>
              <AnimatePresence initial={false}>
                {!collapsed && (
                  <motion.h3
                    key="playlists-label"
                    variants={labelVariants}
                    initial="collapsed"
                    animate="expanded"
                    exit="collapsed"
                    className="text-[11px] font-bold uppercase tracking-[0.22em] text-gray-500"
                  >
                    Playlists
                  </motion.h3>
                )}
              </AnimatePresence>
              <button
                onClick={() => setShowCreate(true)}
                title="New playlist"
                className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:text-neon-blue hover:bg-white/5 transition"
              >
                <PlusIcon className="h-4 w-4" />
              </button>
            </div>

            <ul className="mt-1 space-y-1">
              {playlists.length === 0 ? (
                !collapsed && (
                  <li className="px-3 py-2 text-xs text-gray-500">No playlists yet</li>
                )
              ) : (
                playlists.map((playlist) => {
                  const playlistId = playlist._id || playlist.id;
                  return (
                    <li key={playlistId} className="relative group">
                      <Link
                        to={`/playlist/${playlistId}`}
                        title={collapsed ? playlist.name : undefined}
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-300 hover:text-white hover:bg-white/[0.06] transition"
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md overflow-hidden bg-gradient-to-br from-neon-blue/25 to-purple-500/25 border border-white/10">
                          {playlist.image ? (
                            <img src={playlist.image || albumArtPlaceholder} alt={playlist.name} className="h-full w-full object-cover" />
                          ) : (
                            <MusicNoteIcon className="h-4 w-4 text-white/80" />
                          )}
                        </div>
                        <AnimatePresence initial={false}>
                          {!collapsed && (
                            <motion.span
                              key={`${playlistId}-name`}
                              variants={labelVariants}
                              initial="collapsed"
                              animate="expanded"
                              exit="collapsed"
                              className="flex-1 truncate text-sm"
                            >
                              {playlist.name}
                            </motion.span>
                          )}
                        </AnimatePresence>
                        {!collapsed && (
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setShowItemMenuId(showItemMenuId === playlistId ? null : playlistId);
                            }}
                            className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-white transition"
                            title="Options"
                            aria-label="Options"
                          >
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                              <circle cx="5" cy="12" r="2" />
                              <circle cx="12" cy="12" r="2" />
                              <circle cx="19" cy="12" r="2" />
                            </svg>
                          </button>
                        )}
                      </Link>
                      {showItemMenuId === playlistId && !collapsed && (
                        <div className="absolute right-2 top-full mt-1 w-40 rounded-lg border border-white/10 bg-black/90 backdrop-blur-xl shadow-xl shadow-black/40 z-50">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditTarget(playlist);
                              setPlaylistName(playlist.name || '');
                              setShowCreate(true);
                              setShowItemMenuId(null);
                            }}
                            className="block w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-white/5 hover:text-white transition"
                          >
                            Rename
                          </button>
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              await handleDeletePlaylist(playlistId);
                              setShowItemMenuId(null);
                            }}
                            className="block w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-white/5 transition"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        </nav>

        {/* Bottom: user profile + settings */}
        <div className="relative z-10 border-t border-white/[0.06] px-3 py-3 space-y-1">
          <Link
            to="/profile"
            title={collapsed ? 'Profile' : undefined}
            className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-gray-300 hover:text-white hover:bg-white/[0.06] border border-transparent hover:border-white/10 transition"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-neon-blue/40 to-purple-500/40 border border-white/10">
              <UserIcon className="h-4 w-4 text-white" />
            </div>
            <AnimatePresence initial={false}>
              {!collapsed && (
                <motion.span
                  key="profile-label"
                  variants={labelVariants}
                  initial="collapsed"
                  animate="expanded"
                  exit="collapsed"
                  className="text-sm font-medium whitespace-nowrap"
                >
                  Profile
                </motion.span>
              )}
            </AnimatePresence>
          </Link>
          <Link
            to="/security/change-password"
            title={collapsed ? 'Security' : undefined}
            className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-gray-300 hover:text-white hover:bg-white/[0.06] border border-transparent hover:border-white/10 transition"
          >
            <ShieldIcon className="h-5 w-5 shrink-0" />
            <AnimatePresence initial={false}>
              {!collapsed && (
                <motion.span
                  key="security-label"
                  variants={labelVariants}
                  initial="collapsed"
                  animate="expanded"
                  exit="collapsed"
                  className="text-sm font-medium whitespace-nowrap"
                >
                  Security
                </motion.span>
              )}
            </AnimatePresence>
          </Link>
          <Link
            to="/settings"
            title={collapsed ? 'Settings' : undefined}
            className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-gray-300 hover:text-white hover:bg-white/[0.06] border border-transparent hover:border-white/10 transition"
          >
            <SettingsIcon className="h-5 w-5 shrink-0" />
            <AnimatePresence initial={false}>
              {!collapsed && (
                <motion.span
                  key="settings-label"
                  variants={labelVariants}
                  initial="collapsed"
                  animate="expanded"
                  exit="collapsed"
                  className="text-sm font-medium whitespace-nowrap"
                >
                  Settings
                </motion.span>
              )}
            </AnimatePresence>
          </Link>
        </div>
      </motion.aside>

      {/* Playlist create/rename modal */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            className="fixed inset-0 z-[60] flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setShowCreate(false)} />
            <motion.div
              className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-[rgba(12,14,22,0.85)] backdrop-blur-2xl p-6 shadow-2xl shadow-black/50"
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
            >
              <h3 className="text-xl font-semibold text-white mb-3">{editTarget ? 'Rename playlist' : 'New playlist'}</h3>
              <input
                type="text"
                value={playlistName}
                onChange={(e) => setPlaylistName(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-white/5 text-white border border-white/10 focus:outline-none focus:ring-2 focus:ring-neon-blue"
                placeholder="Playlist name"
                autoFocus
              />
              <div className="mt-4 flex justify-end gap-3">
                <button
                  onClick={() => setShowCreate(false)}
                  className="px-4 py-2 rounded-lg bg-white/5 text-white border border-white/10 hover:bg-white/10 transition"
                >
                  Cancel
                </button>
                {editTarget ? (
                  <button onClick={handleRename} className="px-4 py-2 rounded-lg bg-neon-blue text-dark-bg font-semibold hover:bg-neon-blue/80 transition">
                    Save
                  </button>
                ) : (
                  <button onClick={handleCreate} className="px-4 py-2 rounded-lg bg-neon-blue text-dark-bg font-semibold hover:bg-neon-blue/80 transition">
                    Create
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default Sidebar;
