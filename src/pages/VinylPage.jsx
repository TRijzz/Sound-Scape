import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import apiService from '../services/api';
import { ToastContainer } from '../components/ui/Toast';
import VinylPlayer from '../components/ui/VinylPlayer';
import { useMusic } from '../contexts/MusicContext';
import vinylDisc from '../assets/vinyl.svg';

const VinylPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { playTrack } = useMusic();
  
  const [vinyl, setVinyl] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  useEffect(() => {
    const fetchVinylData = async () => {
      try {
        setLoading(true);
        const data = await apiService.getVinyl(id);
        setVinyl(data);

        if (data.albumId) {
          const albumTracksRes = await apiService.getAlbumTracks(data.albumId._id || data.albumId);
          setTracks(albumTracksRes.songs || albumTracksRes.tracks || []);
        } else if (data.songId) {
          const songRes = await apiService.getSong(data.songId._id || data.songId);
          setTracks([songRes]);
        } else if (data.tracklist && data.tracklist.length > 0) {
          setTracks(data.tracklist);
        }
      } catch (err) {
        console.error('Error fetching vinyl:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchVinylData();
  }, [id]);

  const showToast = (message, type = 'success', duration = 3000) => {
    const toastId = Date.now();
    setToasts(prev => [...prev, { id: toastId, message, type, duration }]);
  };

  const removeToast = (toastId) => {
    setToasts(prev => prev.filter(toast => toast.id !== toastId));
  };

  const handlePurchase = async () => {
    try {
      await apiService.purchaseVinyl(vinyl._id || vinyl.id);
      showToast(`Successfully purchased ${vinyl.name}! Redirecting to collection...`);
      setTimeout(() => navigate('/library'), 2000);
    } catch (err) {
      showToast(`Failed to purchase: ${err.message}`, 'error');
    }
  };

  const handlePreview = () => {
    if (tracks.length > 0) {
      const firstTrack = tracks[0];
      playTrack(firstTrack);
      setIsPreviewOpen(true);
    } else {
      showToast('No tracks available for preview', 'error');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A0A0B] text-white">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-neon-blue/20 border-t-neon-blue rounded-full animate-spin"></div>
          <p className="text-gray-400 animate-pulse">Fetching vinyl details...</p>
        </div>
      </div>
    );
  }

  if (error || !vinyl) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0A0A0B] text-white p-4">
        <div className="text-2xl text-red-500 mb-4">Error: {error || 'Vinyl not found'}</div>
        <button 
          onClick={() => navigate('/store')}
          className="bg-neon-blue text-dark-bg px-6 py-2 rounded-lg font-bold"
        >
          Back to Store
        </button>
      </div>
    );
  }

  const imageSrc = vinyl.image_base64 
    ? `data:${vinyl.mime_type || 'image/png'};base64,${vinyl.image_base64}` 
    : vinyl.image_url || vinylDisc;

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white">
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      
      <VinylPlayer isOpen={isPreviewOpen} onClose={() => setIsPreviewOpen(false)} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => navigate('/store')}
          className="mb-12 flex items-center text-gray-500 hover:text-neon-blue transition-colors font-medium group"
        >
          <span className="mr-2 transform group-hover:-translate-x-1 transition-transform">&larr;</span> Back to Vinyl Shop
        </motion.button>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
          <div className="lg:col-span-5 sticky top-24">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6 }}
              className="relative aspect-square max-w-md mx-auto"
            >
              <div className="absolute inset-0 rounded-[2rem] bg-[#18181B] shadow-2xl border border-gray-800" />

              <motion.img
                src={imageSrc}
                alt={vinyl.name}
                className="relative z-10 w-full h-full object-contain p-6 drop-shadow-[0_20px_45px_rgba(0,0,0,0.45)]"
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 8, ease: 'linear' }}
              />

              <div className="absolute -inset-4 bg-neon-blue/20 blur-3xl rounded-full -z-10 opacity-30" />
            </motion.div>
          </div>

          <div className="lg:col-span-7 space-y-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="flex items-center space-x-3 mb-4">
                <span className="px-3 py-1 bg-neon-blue/10 text-neon-blue text-xs font-bold rounded-full uppercase tracking-wider border border-neon-blue/20">
                  Premium Vinyl Edition
                </span>
                {vinyl.release_year && (
                  <span className="text-gray-500 font-medium">Released {vinyl.release_year}</span>
                )}
              </div>
              
              <h1 className="text-5xl md:text-6xl font-black mb-4 tracking-tight">
                {vinyl.name}
              </h1>
              <p className="text-2xl text-gray-400 font-medium mb-8">
                by <span className="text-white hover:text-neon-blue cursor-pointer transition-colors">{vinyl.artist}</span>
              </p>

              <div className="flex flex-wrap gap-4 mb-10">
                <button
                  onClick={handlePurchase}
                  disabled={!vinyl.is_available}
                  className={`px-10 py-4 rounded-2xl font-black text-lg transition-all transform hover:scale-105 active:scale-95 flex items-center shadow-2xl ${
                    vinyl.is_available 
                    ? 'bg-neon-blue text-dark-bg hover:bg-neon-blue/90 shadow-neon-blue/20' 
                    : 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700'
                  }`}
                >
                  <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                  {vinyl.is_available ? `Buy for $${vinyl.price?.toFixed(2)}` : 'Sold Out'}
                </button>

                <button
                  onClick={handlePreview}
                  className="px-10 py-4 rounded-2xl font-black text-lg bg-white/5 text-white border border-white/10 hover:bg-white/10 transition-all flex items-center backdrop-blur-md"
                >
                  <svg className="w-6 h-6 mr-3 text-neon-blue" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  Preview Experience
                </button>
              </div>

              <div className="space-y-8">
                <section>
                  <h3 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-4 flex items-center">
                    <span className="w-1 h-4 bg-neon-blue mr-2"></span>
                    Description
                  </h3>
                  <p className="text-gray-400 text-lg leading-relaxed max-w-2xl">
                    {vinyl.description || `Experience ${vinyl.name} like never before. This limited edition vinyl features high-fidelity audio pressings on heavyweight wax, ensuring every detail of ${vinyl.artist}'s production is captured with warmth and clarity.`}
                  </p>
                </section>

                <section>
                  <h3 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-4 flex items-center">
                    <span className="w-1 h-4 bg-purple-500 mr-2"></span>
                    Tracklist
                  </h3>
                  <div className="bg-[#18181B] rounded-2xl border border-gray-800/50 overflow-hidden divide-y divide-gray-800/50">
                    {tracks.length > 0 ? (
                      tracks.map((track, idx) => (
                        <div 
                          key={track._id || track.id || idx} 
                          className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors group cursor-pointer"
                          onClick={() => playTrack(track)}
                        >
                          <div className="flex items-center space-x-4">
                            <span className="text-gray-600 font-mono text-sm w-4 text-right">{idx + 1}</span>
                            <div>
                              <div className="font-bold text-white group-hover:text-neon-blue transition-colors">
                                {track.name || track.title}
                              </div>
                              <div className="text-xs text-gray-500">{track.duration || '3:45'}</div>
                            </div>
                          </div>
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <svg className="w-5 h-5 text-neon-blue" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center text-gray-500 italic">
                        Tracklist information is currently unavailable for this pressing.
                      </div>
                    )}
                  </div>
                </section>
              </div>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default VinylPage;
