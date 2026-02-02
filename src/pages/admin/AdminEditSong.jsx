import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import apiService from '../../services/api';
import AdminLayout from './AdminLayout';
import { ToastContainer } from '../../components/ui/Toast';

export default function AdminEditSong() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toasts, setToasts] = useState([]);
  
  // Lists
  const [allArtists, setAllArtists] = useState([]);
  const [allAlbums, setAllAlbums] = useState([]);

  // Form State
  const [name, setName] = useState('');
  const [artists, setArtists] = useState([]); // array of IDs
  const [album, setAlbum] = useState(''); // ID
  const [trackNumber, setTrackNumber] = useState('');
  const [duration, setDuration] = useState('');
  const [spotifyId, setSpotifyId] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [externalSpotifyUrl, setExternalSpotifyUrl] = useState('');
  const [popularity, setPopularity] = useState('');
  const [tags, setTags] = useState('');
  
  const [discNumber, setDiscNumber] = useState('1');
  const [explicit, setExplicit] = useState(false);
  const [category, setCategory] = useState('');
  const [genre, setGenre] = useState('');
  const [mood, setMood] = useState('');
  const [language, setLanguage] = useState('');
  const [artistNames, setArtistNames] = useState('');
  
  // File State
  const [audioFile, setAudioFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [lyricsFile, setLyricsFile] = useState(null);

  const showToast = (message, type = 'error', duration = 4000) => {
    const toastId = Date.now();
    setToasts(prev => [...prev, { id: toastId, message, type, duration }]);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const [res, artistsRes, albumsRes] = await Promise.all([
          apiService.getSong(id),
          apiService.getArtists(1, 1000),
          apiService.getAlbums(1, 1000)
        ]);
        
        const song = res.song || res;
        const artistsList = artistsRes.artists || (Array.isArray(artistsRes) ? artistsRes : []);
        setAllArtists(artistsList);
        setAllAlbums(albumsRes.albums || (Array.isArray(albumsRes) ? albumsRes : []));
        
        setName(song.name || '');
        setArtists(song.artists ? song.artists.map(a => a._id || a) : []);
        
        // Set artist names for display
        const songArtists = song.artists || [];
        const aNames = songArtists.map(a => {
           if (typeof a === 'object' && a.name) return a.name;
           const found = artistsList.find(ar => ar._id === a);
           return found ? found.name : '';
        }).filter(Boolean).join(', ');
        setArtistNames(aNames);

        setAlbum(song.album ? (song.album._id || song.album) : '');
        setTrackNumber(song.track_number || '');
        setDuration(song.duration_ms ? Math.round(song.duration_ms / 1000) : '');
        setSpotifyId(song.spotify_id || '');
        setPreviewUrl(song.preview_url || '');
        setExternalSpotifyUrl(song.external_urls?.spotify || '');
        setPopularity(song.popularity || '');
        setTags(Array.isArray(song.tags) ? song.tags.join(', ') : (song.tags || ''));
        
        setDiscNumber(song.disc_number || '1');
        setExplicit(song.explicit || false);
        setCategory(song.category || '');
        setGenre(song.genre || '');
        setMood(song.mood || '');
        setLanguage(song.language || '');
      } catch (error) {
        console.error('Error loading data:', error);
        showToast('Error loading song details', 'error');
        navigate('/admin/songs');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id, navigate]);

  const handleSave = async () => {
    if (!name.trim()) {
      showToast('Name is required', 'error');
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('name', name.trim());
      
      if (artists.length > 0) formData.append('artists', JSON.stringify(artists));
      if (album) formData.append('album', album);
      if (trackNumber) formData.append('track_number', trackNumber);
      if (duration) formData.append('duration', duration);
      if (spotifyId) formData.append('spotify_id', spotifyId);
      if (previewUrl) formData.append('preview_url', previewUrl);
      if (externalSpotifyUrl) formData.append('external_urls.spotify', externalSpotifyUrl);
      if (popularity) formData.append('popularity', popularity);
      if (tags) formData.append('tags', tags);

      formData.append('disc_number', discNumber);
      formData.append('explicit', explicit);
      if (category) formData.append('category', category);
      if (genre) formData.append('genre', genre);
      if (mood) formData.append('mood', mood);
      if (language) formData.append('language', language);

      if (audioFile) formData.append('audio', audioFile);
      if (coverFile) formData.append('cover', coverFile);
      if (lyricsFile) formData.append('lyrics', lyricsFile);

      await apiService.updateSong(id, formData);
      showToast('Song updated successfully', 'success');
      setTimeout(() => navigate('/admin/songs'), 1000);
    } catch (error) {
      console.error('Error updating song:', error);
      showToast(error.message || 'Failed to update song', 'error');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64 text-gray-400">Loading...</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Edit Song</h2>
          <button onClick={() => navigate('/admin/songs')} className="px-4 py-2 rounded-lg bg-gray-700 text-white hover:bg-gray-600">
            Back to List
          </button>
        </div>

        <div className="bg-dark-gray/40 rounded-xl border border-gray-800 p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Name *</label>
                <input 
                  value={name} 
                  readOnly
                  className="w-full px-4 py-2 rounded-lg bg-light-gray/30 text-gray-400 border border-gray-800 cursor-not-allowed focus:outline-none" 
                  placeholder="Song Name"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Album</label>
                <select 
                  value={album} 
                  disabled
                  className="w-full px-4 py-2 rounded-lg bg-light-gray/30 text-gray-400 border border-gray-800 cursor-not-allowed appearance-none"
                >
                  <option value="">Select Album</option>
                  {allAlbums.map(a => (
                    <option key={a._id} value={a._id}>{a.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Artists</label>
                <input 
                  value={artistNames} 
                  readOnly
                  className="w-full px-4 py-2 rounded-lg bg-light-gray/30 text-gray-400 border border-gray-800 cursor-not-allowed focus:outline-none" 
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Category</label>
                <input 
                  value={category} 
                  onChange={e => setCategory(e.target.value)} 
                  className="w-full px-4 py-2 rounded-lg bg-light-gray/50 text-white border border-gray-700 focus:border-neon-blue focus:outline-none" 
                  placeholder="e.g. Pop"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Genre</label>
                <input 
                  value={genre} 
                  onChange={e => setGenre(e.target.value)} 
                  className="w-full px-4 py-2 rounded-lg bg-light-gray/50 text-white border border-gray-700 focus:border-neon-blue focus:outline-none" 
                  placeholder="e.g. Synth-pop"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Mood</label>
                <input 
                  value={mood} 
                  onChange={e => setMood(e.target.value)} 
                  className="w-full px-4 py-2 rounded-lg bg-light-gray/50 text-white border border-gray-700 focus:border-neon-blue focus:outline-none" 
                  placeholder="e.g. Happy"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Language</label>
                <input 
                  value={language} 
                  onChange={e => setLanguage(e.target.value)} 
                  className="w-full px-4 py-2 rounded-lg bg-light-gray/50 text-white border border-gray-700 focus:border-neon-blue focus:outline-none" 
                  placeholder="e.g. English"
                />
              </div>

              <div className="pt-2">
                 <label className="flex items-center gap-3 cursor-pointer">
                   <input 
                     type="checkbox" 
                     checked={explicit} 
                     onChange={e => setExplicit(e.target.checked)} 
                     className="w-5 h-5 rounded bg-gray-700 border-gray-600 text-neon-blue focus:ring-neon-blue" 
                   />
                   <span className="text-white">Explicit Content</span>
                 </label>
              </div>

              <div className="pt-4 space-y-4 border-t border-gray-800 mt-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Update Audio File</label>
                  <input 
                    type="file" 
                    accept="audio/*" 
                    onChange={e => setAudioFile(e.target.files[0])} 
                    className="w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-neon-blue/10 file:text-neon-blue hover:file:bg-neon-blue/20" 
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Update Cover Image</label>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={e => setCoverFile(e.target.files[0])} 
                    className="w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-neon-blue/10 file:text-neon-blue hover:file:bg-neon-blue/20" 
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Update Lyrics File</label>
                  <input 
                    type="file" 
                    accept=".lrc,.txt" 
                    onChange={e => setLyricsFile(e.target.files[0])} 
                    className="w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-neon-blue/10 file:text-neon-blue hover:file:bg-neon-blue/20" 
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
            <button 
              onClick={() => navigate('/admin/songs')} 
              className="px-6 py-2 rounded-lg bg-gray-700 text-white hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={handleSave} 
              disabled={saving}
              className="px-6 py-2 rounded-lg bg-neon-blue text-dark-bg font-medium hover:bg-neon-blue/80 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </motion.div>
    </AdminLayout>
  );
}
