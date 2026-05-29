import React from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';

import Navbar from './components/layout/Navbar';
import Sidebar from './components/layout/Sidebar';
import NowPlayingFooter from './components/layout/NowPlayingFooter';

// Pages
import HomePage from './pages/HomePage';
import LandingPage from './pages/LandingPage';
import SearchResultsPage from './pages/SearchResultsPage';
import ArtistPage from './pages/ArtistPage';
import UserProfilePage from './pages/UserProfilePage';
import AlbumPage from './pages/AlbumPage';
import GenrePage from './pages/GenrePage';
import MoodBrowsePage from './pages/MoodBrowsePage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import SettingsPage from './pages/SettingsPage';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import EmailVerification from './pages/auth/EmailVerification';
import EmailVerified from './pages/auth/EmailVerified';
import Onboarding from './pages/auth/Onboarding';
import VerificationSuccess from './pages/auth/VerificationSuccess';
import LikedSongs from './pages/LikedSongs';
import LibraryPage from './pages/LibraryPage';
import PlaylistPage from './pages/PlaylistPage';
import AdminPage from './pages/AdminPage';
import AdminArtists from './pages/admin/AdminArtists';
import AdminAlbums from './pages/admin/AdminAlbums';
import AdminSongs from './pages/admin/AdminSongs';
import AdminCreateSong from './pages/admin/AdminCreateSong';
import AdminEditSong from './pages/admin/AdminEditSong';
import AdminEditAlbum from './pages/admin/AdminEditAlbum';
import AdminCategories from './pages/admin/AdminCategories';
import AdminLyrics from './pages/admin/AdminLyrics';
import AdminVinyls from './pages/admin/AdminVinyls';
import AdminUsers from './pages/admin/AdminUsers';
import AdminGuard from './pages/admin/AdminGuard';
import NotFound from './pages/NotFound';
import VinylStore from './pages/VinylStore';
import VinylPage from './pages/VinylPage';
import KhaltiPaymentCallbackPage from './pages/KhaltiPaymentCallbackPage';
import AnalyticsPage from './pages/AnalyticsPage';
import ChangePassword from './pages/security/ChangePassword';

// Context Providers
import { MusicProvider } from './contexts/MusicContext';
import { useMusic } from './contexts/MusicContext';
import { SidebarProvider, useSidebar } from './contexts/SidebarContext';
import useEscapeKey from './hooks/useEscapeKey';

function AuthPromptOverlay() {
  const { showAuthPrompt, setShowAuthPrompt } = useMusic();
  const navigate = useNavigate();
  const location = useLocation();
  useEscapeKey(showAuthPrompt, () => setShowAuthPrompt(false));
  React.useEffect(() => {
    if (location.pathname.startsWith('/login') || location.pathname.startsWith('/signup')) {
      if (showAuthPrompt) setShowAuthPrompt(false);
    }
  }, [location.pathname, showAuthPrompt, setShowAuthPrompt]);
  const handleLogin = () => {
    const returnTo = `${window.location.pathname}${window.location.search}`;
    setShowAuthPrompt(false);
    navigate('/login', { state: { from: returnTo } });
  };
  if (!showAuthPrompt) return null;
  return (
    <motion.div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={() => setShowAuthPrompt(false)} />
      <motion.div className="relative z-10 w-full max-w-md bg-dark-gray border border-gray-700 rounded-xl p-6 text-center" initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }}>
        <h3 className="text-xl font-semibold text-white mb-2">Sign in required</h3>
        <p className="text-gray-300 mb-4">You need to sign in first to play songs.</p>
        <div className="flex items-center justify-center space-x-3">
          <button onClick={() => setShowAuthPrompt(false)} className="px-4 py-2 rounded-lg bg-light-gray/50 text-white hover:bg-light-gray">Cancel</button>
          <button onClick={handleLogin} className="px-4 py-2 rounded-lg bg-neon-blue text-dark-bg hover:bg-neon-blue/80">Sign in</button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Maps the current route to a human-readable page name shown in the browser tab.
const USER_PAGE_TITLES = [
  { match: (p) => p === '/home', title: 'Home' },
  { match: (p) => p.startsWith('/search'), title: 'Search' },
  { match: (p) => p.startsWith('/artist/'), title: 'Artist' },
  { match: (p) => p.startsWith('/album/'), title: 'Album' },
  { match: (p) => p.startsWith('/genre/'), title: 'Genre' },
  { match: (p) => p === '/moods', title: 'Moods' },
  { match: (p) => p === '/store', title: 'Vinyl Store' },
  { match: (p) => p.startsWith('/vinyl/'), title: 'Vinyl' },
  { match: (p) => p.startsWith('/payment/khalti'), title: 'Payment' },
  { match: (p) => p === '/login', title: 'Log In' },
  { match: (p) => p === '/signup', title: 'Sign Up' },
  { match: (p) => p.startsWith('/forgot-password'), title: 'Forgot Password' },
  { match: (p) => p.startsWith('/reset-password'), title: 'Reset Password' },
  { match: (p) => p.startsWith('/verify-email'), title: 'Verify Email' },
  { match: (p) => p.startsWith('/email-verified'), title: 'Email Verified' },
  { match: (p) => p.startsWith('/verification-success'), title: 'Email Verified' },
  { match: (p) => p === '/onboarding', title: 'Onboarding' },
  { match: (p) => p === '/settings', title: 'Settings' },
  { match: (p) => p === '/account', title: 'Account' },
  { match: (p) => p === '/profile', title: 'Profile' },
  { match: (p) => p.startsWith('/user/'), title: 'Profile' },
  { match: (p) => p === '/liked', title: 'Liked Songs' },
  { match: (p) => p === '/library', title: 'Your Library' },
  { match: (p) => p.startsWith('/playlist/'), title: 'Playlist' },
  { match: (p) => p === '/analytics', title: 'Analytics' },
  { match: (p) => p.startsWith('/security/change-password'), title: 'Change Password' }
];

const ADMIN_PAGE_TITLES = [
  { match: (p) => p === '/admin/artists', title: 'Artists' },
  { match: (p) => p === '/admin/albums', title: 'Albums' },
  { match: (p) => p === '/admin/songs/create', title: 'Create Song' },
  { match: (p) => p.startsWith('/admin/songs/edit'), title: 'Edit Song' },
  { match: (p) => p === '/admin/songs', title: 'Songs' },
  { match: (p) => p.startsWith('/admin/albums/edit'), title: 'Edit Album' },
  { match: (p) => p === '/admin/categories', title: 'Categories' },
  { match: (p) => p === '/admin/lyrics', title: 'Lyrics' },
  { match: (p) => p === '/admin/vinyls', title: 'Vinyls' },
  { match: (p) => p === '/admin/users', title: 'Users' },
  { match: (p) => p.startsWith('/admin'), title: 'Dashboard' }
];

function resolvePageTitle(pathname) {
  if (pathname === '/') return 'Sound Scape — Music Streaming & Vinyl';
  if (pathname.startsWith('/admin')) {
    const entry = ADMIN_PAGE_TITLES.find((t) => t.match(pathname));
    return `${entry ? entry.title : 'Dashboard'} • Sound Scape Admin`;
  }
  const entry = USER_PAGE_TITLES.find((t) => t.match(pathname));
  return entry ? `${entry.title} • Sound Scape` : 'Sound Scape';
}

function AppContent() {                     //Frontend Layout, decides when to show sidebar/navbar and sets page title based on route
  const location = useLocation();
  const { collapsed } = useSidebar();
  const isAdmin = location.pathname.startsWith('/admin');
  const isLandingPage = location.pathname === '/';
  const authShellRoutes = [
    '/login',
    '/signup',
    '/forgot-password',
    '/reset-password',
    '/verify-email',
    '/email-verified',
    '/verification-success',
    '/onboarding'
  ];
  const hideChrome = isLandingPage || authShellRoutes.some((route) => location.pathname.startsWith(route));
  const showSidebar = !isAdmin && !hideChrome;
  const sidebarMarginClass = showSidebar ? (collapsed ? 'lg:ml-[76px]' : 'lg:ml-64') : '';

  // Reflect the current page in the browser tab title.
  React.useEffect(() => {
    document.title = resolvePageTitle(location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-dark-bg text-white font-inter">
      <div className="flex">
        {showSidebar && <Sidebar />}

        <div className={`flex-1 min-w-0 flex flex-col transition-[margin] duration-300 ease-out ${sidebarMarginClass}`}>
          {showSidebar && <Navbar />}

          {/* Page Content - bottom padding clears the fixed NowPlayingFooter */}
          <main className="flex-1 min-w-0 overflow-x-hidden overflow-y-auto pb-28">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <Routes>                                            {/* Maps URLs to page components */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/home" element={<HomePage />} />
                <Route path="/search" element={<SearchResultsPage />} />
                <Route path="/artist/:id" element={<ArtistPage />} />
                <Route path="/user/:id" element={<UserProfilePage />} />
                <Route path="/album/:id" element={<AlbumPage />} />
                <Route path="/genre/:name" element={<GenrePage />} />
                <Route path="/moods" element={<MoodBrowsePage />} />
                <Route path="/payment/khalti/callback" element={<KhaltiPaymentCallbackPage />} />
                <Route path="/store" element={<VinylStore />} />
                <Route path="/vinyl/:id" element={<VinylPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignupPage />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/verify-email" element={<EmailVerification />} />
                <Route path="/email-verified" element={<EmailVerified />} />
                <Route path="/onboarding" element={<Onboarding />} />
                <Route path="/verification-success" element={<VerificationSuccess />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/profile" element={<UserProfilePage selfProfile />} />
                <Route path="/account" element={<SettingsPage defaultTab="account" />} />
                <Route path="/liked" element={<LikedSongs />} />
                <Route path="/library" element={<LibraryPage />} />
                <Route path="/playlist/:id" element={<PlaylistPage />} />
                <Route path="/analytics" element={<AnalyticsPage />} />
                <Route path="/security/change-password" element={<ChangePassword />} />
                <Route path="/admin" element={<AdminGuard><AdminPage /></AdminGuard>} />      {/* Admin protected routes */}
                <Route path="/admin/reset-password" element={<AdminGuard><AdminPage /></AdminGuard>} />
                <Route path="/admin/artists" element={<AdminGuard><AdminArtists /></AdminGuard>} />
                <Route path="/admin/albums" element={<AdminGuard><AdminAlbums /></AdminGuard>} />
                <Route path="/admin/songs" element={<AdminGuard><AdminSongs /></AdminGuard>} />
                <Route path="/admin/songs/create" element={<AdminGuard><AdminCreateSong /></AdminGuard>} />
                <Route path="/admin/songs/edit/:id" element={<AdminGuard><AdminEditSong /></AdminGuard>} />
                <Route path="/admin/albums/edit/:id" element={<AdminGuard><AdminEditAlbum /></AdminGuard>} />
                <Route path="/admin/categories" element={<AdminGuard><AdminCategories /></AdminGuard>} />
                <Route path="/admin/lyrics" element={<AdminGuard><AdminLyrics /></AdminGuard>} />
                <Route path="/admin/vinyls" element={<AdminGuard><AdminVinyls /></AdminGuard>} />
                <Route path="/admin/users" element={<AdminGuard><AdminUsers /></AdminGuard>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </motion.div>
          </main>
        </div>
      </div>
      
      {/* Now Playing Footer */}
      {!hideChrome && <NowPlayingFooter />}
      <AuthPromptOverlay />                        {/* Warning appears when guest tries to perform an action without login. */}
    </div>
  );
}

function App() {      //Whole app UI wrapped
  return (
    <MusicProvider>
      <SidebarProvider>
        <Router>
          <AppContent />
        </Router>
      </SidebarProvider>
    </MusicProvider>
  );
}

export default App;
