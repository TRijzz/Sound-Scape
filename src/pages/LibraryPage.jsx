import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { usePlaylistActions } from '../hooks/usePlaylists';
import { PlayIcon, SearchIcon, HeartIcon, PlusIcon } from '../components/ui/Icons';
import albumArtPlaceholder from '../assets/album_art_placeholder.svg';

const LibraryPage = () => {
  const navigate = useNavigate();
  const { playlists, loading, handleCreatePlaylist } = usePlaylistActions();
  const [showSticky, setShowSticky] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState('private');
  const [bgColor, setBgColor] = useState('#0B0F1A');
  const [imageData, setImageData] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const onScroll = () => {
      setShowSticky(window.scrollY > 120);
    };
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const filteredPlaylists = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const items = Array.isArray(playlists) ? playlists : [];
    if (!term) return items;
    return items.filter(p => (p.name || '').toLowerCase().includes(term));
  }, [playlists, searchTerm]);

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
    const pl = await handleCreatePlaylist(payload);
    setShowCreate(false);
    setName('');
    setDescription('');
    setVisibility('private');
    setBgColor('#0B0F1A');
    setImageData('');
    navigate(`/playlist/${pl._id || pl.id}`);
  };

  const renderPlaylistCard = (pl) => {
    const color = pl.color || '#0B0F1A';
    const img = pl.image || albumArtPlaceholder;
    const count = Array.isArray(pl.songs) ? pl.songs.length : (pl.total_songs || 0);
    return (
      <Link
        key={pl._id || pl.id}
        to={`/playlist/${pl._id || pl.id}`}
        className="group"
      >
        <div className="relative rounded-xl overflow-hidden border border-gray-700 bg-dark-gray">
          <div className="aspect-square w-full relative">
            <div className="absolute inset-0" style={{ background: color, opacity: 0.25 }} />
            <img src={img} alt={pl.name} className="w-full h-full object-cover" />
            <motion.div
              className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              whileHover={{ scale: 1 }}
            >
              <button className="w-12 h-12 bg-neon-blue text-dark-bg rounded-full flex items-center justify-center hover:scale-110 transition-transform">
                <PlayIcon className="w-5 h-5 ml-0.5" />
              </button>
            </motion.div>
          </div>
          <div className="p-3">
            <h3 className="text-sm font-medium text-white truncate group-hover:text-neon-blue transition-colors">{pl.name}</h3>
            <p className="text-xs text-gray-400">{count} {count === 1 ? 'song' : 'songs'}</p>
          </div>
        </div>
      </Link>
    );
  };

  return (
    <div className="p-0">
      <div className="p-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="relative overflow-hidden rounded-2xl p-8 md:p-10 border border-gray-700 bg-gradient-to-br from-black via-blue-900/60 to-neon-blue/20">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-white">Your Library</h1>
                <p className="text-gray-300 mt-1">Your music, your space</p>
              </div>
              <div className="mt-6 md:mt-0 flex items-center gap-2">
                <button onClick={() => setShowCreate(true)} className="px-4 py-2 rounded-lg bg-neon-blue text-dark-bg hover:bg-neon-blue/80 transition-colors flex items-center gap-2">
                  <PlusIcon className="w-5 h-5" />
                  <span>Create Playlist</span>
                </button>
                <Link to="/liked" className="px-4 py-2 rounded-lg bg-light-gray/50 text-white hover:bg-light-gray transition-colors flex items-center gap-2">
                  <HeartIcon className="w-5 h-5" />
                  <span>Liked Songs</span>
                </Link>
                <button className="px-4 py-2 rounded-lg bg-light-gray/50 text-white hover:bg-light-gray transition-colors flex items-center gap-2">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 3v12m0 0l4-4m-4 4l-4-4M4 17h16v4H4z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  <span>Downloads</span>
                </button>
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
            <div className="flex items-center gap-2">
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search Library"
                className="px-3 py-1.5 rounded-lg bg-light-gray text-white border border-gray-700 w-52"
              />
            </div>
          </div>
        </div>
      )}

      <div className="px-6">
        <div className="flex items-center gap-3 mb-6">
          {['all', 'playlists', 'artists', 'albums', 'podcasts'].map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`px-4 py-2 rounded-full border ${activeTab === t ? 'border-neon-blue text-neon-blue shadow-[0_0_10px_rgba(0,255,255,0.3)]' : 'border-gray-700 text-gray-300 hover:text-white'}`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <Link to="/liked" className="rounded-xl p-6 bg-gradient-to-r from-neon-blue/20 to-purple-500/20 border border-gray-700 hover:opacity-90 transition flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-black/30 border border-gray-700 flex items-center justify-center">
              <HeartIcon className="w-6 h-6 text-neon-blue" />
            </div>
            <div>
              <div className="text-white font-medium">Liked Songs</div>
              <div className="text-gray-400 text-sm">Quick access to your favorites</div>
            </div>
          </Link>
          <button className="rounded-xl p-6 bg-gradient-to-r from-neon-blue/20 to-purple-500/20 border border-gray-700 hover:opacity-90 transition flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-black/30 border border-gray-700 flex items-center justify-center">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 3v12m0 0l4-4m-4 4l-4-4M4 17h16v4H4z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <div>
              <div className="text-white font-medium">Downloaded</div>
              <div className="text-gray-400 text-sm">Offline tracks</div>
            </div>
          </button>
        </div>

        <div className="mb-3 text-white font-semibold">Playlists</div>
        {loading ? (
          <div className="text-gray-400">Loading...</div>
        ) : filteredPlaylists.length === 0 ? (
          <div className="text-gray-400">No playlists yet</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-6">
            {filteredPlaylists.map(renderPlaylistCard)}
          </div>
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
                  <input value={name} onChange={(e)=>setName(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-light-gray text-white border border-gray-700" />
                </div>
                <div className="mb-3">
                  <label className="block text-sm text-gray-400 mb-1">Description</label>
                  <input value={description} onChange={(e)=>setDescription(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-light-gray text-white border border-gray-700" />
                </div>
                <div className="mb-3">
                  <label className="block text-sm text-gray-400 mb-1">Visibility</label>
                  <select value={visibility} onChange={(e)=>setVisibility(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-light-gray text-white border border-gray-700">
                    <option value="private">Private</option>
                    <option value="public">Public</option>
                  </select>
                </div>
                <div className="mb-3">
                  <label className="block text-sm text-gray-400 mb-1">Background Color</label>
                  <div className="flex items-center gap-2">
                    {['#0B0F1A','#1E2A78','#00FFFF','#B83280','#0F5132'].map((c)=>(
                      <button key={c} onClick={()=>setBgColor(c)} className="w-8 h-8 rounded-lg border border-gray-700" style={{ background: c }} />
                    ))}
                    <input type="color" value={bgColor} onChange={(e)=>setBgColor(e.target.value)} className="w-10 h-10 rounded-lg border border-gray-700 bg-light-gray" />
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
              <button onClick={()=>setShowCreate(false)} className="px-4 py-2 rounded-lg bg-light-gray/50 text-white hover:bg-light-gray">Cancel</button>
              <button onClick={handleCreate} className="px-4 py-2 rounded-lg bg-neon-blue text-dark-bg hover:bg-neon-blue/80">Create Playlist</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

export default LibraryPage;
