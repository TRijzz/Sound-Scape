import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import apiService from '../../services/api';
import AdminLayout from './AdminLayout';
import { ToastContainer } from '../../components/ui/Toast';

const selectOptionStyle = { backgroundColor: '#0b0d14', color: '#ffffff' };

const emptyForm = () => ({
  name: '', display_name: '', bio: '', image_url: '', cover_image_url: '',
  genres: [], tags: [], mood_tags: [], language: '', country: '', region: '',
  popularity: 0, priority_score: 0, is_featured: false, is_visible: true, is_verified: false,
  publish_status: 'published', hidden_reason: '', spotify_id: '',
  social_links: { instagram: '', x: '', tiktok: '', youtube: '', website: '' },
  external_ids: { spotify: '', apple_music: '', musicbrainz: '' }
});

const idOf = (artist) => artist?._id || artist?.id;
const imageOf = (artist) => apiService.resolveMediaUrl(artist?.image_url || artist?.images?.[0]?.url || '');
const tagText = (list = []) => list.join(', ');
const parseTags = (value = '') => value.split(',').map((item) => item.trim()).filter(Boolean);
const previewName = (artist) => artist?.display_name || artist?.name || 'Untitled artist';
const fmtDate = (value) => {
  if (!value) return 'Unknown';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Unknown' : new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
};
const statusMeta = (artist) => {
  if (!artist.is_visible || artist.publish_status === 'hidden') return { label: 'Hidden', tone: 'bg-red-500/15 text-red-200 border-red-500/30' };
  if (artist.publish_status === 'draft') return { label: 'Draft', tone: 'bg-amber-500/15 text-amber-200 border-amber-500/30' };
  return { label: 'Active', tone: 'bg-emerald-500/15 text-emerald-200 border-emerald-500/30' };
};
const validUrl = (value) => {
  if (!value) return true;
  if (value.startsWith('/')) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};
const normalize = (artist = {}) => ({
  ...emptyForm(),
  ...artist,
  image_url: artist.image_url || artist.images?.[0]?.url || '',
  genres: Array.isArray(artist.genres) ? artist.genres : [],
  tags: Array.isArray(artist.tags) ? artist.tags : [],
  mood_tags: Array.isArray(artist.mood_tags) ? artist.mood_tags : [],
  popularity: Number(artist.popularity) || 0,
  priority_score: Number(artist.priority_score) || 0,
  is_featured: Boolean(artist.is_featured),
  is_visible: artist.is_visible !== false,
  is_verified: Boolean(artist.is_verified),
  publish_status: artist.publish_status || (artist.is_visible === false ? 'hidden' : 'published'),
  social_links: {
    instagram: artist.social_links?.instagram || '',
    x: artist.social_links?.x || '',
    tiktok: artist.social_links?.tiktok || '',
    youtube: artist.social_links?.youtube || '',
    website: artist.social_links?.website || ''
  },
  external_ids: {
    spotify: artist.external_ids?.spotify || artist.spotify_id || '',
    apple_music: artist.external_ids?.apple_music || '',
    musicbrainz: artist.external_ids?.musicbrainz || ''
  }
});
const payloadFrom = (form) => {
  const payload = {
    name: form.name.trim(),
    display_name: form.display_name.trim(),
    bio: form.bio.trim(),
    genres: form.genres,
    tags: form.tags,
    mood_tags: form.mood_tags,
    language: form.language.trim(),
    country: form.country.trim(),
    region: form.region.trim(),
    is_featured: form.is_featured,
    is_visible: form.publish_status !== 'hidden',
    is_verified: form.is_verified,
    publish_status: form.publish_status,
    hidden_reason: form.hidden_reason.trim()
  };

  if (form.image_url.trim()) payload.image_url = form.image_url.trim();
  if (form.cover_image_url.trim()) payload.cover_image_url = form.cover_image_url.trim();
  if (form.spotify_id.trim()) payload.spotify_id = form.spotify_id.trim();

  return payload;
};

export default function AdminArtists() {
  const navigate = useNavigate();
  const [artists, setArtists] = useState([]);
  const [genres, setGenres] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ status: 'all', verified: 'all', genre: 'all', region: 'all', sort: 'recent' });
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkGenre, setBulkGenre] = useState('');
  const [bulkTag, setBulkTag] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState('create');
  const [activeId, setActiveId] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [dirty, setDirty] = useState(false);
  const [errors, setErrors] = useState({});
  const [links, setLinks] = useState({ albums: [], tracks: [], loading: false });
  const [profileImageFile, setProfileImageFile] = useState(null);
  const [coverImageFile, setCoverImageFile] = useState(null);
  const [profilePreview, setProfilePreview] = useState('');
  const [coverPreview, setCoverPreview] = useState('');
  const [toasts, setToasts] = useState([]);
  const [drawerNotice, setDrawerNotice] = useState(null);

  const toast = (message, type = 'error', duration = 3500) => setToasts((prev) => [...prev, { id: Date.now() + Math.random(), message, type, duration }]);
  const removeToast = (id) => setToasts((prev) => prev.filter((toast) => toast.id !== id));

  const load = async () => {
    setLoading(true);
    try {
      const [artistsRes, genresRes] = await Promise.all([apiService.getArtists(1, 1000), apiService.getArtistGenres(200).catch(() => [])]);
      const list = Array.isArray(artistsRes?.artists) ? artistsRes.artists : [];
      setArtists(list.map(normalize));
      setGenres(Array.isArray(genresRes) ? genresRes : []);
    } catch (error) {
      toast(`Failed to load artists: ${error?.message || 'Unknown error'}`);
      setArtists([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    try {
      const stored = localStorage.getItem('authTokens');
      if (stored) {
        const { accessToken } = JSON.parse(stored);
        if (accessToken) apiService.setAuthToken(accessToken);
      }
    } catch {}
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!dirty) return undefined;
    const onBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  useEffect(() => {
    if (!drawerOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [drawerOpen]);

  const regions = useMemo(() => Array.from(new Set(artists.map((artist) => artist.region || artist.country).filter(Boolean))).sort(), [artists]);
  const stats = useMemo(() => ({
    total: artists.length,
    live: artists.filter((artist) => artist.is_visible && artist.publish_status === 'published').length,
    featured: artists.filter((artist) => artist.is_featured).length,
    hidden: artists.filter((artist) => !artist.is_visible || artist.publish_status === 'hidden').length
  }), [artists]);

  const filtered = useMemo(() => {
    const visible = artists.filter((artist) => {
      const q = search.trim().toLowerCase();
      const matchesSearch = !q || [artist.name, artist.display_name].filter(Boolean).some((value) => value.toLowerCase().includes(q));
      const label = statusMeta(artist).label.toLowerCase();
      const matchesStatus = filters.status === 'all'
        || (filters.status === 'active' && label === 'active')
        || (filters.status === 'inactive' && label !== 'active')
        || label === filters.status;
      const matchesVerified = filters.verified === 'all'
        || (filters.verified === 'verified' && artist.is_verified)
        || (filters.verified === 'unverified' && !artist.is_verified);
      const matchesGenre = filters.genre === 'all' || artist.genres.some((genre) => genre.toLowerCase() === filters.genre.toLowerCase());
      const matchesRegion = filters.region === 'all' || String(artist.region || artist.country || '').toLowerCase() === filters.region.toLowerCase();
      return matchesSearch && matchesStatus && matchesVerified && matchesGenre && matchesRegion;
    });

    const sorted = [...visible];
    if (filters.sort === 'az') {
      sorted.sort((left, right) => previewName(left).localeCompare(previewName(right), undefined, { sensitivity: 'base' }));
    } else if (filters.sort === 'za') {
      sorted.sort((left, right) => previewName(right).localeCompare(previewName(left), undefined, { sensitivity: 'base' }));
    } else {
      sorted.sort((left, right) => new Date(right.createdAt || right.updatedAt || 0).getTime() - new Date(left.createdAt || left.updatedAt || 0).getTime());
    }

    return sorted;
  }, [artists, filters, search]);

  const allFilteredSelected = filtered.length > 0 && filtered.every((artist) => selectedIds.includes(idOf(artist)));
  const patchArtist = (nextArtist) => setArtists((prev) => {
    const normalized = normalize(nextArtist);
    const existing = prev.some((artist) => idOf(artist) === idOf(normalized));
    return existing ? prev.map((artist) => (idOf(artist) === idOf(normalized) ? normalized : artist)) : [normalized, ...prev];
  });
  const closeDrawer = () => {
    if (dirty && !window.confirm('Discard unsaved artist changes?')) return;
    setDrawerOpen(false); setDirty(false); setErrors({}); setActiveId(null);
    setProfileImageFile(null); setCoverImageFile(null); setProfilePreview(''); setCoverPreview('');
    setDrawerNotice(null);
  };
  const updateForm = (field, value) => { setForm((prev) => ({ ...prev, [field]: value })); setDirty(true); setDrawerNotice(null); };

  const openDrawer = async (mode, artist = null) => {
    setDrawerMode(mode); setActiveId(idOf(artist)); setForm(artist ? normalize(artist) : emptyForm()); setDirty(false); setErrors({}); setDrawerOpen(true);
    setProfileImageFile(null); setCoverImageFile(null); setProfilePreview(''); setCoverPreview('');
    setDrawerNotice(null);
    if (!artist) { setLinks({ albums: [], tracks: [], loading: false }); return; }
    setLinks({ albums: [], tracks: [], loading: true });
    try {
      const [albumsRes, tracksRes] = await Promise.all([apiService.getArtistAlbums(idOf(artist), 1, 5), apiService.getArtistTopTracks(idOf(artist), 5)]);
      setLinks({ albums: Array.isArray(albumsRes?.albums) ? albumsRes.albums : [], tracks: Array.isArray(tracksRes?.tracks) ? tracksRes.tracks : [], loading: false });
    } catch {
      setLinks({ albums: [], tracks: [], loading: false });
      toast('Linked albums or songs could not be loaded for this artist.');
    }
  };

  const validate = () => {
    const next = {};
    const trimmedName = form.name.trim().toLowerCase();
    if (!trimmedName) next.name = 'Artist name is required.';
    if (artists.some((artist) => idOf(artist) !== activeId && String(artist.name || '').trim().toLowerCase() === trimmedName)) next.name = 'Duplicate artist name.';
    if (form.publish_status === 'published' && !form.image_url.trim() && !profileImageFile) next.image_url = 'Published artists need a profile image.';
    ['image_url', 'cover_image_url'].forEach((field) => { if (form[field] && !validUrl(form[field])) next[field] = 'Enter a valid URL.'; });
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const saveArtist = async () => {
    if (!validate()) {
      const message = 'Please resolve the highlighted fields before saving.';
      setDrawerNotice({ type: 'error', message });
      toast(message);
      return;
    }
    setSaving(true);
    setDrawerNotice(null);
    try {
      const payload = new FormData();
      Object.entries(payloadFrom(form)).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          payload.append(key, value.join(', '));
          return;
        }
        if (value === undefined || value === null) return;
        payload.append(key, String(value));
      });
      if (profileImageFile) payload.append('profileImage', profileImageFile);
      if (coverImageFile) payload.append('coverImage', coverImageFile);
      const saved = drawerMode === 'create' ? await apiService.createArtist(payload) : await apiService.updateArtist(activeId, payload);
      patchArtist(saved);
      setDrawerNotice({ type: 'success', message: drawerMode === 'create' ? 'Artist created successfully.' : 'Artist updated successfully.' });
      setDirty(false);
      setProfileImageFile(null);
      setCoverImageFile(null);
      setProfilePreview('');
      setCoverPreview('');
      toast(drawerMode === 'create' ? 'Artist created successfully.' : 'Artist updated successfully.', 'success');
    } catch (error) {
      const detailsMessage = error?.details?.error || error?.details?.message || error?.message || 'Unknown error';
      setDrawerNotice({ type: 'error', message: detailsMessage });
      toast(`Failed to save artist: ${detailsMessage}`);
    } finally { setSaving(false); }
  };

  const removeArtist = async (artist) => {
    if (!window.confirm(`Delete ${artist.name}? This also removes linked albums and songs.`)) return;
    try {
      await apiService.deleteArtist(idOf(artist));
      setArtists((prev) => prev.filter((item) => idOf(item) !== idOf(artist)));
      setSelectedIds((prev) => prev.filter((id) => id !== idOf(artist)));
      if (activeId === idOf(artist)) setDrawerOpen(false);
      toast('Artist deleted successfully.', 'success');
    } catch (error) {
      toast(`Failed to delete artist: ${error?.message || 'Unknown error'}`);
    }
  };

  const toggleQuick = async (artist, updates, message) => {
    try {
      const saved = await apiService.updateArtist(idOf(artist), updates);
      patchArtist(saved);
      if (activeId === idOf(artist)) { setForm(normalize(saved)); setDirty(false); }
      toast(message, 'success');
    } catch (error) {
      toast(`Failed to update artist: ${error?.message || 'Unknown error'}`);
    }
  };

  const bulkUpdate = async (builder, message, onDone) => {
    if (selectedIds.length === 0) return;
    setSaving(true);
    try {
      const picked = artists.filter((artist) => selectedIds.includes(idOf(artist)));
      const responses = await Promise.all(picked.map((artist) => apiService.updateArtist(idOf(artist), builder(artist))));
      setArtists((prev) => prev.map((artist) => {
        const match = responses.find((item) => idOf(item) === idOf(artist));
        return match ? normalize(match) : artist;
      }));
      toast(message, 'success');
      if (onDone) onDone();
    } catch (error) {
      toast(`Bulk action failed: ${error?.message || 'Unknown error'}`);
    } finally { setSaving(false); }
  };

  const toggleFilteredSelection = () => {
    const filteredIds = filtered.map((artist) => idOf(artist));
    setSelectedIds(
      allFilteredSelected
        ? selectedIds.filter((id) => !filteredIds.includes(id))
        : Array.from(new Set([...selectedIds, ...filteredIds]))
    );
  };

  const handleFileSelection = (field, file) => {
    if (!file) return;
    const preview = URL.createObjectURL(file);
    if (field === 'profile') {
      setProfileImageFile(file);
      setProfilePreview(preview);
    } else {
      setCoverImageFile(file);
      setCoverPreview(preview);
    }
    setDirty(true);
    setDrawerNotice(null);
  };

  const profileImageSrc = profilePreview || apiService.resolveMediaUrl(form.image_url);
  const coverImageSrc = coverPreview || apiService.resolveMediaUrl(form.cover_image_url);

  return (
    <AdminLayout>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <div className="rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(61,180,255,0.18),_transparent_38%),linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-neon-blue/80">Artist Console</p>
              <h2 className="text-3xl font-semibold text-white">List, filter, quick edit, preview</h2>
              <p className="max-w-2xl text-sm text-gray-300">Admins can now scan artist health, apply bulk actions, and open a focused detail drawer instead of diving into one profile at a time.</p>
            </div>
            <button onClick={() => openDrawer('create')} className="rounded-2xl bg-neon-blue px-5 py-3 text-sm font-semibold text-dark-bg hover:bg-neon-blue/85">Add artist</button>
          </div>
          <div className="mt-6 grid gap-3 md:grid-cols-4">
            {[
              ['Total artists', stats.total],
              ['Published', stats.live],
              ['Featured', stats.featured],
              ['Hidden or draft', stats.hidden]
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-gray-400">{label}</p>
                <p className="mt-2 text-3xl font-semibold text-white">{value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1.8fr)_repeat(5,minmax(0,1fr))]">
            <label className="space-y-2"><span className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Search</span><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by artist name" className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-neon-blue/60" /></label>
            <label className="space-y-2"><span className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Status</span><select value={filters.status} onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))} style={{ colorScheme: 'dark' }} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-neon-blue/60"><option style={selectOptionStyle} value="all">All statuses</option><option style={selectOptionStyle} value="active">Active</option><option style={selectOptionStyle} value="draft">Draft</option><option style={selectOptionStyle} value="hidden">Hidden</option><option style={selectOptionStyle} value="inactive">Inactive</option></select></label>
            <label className="space-y-2"><span className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Verified</span><select value={filters.verified} onChange={(e) => setFilters((prev) => ({ ...prev, verified: e.target.value }))} style={{ colorScheme: 'dark' }} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-neon-blue/60"><option style={selectOptionStyle} value="all">All artists</option><option style={selectOptionStyle} value="verified">Verified</option><option style={selectOptionStyle} value="unverified">Unverified</option></select></label>
            <label className="space-y-2"><span className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Genre</span><select value={filters.genre} onChange={(e) => setFilters((prev) => ({ ...prev, genre: e.target.value }))} style={{ colorScheme: 'dark' }} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-neon-blue/60"><option style={selectOptionStyle} value="all">All genres</option>{genres.map((genre) => <option style={selectOptionStyle} key={genre} value={genre}>{genre}</option>)}</select></label>
            <label className="space-y-2"><span className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Region</span><select value={filters.region} onChange={(e) => setFilters((prev) => ({ ...prev, region: e.target.value }))} style={{ colorScheme: 'dark' }} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-neon-blue/60"><option style={selectOptionStyle} value="all">All regions</option>{regions.map((region) => <option style={selectOptionStyle} key={region} value={region}>{region}</option>)}</select></label>
            <label className="space-y-2"><span className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Sort</span><select value={filters.sort} onChange={(e) => setFilters((prev) => ({ ...prev, sort: e.target.value }))} style={{ colorScheme: 'dark' }} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-neon-blue/60"><option style={selectOptionStyle} value="recent">Recently added</option><option style={selectOptionStyle} value="az">Artist name A-Z</option><option style={selectOptionStyle} value="za">Artist name Z-A</option></select></label>
          </div>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap gap-2">
              <button onClick={toggleFilteredSelection} className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white hover:bg-white/5">{allFilteredSelected ? 'Clear page selection' : 'Select filtered'}</button>
              <button disabled={selectedIds.length === 0 || saving} onClick={() => bulkUpdate(() => ({ is_featured: true }), 'Selected artists featured.')} className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white disabled:opacity-40 hover:bg-white/5">Feature</button>
              <button disabled={selectedIds.length === 0 || saving} onClick={() => bulkUpdate(() => ({ is_featured: false }), 'Selected artists unfeatured.')} className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white disabled:opacity-40 hover:bg-white/5">Unfeature</button>
            </div>
            <div className="flex flex-col gap-3 md:flex-row">
              <input value={bulkGenre} onChange={(e) => setBulkGenre(e.target.value)} placeholder="Assign genre" className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white outline-none focus:border-neon-blue/60" />
              <button disabled={selectedIds.length === 0 || !bulkGenre.trim() || saving} onClick={() => bulkUpdate((artist) => ({ genres: Array.from(new Set([...(artist.genres || []), bulkGenre.trim()])) }), `Genre "${bulkGenre.trim()}" assigned.`, () => setBulkGenre(''))} className="rounded-xl bg-white/10 px-4 py-2 text-sm text-white disabled:opacity-40 hover:bg-white/15">Assign genre</button>
              <input value={bulkTag} onChange={(e) => setBulkTag(e.target.value)} placeholder="Add tag" className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white outline-none focus:border-neon-blue/60" />
              <button disabled={selectedIds.length === 0 || !bulkTag.trim() || saving} onClick={() => bulkUpdate((artist) => ({ tags: Array.from(new Set([...(artist.tags || []), bulkTag.trim()])) }), `Tag "${bulkTag.trim()}" added.`, () => setBulkTag(''))} className="rounded-xl bg-white/10 px-4 py-2 text-sm text-white disabled:opacity-40 hover:bg-white/15">Bulk tag</button>
            </div>
          </div>
        </div>

        <div className="hidden overflow-hidden rounded-[28px] border border-white/10 bg-white/5 xl:block">
          <div className="grid grid-cols-[52px_minmax(0,2fr)_120px_1.2fr_140px_120px_1.1fr_280px] gap-4 border-b border-white/10 px-5 py-4 text-xs font-semibold uppercase tracking-[0.24em] text-gray-400">
            <div><input type="checkbox" checked={allFilteredSelected} onChange={toggleFilteredSelection} className="h-4 w-4" /></div><div>Artist</div><div>Status</div><div>Genres / tags</div><div>Popularity / priority</div><div>Updated</div><div>Region</div><div>Quick actions</div>
          </div>
          <div className="divide-y divide-white/10">
            {filtered.map((artist) => {
              const meta = statusMeta(artist);
              return (
                <div key={idOf(artist)} className="grid grid-cols-[52px_minmax(0,2fr)_120px_1.2fr_140px_120px_1.1fr_280px] gap-4 px-5 py-4">
                  <div className="pt-4"><input type="checkbox" checked={selectedIds.includes(idOf(artist))} onChange={() => setSelectedIds((prev) => prev.includes(idOf(artist)) ? prev.filter((id) => id !== idOf(artist)) : [...prev, idOf(artist)])} className="h-4 w-4" /></div>
                  <div className="flex items-center gap-3"><div className="h-14 w-14 overflow-hidden rounded-2xl border border-white/10 bg-white/5">{imageOf(artist) ? <img src={imageOf(artist)} alt={artist.name} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-[10px] uppercase tracking-[0.2em] text-gray-500">No art</div>}</div><div className="min-w-0"><p className="truncate text-sm font-semibold text-white">{previewName(artist)}</p><p className="truncate text-xs text-gray-400">{artist.name}</p><div className="mt-2 flex flex-wrap gap-2">{artist.is_featured ? <span className="rounded-full bg-neon-blue/15 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-neon-blue">Featured</span> : null}{artist.is_verified ? <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-white">Verified</span> : null}</div></div></div>
                  <div><span className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${meta.tone}`}>{meta.label}</span></div>
                  <div className="flex flex-wrap gap-2">{artist.genres.slice(0, 2).map((genre) => <span key={genre} className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-gray-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">{genre}</span>)}{artist.tags.slice(0, 2).map((tag) => <span key={tag} className="rounded-xl border border-white/10 bg-black/20 px-3 py-1.5 text-xs text-gray-300">#{tag}</span>)}{artist.genres.length === 0 && artist.tags.length === 0 ? <span className="text-xs text-gray-500">No tags yet</span> : null}</div>
                  <div className="text-sm text-gray-200"><div>Pop {artist.popularity || 0}</div><div className="text-xs text-gray-400">Priority {artist.priority_score || 0}</div></div>
                  <div className="text-sm text-gray-300">{fmtDate(artist.last_edited_at || artist.updatedAt)}</div>
                  <div className="text-sm text-gray-300">{artist.region || artist.country || 'Not set'}</div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => openDrawer('edit', artist)} className="rounded-xl border border-white/10 px-3 py-2 text-xs text-white hover:bg-white/5">Edit</button>
                    {artist.is_visible ? <button onClick={() => toggleQuick(artist, { is_visible: false, publish_status: 'hidden' }, 'Artist hidden.')} className="rounded-xl border border-white/10 px-3 py-2 text-xs text-white hover:bg-white/5">Hide</button> : <><span className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">Hidden</span><button onClick={() => toggleQuick(artist, { is_visible: true, publish_status: 'published' }, 'Artist unhidden.')} className="rounded-xl border border-white/10 px-3 py-2 text-xs text-white hover:bg-white/5">Unhide</button></>}
                    <button onClick={() => toggleQuick(artist, { is_featured: !artist.is_featured }, artist.is_featured ? 'Artist unfeatured.' : 'Artist featured.')} className="rounded-xl border border-white/10 px-3 py-2 text-xs text-white hover:bg-white/5">{artist.is_featured ? 'Unfeature' : 'Feature'}</button>
                    <button onClick={() => removeArtist(artist)} className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200 hover:bg-red-500/20">Delete</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid gap-4 xl:hidden">
          {filtered.map((artist) => {
            const meta = statusMeta(artist);
            return (
              <div key={idOf(artist)} className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                <div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3"><input type="checkbox" checked={selectedIds.includes(idOf(artist))} onChange={() => setSelectedIds((prev) => prev.includes(idOf(artist)) ? prev.filter((id) => id !== idOf(artist)) : [...prev, idOf(artist)])} className="h-4 w-4" /><div className="h-14 w-14 overflow-hidden rounded-2xl border border-white/10 bg-white/5">{imageOf(artist) ? <img src={imageOf(artist)} alt={artist.name} className="h-full w-full object-cover" /> : null}</div><div><p className="text-sm font-semibold text-white">{previewName(artist)}</p><p className="text-xs text-gray-400">{artist.region || artist.country || 'Region not set'}</p></div></div><span className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${meta.tone}`}>{meta.label}</span></div>
                <div className="mt-4 flex flex-wrap gap-2">{artist.genres.slice(0, 3).map((genre) => <span key={genre} className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-gray-100">{genre}</span>)}{artist.tags.slice(0, 2).map((tag) => <span key={tag} className="rounded-xl border border-white/10 bg-black/20 px-3 py-1.5 text-xs text-gray-300">#{tag}</span>)}</div>
                <div className="mt-4 flex flex-wrap gap-2"><button onClick={() => openDrawer('edit', artist)} className="rounded-xl border border-white/10 px-3 py-2 text-xs text-white">Edit</button>{artist.is_visible ? <button onClick={() => toggleQuick(artist, { is_visible: false, publish_status: 'hidden' }, 'Artist hidden.')} className="rounded-xl border border-white/10 px-3 py-2 text-xs text-white">Hide</button> : <><span className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">Hidden</span><button onClick={() => toggleQuick(artist, { is_visible: true, publish_status: 'published' }, 'Artist unhidden.')} className="rounded-xl border border-white/10 px-3 py-2 text-xs text-white">Unhide</button></>}<button onClick={() => toggleQuick(artist, { is_featured: !artist.is_featured }, artist.is_featured ? 'Artist unfeatured.' : 'Artist featured.')} className="rounded-xl border border-white/10 px-3 py-2 text-xs text-white">{artist.is_featured ? 'Unfeature' : 'Feature'}</button><button onClick={() => removeArtist(artist)} className="rounded-xl border border-red-500/30 px-3 py-2 text-xs text-red-200">Delete</button></div>
              </div>
            );
          })}
        </div>

        <div className="flex flex-col gap-3 rounded-[28px] border border-white/10 bg-white/5 p-5 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-gray-300">{loading ? 'Loading artists...' : `${filtered.length} artists shown of ${artists.length}`}</p>
          <div className="flex flex-wrap gap-2">
            <button onClick={load} disabled={loading} className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white disabled:opacity-40 hover:bg-white/5">Refresh</button>
            <button onClick={async () => { try { setLoading(true); const res = await apiService.populateArtistGenres({ dryRun: true }); toast(`Dry run complete. ${Number(res?.updated || 0)} artists would be updated.`, 'success', 4500); } catch (error) { toast(`Failed to populate genres: ${error?.message || 'Unknown error'}`); } finally { setLoading(false); } }} disabled={loading} className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white disabled:opacity-40 hover:bg-white/5">Dry run genre fill</button>
            <button onClick={async () => { try { setLoading(true); const res = await apiService.populateArtistGenres({ dryRun: false }); toast(`Genres populated for ${Number(res?.updated || 0)} artists.`, 'success', 4500); await load(); } catch (error) { toast(`Failed to populate genres: ${error?.message || 'Unknown error'}`); } finally { setLoading(false); } }} disabled={loading} className="rounded-xl bg-neon-blue px-4 py-2 text-sm font-semibold text-dark-bg disabled:opacity-40 hover:bg-neon-blue/85">Populate genres</button>
          </div>
        </div>
      </motion.section>

      {createPortal(
        <AnimatePresence>
          {drawerOpen ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[220] bg-black/72 backdrop-blur-md">
              <motion.aside initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 28, stiffness: 280 }} className="absolute right-0 top-0 z-[221] h-screen w-full max-w-[1080px] overflow-y-auto border-l border-white/10 bg-[#0b0d14] p-5 shadow-[-24px_0_80px_rgba(0,0,0,0.55)]">
              <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
                <div><p className="text-xs font-semibold uppercase tracking-[0.3em] text-neon-blue/80">{drawerMode === 'create' ? 'Add artist' : 'Edit artist'}</p><h3 className="mt-2 text-2xl font-semibold text-white">{drawerMode === 'create' ? 'New artist profile' : previewName(form)}</h3><p className="mt-1 text-sm text-gray-400">Use quick row toggles for tiny changes; use this drawer for deeper edits and previewing.</p></div>
                <button onClick={closeDrawer} className="rounded-2xl border border-white/10 px-4 py-2 text-sm text-white hover:bg-white/5">Close</button>
              </div>
              {drawerNotice ? (
                <div className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${drawerNotice.type === 'success' ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-100' : 'border-red-400/40 bg-red-500/10 text-red-100'}`}>
                  {drawerNotice.message}
                </div>
              ) : null}
              <div className="mt-5 grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_340px]">
                <div className="space-y-6">
                  <section className="rounded-[28px] border border-white/10 bg-white/5 p-5">
                    <h4 className="text-sm font-semibold uppercase tracking-[0.24em] text-gray-300">Basic info</h4>
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <label className="space-y-2"><span className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Name</span><input value={form.name} onChange={(e) => updateForm('name', e.target.value)} className={`w-full rounded-2xl border px-4 py-3 text-sm text-white outline-none ${errors.name ? 'border-red-400 bg-red-500/5' : 'border-white/10 bg-white/5 focus:border-neon-blue/60'}`} placeholder="Artist name" />{errors.name ? <p className="text-xs text-red-300">{errors.name}</p> : null}</label>
                      <label className="space-y-2"><span className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Display name</span><input value={form.display_name} onChange={(e) => updateForm('display_name', e.target.value)} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-neon-blue/60" placeholder="Public-facing name" /></label>
                      <div className="space-y-3">
                        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Profile image</span>
                        <div className={`rounded-[24px] border p-4 ${errors.image_url ? 'border-red-400 bg-red-500/5' : 'border-white/10 bg-black/20'}`}>
                          <div className="flex items-center gap-4">
                            <div className="h-20 w-20 overflow-hidden rounded-3xl border border-white/10 bg-white/5">
                              {profileImageSrc ? <img src={profileImageSrc} alt={previewName(form)} className="h-full w-full object-cover" /> : null}
                            </div>
                            <div className="min-w-0 flex-1 space-y-3">
                              <label className="inline-flex cursor-pointer items-center rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white hover:bg-white/10">
                                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileSelection('profile', e.target.files?.[0])} />
                                {profileImageSrc ? 'Replace profile image' : 'Upload profile image'}
                              </label>
                              <p className="text-xs text-gray-400">
                                {profileImageSrc ? 'Current uploaded image will be used for this artist.' : 'No profile image uploaded yet.'}
                              </p>
                            </div>
                          </div>
                        </div>
                        {errors.image_url ? <p className="text-xs text-red-300">{errors.image_url}</p> : null}
                      </div>
                      <div className="space-y-3">
                        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Cover image</span>
                        <div className={`rounded-[24px] border p-4 ${errors.cover_image_url ? 'border-red-400 bg-red-500/5' : 'border-white/10 bg-black/20'}`}>
                          <div className="flex items-center gap-4">
                            <div className="h-20 w-28 overflow-hidden rounded-3xl border border-white/10 bg-white/5">
                              {coverImageSrc ? <img src={coverImageSrc} alt="" className="h-full w-full object-cover" /> : null}
                            </div>
                            <div className="min-w-0 flex-1 space-y-3">
                              <label className="inline-flex cursor-pointer items-center rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white hover:bg-white/10">
                                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileSelection('cover', e.target.files?.[0])} />
                                {coverImageSrc ? 'Replace cover image' : 'Upload cover image'}
                              </label>
                              <p className="text-xs text-gray-400">
                                {coverImageSrc ? 'Current uploaded image will be used for the artist header.' : 'No cover image uploaded yet.'}
                              </p>
                            </div>
                          </div>
                        </div>
                        {errors.cover_image_url ? <p className="text-xs text-red-300">{errors.cover_image_url}</p> : null}
                      </div>
                      <label className="space-y-2 md:col-span-2"><span className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Bio</span><textarea rows={5} value={form.bio} onChange={(e) => updateForm('bio', e.target.value)} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-neon-blue/60" placeholder="Short artist bio" /></label>
                    </div>
                  </section>
                  <section className="rounded-[28px] border border-white/10 bg-white/5 p-5">
                    <h4 className="text-sm font-semibold uppercase tracking-[0.24em] text-gray-300">Discovery settings</h4>
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <label className="space-y-2"><span className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Genres</span><input value={tagText(form.genres)} onChange={(e) => updateForm('genres', parseTags(e.target.value))} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-neon-blue/60" placeholder="hip-hop, rap" /></label>
                      <label className="space-y-2"><span className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Mood / tags</span><input value={tagText(form.mood_tags)} onChange={(e) => updateForm('mood_tags', parseTags(e.target.value))} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-neon-blue/60" placeholder="anthemic, nocturnal" /></label>
                      <label className="space-y-2"><span className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Language</span><input value={form.language} onChange={(e) => updateForm('language', e.target.value)} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-neon-blue/60" placeholder="English" /></label>
                      <label className="space-y-2"><span className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Country</span><input value={form.country} onChange={(e) => updateForm('country', e.target.value)} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-neon-blue/60" placeholder="United States" /></label>
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <label className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3"><div><p className="text-sm font-medium text-white">Featured</p><p className="text-xs text-gray-400">Boost this artist in editorial surfaces.</p></div><input type="checkbox" checked={form.is_featured} onChange={(e) => updateForm('is_featured', e.target.checked)} className="h-4 w-4" /></label>
                      <label className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3"><div><p className="text-sm font-medium text-white">Verified</p><p className="text-xs text-gray-400">Mark profile as trusted.</p></div><input type="checkbox" checked={form.is_verified} onChange={(e) => updateForm('is_verified', e.target.checked)} className="h-4 w-4" /></label>
                    </div>
                  </section>
                  <section className="rounded-[28px] border border-white/10 bg-white/5 p-5">
                    <h4 className="text-sm font-semibold uppercase tracking-[0.24em] text-gray-300">Linked releases</h4>
                    <div className="mt-5 grid gap-4 md:grid-cols-2">
                      <div className="rounded-2xl border border-white/10 bg-black/20 p-4"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Linked albums</p>{links.loading ? <p className="mt-3 text-sm text-gray-400">Loading albums...</p> : links.albums.length === 0 ? <p className="mt-3 text-sm text-gray-400">No linked albums yet.</p> : <div className="mt-3 space-y-2">{links.albums.map((album) => <div key={album._id || album.id} className="rounded-xl border border-white/10 px-3 py-3 text-sm text-white"><div className="font-medium">{album.name}</div><div className="mt-1 text-xs text-gray-400">{album.release_date || 'Release date unknown'}</div><button onClick={() => navigate(`/admin/albums/edit/${album._id || album.id}`)} className="mt-3 rounded-lg border border-white/10 px-3 py-2 text-xs text-white hover:bg-white/5">Edit album</button></div>)}</div>}<button onClick={() => navigate('/admin/albums')} className="mt-4 rounded-lg border border-white/10 px-3 py-2 text-xs text-white hover:bg-white/5">Add album</button></div>
                      <div className="rounded-2xl border border-white/10 bg-black/20 p-4"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Linked songs</p>{links.loading ? <p className="mt-3 text-sm text-gray-400">Loading songs...</p> : links.tracks.length === 0 ? <p className="mt-3 text-sm text-gray-400">No linked songs yet.</p> : <div className="mt-3 space-y-2">{links.tracks.map((track) => <div key={track._id || track.id} className="rounded-xl border border-white/10 px-3 py-3 text-sm text-white"><div className="font-medium">{track.name}</div><div className="mt-1 text-xs text-gray-400">Popularity {track.popularity || 0}</div><button onClick={() => navigate(`/admin/songs/edit/${track._id || track.id}`)} className="mt-3 rounded-lg border border-white/10 px-3 py-2 text-xs text-white hover:bg-white/5">Edit song</button></div>)}</div>}<button onClick={() => navigate('/admin/songs/create')} className="mt-4 rounded-lg border border-white/10 px-3 py-2 text-xs text-white hover:bg-white/5">Add song</button></div>
                    </div>
                  </section>
                </div>
                <div className="space-y-6">
                  <section className="rounded-[28px] border border-white/10 bg-white/5 p-5">
                    <h4 className="text-sm font-semibold uppercase tracking-[0.24em] text-gray-300">Preview</h4>
                    <div className="mt-4 overflow-hidden rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(61,180,255,0.18),rgba(12,15,24,0.96))]"><div className="h-28 bg-white/5">{coverImageSrc ? <img src={coverImageSrc} alt="" className="h-full w-full object-cover" /> : null}</div><div className="-mt-10 px-4 pb-4"><div className="h-20 w-20 overflow-hidden rounded-3xl border-4 border-[#0b0d14] bg-black/30">{profileImageSrc ? <img src={profileImageSrc} alt={previewName(form)} className="h-full w-full object-cover" /> : null}</div><div className="mt-3"><p className="text-xl font-semibold text-white">{previewName(form)}</p><p className="mt-1 text-sm text-gray-300">{form.country || form.language || 'Discovery metadata pending'}</p><p className="mt-3 line-clamp-3 text-sm text-gray-300">{form.bio || 'Artist bio preview will appear here.'}</p><div className="mt-4 flex flex-wrap gap-2">{form.genres.slice(0, 3).map((genre) => <span key={genre} className="rounded-xl border border-white/10 bg-white/10 px-3 py-1.5 text-xs text-white">{genre}</span>)}{form.tags.slice(0, 2).map((tag) => <span key={tag} className="rounded-xl border border-white/10 bg-black/25 px-3 py-1.5 text-xs text-gray-200">#{tag}</span>)}</div></div></div></div>
                    <div className="mt-4 space-y-3">
                      <label className="space-y-2"><span className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Publish state</span><select value={form.publish_status} onChange={(e) => updateForm('publish_status', e.target.value)} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-neon-blue/60"><option value="published">Published</option><option value="draft">Draft</option><option value="hidden">Hidden</option></select></label>
                      <label className="space-y-2"><span className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Hidden / restricted reason</span><textarea rows={3} value={form.hidden_reason} onChange={(e) => updateForm('hidden_reason', e.target.value)} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-neon-blue/60" placeholder="Why is this artist hidden or restricted?" /></label>
                    </div>
                  </section>
                  <section className="rounded-[28px] border border-white/10 bg-white/5 p-5">
                    <h4 className="text-sm font-semibold uppercase tracking-[0.24em] text-gray-300">Audit / publish</h4>
                    <div className="mt-4 space-y-3 text-sm text-gray-300">
                      <div className="flex items-center justify-between gap-3"><span>Created by</span><span className="text-right text-white">{form.created_by || 'System / unknown'}</span></div>
                      <div className="flex items-center justify-between gap-3"><span>Last edited by</span><span className="text-right text-white">{form.last_edited_by || 'System / unknown'}</span></div>
                      <div className="flex items-center justify-between gap-3"><span>Last updated</span><span className="text-right text-white">{fmtDate(form.last_edited_at || form.updatedAt)}</span></div>
                    </div>
                    <div className="mt-5 space-y-3">
                      {dirty ? <p className="text-sm text-amber-200">You have unsaved changes in this artist profile.</p> : <p className="text-sm text-gray-400">No pending edits.</p>}
                      <button onClick={saveArtist} disabled={saving} className="w-full rounded-2xl bg-neon-blue px-4 py-3 text-sm font-semibold text-dark-bg disabled:opacity-50 hover:bg-neon-blue/85">{saving ? 'Saving changes...' : 'Save changes'}</button>
                      {drawerMode === 'edit' ? <button onClick={() => removeArtist(form)} className="w-full rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-200 hover:bg-red-500/20">Delete artist</button> : null}
                    </div>
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
