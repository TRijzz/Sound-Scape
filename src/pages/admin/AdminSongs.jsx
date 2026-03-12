import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

export default function AdminSongs() {
  const navigate = useNavigate();
  const [songs, setSongs] = useState([]);
  const [artists, setArtists] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [genreOptions, setGenreOptions] = useState([]);
  const [moodOptions, setMoodOptions] = useState(DEFAULT_MOODS);
  const [languageOptions, setLanguageOptions] = useState(DEFAULT_LANGUAGES);

  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState('');

  const [name, setName] = useState('');
  const [artistNamesInput, setArtistNamesInput] = useState('');
  const [selectedAlbum, setSelectedAlbum] = useState('');
  const [durationMs, setDurationMs] = useState('');
  const [trackNumber, setTrackNumber] = useState('');
  const [discNumber, setDiscNumber] = useState('1');
  const [explicit, setExplicit] = useState(false);
  const [popularity, setPopularity] = useState('');
  const [category, setCategory] = useState('');
  const [genre, setGenre] = useState('');
  const [mood, setMood] = useState('');
  const [language, setLanguage] = useState('');
  const [tags, setTags] = useState('');
  const [spotifyId, setSpotifyId] = useState('');
  const [albumGenres, setAlbumGenres] = useState([]);

  const [audioFile, setAudioFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [lyricsFile, setLyricsFile] = useState(null);

  const [toasts, setToasts] = useState([]);
  const canCreate = useMemo(() => name.trim().length > 0 && !creating, [name, creating]);
  const [syncingFolders, setSyncingFolders] = useState(false);

  const artistSuggestions = useMemo(() => uniqueSorted(artists.map((artist) => artist.name)), [artists]);
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

  const load = async () => {
    setLoading(true);
    try {
      const [songsRes, artistsRes, albumsRes, categoriesRes, genresRes] = await Promise.all([
        apiService.getSongs(1, 1000, search),
        apiService.getArtists(1, 1000),
        apiService.getAlbums(1, 1000),
        apiService.getCategories(),
        apiService.getGenres(200)
      ]);

      const songList = Array.isArray(songsRes?.songs) ? songsRes.songs : Array.isArray(songsRes) ? songsRes : [];
      const artistsList = artistsRes?.artists || (Array.isArray(artistsRes) ? artistsRes : []);
      const albumsList = albumsRes?.albums || (Array.isArray(albumsRes) ? albumsRes : []);
      const categoriesList = Array.isArray(categoriesRes) ? categoriesRes : (categoriesRes?.categories || []);
      const genresList = Array.isArray(genresRes) ? genresRes : (genresRes?.genres || []);

      setSongs(songList);
      setArtists(artistsList);
      setAlbums(albumsList);
      setCategoryOptions(uniqueSorted(categoriesList.map((item) => item.name || item.collectionName || '')));
      setGenreOptions(uniqueSorted(genresList.map((item) => typeof item === 'string' ? item : item?.name).filter(Boolean).map(toDisplayGenre)));
      setMoodOptions(uniqueSorted([...DEFAULT_MOODS, ...songList.map((song) => song.mood)]));
      setLanguageOptions(uniqueSorted([...DEFAULT_LANGUAGES, ...songList.map((song) => song.language)]));
    } catch (error) {
      console.error('Error loading data:', error);
      setSongs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [search]);

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

  const autoPopulate = async () => {
    try {
      showToast('Assigning song genres and categories from synced metadata...', 'success', 2500);
      const res = await apiService.populateSongCategories({
        dryRun: false,
        limit: 0,
        overwriteGenre: true,
        overwriteCategory: true
      });
      showToast('Genre and category assignment complete: ' + (res?.updated || 0) + ' songs updated', 'success', 3500);
      await load();
    } catch (error) {
      showToast('Automatic assignment failed: ' + (error?.message || 'Unknown error'), 'error');
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
      if (durationMs) formData.append('duration_ms', durationMs);
      if (trackNumber) formData.append('track_number', trackNumber);
      if (discNumber) formData.append('disc_number', discNumber);
      formData.append('explicit', String(explicit));
      if (popularity) formData.append('popularity', popularity);
      if (category.trim()) formData.append('category', category.trim());
      if (genre.trim()) formData.append('genre', genre.trim());
      if (mood.trim()) formData.append('mood', mood.trim());
      if (language.trim()) formData.append('language', language.trim());
      if (spotifyId.trim()) formData.append('spotify_id', spotifyId.trim());
      if (tags.trim()) formData.append('tags', tags);
      if (artistIds.length > 0) formData.append('artists', JSON.stringify(artistIds));
      if (audioFile) formData.append('audio', audioFile);
      if (coverFile) formData.append('cover', coverFile);
      if (lyricsFile) formData.append('lyricsFile', lyricsFile);

      await apiService.createSong(formData);

      setName('');
      setArtistNamesInput('');
      setSelectedAlbum('');
      setDurationMs('');
      setTrackNumber('');
      setDiscNumber('1');
      setExplicit(false);
      setPopularity('');
      setCategory('');
      setGenre('');
      setMood('');
      setLanguage('');
      setTags('');
      setSpotifyId('');
      setAlbumGenres([]);
      setAudioFile(null);
      setCoverFile(null);
      setLyricsFile(null);

      const fileInputs = document.querySelectorAll('input[type="file"]');
      fileInputs.forEach((input) => { input.value = ''; });

      showToast('Song created successfully!', 'success', 3000);
      await load();
    } catch (error) {
      console.error('Error creating song:', error);
      const errorMessage = error?.message || error?.details?.message || error?.details?.error || 'Unknown error';
      showToast('Failed to create song: ' + errorMessage, 'error');
    } finally {
      setCreating(false);
    }
  };

  const deleteSong = async (id) => {
    if (!window.confirm('Are you sure you want to delete this song?')) return;
    try {
      await apiService.deleteSong(id);
      showToast('Song deleted successfully!', 'success', 3000);
      await load();
    } catch (error) {
      console.error('Error deleting song:', error);
      showToast('Failed to delete song: ' + (error?.message || 'Unknown error'), 'error');
    }
  };

  const handleFolderSync = async () => {
    if (syncingFolders) return;
    setSyncingFolders(true);
    try {
      showToast('Starting folder sync...', 'success', 2000);
      const res = await apiService.syncFromFolders();
      showToast('Folder sync complete: Added ' + (res?.stats?.added || 0) + ', Updated ' + (res?.stats?.updated || 0), 'success', 4000);
      await load();
    } catch (error) {
      showToast('Folder sync failed: ' + (error?.message || 'Unknown error'), 'error');
    } finally {
      setSyncingFolders(false);
    }
  };

  return (
    <AdminLayout>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="space-y-4">
        <div className="flex items-center gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search songs"
            className="px-3 py-2 rounded-lg bg-light-gray/50 text-white border border-gray-700 flex-1"
          />
        </div>

        <div className="p-4 bg-dark-gray/40 rounded-xl border border-gray-800 space-y-3">
          <h3 className="text-lg font-medium text-white">Create Song</h3>
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

            <input value={discNumber} onChange={(e) => setDiscNumber(e.target.value)} type="number" placeholder="Disc #" className="px-3 py-2 rounded-lg bg-light-gray/50 text-white border border-gray-700" />
            <div className="flex items-center px-3 border border-gray-700 rounded-lg bg-light-gray/50">
              <label className="flex items-center gap-2 text-white text-sm cursor-pointer w-full py-2">
                <input type="checkbox" checked={explicit} onChange={(e) => setExplicit(e.target.checked)} className="rounded bg-gray-700 border-gray-600 text-neon-blue focus:ring-neon-blue" />
                Explicit
              </label>
            </div>
            <input value={trackNumber} onChange={(e) => setTrackNumber(e.target.value)} type="number" placeholder="Track #" className="px-3 py-2 rounded-lg bg-light-gray/50 text-white border border-gray-700" />
            <input value={durationMs} onChange={(e) => setDurationMs(e.target.value)} type="number" placeholder="Duration (ms)" className="px-3 py-2 rounded-lg bg-light-gray/50 text-white border border-gray-700" />
            <input value={popularity} onChange={(e) => setPopularity(e.target.value)} type="number" min="0" max="100" placeholder="Popularity" className="px-3 py-2 rounded-lg bg-light-gray/50 text-white border border-gray-700" />
            <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Tags (comma separated)" className="px-3 py-2 rounded-lg bg-light-gray/50 text-white border border-gray-700" />

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

            <select value={mood} onChange={(e) => setMood(e.target.value)} className="px-3 py-2 rounded-lg bg-light-gray/50 text-white border border-gray-700">
              <option value="">Select Mood</option>
              {moodOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>

            <select value={language} onChange={(e) => setLanguage(e.target.value)} className="px-3 py-2 rounded-lg bg-light-gray/50 text-white border border-gray-700">
              <option value="">Select Language</option>
              {languageOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>

            <input value={spotifyId} onChange={(e) => setSpotifyId(e.target.value)} placeholder="Spotify ID" className="px-3 py-2 rounded-lg bg-light-gray/50 text-white border border-gray-700" />

            {albumGenres.length > 0 && (
              <div className="md:col-span-3 text-[11px] text-gray-400">Album genres: {albumGenres.join(', ')}</div>
            )}

            <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Audio</label>
                <input type="file" accept="audio/*" onChange={(e) => setAudioFile(e.target.files[0])} className="w-full text-xs text-gray-300" />
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
            <button onClick={autoPopulate} className="px-3 py-2 rounded-lg bg-purple-500/80 text-white text-sm">Auto Assign Genre + Category</button>
            <button onClick={handleFolderSync} disabled={syncingFolders} className="px-3 py-2 rounded-lg bg-yellow-600/80 text-white disabled:opacity-50 text-sm">
              {syncingFolders ? 'Syncing...' : 'Sync Folders'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {songs.map((song) => (
            <div key={song._id || song.id} className="flex flex-col p-3 rounded-lg bg-light-gray/30 gap-3">
              <div className="flex gap-3">
                <div className="w-16 h-16 flex-shrink-0 bg-black/40 rounded overflow-hidden">
                  {(song.cover_art_url || song.album?.images?.[0]?.url) ? (
                    <img src={song.cover_art_url || song.album?.images?.[0]?.url} alt={song.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-600 text-xs">No Art</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{song.name}</div>
                  <div className="text-xs text-gray-400 truncate">{song.artists && song.artists.map((artist) => artist.name).join(', ')}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {song.album ? song.album.name : 'No Album'} � {Math.floor((song.duration_ms || 0) / 1000 / 60)}:{(Math.floor((song.duration_ms || 0) / 1000) % 60).toString().padStart(2, '0')}
                  </div>
                  <div className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                    <span className="opacity-70">Genre:</span>
                    <span className="bg-gray-800 px-1 rounded truncate max-w-[100px]">{song.genre?.name || song.genre || 'Uncategorized'}</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {song.explicit && <div className="text-[10px] text-red-400 border border-red-400/50 inline-block px-1 rounded">Explicit</div>}
                    {song.audio_url ? (
                      <div className="text-[10px] text-green-400 border border-green-400/50 inline-block px-1 rounded flex items-center gap-1">
                        <span>Audio</span>
                        <svg className="w-2 h-2" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                      </div>
                    ) : (
                      <div className="text-[10px] text-orange-400 border border-orange-400/50 inline-block px-1 rounded">No Audio</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-auto">
                <button onClick={() => navigate('/admin/songs/edit/' + (song._id || song.id))} className="flex-1 px-3 py-1 rounded bg-gray-600 text-white text-sm">Edit</button>
                <button onClick={() => deleteSong(song._id || song.id)} className="flex-1 px-3 py-1 rounded bg-red-500/80 text-white text-sm">Delete</button>
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-400">
            {loading ? 'Loading...' : 'Total: ' + songs.length + ' song' + (songs.length !== 1 ? 's' : '')}
          </div>
          <button disabled={loading} onClick={load} className="px-3 py-2 rounded bg-gray-700 text-white disabled:opacity-50 hover:bg-gray-600">
            Refresh
          </button>
        </div>
      </motion.section>
    </AdminLayout>
  );
}
