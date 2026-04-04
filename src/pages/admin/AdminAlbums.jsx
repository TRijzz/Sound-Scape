import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import apiService from '../../services/api';
import AdminLayout from './AdminLayout';
import { ToastContainer } from '../../components/ui/Toast';
import ConfirmModal from '../../components/ui/ConfirmModal';
import DatePicker from '../../components/ui/DatePicker';

const selectOptionStyle = { backgroundColor: '#0b0d14', color: '#ffffff' };
const isAdminVisibleArtist = (artist) => artist && artist.is_visible !== false && artist.publish_status !== 'hidden';
const getArtistEntityId = (artist) => {
  if (!artist) return '';
  if (typeof artist === 'string') return artist;
  return String(artist._id || artist.id || '');
};

const getAlbumDisplayName = (album) => {
  if (album?.name === '\u00F7 (Deluxe)') return 'Divide Deluxe';
  return album?.name;
};

const albumCover = (album) => apiService.resolveMediaUrl(album?.images?.[0]?.url || '');
const isHiddenAlbum = (album) => album?.is_visible === false || album?.publish_status === 'hidden';

const fmtDate = (value) => {
  if (!value) return 'Unknown';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Unknown'
    : new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
};

export default function AdminAlbums() {
  const navigate = useNavigate();
  const [albums, setAlbums] = useState([]);
  const [artists, setArtists] = useState([]);
  const [trackCounts, setTrackCounts] = useState({});
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ type: 'all', artist: 'all', sort: 'recent' });
  const [artistContentMode, setArtistContentMode] = useState('visible');
  const [selectedIds, setSelectedIds] = useState([]);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [albumToDelete, setAlbumToDelete] = useState(null);

  const [name, setName] = useState('');
  const [albumType, setAlbumType] = useState('album');
  const [totalTracks, setTotalTracks] = useState('');
  const [releaseDate, setReleaseDate] = useState('');
  const [selectedArtists, setSelectedArtists] = useState([]);
  const [genres, setGenres] = useState('');
  const [moods, setMoods] = useState('');
  const [popularity, setPopularity] = useState('');
  const [spotifyId, setSpotifyId] = useState('');
  const [coverFile, setCoverFile] = useState(null);
  const [moodOptions, setMoodOptions] = useState([]);

  const [toasts, setToasts] = useState([]);
  const canCreate = useMemo(() => name.trim().length > 0 && !creating, [name, creating]);
  const visibleArtists = useMemo(() => artists.filter(isAdminVisibleArtist), [artists]);
  const hiddenArtists = useMemo(() => artists.filter((artist) => !isAdminVisibleArtist(artist)), [artists]);
  const hiddenArtistIds = useMemo(
    () => new Set(artists.filter((artist) => !isAdminVisibleArtist(artist)).map((artist) => String(artist._id || artist.id || '')).filter(Boolean)),
    [artists]
  );

  const isArtistAllowed = (artist) => {
    const artistId = getArtistEntityId(artist);
    if (artistId && hiddenArtistIds.has(artistId)) return false;
    return isAdminVisibleArtist(artist);
  };

  const albumArtistsText = (album) => (album?.artists || []).filter(isArtistAllowed).map((artist) => artist?.name).filter(Boolean).join(', ');
  const hasHiddenArtistLink = (artistList) => Array.isArray(artistList) && artistList.some((artist) => !isArtistAllowed(artist));

  const stats = useMemo(() => ({
    total: albums.length,
    withAudio: Object.values(trackCounts).filter((count) => count > 0).length,
    singles: albums.filter((album) => album.album_type === 'single').length,
    upcoming: albums.filter((album) => album.release_date && new Date(album.release_date) > new Date()).length,
    hidden: albums.filter((album) => isHiddenAlbum(album)).length,
    hiddenArtistAlbums: albums.filter((album) => hasHiddenArtistLink(album?.artists)).length
  }), [albums, trackCounts]);

  const artistOptions = useMemo(
    () => (artistContentMode === 'hidden' ? hiddenArtists : visibleArtists)
      .map((artist) => artist.name)
      .filter(Boolean)
      .sort((left, right) => left.localeCompare(right, undefined, { sensitivity: 'base' })),
    [artistContentMode, hiddenArtists, visibleArtists]
  );

  const filteredAlbums = useMemo(() => {
    const query = search.trim().toLowerCase();
    const next = albums.filter((album) => {
      const hiddenLinked = hasHiddenArtistLink(album?.artists);
      const matchesVisibility = artistContentMode === 'hidden' ? hiddenLinked : !hiddenLinked;
      const hiddenArtistText = (album?.artists || []).filter((artist) => hiddenArtistIds.has(getArtistEntityId(artist))).map((artist) => artist?.name).filter(Boolean).join(', ');
      const matchesSearch = !query || [getAlbumDisplayName(album), artistContentMode === 'hidden' ? hiddenArtistText : albumArtistsText(album)]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query));
      const matchesType = filters.type === 'all' || album.album_type === filters.type;
      const matchesArtist = filters.artist === 'all'
        || (album.artists || []).some((artist) => String(artist?.name || '').toLowerCase() === filters.artist.toLowerCase()
          && (artistContentMode === 'hidden'
            ? hiddenArtistIds.has(getArtistEntityId(artist))
            : isArtistAllowed(artist)));
      return matchesVisibility && matchesSearch && matchesType && matchesArtist;
    });

    const sorted = [...next];
    if (filters.sort === 'az') {
      sorted.sort((left, right) => getAlbumDisplayName(left).localeCompare(getAlbumDisplayName(right), undefined, { sensitivity: 'base' }));
    } else if (filters.sort === 'za') {
      sorted.sort((left, right) => getAlbumDisplayName(right).localeCompare(getAlbumDisplayName(left), undefined, { sensitivity: 'base' }));
    } else {
      sorted.sort((left, right) => new Date(right.createdAt || right.updatedAt || 0).getTime() - new Date(left.createdAt || left.updatedAt || 0).getTime());
    }
    return sorted;
  }, [albumArtistsText, albums, artistContentMode, filters, hiddenArtistIds, search]);
  const filteredAlbumIds = filteredAlbums.map((album) => String(album._id || album.id));
  const allFilteredSelected = filteredAlbumIds.length > 0 && filteredAlbumIds.every((id) => selectedIds.includes(id));

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
      const [res, artistsRes, songsRes, moodsRes] = await Promise.all([
        apiService.getAlbums(1, 1000),
        apiService.getArtists(1, 1000),
        apiService.getSongs(1, 2000),
        apiService.getSongMoods().catch(() => ({ moods: [] }))
      ]);

      const list = Array.isArray(res?.albums) ? res.albums : Array.isArray(res) ? res : [];
      setAlbums(list);

      const artistsList = artistsRes?.artists || (Array.isArray(artistsRes) ? artistsRes : []);
      setArtists(artistsList);

      const songsList = songsRes?.songs || (Array.isArray(songsRes) ? songsRes : []);
      const counts = {};
      songsList.forEach((song) => {
        const albumId = typeof song.album === 'object' ? song.album?._id : song.album;
        if (albumId && song.audio_url) {
          counts[albumId] = (counts[albumId] || 0) + 1;
        }
      });
      setTrackCounts(counts);
      setMoodOptions(Array.isArray(moodsRes?.moods) ? moodsRes.moods : []);
    } catch (error) {
      console.error('Error loading albums:', error);
      setAlbums([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const storedTokens = localStorage.getItem('authTokens');
    if (storedTokens) {
      try {
        const { accessToken } = JSON.parse(storedTokens);
        if (accessToken) apiService.setAuthToken(accessToken);
      } catch (error) {
        console.error('Error loading auth token:', error);
      }
    }
  }, []);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!drawerOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [drawerOpen]);

  const resetCreateForm = () => {
    setName('');
    setAlbumType('album');
    setTotalTracks('');
    setReleaseDate('');
    setSelectedArtists([]);
    setGenres('');
    setMoods('');
    setPopularity('');
    setSpotifyId('');
    setCoverFile(null);
  };

  const closeDrawer = () => {
    if (creating) return;
    setDrawerOpen(false);
  };

  const createAlbum = async () => {
    if (!canCreate || creating) return;
    setCreating(true);
    try {
      const formData = new FormData();
      formData.append('name', name.trim());
      formData.append('album_type', albumType);
      if (totalTracks) formData.append('total_tracks', totalTracks);
      if (releaseDate) formData.append('release_date', releaseDate);
      if (genres) formData.append('genres', genres);
      if (moods) formData.append('moods', moods);
      if (popularity) formData.append('popularity', popularity);
      if (spotifyId) formData.append('spotify_id', spotifyId);
      if (selectedArtists.length > 0) formData.append('artists', JSON.stringify(selectedArtists));
      if (coverFile) formData.append('cover', coverFile);

      await apiService.createAlbum(formData);

      resetCreateForm();

      const fileInputs = document.querySelectorAll('input[type="file"]');
      fileInputs.forEach((input) => { input.value = ''; });

      showToast('Album created successfully!', 'success', 3000);
      setDrawerOpen(false);
      await load();
    } catch (error) {
      console.error('Error creating album:', error);
      showToast(`Failed to create album: ${error?.message || 'Unknown error'}`, 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteClick = (album) => {
    setAlbumToDelete(album);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!albumToDelete) return;
    try {
      await apiService.deleteAlbum(albumToDelete._id || albumToDelete.id);
      showToast('Album deleted successfully!', 'success', 3000);
      await load();
    } catch (error) {
      console.error('Error deleting album:', error);
      showToast(`Failed to delete album: ${error?.message || 'Unknown error'}`, 'error');
    } finally {
      setDeleteModalOpen(false);
      setAlbumToDelete(null);
    }
  };

  const bulkDeleteAlbums = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Delete ${selectedIds.length} selected album${selectedIds.length === 1 ? '' : 's'}?`)) return;
    try {
      await Promise.all(selectedIds.map((id) => apiService.deleteAlbum(id)));
      setAlbums((prev) => prev.filter((album) => !selectedIds.includes(String(album._id || album.id))));
      setSelectedIds([]);
      showToast(`Deleted ${selectedIds.length} album${selectedIds.length === 1 ? '' : 's'}.`, 'success', 3000);
    } catch (error) {
      showToast(`Failed to delete selected albums: ${error?.message || 'Unknown error'}`, 'error');
    }
  };

  const updateAlbumVisibility = async (album, nextVisible) => {
    try {
      const updated = await apiService.updateAlbum(album._id || album.id, {
        is_visible: nextVisible,
        publish_status: nextVisible ? 'published' : 'hidden'
      });
      setAlbums((prev) => prev.map((item) => (
        String(item._id || item.id) === String(album._id || album.id) ? updated : item
      )));
      showToast(`Album ${nextVisible ? 'unhidden' : 'hidden'} successfully.`, 'success', 3000);
    } catch (error) {
      showToast(`Failed to update album visibility: ${error?.message || 'Unknown error'}`, 'error');
    }
  };

  const bulkUpdateAlbumVisibility = async (nextVisible) => {
    if (selectedIds.length === 0) return;
    try {
      const responses = await Promise.all(
        selectedIds.map((id) => apiService.updateAlbum(id, {
          is_visible: nextVisible,
          publish_status: nextVisible ? 'published' : 'hidden'
        }))
      );
      setAlbums((prev) => prev.map((album) => {
        const match = responses.find((item) => String(item._id || item.id) === String(album._id || album.id));
        return match || album;
      }));
      showToast(`${nextVisible ? 'Unhid' : 'Hid'} ${selectedIds.length} album${selectedIds.length === 1 ? '' : 's'}.`, 'success', 3000);
    } catch (error) {
      showToast(`Failed to update selected albums: ${error?.message || 'Unknown error'}`, 'error');
    }
  };

  const toggleAlbumSelection = (albumId) => {
    setSelectedIds((prev) => (
      prev.includes(albumId)
        ? prev.filter((id) => id !== albumId)
        : [...prev, albumId]
    ));
  };

  const toggleFilteredSelection = () => {
    setSelectedIds((prev) => (
      allFilteredSelected
        ? prev.filter((id) => !filteredAlbumIds.includes(id))
        : Array.from(new Set([...prev, ...filteredAlbumIds]))
    ));
  };

  useEffect(() => {
    setSelectedIds([]);
  }, [artistContentMode]);

  return (
    <AdminLayout>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="space-y-4">
        <div className="rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(61,180,255,0.18),_transparent_38%),linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-neon-blue/80">Album Console</p>
              <h2 className="text-3xl font-semibold text-white">List, create, edit, release</h2>
              <p className="max-w-2xl text-sm text-gray-300">Manage album metadata, covers, release dates, and linked audio inventory from one place.</p>
            </div>
            <button onClick={() => setDrawerOpen(true)} className="rounded-2xl bg-neon-blue px-5 py-3 text-sm font-semibold text-dark-bg hover:bg-neon-blue/85">Add album</button>
          </div>
          <div className="mt-6 grid gap-3 md:grid-cols-6">
            {[
              ['Total albums', stats.total],
              ['With audio', stats.withAudio],
              ['Singles', stats.singles],
              ['Upcoming', stats.upcoming],
              ['Hidden albums', stats.hidden],
              ['Hidden artist albums', stats.hiddenArtistAlbums]
            ].map(([label, value]) => {
              const isHiddenCard = label === 'Hidden artist albums';
              return (
              <button
                type="button"
                key={label}
                onClick={isHiddenCard ? () => setArtistContentMode((prev) => (prev === 'hidden' ? 'visible' : 'hidden')) : undefined}
                className={`rounded-2xl border p-4 text-left ${isHiddenCard && artistContentMode === 'hidden' ? 'border-neon-blue/50 bg-neon-blue/10' : 'border-white/10 bg-black/20'} ${isHiddenCard ? 'transition hover:border-neon-blue/40 hover:bg-neon-blue/5' : ''}`}
              >
                <p className="text-xs uppercase tracking-[0.2em] text-gray-400">{label}</p>
                <p className="mt-2 text-3xl font-semibold text-white">{value}</p>
                {isHiddenCard ? <p className="mt-2 text-xs text-neon-blue">{artistContentMode === 'hidden' ? 'Showing only hidden artist albums' : 'Click to view hidden artist albums'}</p> : null}
              </button>
            );})}
          </div>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1.8fr)_repeat(3,minmax(0,1fr))]">
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Search</span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by album or artist name"
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-neon-blue/60"
              />
            </label>
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Album type</span>
              <select value={filters.type} onChange={(e) => setFilters((prev) => ({ ...prev, type: e.target.value }))} style={{ colorScheme: 'dark' }} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-neon-blue/60">
                <option style={selectOptionStyle} value="all">All types</option>
                <option style={selectOptionStyle} value="album">Albums</option>
                <option style={selectOptionStyle} value="single">Singles</option>
                <option style={selectOptionStyle} value="compilation">Compilations</option>
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Artist</span>
              <select value={filters.artist} onChange={(e) => setFilters((prev) => ({ ...prev, artist: e.target.value }))} style={{ colorScheme: 'dark' }} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-neon-blue/60">
                <option style={selectOptionStyle} value="all">All artists</option>
                {artistOptions.map((artistName) => (
                  <option key={artistName} style={selectOptionStyle} value={artistName}>{artistName}</option>
                ))}
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Sort</span>
              <select value={filters.sort} onChange={(e) => setFilters((prev) => ({ ...prev, sort: e.target.value }))} style={{ colorScheme: 'dark' }} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-neon-blue/60">
                <option style={selectOptionStyle} value="recent">Recently added</option>
                <option style={selectOptionStyle} value="az">Album name A-Z</option>
                <option style={selectOptionStyle} value="za">Album name Z-A</option>
              </select>
            </label>
          </div>
        </div>

        {selectedIds.length > 0 ? (
          <div className="flex items-center justify-between rounded-[28px] border border-red-500/20 bg-red-500/5 p-5">
            <p className="text-sm text-gray-200">{selectedIds.length} album{selectedIds.length === 1 ? '' : 's'} selected</p>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => bulkUpdateAlbumVisibility(false)} className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white hover:bg-white/5">Hide selected</button>
              <button onClick={() => bulkUpdateAlbumVisibility(true)} className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white hover:bg-white/5">Unhide selected</button>
              <button onClick={bulkDeleteAlbums} className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-200 hover:bg-red-500/20">Delete selected</button>
            </div>
          </div>
        ) : null}

        <div className="hidden overflow-hidden rounded-[28px] border border-white/10 bg-white/5 xl:block">
          <div className="grid grid-cols-[44px_minmax(0,2fr)_1.1fr_120px_120px_120px_220px] gap-4 border-b border-white/10 px-5 py-4 text-xs font-semibold uppercase tracking-[0.24em] text-gray-400">
            <div className="flex items-center justify-center"><input type="checkbox" checked={allFilteredSelected} onChange={toggleFilteredSelection} /></div><div>Album</div><div>Artist</div><div>Status</div><div>Tracks</div><div>Updated</div><div>Quick actions</div>
          </div>
          <div className="divide-y divide-white/10">
            {filteredAlbums.map((album) => (
              <div key={album._id || album.id} className="grid grid-cols-[44px_minmax(0,2fr)_1.1fr_120px_120px_120px_220px] gap-4 px-5 py-4">
                <div className="flex items-center justify-center">
                  <input type="checkbox" checked={selectedIds.includes(String(album._id || album.id))} onChange={() => toggleAlbumSelection(String(album._id || album.id))} />
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-14 w-14 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                    {albumCover(album) ? (
                      <img src={albumCover(album)} alt={getAlbumDisplayName(album)} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-[10px] uppercase tracking-[0.2em] text-gray-500">No art</div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">{getAlbumDisplayName(album)}</p>
                    <p className="truncate text-xs text-gray-400">{fmtDate(album.release_date)}</p>
                  </div>
                </div>
                <div className="truncate text-sm text-gray-300">{albumArtistsText(album) || 'No artist linked'}</div>
                <div className="flex flex-wrap items-start gap-2">
                  <span className={`inline-flex w-fit whitespace-nowrap rounded-full border px-3 py-1 text-xs ${
                    isHiddenAlbum(album)
                      ? 'border-red-500/30 bg-red-500/10 text-red-200'
                      : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                  }`}>{isHiddenAlbum(album) ? 'Hidden' : 'Active'}</span>
                  <span className="inline-flex w-fit whitespace-nowrap rounded-full border border-white/10 px-3 py-1 text-xs capitalize text-gray-300">{album.album_type || 'album'}</span>
                </div>
                <div className="text-sm text-gray-300">{trackCounts[album._id || album.id] || 0}</div>
                <div className="text-sm text-gray-300">{fmtDate(album.updatedAt)}</div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => navigate(`/admin/albums/edit/${album._id || album.id}`)} className="rounded-xl border border-white/10 px-3 py-2 text-xs text-white hover:bg-white/5">Edit</button>
                  <button onClick={() => updateAlbumVisibility(album, isHiddenAlbum(album))} className="rounded-xl border border-white/10 px-3 py-2 text-xs text-white hover:bg-white/5">{isHiddenAlbum(album) ? 'Unhide' : 'Hide'}</button>
                  <button onClick={() => handleDeleteClick(album)} className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200 hover:bg-red-500/20">Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-4 xl:hidden">
          {filteredAlbums.map((album) => (
            <div key={album._id || album.id} className="rounded-[24px] border border-white/10 bg-white/5 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <input type="checkbox" checked={selectedIds.includes(String(album._id || album.id))} onChange={() => toggleAlbumSelection(String(album._id || album.id))} className="mt-1" />
                  <div className="h-14 w-14 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                    {albumCover(album) ? <img src={albumCover(album)} alt={getAlbumDisplayName(album)} className="h-full w-full object-cover" /> : null}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{getAlbumDisplayName(album)}</p>
                    <p className="text-xs text-gray-400">{albumArtistsText(album) || 'No artist linked'}</p>
                  </div>
                </div>
                <span className="rounded-full border border-white/10 px-3 py-1 text-xs capitalize text-gray-300">{album.album_type || 'album'}</span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 text-xs text-gray-400">
                <span className="rounded-xl border border-white/10 bg-black/20 px-3 py-1.5">Released {fmtDate(album.release_date)}</span>
                <span className="rounded-xl border border-white/10 bg-black/20 px-3 py-1.5">Linked tracks {trackCounts[album._id || album.id] || 0}</span>
                <span className={`rounded-xl border px-3 py-1.5 ${isHiddenAlbum(album) ? 'border-red-500/30 bg-red-500/10 text-red-200' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'}`}>{isHiddenAlbum(album) ? 'Hidden' : 'Active'}</span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button onClick={() => navigate(`/admin/albums/edit/${album._id || album.id}`)} className="rounded-xl border border-white/10 px-3 py-2 text-xs text-white">Edit</button>
                <button onClick={() => updateAlbumVisibility(album, isHiddenAlbum(album))} className="rounded-xl border border-white/10 px-3 py-2 text-xs text-white">{isHiddenAlbum(album) ? 'Unhide' : 'Hide'}</button>
                <button onClick={() => handleDeleteClick(album)} className="rounded-xl border border-red-500/30 px-3 py-2 text-xs text-red-200">Delete</button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between rounded-[28px] border border-white/10 bg-white/5 p-5">
          <div className="text-sm text-gray-300">
            {loading ? 'Loading albums...' : `${filteredAlbums.length} albums shown of ${albums.length}${selectedIds.length ? ` • ${selectedIds.length} selected` : ''}`}
          </div>
          <button disabled={loading} onClick={load} className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white disabled:opacity-50 hover:bg-white/5">
            Refresh
          </button>
        </div>

        <ConfirmModal
          isOpen={deleteModalOpen}
          onClose={() => setDeleteModalOpen(false)}
          onConfirm={confirmDelete}
          title="Delete Album"
          message={`Are you sure you want to delete "${albumToDelete?.name}"? This action cannot be undone.`}
          confirmText="Delete Album"
          isDangerous={true}
        />
      </motion.section>
      {createPortal(
        <AnimatePresence>
          {drawerOpen ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[220] bg-black/72 backdrop-blur-md">
              <motion.aside initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 28, stiffness: 280 }} className="absolute right-0 top-0 z-[221] h-screen w-full max-w-[920px] overflow-y-auto border-l border-white/10 bg-[#0b0d14] p-5 shadow-[-24px_0_80px_rgba(0,0,0,0.55)]">
                <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-neon-blue/80">Add album</p>
                    <h3 className="mt-2 text-2xl font-semibold text-white">New album release</h3>
                    <p className="mt-1 text-sm text-gray-400">Use this drawer to create an album with release info, discovery tags, and cover artwork.</p>
                  </div>
                  <button onClick={closeDrawer} className="rounded-2xl border border-white/10 px-4 py-2 text-sm text-white hover:bg-white/5">Close</button>
                </div>
                <div className="mt-5 grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_320px]">
                  <div className="space-y-6">
                    <section className="rounded-[28px] border border-white/10 bg-white/5 p-5">
                      <h4 className="text-sm font-semibold uppercase tracking-[0.24em] text-gray-300">Basic info</h4>
                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <label className="space-y-2 md:col-span-2">
                          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Album name</span>
                          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Album Name *" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-neon-blue/60" />
                        </label>
                        <label className="space-y-2">
                          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Album type</span>
                          <select value={albumType} onChange={(e) => setAlbumType(e.target.value)} style={{ colorScheme: 'dark' }} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-neon-blue/60">
                            <option style={selectOptionStyle} value="album">Album</option>
                            <option style={selectOptionStyle} value="single">Single</option>
                            <option style={selectOptionStyle} value="compilation">Compilation</option>
                          </select>
                        </label>
                        <div className="space-y-2">
                          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Release date</span>
                          <DatePicker value={releaseDate} onChange={setReleaseDate} placeholder="Release Date" />
                        </div>
                        <label className="space-y-2 md:col-span-2">
                          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Choose artist</span>
                          <select value={selectedArtists[0] || ''} onChange={(e) => setSelectedArtists(e.target.value ? [e.target.value] : [])} style={{ colorScheme: 'dark' }} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-neon-blue/60">
                            <option style={selectOptionStyle} value="">Select artist</option>
                            {visibleArtists.map((artist) => (
                              <option key={artist._id || artist.id} style={selectOptionStyle} value={artist._id || artist.id}>{artist.name}</option>
                            ))}
                          </select>
                        </label>
                      </div>
                    </section>
                    <section className="rounded-[28px] border border-white/10 bg-white/5 p-5">
                      <h4 className="text-sm font-semibold uppercase tracking-[0.24em] text-gray-300">Discovery settings</h4>
                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <label className="space-y-2">
                          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Genres</span>
                          <input value={genres} onChange={(e) => setGenres(e.target.value)} placeholder="Genres (comma separated)" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-neon-blue/60" />
                        </label>
                        <label className="space-y-2">
                          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Moods</span>
                          <input list="admin-album-moods" value={moods} onChange={(e) => setMoods(e.target.value)} placeholder="Moods (comma separated)" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-neon-blue/60" />
                          <datalist id="admin-album-moods">
                            {moodOptions.map((option) => (
                              <option key={option} value={option} />
                            ))}
                          </datalist>
                        </label>
                      </div>
                    </section>
                  </div>
                  <div className="space-y-6">
                    <section className="rounded-[28px] border border-white/10 bg-white/5 p-5">
                      <h4 className="text-sm font-semibold uppercase tracking-[0.24em] text-gray-300">Preview</h4>
                      <div className="mt-4 overflow-hidden rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(61,180,255,0.18),rgba(12,15,24,0.96))]">
                        <div className="flex items-center gap-4 p-4">
                          <div className="h-24 w-24 overflow-hidden rounded-3xl border border-white/10 bg-black/30">
                            {coverFile ? <img src={URL.createObjectURL(coverFile)} alt={name || 'Album cover'} className="h-full w-full object-cover" /> : null}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-xl font-semibold text-white">{name || 'Untitled album'}</p>
                            <p className="mt-1 text-sm text-gray-300">{albumType}</p>
                            <p className="mt-2 truncate text-sm text-gray-400">{visibleArtists.find((artist) => (artist._id || artist.id) === selectedArtists[0])?.name || 'No artist selected'}</p>
                          </div>
                        </div>
                      </div>
                    </section>
                    <section className="rounded-[28px] border border-white/10 bg-white/5 p-5 space-y-4">
                      <h4 className="text-sm font-semibold uppercase tracking-[0.24em] text-gray-300">Artwork</h4>
                      <label className="inline-flex cursor-pointer items-center rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white hover:bg-white/10">
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => setCoverFile(e.target.files?.[0] || null)} />
                        {coverFile ? 'Replace cover image' : 'Upload cover image'}
                      </label>
                      <button onClick={createAlbum} disabled={!canCreate} className="w-full rounded-2xl bg-neon-blue px-4 py-3 text-sm font-semibold text-dark-bg disabled:opacity-50 hover:bg-neon-blue/85">
                        {creating ? 'Creating album...' : 'Create album'}
                      </button>
                    </section>
                  </div>
                </div>
              </motion.aside>
            </motion.div>
          ) : null}
        </AnimatePresence>,
        document.body
      )}
    </AdminLayout>
  );
}
