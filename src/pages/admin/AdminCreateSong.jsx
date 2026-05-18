import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import apiService from '../../services/api';
import AdminLayout from './AdminLayout';
import { ToastContainer } from '../../components/ui/Toast';
import { formatDurationFromMs, readAudioDurationFromFile } from '../../utils/audioDuration';
import { isAdminVisibleAlbum, isAdminVisibleArtist } from '../../utils/adminVisibility';

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

export default function AdminCreateSong() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [artists, setArtists] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [genreOptions, setGenreOptions] = useState([]);
  const [moodOptions, setMoodOptions] = useState([]);
  const [languageOptions, setLanguageOptions] = useState(DEFAULT_LANGUAGES);

  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [artistNamesInput, setArtistNamesInput] = useState('');
  const [selectedAlbum, setSelectedAlbum] = useState('');
  const [explicit, setExplicit] = useState(false);
  const [category, setCategory] = useState('');
  const [genre, setGenre] = useState('');
  const [mood, setMood] = useState('');
  const [language, setLanguage] = useState('');
  const [albumGenres, setAlbumGenres] = useState([]);

  const [audioFile, setAudioFile] = useState(null);
  const [detectedDurationMs, setDetectedDurationMs] = useState(0);
  const [coverFile, setCoverFile] = useState(null);
  const [lyricsFile, setLyricsFile] = useState(null);

  const [toasts, setToasts] = useState([]);
  const prefilledArtistName = searchParams.get('artist') || '';
  const prefilledArtistId = searchParams.get('artistId') || '';

  const canCreate = useMemo(() => name.trim().length > 0 && !creating, [name, creating]);
  const artistSuggestions = useMemo(() => uniqueSorted(artists.filter(isAdminVisibleArtist).map((artist) => artist.name)), [artists]);
  const selectedAlbumDetails = useMemo(
    () => albums.find((album) => (album._id || album.id) === selectedAlbum),
    [albums, selectedAlbum]
  );

  const mergeOption = (options, value) => uniqueSorted(value ? [...options, value] : options);

  const showToast = (message, type = 'error', duration = 4000) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type, duration }]);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  useEffect(() => {
    const load = async () => {
      try {
        const [songsRes, artistsRes, albumsRes, categoriesRes, genresRes, moodsRes] = await Promise.all([
          apiService.getSongs(1, 1000),
          apiService.getArtists(1, 1000),
          apiService.getAlbums(1, 1000),
          apiService.getCategories(),
          apiService.getGenres(200),
          apiService.getSongMoods().catch(() => ({ moods: [] }))
        ]);

        const songList = Array.isArray(songsRes?.songs) ? songsRes.songs : Array.isArray(songsRes) ? songsRes : [];
        const artistsList = artistsRes?.artists || (Array.isArray(artistsRes) ? artistsRes : []);
        const albumsList = albumsRes?.albums || (Array.isArray(albumsRes) ? albumsRes : []);
        const categoriesList = Array.isArray(categoriesRes) ? categoriesRes : (categoriesRes?.categories || []);
        const genresList = Array.isArray(genresRes) ? genresRes : (genresRes?.genres || []);

        setArtists(artistsList.filter(isAdminVisibleArtist));
        setAlbums(albumsList.filter(isAdminVisibleAlbum));
        setCategoryOptions(uniqueSorted(categoriesList.map((item) => item.name || item.collectionName || '')));
        setGenreOptions(uniqueSorted(genresList.map((item) => typeof item === 'string' ? item : item?.name).filter(Boolean).map(toDisplayGenre)));
        setMoodOptions(uniqueSorted((moodsRes?.moods || []).concat(songList.map((song) => song.mood))));
        setLanguageOptions(uniqueSorted([...DEFAULT_LANGUAGES, ...songList.map((song) => song.language)]));
        if (prefilledArtistName) {
          setArtistNamesInput(prefilledArtistName);
        } else if (prefilledArtistId) {
          const matchedArtist = artistsList.filter(isAdminVisibleArtist).find((artist) => String(artist._id || artist.id || '') === String(prefilledArtistId));
          if (matchedArtist?.name) {
            setArtistNamesInput(matchedArtist.name);
          }
        }
      } catch (error) {
        console.error('Error loading create song data:', error);
      }
    };

    load();
  }, [prefilledArtistId, prefilledArtistName]);

  const resolveArtistIds = async () => {
    const names = uniqueSorted(artistNamesInput.split(',').map((value) => value.trim()));
    const ids = [];
    const nextArtists = [...artists];

    for (const artistName of names) {
      let artist = nextArtists.find((item) => item.name.toLowerCase() === artistName.toLowerCase());
      if (!artist) {
        artist = await apiService.createArtist({ name: artistName });
        nextArtists.push(artist);
      }
      ids.push(artist._id || artist.id);
    }

    setArtists(nextArtists);
    return ids;
  };

  const handleAudioChange = async (event) => {
    const nextFile = event.target.files?.[0] || null;
    setAudioFile(nextFile);
    setDetectedDurationMs(0);

    if (!nextFile) {
      return;
    }

    try {
      const nextDuration = await readAudioDurationFromFile(nextFile);
      setDetectedDurationMs(nextDuration);
    } catch (error) {
      console.error('Failed to detect uploaded audio duration:', error);
      showToast('Could not detect audio duration automatically. You can still create the song and re-upload if needed.', 'error');
    }
  };

  const createSong = async () => {
    if (!canCreate || creating) return;
    setCreating(true);
    try {
      const artistIds = await resolveArtistIds();
      const formData = new FormData();
      formData.append('name', name.trim());
      if (selectedAlbum) formData.append('album', selectedAlbum);
      formData.append('explicit', String(explicit));
      if (category.trim()) formData.append('category', category.trim());
      if (genre.trim()) formData.append('genre', genre.trim());
      if (mood.trim()) formData.append('mood', mood.trim());
      if (language.trim()) formData.append('language', language.trim());
      if (artistIds.length > 0) formData.append('artists', JSON.stringify(artistIds));
      if (detectedDurationMs > 0) formData.append('duration_ms', String(detectedDurationMs));
      if (audioFile) formData.append('audio', audioFile);
      if (coverFile) formData.append('cover', coverFile);
      if (lyricsFile) formData.append('lyricsFile', lyricsFile);

      await apiService.createSong(formData);
      showToast('Song created successfully!', 'success', 3000);
      navigate(`/admin/songs?q=${encodeURIComponent(name.trim())}`);
    } catch (error) {
      console.error('Error creating song:', error);
      const errorMessage = error?.message || error?.details?.message || error?.details?.error || 'Unknown error';
      showToast('Failed to create song: ' + errorMessage, 'error');
    } finally {
      setCreating(false);
    }
  };

  return (
    <AdminLayout>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-white">Create Song</h2>
            <p className="text-sm text-gray-400 mt-1">Add a new song with the streamlined fields you actually need.</p>
          </div>
          <button onClick={() => navigate('/admin/songs')} className="px-4 py-2 rounded-lg bg-light-gray/50 text-white hover:bg-light-gray transition-colors">
            Back to Songs
          </button>
        </div>

        <div className="p-4 bg-dark-gray/40 rounded-xl border border-gray-800 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name *" className="px-3 py-2 rounded-lg bg-light-gray/50 text-white border border-gray-700" />

            <select
              value={selectedAlbum}
              onChange={(e) => {
                const nextAlbumId = e.target.value;
                setSelectedAlbum(nextAlbumId);
                const nextAlbum = albums.find((item) => (item._id || item.id) === nextAlbumId);
                const nextGenres = (nextAlbum?.genres || []).map(toDisplayGenre);
                setAlbumGenres(nextGenres);
                if (!genre && nextGenres.length > 0) {
                  setGenre(nextGenres[0]);
                }
              }}
              className="px-3 py-2 rounded-lg bg-light-gray/50 text-white border border-gray-700"
            >
              <option value="">Select Album</option>
              {albums.map((albumItem) => (
                <option key={albumItem._id || albumItem.id} value={albumItem._id || albumItem.id}>{albumItem.name}</option>
              ))}
            </select>

            <input
              list="admin-song-artists"
              value={artistNamesInput}
              onChange={(e) => setArtistNamesInput(e.target.value)}
              placeholder="Artist names, comma separated"
              className="px-3 py-2 rounded-lg bg-light-gray/50 text-white border border-gray-700"
            />
            <datalist id="admin-song-artists">
              {artistSuggestions.map((artistName) => (
                <option key={artistName} value={artistName} />
              ))}
            </datalist>

            <div className="flex items-center px-3 border border-gray-700 rounded-lg bg-light-gray/50">
              <label className="flex items-center gap-2 text-white text-sm cursor-pointer w-full py-2">
                <input type="checkbox" checked={explicit} onChange={(e) => setExplicit(e.target.checked)} className="rounded bg-gray-700 border-gray-600 text-neon-blue focus:ring-neon-blue" />
                Explicit
              </label>
            </div>

            <select value={category} onChange={(e) => setCategory(e.target.value)} className="px-3 py-2 rounded-lg bg-light-gray/50 text-white border border-gray-700">
              <option value="">Select Category</option>
              {categoryOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>

            <select value={genre} onChange={(e) => setGenre(e.target.value)} className="px-3 py-2 rounded-lg bg-light-gray/50 text-white border border-gray-700">
              <option value="">Select Genre</option>
              {mergeOption(genreOptions, selectedAlbumDetails?.genres?.[0] ? toDisplayGenre(selectedAlbumDetails.genres[0]) : '').map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>

            <div>
              <input list="admin-song-moods" value={mood} onChange={(e) => setMood(e.target.value)} placeholder="Type or select mood" className="w-full px-3 py-2 rounded-lg bg-light-gray/50 text-white border border-gray-700" />
              <datalist id="admin-song-moods">
                {moodOptions.map((option) => (
                  <option key={option} value={option} />
                ))}
              </datalist>
            </div>

            <select value={language} onChange={(e) => setLanguage(e.target.value)} className="px-3 py-2 rounded-lg bg-light-gray/50 text-white border border-gray-700">
              <option value="">Select Language</option>
              {languageOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>

            {albumGenres.length > 0 && (
              <div className="md:col-span-3 text-[11px] text-gray-400">Album genres: {albumGenres.join(', ')}</div>
            )}

            <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Audio</label>
                <input type="file" accept="audio/*" onChange={handleAudioChange} className="w-full text-xs text-gray-300" />
                {detectedDurationMs > 0 && (
                  <div className="mt-2 text-xs text-green-400">Detected duration: {formatDurationFromMs(detectedDurationMs)}</div>
                )}
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Cover</label>
                <input type="file" accept="image/*" onChange={(e) => setCoverFile(e.target.files[0])} className="w-full text-xs text-gray-300" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Lyrics</label>
                <input type="file" accept=".lrc,.txt" onChange={(e) => setLyricsFile(e.target.files[0])} className="w-full text-xs text-gray-300" />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-2">
            <button onClick={createSong} disabled={!canCreate} className="px-4 py-2 rounded-lg bg-neon-blue text-dark-bg disabled:opacity-50 font-medium">
              {creating ? 'Creating...' : 'Create Song'}
            </button>
          </div>
        </div>
      </motion.section>
    </AdminLayout>
  );
}
