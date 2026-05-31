import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import apiService from '../../services/api';
import AdminLayout from './AdminLayout';
import { ToastContainer } from '../../components/ui/Toast';
import { formatDurationFromMs, readAudioDurationFromFile, readAudioDurationFromUrl } from '../../utils/audioDuration';
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

export default function AdminEditSong() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toasts, setToasts] = useState([]);

  const [allArtists, setAllArtists] = useState([]);
  const [allAlbums, setAllAlbums] = useState([]);
  const [genreOptions, setGenreOptions] = useState([]);
  const [moodOptions, setMoodOptions] = useState([]);
  const [languageOptions, setLanguageOptions] = useState(DEFAULT_LANGUAGES);

  const [name, setName] = useState('');
  const [artistNamesInput, setArtistNamesInput] = useState('');
  const [album, setAlbum] = useState('');
  const [spotifyId, setSpotifyId] = useState('');
  const [externalSpotifyUrl, setExternalSpotifyUrl] = useState('');
  const [discNumber, setDiscNumber] = useState('1');
  const [explicit, setExplicit] = useState(false);
  const [genre, setGenre] = useState('');
  const [albumGenres, setAlbumGenres] = useState([]);
  const [mood, setMood] = useState('');
  const [language, setLanguage] = useState('');
  const [currentAudioUrl, setCurrentAudioUrl] = useState('');
  const [currentCoverUrl, setCurrentCoverUrl] = useState('');
  const [audioFile, setAudioFile] = useState(null);
  const [removeCurrentAudio, setRemoveCurrentAudio] = useState(false);
  const [coverFile, setCoverFile] = useState(null);
  const [lyricsFile, setLyricsFile] = useState(null);
  const [detectedDurationMs, setDetectedDurationMs] = useState(0);

  const artistSuggestions = useMemo(() => uniqueSorted(allArtists.filter(isAdminVisibleArtist).map((artist) => artist.name)), [allArtists]);
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
        const [songRes, artistsRes, albumsRes, genresRes, songsRes, moodsRes] = await Promise.all([
          apiService.getSong(id),
          apiService.getArtists(1, 1000),
          apiService.getAlbums(1, 1000),
          apiService.getGenres(200),
          apiService.getSongs(1, 1000),
          apiService.getSongMoods().catch(() => ({ moods: [] }))
        ]);

        const song = songRes.song || songRes;
        const artistsList = artistsRes.artists || (Array.isArray(artistsRes) ? artistsRes : []);
        const albumsList = albumsRes.albums || (Array.isArray(albumsRes) ? albumsRes : []);
        const genresList = Array.isArray(genresRes) ? genresRes : (genresRes?.genres || []);
        const songsList = songsRes?.songs || (Array.isArray(songsRes) ? songsRes : []);

        setAllArtists(artistsList.filter(isAdminVisibleArtist));
        setAllAlbums(albumsList.filter(isAdminVisibleAlbum));

        const artistNames = (Array.isArray(song.artists) ? song.artists : [])
          .map((artist) => {
            if (typeof artist === 'object' && artist?.name) return artist.name;
            return artistsList.filter(isAdminVisibleArtist).find((item) => item._id === artist || item.id === artist)?.name || '';
          })
          .filter(Boolean)
          .join(', ');

        const genreNames = genresList.map((item) => typeof item === 'string' ? item : item?.name).filter(Boolean).map(toDisplayGenre);
        const moodNames = (moodsRes?.moods || []).concat(songsList.map((item) => item.mood).filter(Boolean));
        const languageNames = songsList.map((item) => item.language).filter(Boolean);

        setGenreOptions(mergeOption(genreNames, toDisplayGenre(song.genre?.name || song.genre || '')));
        setMoodOptions(mergeOption(moodNames, song.mood || ''));
        setLanguageOptions(mergeOption([...DEFAULT_LANGUAGES, ...languageNames], song.language || ''));

        setName(song.name || '');
        setArtistNamesInput(artistNames);
        setAlbum(song.album ? (song.album._id || song.album) : '');
        setAlbumGenres((song.album?.genres || []).map(toDisplayGenre));
        setSpotifyId(song.spotify_id || '');
        setExternalSpotifyUrl(song.external_urls?.spotify || '');
        setDiscNumber(song.disc_number || '1');
        setExplicit(song.explicit || false);
        setGenre(toDisplayGenre(song.genre?.name || song.genre || ''));
        setMood(song.mood || '');
        setLanguage(song.language || '');
        setCurrentAudioUrl(song.audio_url || '');
        setCurrentCoverUrl(song.cover_art_url || song.album?.images?.[0]?.url || '');
        setDetectedDurationMs(Number(song.duration_ms || 0));
        setRemoveCurrentAudio(false);

        if (song.audio_url && !Number(song.duration_ms || 0)) {
          try {
            const absoluteAudioUrl = song.audio_url.startsWith('http')
              ? song.audio_url
              : `${window.location.origin}${song.audio_url}`;
            const nextDuration = await readAudioDurationFromUrl(absoluteAudioUrl);
            setDetectedDurationMs(nextDuration);
          } catch (durationError) {
            console.error('Failed to detect existing audio duration:', durationError);
          }
        }
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

  const handleAudioChange = async (event) => {
    const nextFile = event.target.files?.[0] || null;
    setAudioFile(nextFile);
    if (!nextFile) {
      return;
    }

    setRemoveCurrentAudio(false);
    try {
      const nextDuration = await readAudioDurationFromFile(nextFile);
      setDetectedDurationMs(nextDuration);
    } catch (error) {
      console.error('Failed to detect uploaded audio duration:', error);
      showToast('Could not detect the new audio duration automatically.', 'error');
    }
  };

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
      if (spotifyId) formData.append('spotify_id', spotifyId);
      if (externalSpotifyUrl) formData.append('external_urls.spotify', externalSpotifyUrl);
      formData.append('disc_number', discNumber);
      formData.append('explicit', explicit);
      formData.append('genre', genre);
      formData.append('mood', mood);
      formData.append('language', language);
      if (detectedDurationMs > 0) formData.append('duration_ms', String(detectedDurationMs));
      if (removeCurrentAudio && !audioFile) formData.append('remove_audio', 'true');
      if (audioFile) formData.append('audio', audioFile);
      if (coverFile) formData.append('cover', coverFile);
      if (lyricsFile) formData.append('lyricsFile', lyricsFile);

      await apiService.updateSong(id, formData);
      showToast('Song updated successfully', 'success');
      // Stay on the edit page — admins often want to make multiple
      // tweaks (re-upload audio, fix lyrics, adjust metadata) without
      // being kicked back to the list after every save.
    } catch (error) {
      console.error('Error updating song:', error);
      const detail = error.details?.error || error.details?.message || error.message;
      showToast('Failed to update song: ' + detail, 'error');
    } finally {
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
            </div>

            <div className="space-y-4">
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
                <div>
                  <input
                    list="admin-edit-song-moods"
                    value={mood}
                    onChange={(e) => setMood(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg bg-light-gray/50 text-white border border-gray-700 focus:border-neon-blue focus:outline-none"
                    placeholder="Type or select mood"
                  />
                  <datalist id="admin-edit-song-moods">
                    {moodOptions.map((option) => (
                      <option key={option} value={option} />
                    ))}
                  </datalist>
                </div>
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
                    {currentAudioUrl && !removeCurrentAudio ? (
                      <span className="text-[10px] text-green-400 border border-green-400/50 px-1 rounded flex items-center gap-1">
                        <svg className="w-2 h-2" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                        Already Uploaded
                      </span>
                    ) : removeCurrentAudio ? (
                      <span className="text-[10px] text-red-400 border border-red-400/50 px-1 rounded">Will Remove</span>
                    ) : (
                      <span className="text-[10px] text-orange-400 border border-orange-400/50 px-1 rounded">No Audio</span>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={handleAudioChange}
                    className="w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-neon-blue/10 file:text-neon-blue hover:file:bg-neon-blue/20"
                  />
                  {detectedDurationMs > 0 && (
                    <div className="mt-2 text-xs text-green-400">Detected duration: {formatDurationFromMs(detectedDurationMs)}</div>
                  )}
                  {currentAudioUrl ? (
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <div className="text-xs text-gray-500 truncate max-w-xs">
                        Current: {currentAudioUrl.split('/').pop()}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setRemoveCurrentAudio((prev) => !prev);
                          setAudioFile(null);
                        }}
                        className={`rounded-lg border px-3 py-1 text-xs ${removeCurrentAudio ? 'border-gray-600 text-gray-300 hover:bg-white/5' : 'border-red-500/40 text-red-300 hover:bg-red-500/10'}`}
                      >
                        {removeCurrentAudio ? 'Keep audio' : 'Remove audio'}
                      </button>
                    </div>
                  ) : null}
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
