import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import AdminLayout from './AdminLayout';
import apiService from '../../services/api';
import { ToastContainer } from '../../components/ui/Toast';

export default function AdminLyrics() {
  const [items, setItems] = useState([]);
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [search, setSearch] = useState('');
  
  // Add Lyrics State
  const [isAdding, setIsAdding] = useState(false);
  const [selectedSongId, setSelectedSongId] = useState('');
  const [lyricsContent, setLyricsContent] = useState('');
  const [lyricsFile, setLyricsFile] = useState(null);
  const [inputType, setInputType] = useState('text'); // 'text' or 'file'
  const [submitting, setSubmitting] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [songSearch, setSongSearch] = useState('');
  // const [showSuggestions, setShowSuggestions] = useState(false); // Removed dropdown logic
  const stats = {
    total: items.length,
    synced: items.filter((item) => Array.isArray(item.lines) && item.lines.length > 0).length,
    drafts: items.filter((item) => !Array.isArray(item.lines) || item.lines.length === 0).length,
    editing: isAdding ? 1 : 0
  };

  const showToast = (message, type = 'success', duration = 3000) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type, duration }]);
  };
  const removeToast = (id) => setToasts(prev => prev.filter(t => t.id !== id));

  const load = async () => {
    setLoading(true);
    try {
      // Don't load all songs upfront anymore
      const lyricsRes = await apiService.getLyricsList();
      
      const list = Array.isArray(lyricsRes?.lyrics) ? lyricsRes.lyrics : Array.isArray(lyricsRes) ? lyricsRes : [];
      // optional filter by search on song name
      const filtered = search.trim()
        ? list.filter(it => String(it?.song?.name || '').toLowerCase().includes(search.trim().toLowerCase()))
        : list;
      setItems(filtered);
      
      // Initialize empty songs list for search
      setSongs([]);
    } catch (e) {
      console.error(e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  // Debounced search for songs
  useEffect(() => {
    if (!songSearch.trim()) {
      setSongs([]);
      return;
    }
    
    // Don't search if we have a selected song that matches the search text exactly (to avoid re-searching on selection)
    if (selectedSongId && songs.find(s => s._id === selectedSongId)?.name === songSearch) {
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await apiService.getSongs(1, 20, songSearch);
        const results = res?.songs || (Array.isArray(res) ? res : []);
        setSongs(results);
      } catch (err) {
        console.error('Song search failed', err);
        setSongs([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [songSearch, selectedSongId]);

  const handleAddLyrics = async () => {
    if (!selectedSongId) {
      showToast('Please select a song', 'error');
      return;
    }

    if (inputType === 'text' && !lyricsContent.trim()) {
      showToast('Please enter lyrics content', 'error');
      return;
    }

    if (inputType === 'file' && !lyricsFile) {
      showToast('Please select an LRC file', 'error');
      return;
    }
    
    setSubmitting(true);
    try {
      if (inputType === 'file') {
        await apiService.uploadLyrics(selectedSongId, lyricsFile);
      } else {
        await apiService.addLyrics(selectedSongId, lyricsContent);
      }
      
      showToast('Lyrics added successfully');
      setLyricsContent('');
      setLyricsFile(null);
      setSelectedSongId('');
      setIsAdding(false);
      await load();
    } catch (err) {
      showToast(err.message || 'Failed to add lyrics', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (item) => {
    setSelectedSongId(item?.song?._id || item?.song);
    setSongSearch(item?.song?.name || '');
    // If we have raw lyrics text, use it. Otherwise empty.
    // If it was file-based, we might not have the original file object, 
    // but we might have the content in item.lyrics if it was stored.
    setLyricsContent(item.lyrics || '');
    // Default to text editing since we can't pre-fill file input
    setInputType('text');
    setIsAdding(true);
    // Scroll to top to see form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (songId) => {
    if (!window.confirm('Delete these lyrics? This cannot be undone.')) return;
    try {
      await apiService.deleteLyrics(songId);
      showToast('Lyrics deleted successfully');
      await load();
    } catch (err) {
      showToast(err.message || 'Failed to delete lyrics', 'error');
    }
  };

  useEffect(() => { load(); /* eslint-disable-line */ }, [search]);

  return (
    <AdminLayout>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        <div className="rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(61,180,255,0.18),_transparent_38%),linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-neon-blue/80">Lyrics Console</p>
              <h2 className="text-3xl font-semibold text-white">List, search, edit, sync</h2>
              <p className="max-w-2xl text-sm text-gray-300">Manage synced lyrics, upload new LRC files, and clean up song lyric coverage without leaving the admin flow.</p>
            </div>
            <button
              onClick={() => {
                setIsAdding(!isAdding);
                if (!isAdding) {
                  setSelectedSongId('');
                  setSongSearch('');
                  setLyricsContent('');
                  setLyricsFile(null);
                  setInputType('text');
                }
              }}
              className="rounded-2xl bg-neon-blue px-5 py-3 text-sm font-semibold text-dark-bg hover:bg-neon-blue/85"
            >
              {isAdding ? 'Close editor' : 'Add lyrics'}
            </button>
          </div>
          <div className="mt-6 grid gap-3 md:grid-cols-4">
            {[
              ['Total lyrics', stats.total],
              ['Synced lines', stats.synced],
              ['Needs review', stats.drafts],
              ['Editor open', stats.editing]
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-gray-400">{label}</p>
                <p className="mt-2 text-3xl font-semibold text-white">{value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search lyrics by song name"
            className="px-3 py-2 rounded-lg bg-light-gray/50 text-white border border-gray-700 flex-1"
          />
          <button 
            onClick={() => {
              setIsAdding(!isAdding);
              if (!isAdding) {
                setSelectedSongId('');
                setSongSearch('');
                setLyricsContent('');
                setLyricsFile(null);
                setInputType('text');
              }
            }}
            className="px-4 py-2 rounded-lg bg-neon-blue text-dark-bg font-medium hover:opacity-90 transition-opacity"
          >
            {isAdding ? 'Cancel' : 'Add Lyrics'}
          </button>
        </div>

        {isAdding && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }} 
            animate={{ opacity: 1, height: 'auto' }}
            className="p-4 bg-dark-gray/40 rounded-xl border border-gray-800 space-y-3"
          >
            <h3 className="text-lg font-medium text-white">{selectedSongId && items.find(i => (i.song?._id || i.song) === selectedSongId) ? 'Edit Lyrics' : 'Add New Lyrics'}</h3>
            <div className="space-y-3">
                <label className="block text-xs text-gray-400 mb-1">Song Name</label>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={songSearch}
                    onChange={e => {
                      setSongSearch(e.target.value);
                      // If user changes text, clear previous selection unless it matches perfectly
                      if (selectedSongId) {
                         const currentSelection = songs.find(s => s._id === selectedSongId);
                         if (currentSelection && currentSelection.name !== e.target.value) {
                           setSelectedSongId('');
                         }
                      }
                    }}
                    placeholder="Type song name to check existence..."
                    className={`w-full px-3 py-2 rounded-lg bg-light-gray/50 text-white border ${selectedSongId ? 'border-green-500/50' : 'border-gray-700'} focus:outline-none focus:border-neon-blue transition-colors`}
                  />
                  
                  {/* Status Indicator Area */}
                  <div className="text-sm">
                    {selectedSongId ? (
                      <div className="flex items-center gap-2 text-green-400 bg-green-900/20 p-2 rounded border border-green-900/50">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                        <span>Selected: <strong>{songs.find(s => s._id === selectedSongId)?.name}</strong></span>
                        <button 
                          onClick={() => { setSelectedSongId(''); setSongSearch(''); setSongs([]); }}
                          className="ml-auto text-xs underline text-green-400 hover:text-green-300"
                        >
                          Clear
                        </button>
                      </div>
                    ) : songSearch.trim() ? (
                      <div>
                        {isSearching ? (
                           <div className="text-gray-400 text-xs italic">Searching...</div>
                        ) : (() => {
                          const matches = songs; // songs is already filtered by server
                          if (matches.length === 0) {
                            return (
                              <div className="flex items-center gap-2 text-red-400 bg-red-900/20 p-2 rounded border border-red-900/50">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                <span>Song "{songSearch}" not found in system</span>
                              </div>
                            );
                          } else {
                            return (
                              <div className="space-y-1">
                                <div className="text-gray-400 text-xs mb-1">Found {matches.length} matches:</div>
                                <div className="max-h-40 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                                  {matches.map(song => (
                                    <div 
                                      key={song._id}
                                      onClick={() => {
                                        setSongs([song]); // Keep only the selected one
                                        setSelectedSongId(song._id);
                                        setSongSearch(song.name);
                                      }}
                                      className="flex items-center justify-between p-2 rounded bg-gray-800/50 hover:bg-gray-700 cursor-pointer border border-transparent hover:border-gray-600 group transition-all"
                                    >
                                      <span className="text-gray-200">{song.name}</span>
                                      <span className="text-xs text-neon-blue opacity-0 group-hover:opacity-100 transition-opacity">Select</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          }
                        })()}
                      </div>
                    ) : (
                      <div className="text-gray-500 text-xs italic">
                        Start typing to search for a song...
                      </div>
                    )}
                  </div>
                </div>
              
              <div>
                <label className="block text-xs text-gray-400 mb-1">Input Type</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm text-gray-300">
                    <input 
                      type="radio" 
                      name="inputType" 
                      value="text" 
                      checked={inputType === 'text'}
                      onChange={() => setInputType('text')}
                      className="text-neon-blue focus:ring-neon-blue"
                    />
                    Manual Text
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-300">
                    <input 
                      type="radio" 
                      name="inputType" 
                      value="file" 
                      checked={inputType === 'file'}
                      onChange={() => setInputType('file')}
                      className="text-neon-blue focus:ring-neon-blue"
                    />
                    LRC File Upload
                  </label>
                </div>
              </div>
              
              {inputType === 'text' ? (
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Lyrics Content</label>
                  <textarea
                    value={lyricsContent}
                    onChange={e => setLyricsContent(e.target.value)}
                    placeholder="Paste lyrics here..."
                    rows={6}
                    className="w-full px-3 py-2 rounded-lg bg-light-gray/50 text-white border border-gray-700 font-mono text-sm"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs text-gray-400 mb-1">LRC File</label>
                  <input
                    type="file"
                    accept=".lrc,.txt"
                    onChange={e => setLyricsFile(e.target.files[0])}
                    className="w-full px-3 py-2 rounded-lg bg-light-gray/50 text-white border border-gray-700 text-sm"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2">
                <button 
                  onClick={() => setIsAdding(false)}
                  className="px-3 py-1.5 rounded-lg bg-gray-700 text-white hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleAddLyrics}
                  disabled={submitting || !selectedSongId || (inputType === 'text' ? !lyricsContent.trim() : !lyricsFile)}
                  className="px-4 py-1.5 rounded-lg bg-neon-blue text-dark-bg disabled:opacity-50 hover:opacity-90"
                >
                  {submitting ? 'Saving...' : 'Save Lyrics'}
                </button>
              </div>
            </div>
          </motion.div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map(it => (
            <div key={it._id || it.id} className="p-3 rounded-lg bg-light-gray/30 space-y-2 relative group">
              <div className="font-medium pr-16">{it?.song?.name || 'Unknown Song (Orphan)'}</div>
              <div className="text-xs text-gray-400">Lines: {Array.isArray(it.lines) ? it.lines.length : 0}</div>
              <div className="text-xs text-gray-500">Updated: {new Date(it.updatedAt).toLocaleString()}</div>
              
              <div className="flex gap-2 mt-2">
                 <button 
                   onClick={() => handleEdit(it)}
                   className="px-3 py-1 text-xs rounded bg-blue-600/80 text-white hover:bg-blue-600"
                 >
                   Edit
                 </button>
                 <button 
                   onClick={() => handleDelete(it?.song?._id || it?._id)}
                   className="px-3 py-1 text-xs rounded bg-red-600/80 text-white hover:bg-red-600"
                 >
                   Delete
                 </button>
              </div>
            </div>
          ))}
        </div>
      </motion.section>
    </AdminLayout>
  );
}
