import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import apiService from '../services/api';
import VinylCard from '../components/vinyl/VinylCard';
import VinylCarousel from '../components/vinyl/VinylCarousel';
import { ToastContainer } from '../components/ui/Toast';

export default function VinylStore() {
  const [vinyls, setVinyls] = useState([]);
  const [featuredVinyls, setFeaturedVinyls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const fetchVinyls = async () => {
      try {
        const response = await apiService.getVinyls(1, 100, '', true);
        const allVinyls = response.vinyls || [];

        const featured = allVinyls.filter(v => v.is_featured);
        setFeaturedVinyls(featured.length > 0 ? featured : allVinyls.slice(0, 3));
        setVinyls(allVinyls);
      } catch (error) {
        console.error('Error fetching vinyls:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchVinyls();
  }, []);

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white">
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-12"
        >
          <div className="flex flex-col items-center text-center mb-12">
            <div className="w-16 h-16 bg-neon-blue/10 rounded-2xl flex items-center justify-center mb-4 border border-neon-blue/20">
              <svg className="w-8 h-8 text-neon-blue" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="3" />
                <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
              </svg>
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4">
              The <span className="text-neon-blue">Vinyl</span> Shop
            </h1>
            <p className="text-gray-400 max-w-2xl text-lg">
              Collect your favorite music on high-quality physical vinyl. 
              Limited editions, exclusive pressings, and timeless classics.
            </p>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <div className="w-12 h-12 border-4 border-neon-blue/20 border-t-neon-blue rounded-full animate-spin"></div>
              <p className="text-gray-500 animate-pulse">Spinning up the collection...</p>
            </div>
          ) : (
            <>
              {featuredVinyls.length > 0 && (
                <div className="mb-20">
                  <div className="flex items-center justify-between mb-8">
                    <h2 className="text-2xl font-bold flex items-center">
                      <span className="w-2 h-8 bg-neon-blue rounded-full mr-3"></span>
                      Featured Releases
                    </h2>
                  </div>
                  <VinylCarousel items={featuredVinyls} />
                </div>
              )}

              <section>
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-bold flex items-center">
                    <span className="w-2 h-8 bg-purple-500 rounded-full mr-3"></span>
                    Browse All Vinyls
                  </h2>
                  <div className="text-sm text-gray-400">
                    Showing {vinyls.length} items
                  </div>
                </div>

                {vinyls.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-10">
                    {vinyls.map((vinyl, index) => (
                      <motion.div
                        key={vinyl._id || vinyl.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <VinylCard vinyl={vinyl} />
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-20 bg-dark-gray/20 rounded-3xl border border-dashed border-gray-800">
                    <p className="text-gray-500 text-lg">No vinyls available in the store right now.</p>
                  </div>
                )}
              </section>
            </>
          )}
        </motion.div>
      </main>
    </div>
  );
}

