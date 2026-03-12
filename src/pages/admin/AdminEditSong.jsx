import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import apiService from '../../services/api';
import AdminLayout from './AdminLayout';
import { ToastContainer } from '../../components/ui/Toast';

const DEFAULT_MOODS = ['Chill', 'Happy', 'Sad', 'Energetic', 'Romantic', 'Focus', 'Party'];
const DEFAULT_LANGUAGES = ['English', 'Nepali', 'Hindi', 'Spanish', 'French', 'Korean'];

const toDisplayGenre = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const lower = raw.toLowerCase();
  if (lower === 'hiphop') return 'HipHop';
  if (lower === 'soft pop' || lower === 'soft_pop' || lower === 'soft-pop') return 'Soft Pop';
  if (lower === 'funk rock' || lower === 'funk_rock' || lower === 'funk-rock') return 'Funk Rock';
  return raw;
};

const uniqueSorted = (values) => Array.from(new Set(values.map((value) => String(value || '').trim()).filter(Boolean)))
  .sort((left, right) => left.localeCompare(right));

export default function AdminEditSong() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toasts, setToasts] = useState([]);

  const [allArtists, setAllArtists] = useState([]);
  const [allAlbums, setAllAlbums] = useState([]);
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [genreOptions, setGenreOptions] = useState([]);
  const [moodOptions, setMoodOptions] = useState(DEFAULT_MOODS);
  const [languageOptions, setLanguageOptions] = useState(DEFAULT_LANGUAGES);

  const [name, setName] = useState('');
  const [artistNamesInput, setArtistNamesInput] = useState('');
  const [album, setAlbum] = useState('');
  const [trackNumber, setTrackNumber] = useState('');
  const [duration, setDuration] = useState('');
  const [spotifyId, setSpotifyId] = useState('');
  const [externalSpotifyUrl, setExternalSpotifyUrl] = useState('');
  const [popularity, setPopularity] = useState('');
  const [tags, setTags] = useState('');
  const [discNumber, setDiscNumber] = useState('1');
  const [explicit, setExplicit] = useState(false);
  const [category, setCategory] = useState('');
  const [genre, setGenre] = useState('');
  const [albumGenres, setAlbumGenres] = useState([]);
  const [mood, setMood] = useState('');
  const [language, setLanguage] = useState('');
  const [currentAudioUrl, setCurrentAudioUrl] = useState('');
  const [currentCoverUrl, setCurrentCoverUrl] = useState('');
  const [audioFile, setAudioFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [lyricsFile, setLyricsFile] = useState(null);

  const artistSuggestions = useMemo(() => uniqueSorted(allArtists.map((artist) => artist.name)), [allArtists]);
  const selectedAlbum = useMemo(() => allAlbums.find((item) => item._id === album || item.id === album), [allAlbums, album]);

  const showToast = (message, type = 'error', duration = 4000) => {
    const toastId = Date.now();
    setToasts((prev) => [...prev, { id: toastId, message, type, duration }]);
  };

  const removeToast = (toastId) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== toastId));
  };

  const mergeOption = (options, value) => uniqueSorted(value ? [...options, value] : options);

  const resolveArtistIds = async () => {
    const names = uniqueSorted(artistNamesInput.split(',').map((value) => value.trim()));
    const ids = [];
    const nextArtists = [...allArtists];

    for (const artistName of names) {
      let artist = nextArtists.find((item) => item.name.toLowerCase() === artistName.toLowerCase());
      if (!artist) {
        artist = await apiService.createArtist({ name: artistName });
        nextArtists.push(artist);
      }
      ids.push(artist._id || artist.id);
    }

    setAllArtists(nextArtists);
    return ids;
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const [songRes, artistsRes, albumsRes, categoriesRes, genresRes, songsRes] = await Promise.all([
          apiService.getSong(id),
          apiService.getArtists(1, 1000),
          apiService.getAlbums(1, 1000),
          apiService.getCategories(),
          apiService.getGenres(200),
          apiService.getSongs(1, 1000)
        ]);

        const song = songRes.song || songRes;
        const artistsList = artistsRes.artists || (Array.isArray(artistsRes) ? artistsRes : []);
        const albumsList = albumsRes.albums || (Array.isArray(albumsRes) ? albumsRes : []);
        const categoriesList = Array.isArray(categoriesRes) ? categoriesRes : (categoriesRes?.categories || []);
        const genresList = Array.isArray(genresRes) ? genresRes : (genresRes?.genres || []);
        const songsList = songsRes?.songs || (Array.isArray(songsRes) ? songsRes : []);

        setAllArtists(artistsList);
        setAllAlbums(albumsList);

        const artistNames = (Array.isArray(song.artists) ? song.artists : [])
          .map((artist) => {
            if (typeof artist === 'object' && artist?.name) return artist.name;
            return artistsList.find((item) => item._id === artist || item.id === artist)?.name || '';
          })
          .filter(Boolean)
          .join(', ');

        const categoryNames = categoriesList.map((item) => item.name || item.collectionName || '').filter(Boolean);
        const genreNames = genresList.map((item) => typeof item === 'string' ? item : item?.name).filter(Boolean).map(toDisplayGenre);
        const moodNames = songsList.map((item) => item.mood).filter(Boolean);
        const languageNames = songsList.map((item) => item.language).filter(Boolean);

        setCategoryOptions(mergeOption(categoryNames, song.category || ''));
        setGenreOptions(mergeOption(genreNames, toDisplayGenre(song.genre?.name || song.genre || '')));
        setMoodOptions(mergeOption([...DEFAULT_MOODS, ...moodNames], song.mood || ''));
        setLanguageOptions(mergeOption([...DEFAULT_LANGUAGES, ...languageNames], song.language || ''));

        setName(song.name || '');
        setArtistNamesInput(artistNames);
        setAlbum(song.album ? (song.album._id || song.album) : '');
        setAlbumGenres((song.album?.genres || []).map(toDisplayGenre));
        setTrackNumber(song.track_number || '');
        setDuration(song.duration_ms ? Math.round(song.duration_ms / 1000) : '');
        setSpotifyId(song.spotify_id || '');
        setExternalSpotifyUrl(song.external_urls?.spotify || '');
        setPopularity(song.popularity || '');
        setTags(Array.isArray(song.tags) ? song.tags.join(', ') : (song.tags || ''));
        setDiscNumber(song.disc_number || '1');
        setExplicit(song.explicit || false);
        setCategory(song.category || '');
        setGenre(toDisplayGenre(song.genre?.name || song.genre || ''));
        setMood(song.mood || '');
        setLanguage(song.language || '');
        setCurrentAudioUrl(song.audio_url || '');
        setCurrentCoverUrl(song.cover_art_url || song.album?.images?.[0]?.url || '');
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
      const artistIds = await resolveArtistIds();
      const formData = new FormData();
      formData.append('name', name.trim());

      if (artistIds.length > 0) formData.append('artists', JSON.stringify(artistIds));
      if (album) formData.append('album', album);
      if (trackNumber) formData.append('track_number', trackNumber);
      if (duration) formData.append('duration', duration);
      if (spotifyId) formData.append('spotify_id', spotifyId);
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
      if (lyricsFile) formData.append('lyricsFile', lyricsFile);

      await apiService.updateSong(id, formData);
      showToast('Song updated successfully', 'success');
      setTimeout(() => navigate('/admin/songs'), 1000);
    } catch (error) {
      console.error('Error updating song:', error);
      const detail = error.details?.error || error.details?.message || error.message;
      showToast('Failed to update song: ' + detail, 'error');
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
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-light-gray/50 text-white border border-gray-700 focus:border-neon-blue focus:outline-none"
                  placeholder="Song Name"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Album</label>
                <select
                  value={album}
                  onChange={(e) => {
                    const selectedAlbumId = e.target.value;
                    setAlbum(selectedAlbumId);
                    const nextAlbum = allAlbums.find((item) => item._id === selectedAlbumId || item.id === selectedAlbumId);
                    setAlbumGenres((nextAlbum?.genres || []).map(toDisplayGenre));
                    if (!genre && nextAlbum?.genres?.length) {
                      setGenre(toDisplayGenre(nextAlbum.genres[0]));
                    }
                  }}
                  className="w-full px-4 py-2 rounded-lg bg-light-gray/50 text-white border border-gray-700 focus:border-neon-blue focus:outline-none appearance-none"
                >
                  <option value="">Select Album</option>
                  {allAlbums.map((item) => (
                    <option key={item._id || item.id} value={item._id || item.id}>{item.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Artist Name</label>
                <input
                  list="admin-edit-song-artists"
                  value={artistNamesInput}
                  onChange={(e) => setArtistNamesInput(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-light-gray/50 text-white border border-gray-700 focus:border-neon-blue focus:outline-none"
                  placeholder="Type artist name, or multiple separated by commas"
                />
                <datalist id="admin-edit-song-artists">
                  {artistSuggestions.map((artistName) => (
                    <option key={artistName} value={artistName} />
                  ))}
                </datalist>
                <p className="text-xs text-gray-500 mt-2">Use commas for multiple artists. New names will be created automatically.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Track Number</label>
                  <input
                    type="number"
                    min="1"
                    value={trackNumber}
                    onChange={(e) => setTrackNumber(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg bg-light-gray/50 text-white border border-gray-700 focus:border-neon-blue focus:outline-none"
                    placeholder="1"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Duration (seconds)</label>
                  <input
                    type="number"
                    min="0"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg bg-light-gray/50 text-white border border-gray-700 focus:border-neon-blue focus:outline-none"
                    placeholder="215"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Popularity</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={popularity}
                  onChange={(e) => setPopularity(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-light-gray/50 text-white border border-gray-700 focus:border-neon-blue focus:outline-none"
                  placeholder="0-100"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Tags (comma separated)</label>
                <input
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-light-gray/50 text-white border border-gray-700 focus:border-neon-blue focus:outline-none"
                  placeholder="hit, single, acoustic"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-light-gray/50 text-white border border-gray-700 focus:border-neon-blue focus:outline-none appearance-none"
                >
                  <option value="">Select Category</option>
                  {categoryOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Genre</label>
                <select
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-light-gray/50 text-white border border-gray-700 focus:border-neon-blue focus:outline-none appearance-none"
                >
                  <option value="">Select Genre</option>
                  {mergeOption(genreOptions, selectedAlbum?.genres?.[0] ? toDisplayGenre(selectedAlbum.genres[0]) : '').map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
                {albumGenres.length > 0 && (
                  <p className="text-xs text-gray-500 mt-2">Album genres: {albumGenres.join(', ')}</p>
                )}
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Mood</label>
                <select
                  value={mood}
                  onChange={(e) => setMood(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-light-gray/50 text-white border border-gray-700 focus:border-neon-blue focus:outline-none appearance-none"
                >
                  <option value="">Select Mood</option>
                  {moodOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Language</label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-light-gray/50 text-white border border-gray-700 focus:border-neon-blue focus:outline-none appearance-none"
                >
                  <option value="">Select Language</option>
                  {languageOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={explicit}
                    onChange={(e) => setExplicit(e.target.checked)}
                    className="w-5 h-5 rounded bg-gray-700 border-gray-600 text-neon-blue focus:ring-neon-blue"
                  />
                  <span className="text-white">Explicit Content</span>
                </label>
              </div>

              <div className="pt-4 space-y-4 border-t border-gray-800 mt-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm text-gray-400">Audio File</label>
                    {currentAudioUrl ? (
                      <span className="text-[10px] text-green-400 border border-green-400/50 px-1 rounded flex items-center gap-1">
                        <svg className="w-2 h-2" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                        Already Uploaded
                      </span>
                    ) : (
                      <span className="text-[10px] text-orange-400 border border-orange-400/50 px-1 rounded">No Audio</span>
                    )}
                  </div>
                  <input type="file" accept="audio/*" onChange={(e) => setAudioFile(e.target.files[0])} className="w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-neon-blue/10 file:text-neon-blue hover:file:bg-neon-blue/20" />
                  {currentAudioUrl && <div className="mt-1 text-xs text-gray-500 truncate max-w-xs">Current: {currentAudioUrl.split('/').pop()}</div>}
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm text-gray-400">Cover Image</label>
                    {currentCoverUrl ? (
                      <span className="text-[10px] text-green-400 border border-green-400/50 px-1 rounded">Has Cover</span>
                    ) : (
                      <span className="text-[10px] text-orange-400 border border-orange-400/50 px-1 rounded">No Cover</span>
                    )}
                  </div>
                  <input type="file" accept="image/*" onChange={(e) => setCoverFile(e.target.files[0])} className="w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-neon-blue/10 file:text-neon-blue hover:file:bg-neon-blue/20" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Lyrics File</label>
                  <input type="file" accept=".lrc,.txt" onChange={(e) => setLyricsFile(e.target.files[0])} className="w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-neon-blue/10 file:text-neon-blue hover:file:bg-neon-blue/20" />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
            <button onClick={() => navigate('/admin/songs')} className="px-6 py-2 rounded-lg bg-gray-700 text-white hover:bg-gray-600 transition-colors">
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving} className="px-6 py-2 rounded-lg bg-neon-blue text-dark-bg font-medium hover:bg-neon-blue/80 transition-colors disabled:opacity-50">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </motion.div>
    </AdminLayout>
  );
}
