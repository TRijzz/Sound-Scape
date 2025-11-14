import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
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
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import SettingsPage from './pages/SettingsPage';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import EmailVerification from './pages/auth/EmailVerification';

// Context Providers
import { MusicProvider } from './contexts/MusicContext';

function App() {
  return (
    <MusicProvider>
      <Router>
        <div className="min-h-screen bg-dark-bg text-white font-inter">
          <div className="flex">
            {/* Sidebar */}
            <Sidebar />
            
            {/* Main Content */}
            <div className="flex-1 flex flex-col lg:ml-0">
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
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/signup" element={<SignupPage />} />
                    <Route path="/forgot-password" element={<ForgotPassword />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route path="/verify-email" element={<EmailVerification />} />
                    <Route path="/settings" element={<SettingsPage />} />
                  </Routes>
                </motion.div>
              </main>
            </div>
          </div>
          
          {/* Now Playing Footer */}
          <NowPlayingFooter />
        </div>
      </Router>
    </MusicProvider>
  );
}

export default App;