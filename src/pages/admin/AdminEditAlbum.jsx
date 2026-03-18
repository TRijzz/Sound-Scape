import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import apiService from '../../services/api';
import AdminLayout from './AdminLayout';
import { ToastContainer } from '../../components/ui/Toast';
import ConfirmModal from '../../components/ui/ConfirmModal';
import DatePicker from '../../components/ui/DatePicker';

export default function AdminEditAlbum() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [allArtists, setAllArtists] = useState([]);

  // Form State
  const [name, setName] = useState('');
  const [albumType, setAlbumType] = useState('album');
  const [totalTracks, setTotalTracks] = useState('');
  const [releaseDate, setReleaseDate] = useState('');
  const [genres, setGenres] = useState('');
  const [popularity, setPopularity] = useState('');
  const [spotifyId, setSpotifyId] = useState('');
  const [externalSpotifyUrl, setExternalSpotifyUrl] = useState('');
  const [selectedArtists, setSelectedArtists] = useState([]);
  const [artistNames, setArtistNames] = useState('');
  
  const [coverFile, setCoverFile] = useState(null);

  // Audio Upload State
  const [uploadedTracksCount, setUploadedTracksCount] = useState(0);
  const [albumSongs, setAlbumSongs] = useState([]);
  const [audioFiles, setAudioFiles] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadingTrackId, setUploadingTrackId] = useState(null);

  const [vinyls, setVinyls] = useState([]);
  const [vinylName, setVinylName] = useState('');
  const [vinylImageFile, setVinylImageFile] = useState(null);
  const [creatingVinyl, setCreatingVinyl] = useState(false);
  const [vinylToDelete, setVinylToDelete] = useState(null);
  const [deleteVinylModalOpen, setDeleteVinylModalOpen] = useState(false);
  const [trackToDelete, setTrackToDelete] = useState(null);
  const [deleteTrackModalOpen, setDeleteTrackModalOpen] = useState(false);

  const showToast = (message, type = 'error', duration = 4000) => {
    const toastId = Date.now();
    setToasts(prev => [...prev, { id: toastId, message, type, duration }]);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const loadData = async () => {
    try {
      const [albumRes, artistsRes, songsRes, vinylsRes] = await Promise.all([
        apiService.getAlbum(id),
        apiService.getArtists(1, 1000),
        apiService.getSongs(1, 1000, '', '', '', '', id), // Fetch songs for this album to get count
        apiService.getVinyls()
      ]);

      const album = albumRes.album || albumRes;
      const artistsList = artistsRes.artists || (Array.isArray(artistsRes) ? artistsRes : []);
      setAllArtists(artistsList);

      // Handle Vinyls
      const allVinyls = vinylsRes?.vinyls || (Array.isArray(vinylsRes) ? vinylsRes : []);
      const albumVinyls = allVinyls.filter(v => {
          const vAlbumId = typeof v.albumId === 'object' ? v.albumId?._id || v.albumId?.id : v.albumId;
          return vAlbumId === id;
      });
      setVinyls(albumVinyls);

      // Handle songs count
      const songsList = songsRes?.songs || (Array.isArray(songsRes) ? songsRes : []);
      // Sort by track number if available
      songsList.sort((a, b) => (a.track_number || 0) - (b.track_number || 0));
      setUploadedTracksCount(songsList.filter(s => s.audio_url).length);
      setAlbumSongs(songsList);

      setName(album.name || '');
      setAlbumType(album.album_type || 'album');
      setTotalTracks(album.total_tracks || '');
      setReleaseDate(album.release_date || '');
      setGenres(Array.isArray(album.genres) ? album.genres.join(', ') : (album.genres || ''));
      setPopularity(album.popularity || '');
      setSpotifyId(album.spotify_id || '');
      setExternalSpotifyUrl(album.external_urls?.spotify || '');
      
      // Handle artists
      if (Array.isArray(album.artists)) {
          setSelectedArtists(album.artists.map(a => typeof a === 'object' ? a._id : a));

          // Set artist names for display
          const aNames = album.artists.map(a => {
             if (typeof a === 'object' && a.name) return a.name;
             const found = artistsList.find(ar => ar._id === a);
             return found ? found.name : '';
          }).filter(Boolean).join(', ');
          setArtistNames(aNames);
      }

    } catch (error) {
      console.error('Error loading data:', error);
      showToast('Error loading album details', 'error');
      navigate('/admin/albums');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
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
      formData.append('album_type', albumType);
      if (totalTracks) formData.append('total_tracks', totalTracks);
      if (releaseDate) formData.append('release_date', releaseDate);
      if (genres) formData.append('genres', genres);
      if (popularity) formData.append('popularity', popularity);
      if (spotifyId) formData.append('spotify_id', spotifyId);
      if (externalSpotifyUrl) formData.append('external_urls.spotify', externalSpotifyUrl);
      
      if (selectedArtists.length > 0) {
        // Send as JSON string to handle array correctly in FormData
        formData.append('artists', JSON.stringify(selectedArtists));
      }

      if (coverFile) formData.append('cover', coverFile);

      await apiService.updateAlbum(id, formData);
      showToast('Album updated successfully', 'success');
      setTimeout(() => navigate('/admin/albums'), 1000);
    } catch (error) {
      console.error('Error updating album:', error);
      showToast(error.message || 'Failed to update album', 'error');
      setSaving(false);
    }
  };

  const handleUploadAudio = async () => {
    if (!audioFiles || audioFiles.length === 0) return;
    
    setUploading(true);
    let successCount = 0;
    let failCount = 0;

    try {
        for (let i = 0; i < audioFiles.length; i++) {
            const file = audioFiles[i];
            const formData = new FormData();
            // Use filename as song name, removing extension
            const songName = file.name.replace(/\.[^/.]+$/, "");
            
            formData.append('name', songName);
            formData.append('album', id);
            if (selectedArtists.length > 0) {
                formData.append('artists', JSON.stringify(selectedArtists));
            }
            formData.append('audio', file);
            
            // Default fields to avoid validation errors if any
            formData.append('disc_number', '1');
            formData.append('explicit', 'false');

            try {
                await apiService.createSong(formData);
                successCount++;
            } catch (err) {
                console.error(`Failed to upload ${file.name}:`, err);
                failCount++;
            }
        }

        if (successCount > 0) {
            showToast(`Successfully uploaded ${successCount} tracks`, 'success');
            // Reset file input
            setAudioFiles(null);
            const fileInput = document.getElementById('audio-upload-input');
            if (fileInput) fileInput.value = '';
            
            // Refresh count
            loadData();
        }
        
        if (failCount > 0) {
            showToast(`Failed to upload ${failCount} tracks`, 'error');
        }

    } catch (error) {
        console.error('Upload error:', error);
        showToast('Error during upload process', 'error');
    } finally {
        setUploading(false);
    }
  };

  const handleSingleTrackUpload = async (songId, file) => {
    if (!file || !songId) return;

    setUploadingTrackId(songId);
    try {
        const formData = new FormData();
        formData.append('audio', file);
        
        await apiService.updateSong(songId, formData);
        showToast('Track audio updated successfully', 'success');
        loadData();
    } catch (error) {
        console.error('Error updating track audio:', error);
        showToast('Failed to update track audio', 'error');
    } finally {
        setUploadingTrackId(null);
    }
  };

  const handleDeleteTrackAudio = async (songId) => {
    if (!songId) return;
    setUploadingTrackId(songId);
    try {
      await apiService.updateSong(songId, { audio_url: '' });
      showToast('Track audio removed successfully', 'success');
      loadData();
    } catch (error) {
      console.error('Error removing track audio:', error);
      showToast('Failed to remove track audio', 'error');
    } finally {
      setUploadingTrackId(null);
    }
  };

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result || '';
        const base64 = String(result).split(',')[1] || '';
        resolve({ base64, mime: file.type || 'image/png' });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleCreateVinyl = async () => {
    if (!vinylName.trim() || !vinylImageFile) return;
    setCreatingVinyl(true);
    try {
      const { base64, mime } = await fileToBase64(vinylImageFile);
      await apiService.createVinyl({
        name: vinylName.trim(),
        image_base64: base64,
        mime_type: mime,
        albumId: id
      });
      setVinylName(''); 
      setVinylImageFile(null);
      // Reset file input
      const fileInput = document.getElementById('vinyl-image-input');
      if (fileInput) fileInput.value = '';
      
      showToast('Vinyl created successfully', 'success');
      loadData();
    } catch (err) {
      console.error('Error creating vinyl:', err);
      showToast(err?.message || 'Failed to create vinyl', 'error');
    } finally {
      setCreatingVinyl(false);
    }
  };

  const handleDeleteVinylClick = (vinyl) => {
    setVinylToDelete(vinyl);
    setDeleteVinylModalOpen(true);
  };

  const confirmDeleteVinyl = async () => {
    if (!vinylToDelete) return;
    try {
      await apiService.deleteVinyl(vinylToDelete._id || vinylToDelete.id);
      showToast('Vinyl deleted', 'success');
      loadData();
    } catch (err) {
        console.error('Error deleting vinyl:', err);
      showToast(err?.message || 'Failed to delete vinyl', 'error');
    } finally {
      setDeleteVinylModalOpen(false);
      setVinylToDelete(null);
    }
  };

  const handleDeleteTrackClick = (song) => {
    setTrackToDelete(song);
    setDeleteTrackModalOpen(true);
  };

  const confirmDeleteTrack = async () => {
    if (!trackToDelete) return;
    try {
      await apiService.deleteSong(trackToDelete._id || trackToDelete.id);
      showToast('Track deleted', 'success');
      loadData();
    } catch (err) {
      console.error('Error deleting track:', err);
      showToast(err?.message || 'Failed to delete track', 'error');
    } finally {
      setDeleteTrackModalOpen(false);
      setTrackToDelete(null);
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
          <h2 className="text-2xl font-bold text-white">Edit Album</h2>
          <button onClick={() => navigate('/admin/albums')} className="px-4 py-2 rounded-lg bg-gray-700 text-white hover:bg-gray-600">
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
                  onChange={e => setName(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-light-gray/50 text-white border border-gray-700 focus:border-neon-blue focus:outline-none" 
                  placeholder="Album Name"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Type</label>
                  <select 
                    value={albumType} 
                    onChange={e => setAlbumType(e.target.value)} 
                    className="w-full px-4 py-2 rounded-lg bg-light-gray/50 text-white border border-gray-700 focus:border-neon-blue focus:outline-none"
                  >
                    <option value="album">Album</option>
                    <option value="single">Single</option>
                    <option value="compilation">Compilation</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Total Tracks (Metadata)</label>
                  <input 
                    type="number"
                    value={totalTracks} 
                    onChange={e => setTotalTracks(e.target.value)} 
                    className="w-full px-4 py-2 rounded-lg bg-light-gray/50 text-white border border-gray-700 focus:border-neon-blue focus:outline-none" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                 <div>
                    <label className="block text-sm text-gray-400 mb-1">Release Date</label>
                    <DatePicker 
                      value={releaseDate} 
                      onChange={setReleaseDate} 
                      placeholder="Select Date"
                    />
                 </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Genres (comma separated)</label>
                <input 
                  value={genres} 
                  onChange={e => setGenres(e.target.value)} 
                  className="w-full px-4 py-2 rounded-lg bg-light-gray/50 text-white border border-gray-700 focus:border-neon-blue focus:outline-none" 
                  placeholder="Pop, Rock, Indie"
                />
              </div>

            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Artists</label>
                <select
                  multiple
                  value={selectedArtists}
                  onChange={e => {
                    const values = Array.from(e.target.selectedOptions).map(option => option.value);
                    const names = values
                      .map(value => allArtists.find(artist => artist._id === value)?.name)
                      .filter(Boolean)
                      .join(', ');
                    setSelectedArtists(values);
                    setArtistNames(names);
                  }}
                  className="w-full min-h-[140px] px-4 py-2 rounded-lg bg-light-gray/50 text-white border border-gray-700 focus:border-neon-blue focus:outline-none"
                >
                  {allArtists.map((artist) => (
                    <option key={artist._id} value={artist._id}>
                      {artist.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-2">Hold `Ctrl` or `Cmd` to select multiple artists.</p>
                {artistNames && <p className="text-xs text-gray-400 mt-1">Selected: {artistNames}</p>}
              </div>

              <div className="pt-4 space-y-4 border-t border-gray-800 mt-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Update Cover Image</label>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={e => setCoverFile(e.target.files[0])} 
                    className="w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-neon-blue/10 file:text-neon-blue hover:file:bg-neon-blue/20" 
                  />
                </div>
              </div>

              {/* Audio Uploader Section */}
              <div className="pt-4 space-y-4 border-t border-gray-800 mt-4 bg-dark-gray/20 p-4 rounded-lg">
                <h3 className="text-md font-medium text-white">Upload New Tracks</h3>
                
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Batch Upload</label>
                  <input 
                    id="audio-upload-input"
                    type="file" 
                    accept="audio/*" 
                    multiple
                    onChange={e => setAudioFiles(e.target.files)} 
                    className="w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-neon-blue/10 file:text-neon-blue hover:file:bg-neon-blue/20" 
                  />
                  <p className="text-xs text-gray-500 mt-1">Select multiple files to upload new songs to this album.</p>
                </div>

                <button 
                  onClick={handleUploadAudio}
                  disabled={uploading || !audioFiles || audioFiles.length === 0}
                  className="w-full px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {uploading ? 'Uploading...' : 'Upload Selected Tracks'}
                </button>
              </div>

              {/* Vinyl Management Section */}
              <div className="pt-4 space-y-4 border-t border-gray-800 mt-4 bg-dark-gray/20 p-4 rounded-lg">
                <h3 className="text-md font-medium text-white">Vinyl Release</h3>

                {/* Existing Vinyls Status */}
                {vinyls.length > 0 ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg flex items-center gap-3">
                      <div className="text-green-400">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                      </div>
                      <div>
                        <div className="text-green-400 font-medium">Vinyl already uploaded</div>
                        <div className="text-green-400/60 text-sm">This album has {vinyls.length} vinyl release(s) in the Vinyls Page.</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {vinyls.map(v => (
                        <div key={v._id || v.id} className="p-3 rounded-lg bg-light-gray/30 space-y-2 relative group border border-gray-700/50">
                          <div className="font-medium text-sm text-white truncate">{v.name}</div>
                          <div className="w-full aspect-square rounded-lg overflow-hidden bg-black/40 border border-gray-700">
                            <img
                              src={`data:${v.mime_type || 'image/png'};base64,${v.image_base64}`}
                              alt={v.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <button 
                            onClick={() => handleDeleteVinylClick(v)} 
                            className="w-full px-2 py-1.5 rounded bg-red-600/80 text-white text-xs hover:bg-red-500 transition-colors flex items-center justify-center gap-1"
                          >
                            <span>Delete</span>
                          </button>
                        </div>
                      ))}
                    </div>
                    
                    <div className="pt-2">
                         <p className="text-xs text-gray-500 text-center">To add another variant, use the form below.</p>
                    </div>
                  </div>
                ) : (
                    <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg mb-4">
                         <div className="text-blue-400 font-medium text-sm">No vinyl uploaded yet</div>
                         <div className="text-blue-400/60 text-xs">Upload a vinyl version for this album below.</div>
                    </div>
                )}
                
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Vinyl Name</label>
                    <input 
                      value={vinylName} 
                      onChange={e => setVinylName(e.target.value)} 
                      placeholder="e.g. Limited Edition Red"
                      className="w-full px-4 py-2 rounded-lg bg-light-gray/50 text-white border border-gray-700 focus:border-neon-blue focus:outline-none" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Vinyl Image</label>
                    <input 
                      id="vinyl-image-input"
                      type="file" 
                      accept="image/*" 
                      onChange={e => setVinylImageFile(e.target.files[0])} 
                      className="w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-neon-blue/10 file:text-neon-blue hover:file:bg-neon-blue/20" 
                    />
                  </div>
                  <button 
                    onClick={handleCreateVinyl}
                    disabled={creatingVinyl || !vinylName.trim() || !vinylImageFile}
                    className="w-full px-4 py-2 rounded-lg bg-neon-blue text-dark-bg font-medium hover:bg-neon-blue/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {creatingVinyl ? 'Creating...' : 'Add Vinyl'}
                  </button>
                </div>
              </div>

            </div>
          </div>
          
          {/* Tracks List */}
          {albumSongs.length > 0 && (
            <div className="mt-8">
                <h3 className="text-center text-white font-medium mb-4">Album Tracks ({albumSongs.length})</h3>
                <div className="space-y-2">
                    {albumSongs.map((song, index) => (
                        <div key={song._id || song.id} className="flex items-center justify-between p-4 bg-[#121212] border border-gray-800 rounded-lg hover:bg-white/5 transition-colors group">
                            <div className="flex items-center gap-4 flex-1">
                                <span className="text-gray-500 w-6 text-center">{song.track_number || index + 1}</span>
                                <div className="flex flex-col">
                                    <span className="text-white font-bold">{song.name}</span>
                                    <span className="text-xs text-gray-500">
                                        {apiService.formatDuration(song.duration_ms || 0)}
                                    </span>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-4">
                                <div>
                                    {song.audio_url ? (
                                        <span className="text-xs bg-green-900/30 text-green-400 px-2 py-1 rounded border border-green-900/50">
                                            Audio Present
                                        </span>
                                    ) : (
                                        <span className="text-xs bg-red-900/30 text-red-400 px-2 py-1 rounded border border-red-900/50">
                                            Missing Audio
                                        </span>
                                    )}
                                </div>
                                
                                <div className="flex items-center gap-3">
                                  <div>
                                    <input
                                        type="file"
                                        id={`upload-${song._id}`}
                                        accept="audio/*"
                                        className="hidden"
                                        onChange={(e) => {
                                            if (e.target.files?.[0]) {
                                                handleSingleTrackUpload(song._id, e.target.files[0]);
                                            }
                                            e.target.value = '';
                                        }}
                                    />
                                    <label 
                                        htmlFor={`upload-${song._id}`}
                                        className={`
                                            cursor-pointer px-4 py-2 rounded border border-gray-700 text-sm font-medium transition-colors
                                            ${uploadingTrackId === song._id 
                                                ? 'bg-gray-800 text-gray-400 cursor-not-allowed' 
                                                : 'text-gray-300 hover:text-white hover:border-gray-500 hover:bg-white/5'
                                            }
                                        `}
                                    >
                                        {uploadingTrackId === song._id ? (
                                            <span className="flex items-center gap-2">
                                                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                Uploading...
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-2">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                                </svg>
                                                Upload Audio
                                            </span>
                                        )}
                                    </label>
                                  </div>
                                  <button
                                    onClick={() => handleDeleteTrackAudio(song._id || song.id)}
                                    disabled={!song.audio_url || uploadingTrackId === (song._id || song.id)}
                                    className="px-3 py-1.5 rounded border border-yellow-700 text-xs font-medium text-yellow-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-yellow-900/30 hover:text-yellow-200 transition-colors"
                                  >
                                    Remove Audio
                                  </button>
                                  <button
                                    onClick={() => handleDeleteTrackClick(song)}
                                    className="px-3 py-1.5 rounded border border-red-800 text-xs font-medium text-red-400 hover:bg-red-900/30 hover:text-red-300 transition-colors"
                                  >
                                    Delete
                                  </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
            <button 
              onClick={() => navigate('/admin/albums')} 
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
        <ConfirmModal
          isOpen={deleteVinylModalOpen}
          onClose={() => setDeleteVinylModalOpen(false)}
          onConfirm={confirmDeleteVinyl}
          title="Delete Vinyl"
          message={`Are you sure you want to delete "${vinylToDelete?.name}"?`}
          confirmText="Delete Vinyl"
          isDangerous={true}
        />
        <ConfirmModal
          isOpen={deleteTrackModalOpen}
          onClose={() => setDeleteTrackModalOpen(false)}
          onConfirm={confirmDeleteTrack}
          title="Delete Track"
          message={`Are you sure you want to delete "${trackToDelete?.name}"?`}
          confirmText="Delete Track"
          isDangerous={true}
        />
      </motion.div>
    </AdminLayout>
  );
}
