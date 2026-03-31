import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import apiService from '../services/api';
import { ToastContainer } from '../components/ui/Toast';
import { useMusic } from '../contexts/MusicContext';
import vinylDisc from '../assets/vinyl.svg';
import { getVinylImageSrc, resolveVinylTracks } from '../utils/vinyl';

const VinylPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { previewVinylExperience, purchasedVinyls, syncCurrentUser, isAuthenticated } = useMusic();

  const [vinyl, setVinyl] = useState(null);
  const [relatedVinyls, setRelatedVinyls] = useState([]);
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [purchasePending, setPurchasePending] = useState(false);
  const [currentEditionIndex, setCurrentEditionIndex] = useState(0);

  useEffect(() => {
    const fetchVinylData = async () => {
      try {
        setLoading(true);
        const data = await apiService.getVinyl(id);
        setVinyl(data);
        const resolvedTracks = await resolveVinylTracks(data);
        setTracks(resolvedTracks);
        const linkedAlbumId = data?.albumId?._id || data?.albumId || '';
        if (linkedAlbumId) {
          const relatedResponse = await apiService.getVinyls(1, 100, '', true, linkedAlbumId);
          const relatedItems = Array.isArray(relatedResponse?.vinyls) ? relatedResponse.vinyls : [];
          const nextRelated = relatedItems.length > 0 ? relatedItems : [data];
          setRelatedVinyls(nextRelated);
          const activeIndex = nextRelated.findIndex((item) => String(item._id || item.id || '') === String(data._id || data.id || ''));
          setCurrentEditionIndex(activeIndex >= 0 ? activeIndex : 0);
        } else {
          setRelatedVinyls([data]);
          setCurrentEditionIndex(0);
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

  const ownsVinyl = useMemo(() => {
    if (!vinyl) return false;
    const vinylId = String(vinyl._id || vinyl.id || '');
    return (purchasedVinyls || []).some((ownedVinyl) => String(ownedVinyl._id || ownedVinyl.id || '') === vinylId);
  }, [purchasedVinyls, vinyl]);

  const showToast = (message, type = 'success', duration = 3000) => {
    const toastId = Date.now();
    setToasts((prev) => [...prev, { id: toastId, message, type, duration }]);
  };

  const removeToast = (toastId) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== toastId));
  };

  const availableRelatedVinyls = useMemo(
    () => relatedVinyls.filter((edition) => edition?.is_available !== false),
    [relatedVinyls]
  );
  const hasEditionSwitcher = relatedVinyls.length > 1;

  const unownedRelatedVinyls = useMemo(() => {
    return availableRelatedVinyls.filter((edition) => {
      const editionId = String(edition._id || edition.id || '');
      return !(purchasedVinyls || []).some((ownedVinyl) => String(ownedVinyl._id || ownedVinyl.id || '') === editionId);
    });
  }, [availableRelatedVinyls, purchasedVinyls]);

  const handlePurchase = async () => {
    if (!vinyl) return;

    if (ownsVinyl) {
      navigate('/library');
      return;
    }

    setPurchasePending(true);
    try {
      await apiService.purchaseVinyl(vinyl._id || vinyl.id);
      await syncCurrentUser();
      showToast(`Successfully purchased ${vinyl.name}. Added to your vinyl collection.`);
    } catch (err) {
      const message = err?.status === 401 && !isAuthenticated
        ? 'Please log in to purchase this vinyl.'
        : `Failed to purchase: ${err.message}`;
      showToast(message, 'error');
    } finally {
      setPurchasePending(false);
    }
  };

  const handleBuyAllRelated = async () => {
    if (unownedRelatedVinyls.length === 0) {
      showToast('You already own all available vinyl editions for this album.');
      return;
    }

    setPurchasePending(true);
    try {
      for (const edition of unownedRelatedVinyls) {
        await apiService.purchaseVinyl(edition._id || edition.id);
      }
      await syncCurrentUser();
      showToast(`Purchased ${unownedRelatedVinyls.length} vinyl edition${unownedRelatedVinyls.length === 1 ? '' : 's'} from this album.`);
    } catch (err) {
      const message = err?.status === 401 && !isAuthenticated
        ? 'Please log in to purchase these vinyl editions.'
        : `Failed to buy all editions: ${err.message}`;
      showToast(message, 'error');
    } finally {
      setPurchasePending(false);
    }
  };

  const switchEdition = (direction) => {
    if (relatedVinyls.length <= 1) return;
    const nextIndex = (currentEditionIndex + direction + relatedVinyls.length) % relatedVinyls.length;
    const nextEdition = relatedVinyls[nextIndex];
    if (!nextEdition) return;
    setCurrentEditionIndex(nextIndex);
    navigate(`/vinyl/${nextEdition._id || nextEdition.id}`);
  };

  const handlePreview = async () => {
    if (tracks.length > 0) {
      previewVinylExperience({
        track: tracks[0],
        vinyl,
        queue: tracks,
        trackIndex: 0,
      });
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

  const imageSrc = getVinylImageSrc(vinyl, vinylDisc);

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white">
      <ToastContainer toasts={toasts} removeToast={removeToast} />

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
            <div className="relative max-w-md mx-auto">
              {hasEditionSwitcher && (
                <button
                  type="button"
                  onClick={() => switchEdition(-1)}
                  className="absolute left-0 top-1/2 z-20 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/70 text-white shadow-[0_18px_40px_rgba(0,0,0,0.35)] backdrop-blur hover:border-neon-blue/40 hover:text-neon-blue"
                  aria-label="Show previous vinyl edition"
                >
                  <span className="text-3xl leading-none">&#8249;</span>
                </button>
              )}

              <motion.button
                type="button"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6 }}
                className="relative aspect-square block w-full group"
                onClick={handlePreview}
              >
                <div className="absolute inset-0 rounded-[2rem] bg-[#18181B] shadow-2xl border border-gray-800" />

                <motion.img
                  key={String(vinyl._id || vinyl.id || vinyl.name)}
                  src={imageSrc}
                  alt={vinyl.name}
                  className="relative z-10 w-full h-full object-contain p-6 drop-shadow-[0_20px_45px_rgba(0,0,0,0.45)]"
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 8, ease: 'linear' }}
                />

                <div className="absolute -inset-4 bg-neon-blue/20 blur-3xl rounded-full -z-10 opacity-30 group-hover:opacity-50 transition-opacity" />
              </motion.button>

              {hasEditionSwitcher && (
                <button
                  type="button"
                  onClick={() => switchEdition(1)}
                  className="absolute right-0 top-1/2 z-20 flex h-14 w-14 translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/70 text-white shadow-[0_18px_40px_rgba(0,0,0,0.35)] backdrop-blur hover:border-neon-blue/40 hover:text-neon-blue"
                  aria-label="Show next vinyl edition"
                >
                  <span className="text-3xl leading-none">&#8250;</span>
                </button>
              )}

              {hasEditionSwitcher && (
                <div className="mt-5 flex items-center justify-center gap-3">
                  <span className="text-xs font-semibold uppercase tracking-[0.28em] text-gray-500">
                    Edition {currentEditionIndex + 1} of {relatedVinyls.length}
                  </span>
                  <div className="flex items-center gap-2">
                    {relatedVinyls.map((edition, index) => (
                      <button
                        key={edition._id || edition.id || index}
                        type="button"
                        onClick={() => navigate(`/vinyl/${edition._id || edition.id}`)}
                        className={`h-2.5 rounded-full transition-all ${
                          index === currentEditionIndex ? 'w-8 bg-neon-blue' : 'w-2.5 bg-white/20 hover:bg-white/40'
                        }`}
                        aria-label={`Open vinyl edition ${index + 1}`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-7 space-y-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <span className="px-3 py-1 bg-neon-blue/10 text-neon-blue text-xs font-bold rounded-full uppercase tracking-wider border border-neon-blue/20">
                  Premium Vinyl Edition
                </span>
                {vinyl.release_year && (
                  <span className="text-gray-500 font-medium">Released {vinyl.release_year}</span>
                )}
                {ownsVinyl && (
                  <span className="px-3 py-1 bg-emerald-500/10 text-emerald-300 text-xs font-bold rounded-full uppercase tracking-wider border border-emerald-400/20">
                    In Your Collection
                  </span>
                )}
              </div>

              <h1 className="text-5xl md:text-6xl font-black mb-4 tracking-tight">{vinyl.name}</h1>
              <p className="text-2xl text-gray-400 font-medium mb-8">
                by <span className="text-white hover:text-neon-blue cursor-pointer transition-colors">{vinyl.artist}</span>
              </p>

              <div className="flex flex-wrap gap-4 mb-10">
                <button
                  onClick={handlePurchase}
                  disabled={purchasePending || (!vinyl.is_available && !ownsVinyl)}
                  className={`px-10 py-4 rounded-2xl font-black text-lg transition-all transform hover:scale-105 active:scale-95 flex items-center shadow-2xl ${
                    ownsVinyl
                      ? 'bg-emerald-500/15 text-emerald-200 border border-emerald-400/20 hover:bg-emerald-500/20'
                      : vinyl.is_available
                        ? 'bg-neon-blue text-dark-bg hover:bg-neon-blue/90 shadow-neon-blue/20'
                        : 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700'
                  }`}
                >
                  <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                  {ownsVinyl
                    ? 'Open in Collection'
                    : purchasePending
                      ? 'Processing...'
                      : vinyl.is_available
                        ? `Buy for $${vinyl.price?.toFixed(2)}`
                        : 'Sold Out'}
                </button>

                {relatedVinyls.length > 1 && (
                  <button
                    onClick={handleBuyAllRelated}
                    disabled={purchasePending || unownedRelatedVinyls.length === 0}
                    className={`px-10 py-4 rounded-2xl font-black text-lg border transition-all ${
                      unownedRelatedVinyls.length > 0
                        ? 'bg-amber-400/10 text-amber-100 border-amber-300/20 hover:bg-amber-400/15'
                        : 'bg-gray-800 text-gray-500 border-gray-700 cursor-not-allowed'
                    }`}
                  >
                    {unownedRelatedVinyls.length > 0 ? `Buy all ${unownedRelatedVinyls.length} editions` : 'All editions owned'}
                  </button>
                )}

                <button
                  onClick={handlePreview}
                  className="px-10 py-4 rounded-2xl font-black text-lg border transition-all flex items-center backdrop-blur-md bg-white/5 text-white border-white/10 hover:bg-white/10"
                >
                  <svg className="w-6 h-6 mr-3 text-neon-blue" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  {ownsVinyl ? 'Play Vinyl' : 'Preview Experience'}
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
                  <div className="flex items-center justify-between mb-4 gap-4">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-gray-500 flex items-center">
                      <span className="w-1 h-4 bg-purple-500 mr-2"></span>
                      Tracklist
                    </h3>
                    <span className="text-sm text-gray-500">{tracks.length} {tracks.length === 1 ? 'track' : 'tracks'}</span>
                  </div>
                  <div className="bg-[#18181B] rounded-2xl border border-gray-800/50 overflow-hidden divide-y divide-gray-800/50">
                    {tracks.length > 0 ? (
                      tracks.map((track, idx) => (
                        <div
                          key={track._id || track.id || idx}
                          className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors group text-left"
                        >
                          <div className="flex items-center space-x-4 min-w-0">
                            <span className="text-gray-600 font-mono text-sm w-4 text-right">{idx + 1}</span>
                            <div className="min-w-0">
                              <div className="font-bold text-white group-hover:text-neon-blue transition-colors truncate">
                                {track.name || track.title}
                              </div>
                              <div className="text-xs text-gray-500 truncate">
                                {track.artists?.map((artist) => artist.name).join(', ') || vinyl.artist} � {track.durationLabel || track.duration || '3:45'}
                              </div>
                            </div>
                          </div>
                          <div className="text-xs uppercase tracking-[0.2em] text-gray-600 shrink-0">
                            View
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
