import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { usePlaylistActions } from '../hooks/usePlaylists';
import { useMusic } from '../contexts/MusicContext';
import { PlayIcon, SearchIcon, HeartIcon, PlusIcon } from '../components/ui/Icons';
import albumArtPlaceholder from '../assets/album_art_placeholder.svg';
import vinylDisc from '../assets/vinyl.svg';
import { getVinylImageSrc, resolveVinylTracks } from '../utils/vinyl';

const tabs = ['all', 'vinyls', 'playlists', 'liked'];

const LibraryPage = () => {
  const navigate = useNavigate();
  const { playlists, loading, handleCreatePlaylist } = usePlaylistActions();
  const { purchasedVinyls, playVinylTrack } = useMusic();

  const [showSticky, setShowSticky] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState('private');
  const [bgColor, setBgColor] = useState('#0B0F1A');
  const [imageData, setImageData] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [vinylTracksById, setVinylTracksById] = useState({});
  const [vinylLoading, setVinylLoading] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setShowSticky(window.scrollY > 120);
    };
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadVinylTracks = async () => {
      if (!Array.isArray(purchasedVinyls) || purchasedVinyls.length === 0) {
        setVinylTracksById({});
        return;
      }

      setVinylLoading(true);
      try {
        const entries = await Promise.all(
          purchasedVinyls.map(async (vinyl) => {
            try {
              const tracks = await resolveVinylTracks(vinyl);
              return [vinyl._id || vinyl.id, tracks];
            } catch (error) {
              console.error('Failed to load owned vinyl tracks:', error);
              return [vinyl._id || vinyl.id, []];
            }
          })
        );

        if (!cancelled) {
          setVinylTracksById(Object.fromEntries(entries));
        }
      } finally {
        if (!cancelled) {
          setVinylLoading(false);
        }
      }
    };

    loadVinylTracks();
    return () => {
      cancelled = true;
    };
  }, [purchasedVinyls]);

  const filteredPlaylists = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const items = Array.isArray(playlists) ? playlists : [];
    if (!term) return items;
    return items.filter((playlist) => (playlist.name || '').toLowerCase().includes(term));
  }, [playlists, searchTerm]);

  const filteredVinyls = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const items = Array.isArray(purchasedVinyls) ? purchasedVinyls : [];
    if (!term) return items;
    return items.filter((vinyl) => {
      const haystack = [vinyl.name, vinyl.artist].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(term);
    });
  }, [purchasedVinyls, searchTerm]);

  const totalOwnedTracks = useMemo(() => {
    return Object.values(vinylTracksById).reduce((sum, tracks) => sum + tracks.length, 0);
  }, [vinylTracksById]);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setImageData(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleCreate = async () => {
    const payload = {
      name: name.trim() || 'My Playlist',
      description: description.trim(),
      visibility,
      color: bgColor,
      image: imageData
    };
    const playlist = await handleCreatePlaylist(payload);
    setShowCreate(false);
    setName('');
    setDescription('');
    setVisibility('private');
    setBgColor('#0B0F1A');
    setImageData('');
    navigate(`/playlist/${playlist._id || playlist.id}`);
  };

  const handlePlayOwnedVinyl = async (vinyl, track, trackIndex = 0) => {
    const vinylId = vinyl._id || vinyl.id;
    const queue = vinylTracksById[vinylId] || [];
    const selectedTrack = track || queue[trackIndex] || queue[0];
    if (!selectedTrack) return;

    await playVinylTrack({
      track: selectedTrack,
      vinyl,
      queue,
      trackIndex,
      openOverlay: true,
      persistActive: true,
    });
  };

  const renderPlaylistCard = (playlist) => {
    const color = playlist.color || '#0B0F1A';
    const img = playlist.image || albumArtPlaceholder;
    const count = Array.isArray(playlist.songs) ? playlist.songs.length : (playlist.total_songs || 0);
    return (
      <Link key={playlist._id || playlist.id} to={`/playlist/${playlist._id || playlist.id}`} className="group">
        <div className="relative rounded-xl overflow-hidden border border-gray-700 bg-dark-gray">
          <div className="aspect-square w-full relative">
            <div className="absolute inset-0" style={{ background: color, opacity: 0.25 }} />
            <img src={img} alt={playlist.name} className="w-full h-full object-cover" />
            <motion.div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" whileHover={{ scale: 1 }}>
              <button className="w-12 h-12 bg-neon-blue text-dark-bg rounded-full flex items-center justify-center hover:scale-110 transition-transform">
                <PlayIcon className="w-5 h-5 ml-0.5" />
              </button>
            </motion.div>
          </div>
          <div className="p-3">
            <h3 className="text-sm font-medium text-white truncate group-hover:text-neon-blue transition-colors">{playlist.name}</h3>
            <p className="text-xs text-gray-400">{count} {count === 1 ? 'song' : 'songs'}</p>
          </div>
        </div>
      </Link>
    );
  };

  const renderVinylCard = (vinyl) => {
    const vinylId = vinyl._id || vinyl.id;
    const vinylImage = getVinylImageSrc(vinyl, vinylDisc);
    const tracks = vinylTracksById[vinylId] || [];

    return (
      <motion.div
        key={vinylId}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-[1.75rem] border border-gray-800 bg-gradient-to-br from-[#11131A] via-[#111827] to-[#09121F] overflow-hidden shadow-[0_25px_80px_rgba(0,0,0,0.32)]"
      >
        <div className="p-5 lg:p-6">
          <div className="flex flex-col md:flex-row gap-6 md:items-center">
            <button onClick={() => navigate(`/vinyl/${vinylId}`)} className="group relative shrink-0">
              <div className="w-40 h-40 rounded-[1.75rem] bg-[#18181B] border border-gray-800 flex items-center justify-center overflow-hidden">
                <img src={vinylImage} alt={vinyl.name} className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-300" />
              </div>
              <div className="absolute inset-0 rounded-[1.75rem] shadow-[0_0_40px_rgba(0,255,255,0.08)] pointer-events-none" />
            </button>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <span className="px-3 py-1 rounded-full border border-neon-blue/20 bg-neon-blue/10 text-neon-blue text-xs font-bold uppercase tracking-[0.25em]">
                  Owned Vinyl
                </span>
                <span className="text-sm text-gray-500">{tracks.length} {tracks.length === 1 ? 'track' : 'tracks'}</span>
              </div>
              <h3 className="text-3xl font-black text-white truncate">{vinyl.name}</h3>
              <p className="text-lg text-gray-400 mt-1">by {vinyl.artist}</p>
              <p className="text-sm text-gray-500 mt-3 max-w-2xl line-clamp-2">
                {vinyl.description || 'High-fidelity pressing ready to spin inside your Sound Scape collection.'}
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  onClick={() => handlePlayOwnedVinyl(vinyl, tracks[0], 0)}
                  disabled={tracks.length === 0}
                  className="px-5 py-3 rounded-2xl bg-neon-blue text-dark-bg font-bold hover:bg-neon-blue/90 transition-colors disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <PlayIcon className="w-4 h-4" />
                  Play Vinyl
                </button>
                <button
                  onClick={() => navigate(`/vinyl/${vinylId}`)}
                  className="px-5 py-3 rounded-2xl bg-white/5 border border-white/10 text-white font-bold hover:bg-white/10 transition-colors"
                >
                  View Edition
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800/80 bg-black/10 px-5 lg:px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs uppercase tracking-[0.24em] text-gray-500 font-bold">Playable Tracklist</p>
            {tracks.length > 0 && <p className="text-xs text-gray-500">Tap any song to open the vinyl overlay</p>}
          </div>

          {tracks.length > 0 ? (
            <div className="space-y-2">
              {tracks.slice(0, 5).map((track, index) => (
                <button
                  key={track._id || track.id || index}
                  onClick={() => handlePlayOwnedVinyl(vinyl, track, index)}
                  className="w-full rounded-2xl border border-gray-800/80 bg-white/[0.03] px-4 py-3 text-left hover:bg-white/[0.06] transition-colors flex items-center justify-between gap-4"
                >
                  <div className="min-w-0 flex items-center gap-4">
                    <span className="w-6 text-sm font-mono text-gray-500">{index + 1}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{track.name || track.title}</p>
                      <p className="text-xs text-gray-500 truncate">{track.artists?.map((artist) => artist.name).join(', ') || vinyl.artist}</p>
                    </div>
                  </div>
                  <div className="shrink-0 flex items-center gap-4">
                    <span className="text-xs text-gray-500">{track.durationLabel || track.duration || '3:45'}</span>
                    <div className="w-9 h-9 rounded-full bg-neon-blue/10 border border-neon-blue/20 flex items-center justify-center text-neon-blue">
                      <PlayIcon className="w-4 h-4 ml-0.5" />
                    </div>
                  </div>
                </button>
              ))}
              {tracks.length > 5 && (
                <button onClick={() => navigate(`/vinyl/${vinylId}`)} className="text-sm text-neon-blue hover:text-white transition-colors">
                  View full tracklist
                </button>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-gray-800 px-4 py-6 text-sm text-gray-500">
              {vinylLoading ? 'Loading vinyl tracklist...' : 'This pressing does not have playable tracks linked yet.'}
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  const showVinylSection = activeTab === 'all' || activeTab === 'vinyls';
  const showPlaylistSection = activeTab === 'all' || activeTab === 'playlists';

  return (
    <div className="p-0 pb-24">
      <div className="p-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="relative overflow-hidden rounded-2xl p-8 md:p-10 border border-gray-700 bg-gradient-to-br from-black via-blue-900/60 to-neon-blue/20">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(0,255,255,0.18),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(168,85,247,0.18),transparent_30%)] pointer-events-none" />
            <div className="relative flex flex-col md:flex-row md:items-end md:justify-between gap-6">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-white">Your Library</h1>
                <p className="text-gray-300 mt-1">Your playlists, your favorites, and every vinyl you own</p>
                <div className="mt-5 flex flex-wrap gap-3 text-sm">
                  <div className="px-4 py-2 rounded-full bg-black/30 border border-white/10 text-white">
                    {purchasedVinyls.length} owned vinyls
                  </div>
                  <div className="px-4 py-2 rounded-full bg-black/30 border border-white/10 text-white">
                    {totalOwnedTracks} playable vinyl tracks
                  </div>
                  <div className="px-4 py-2 rounded-full bg-black/30 border border-white/10 text-white">
                    {Array.isArray(playlists) ? playlists.length : 0} playlists
                  </div>
                </div>
              </div>
              <div className="mt-0 flex flex-wrap items-center gap-2">
                <button onClick={() => setShowCreate(true)} className="px-4 py-2 rounded-lg bg-neon-blue text-dark-bg hover:bg-neon-blue/80 transition-colors flex items-center gap-2">
                  <PlusIcon className="w-5 h-5" />
                  <span>Create Playlist</span>
                </button>
                <Link to="/liked" className="px-4 py-2 rounded-lg bg-light-gray/50 text-white hover:bg-light-gray transition-colors flex items-center gap-2">
                  <HeartIcon className="w-5 h-5" />
                  <span>Liked Songs</span>
                </Link>
                <div className="relative">
                  <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search Library"
                    className="pl-9 pr-3 py-2 rounded-lg bg-light-gray text-white border border-gray-700"
                  />
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {showSticky && (
        <div className="sticky top-0 z-40 bg-dark-gray/90 backdrop-blur-md border-b border-gray-800">
          <div className="max-w-[1200px] mx-auto px-6 py-3 flex items-center gap-3">
            <button onClick={() => setShowCreate(true)} className="px-3 py-1.5 rounded-lg bg-neon-blue text-dark-bg flex items-center gap-2">
              <PlusIcon className="w-4 h-4" />
              <span>New</span>
            </button>
            <Link to="/liked" className="px-3 py-1.5 rounded-lg bg-light-gray/50 text-white hover:bg-light-gray flex items-center gap-2">
              <HeartIcon className="w-4 h-4" />
              <span>Liked</span>
            </Link>
            <div className="flex-1" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search Library"
              className="px-3 py-1.5 rounded-lg bg-light-gray text-white border border-gray-700 w-52"
            />
          </div>
        </div>
      )}

      <div className="px-6 space-y-10">
        <div className="flex items-center gap-3 flex-wrap">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-full border ${activeTab === tab ? 'border-neon-blue text-neon-blue shadow-[0_0_10px_rgba(0,255,255,0.3)]' : 'border-gray-700 text-gray-300 hover:text-white'}`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link to="/liked" className="rounded-xl p-6 bg-gradient-to-r from-neon-blue/20 to-purple-500/20 border border-gray-700 hover:opacity-90 transition flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-black/30 border border-gray-700 flex items-center justify-center">
              <HeartIcon className="w-6 h-6 text-neon-blue" />
            </div>
            <div>
              <div className="text-white font-medium">Liked Songs</div>
              <div className="text-gray-400 text-sm">Quick access to your favorites</div>
            </div>
          </Link>
          <div className="rounded-xl p-6 bg-gradient-to-r from-neon-blue/20 to-purple-500/20 border border-gray-700 flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-black/30 border border-gray-700 flex items-center justify-center">
              <img src={vinylDisc} alt="Vinyl" className="w-7 h-7 object-contain" />
            </div>
            <div>
              <div className="text-white font-medium">Owned Vinyls</div>
              <div className="text-gray-400 text-sm">{purchasedVinyls.length} editions ready to spin</div>
            </div>
          </div>
        </div>

        {showVinylSection && (
          <section>
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="text-white font-semibold text-2xl">Owned Vinyls</h2>
                <p className="text-sm text-gray-500">Play any record here and the vinyl overlay opens automatically.</p>
              </div>
              <div className="text-sm text-gray-500">{filteredVinyls.length} {filteredVinyls.length === 1 ? 'item' : 'items'}</div>
            </div>

            {filteredVinyls.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-800 bg-[#12131A] px-6 py-10 text-center text-gray-500">
                {searchTerm ? 'No owned vinyls matched your search.' : 'You have not purchased any vinyls yet.'}
              </div>
            ) : (
              <div className="space-y-6">
                {filteredVinyls.map(renderVinylCard)}
              </div>
            )}
          </section>
        )}

        {showPlaylistSection && (
          <section>
            <div className="mb-3 text-white font-semibold text-2xl">Playlists</div>
            {loading ? (
              <div className="text-gray-400">Loading...</div>
            ) : filteredPlaylists.length === 0 ? (
              <div className="text-gray-400">No playlists yet</div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-6">
                {filteredPlaylists.map(renderPlaylistCard)}
              </div>
            )}
          </section>
        )}
      </div>

      {showCreate && (
        <motion.div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowCreate(false)} />
          <motion.div className="relative z-10 w-full max-w-2xl bg-dark-gray border border-gray-700 rounded-xl p-6" initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="mb-3">
                  <label className="block text-sm text-gray-400 mb-1">Playlist Name</label>
                  <input value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-light-gray text-white border border-gray-700" />
                </div>
                <div className="mb-3">
                  <label className="block text-sm text-gray-400 mb-1">Description</label>
                  <input value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-light-gray text-white border border-gray-700" />
                </div>
                <div className="mb-3">
                  <label className="block text-sm text-gray-400 mb-1">Visibility</label>
                  <select value={visibility} onChange={(e) => setVisibility(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-light-gray text-white border border-gray-700">
                    <option value="private">Private</option>
                    <option value="public">Public</option>
                  </select>
                </div>
                <div className="mb-3">
                  <label className="block text-sm text-gray-400 mb-1">Background Color</label>
                  <div className="flex items-center gap-2">
                    {['#0B0F1A', '#1E2A78', '#00FFFF', '#B83280', '#0F5132'].map((color) => (
                      <button key={color} onClick={() => setBgColor(color)} className="w-8 h-8 rounded-lg border border-gray-700" style={{ background: color }} />
                    ))}
                    <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} className="w-10 h-10 rounded-lg border border-gray-700 bg-light-gray" />
                  </div>
                </div>
                <div className="mb-3">
                  <label className="block text-sm text-gray-400 mb-1">Upload Image</label>
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="w-full text-sm text-gray-300" />
                </div>
              </div>
              <div>
                <div className="mb-3 text-white font-semibold">Live preview</div>
                <div className="group">
                  <div className="relative rounded-xl overflow-hidden border border-gray-700 bg-dark-gray">
                    <div className="aspect-square w-full relative">
                      <div className="absolute inset-0" style={{ background: bgColor, opacity: 0.25 }} />
                      {imageData ? (
                        <img src={imageData} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-white" style={{ background: 'linear-gradient(135deg, rgba(0,255,255,0.2), rgba(128,0,128,0.2))' }}>
                          {(name || 'P').charAt(0).toUpperCase()}
                        </div>
                      )}
                      <motion.div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="w-12 h-12 bg-neon-blue text-dark-bg rounded-full flex items-center justify-center">
                          <PlayIcon className="w-5 h-5 ml-0.5" />
                        </button>
                      </motion.div>
                    </div>
                    <div className="p-3">
                      <h3 className="text-sm font-medium text-white truncate group-hover:text-neon-blue transition-colors">{name || 'New Playlist'}</h3>
                      <p className="text-xs text-gray-400">0 songs</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-lg bg-light-gray/50 text-white hover:bg-light-gray">Cancel</button>
              <button onClick={handleCreate} className="px-4 py-2 rounded-lg bg-neon-blue text-dark-bg hover:bg-neon-blue/80">Create Playlist</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

export default LibraryPage;
