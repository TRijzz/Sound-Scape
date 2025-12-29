import React from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';

// Layout Components
import Navbar from './components/layout/Navbar';
import Sidebar from './components/layout/Sidebar';
import NowPlayingFooter from './components/layout/NowPlayingFooter';

// Pages
import HomePage from './pages/HomePage';
import SearchResultsPage from './pages/SearchResultsPage';
import ArtistPage from './pages/ArtistPage';
import AlbumPage from './pages/AlbumPage';
import GenrePage from './pages/GenrePage';
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
import AdminGuard from './pages/admin/AdminGuard';
import NotFound from './pages/NotFound';

// Context Providers
import { MusicProvider } from './contexts/MusicContext';
import { useMusic } from './contexts/MusicContext';

function AuthPromptOverlay() {
  const { showAuthPrompt, setShowAuthPrompt } = useMusic();
  const navigate = useNavigate();
  const location = useLocation();
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

function App() {
  return (
    <MusicProvider>
      <Router>
        <div className="min-h-screen bg-dark-bg text-white font-inter">
          <div className="flex">
            {/* Sidebar */}
            <Sidebar />
            
            {/* Main Content */}
            <div className="flex-1 flex flex-col lg:ml-64">
              {/* Navbar */}
              <Navbar />
              
              {/* Page Content */}
              <main className="flex-1 overflow-y-auto pb-20 lg:pb-0">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/search" element={<SearchResultsPage />} />
                    <Route path="/artist/:id" element={<ArtistPage />} />
                    <Route path="/album/:id" element={<AlbumPage />} />
                    <Route path="/genre/:name" element={<GenrePage />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/signup" element={<SignupPage />} />
                    <Route path="/forgot-password" element={<ForgotPassword />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route path="/verify-email" element={<EmailVerification />} />
                    <Route path="/email-verified" element={<EmailVerified />} />
                    <Route path="/onboarding" element={<Onboarding />} />
                    <Route path="/verification-success" element={<VerificationSuccess />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="/profile" element={<SettingsPage defaultTab="profile" />} />
                    <Route path="/account" element={<SettingsPage defaultTab="account" />} />
                    <Route path="/liked" element={<LikedSongs />} />
                    <Route path="/library" element={<LibraryPage />} />
                    <Route path="/playlist/:id" element={<PlaylistPage />} />
                    <Route path="/admin" element={<AdminGuard><AdminPage /></AdminGuard>} />
                    <Route path="/admin/artists" element={<AdminGuard><AdminArtists /></AdminGuard>} />
                    <Route path="/admin/albums" element={<AdminGuard><AdminAlbums /></AdminGuard>} />
                    <Route path="/admin/songs" element={<AdminGuard><AdminSongs /></AdminGuard>} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </motion.div>
              </main>
            </div>
          </div>
          
          {/* Now Playing Footer */}
          <NowPlayingFooter />
          <AuthPromptOverlay />
        </div>
      </Router>
    </MusicProvider>
  );
}

export default App;
