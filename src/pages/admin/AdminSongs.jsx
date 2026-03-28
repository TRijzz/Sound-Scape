import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import apiService from '../../services/api';
import AdminLayout from './AdminLayout';
import { ToastContainer } from '../../components/ui/Toast';

const songCover = (song) => apiService.resolveMediaUrl(song.cover_art_url || song.album?.images?.[0]?.url || '');
const songArtistsText = (song) => (song.artists || []).map((artist) => artist?.name).filter(Boolean).join(', ');
const songDuration = (song) => {
  const totalSeconds = Math.floor((song.duration_ms || 0) / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

export default function AdminSongs() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [songs, setSongs] = useState([]);
  const [audioInventory, setAudioInventory] = useState({ total_files: 0, linked_song_count: 0, orphan_file_count: 0 });
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const uploadedOnly = searchParams.get('uploaded') === '1';

  const [toasts, setToasts] = useState([]);
  const [syncingFolders, setSyncingFolders] = useState(false);
  const filteredSongs = uploadedOnly ? songs.filter((song) => song.has_uploaded_audio) : songs;
  const stats = {
    total: songs.length,
    uploaded: audioInventory.total_files,
    linkedUploaded: audioInventory.linked_song_count,
    withAlbum: filteredSongs.filter((song) => song.album).length,
    explicit: filteredSongs.filter((song) => song.explicit).length
  };

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
      const [songsRes, inventoryRes] = await Promise.all([
        apiService.getSongs(1, uploadedOnly ? 200 : 1000, search, '', '', '', '', '-popularity', '', '', '', '', uploadedOnly),
        apiService.getAudioInventory()
      ]);

      const songList = Array.isArray(songsRes?.songs) ? songsRes.songs : Array.isArray(songsRes) ? songsRes : [];

      setSongs(songList);
      setAudioInventory({
        total_files: Number(inventoryRes?.total_files) || 0,
        linked_song_count: Number(inventoryRes?.linked_song_count) || 0,
        orphan_file_count: Number(inventoryRes?.orphan_file_count) || 0
      });
    } catch (error) {
      console.error('Error loading data:', error);
      setSongs([]);
      setAudioInventory({ total_files: 0, linked_song_count: 0, orphan_file_count: 0 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [search, uploadedOnly]);

  const autoPopulate = async () => {
    try {
      showToast('Assigning song genres and categories from synced metadata...', 'success', 2500);
      const res = await apiService.populateSongCategories({
        dryRun: false,
        limit: 0,
        overwriteGenre: true,
        overwriteCategory: true
      });
      showToast(`Genre and category assignment complete: ${res?.updated || 0} songs updated`, 'success', 3500);
      await load();
    } catch (error) {
      showToast(`Automatic assignment failed: ${error?.message || 'Unknown error'}`, 'error');
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
      showToast(`Failed to delete song: ${error?.message || 'Unknown error'}`, 'error');
    }
  };

  const handleFolderSync = async () => {
    if (syncingFolders) return;
    setSyncingFolders(true);
    try {
      showToast('Starting folder sync...', 'success', 2000);
      const res = await apiService.syncFromFolders();
      showToast(`Folder sync complete: Added ${res?.stats?.added || 0}, Updated ${res?.stats?.updated || 0}`, 'success', 4000);
      await load();
    } catch (error) {
      showToast(`Folder sync failed: ${error?.message || 'Unknown error'}`, 'error');
    } finally {
      setSyncingFolders(false);
    }
  };

  return (
    <AdminLayout>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="space-y-4">
        <div className="rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(61,180,255,0.18),_transparent_38%),linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-neon-blue/80">Song Console</p>
              <h2 className="text-3xl font-semibold text-white">List, upload, assign, refine</h2>
              <p className="max-w-2xl text-sm text-gray-300">Review song metadata, track uploaded audio coverage, and keep the catalog organized from one workspace.</p>
            </div>
            <button onClick={() => navigate('/admin/songs/create')} className="rounded-2xl bg-neon-blue px-5 py-3 text-sm font-semibold text-dark-bg hover:bg-neon-blue/85">Add song</button>
          </div>
          <div className="mt-6 grid gap-3 md:grid-cols-4">
            {[
              { label: 'Total songs', value: stats.total, onClick: uploadedOnly ? () => setSearchParams({}) : null, helper: uploadedOnly ? 'Show all songs' : null },
              { label: 'Uploaded audio', value: stats.uploaded, onClick: () => setSearchParams({ uploaded: '1' }), helper: `${stats.linkedUploaded} linked to songs` },
              { label: 'Linked albums', value: stats.withAlbum },
              { label: 'Explicit', value: stats.explicit }
            ].map(({ label, value, onClick, helper }) => {
              const clickable = typeof onClick === 'function';
              const Tag = clickable ? 'button' : 'div';
              return (
                <Tag
                  key={label}
                  onClick={onClick}
                  className={`rounded-2xl border border-white/10 bg-black/20 p-4 text-left ${clickable ? 'transition hover:border-neon-blue/40 hover:bg-neon-blue/5' : ''}`}
                >
                  <p className="text-xs uppercase tracking-[0.2em] text-gray-400">{label}</p>
                  <p className="mt-2 text-3xl font-semibold text-white">{value}</p>
                  {helper ? <p className="mt-2 text-xs text-neon-blue">{helper}</p> : null}
                </Tag>
              );
            })}
          </div>
        </div>

        {audioInventory.orphan_file_count > 0 ? (
          <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm text-yellow-100">
            {audioInventory.orphan_file_count} uploaded audio file{audioInventory.orphan_file_count !== 1 ? 's are' : ' is'} in `public/songs` but not linked to any song record yet. Use `Sync Folders` if you want them registered in admin.
          </div>
        ) : null}

        <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1.8fr)_repeat(3,minmax(0,1fr))]">
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Search</span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search songs or artists"
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-neon-blue/60"
              />
            </label>
            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Create</span>
              <button onClick={() => navigate('/admin/songs/create')} className="w-full rounded-2xl bg-neon-blue px-4 py-3 text-sm font-semibold text-dark-bg hover:bg-neon-blue/85">
                Add song
              </button>
            </div>
            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Assign</span>
              <button onClick={autoPopulate} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white hover:bg-white/10">
                Auto assign
              </button>
            </div>
            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Folder sync</span>
              <button onClick={handleFolderSync} disabled={syncingFolders} className="w-full rounded-2xl border border-yellow-500/30 bg-yellow-600/20 px-4 py-3 text-sm text-yellow-100 disabled:opacity-50 hover:bg-yellow-600/30">
                {syncingFolders ? 'Syncing...' : 'Sync folders'}
              </button>
            </div>
          </div>
          {uploadedOnly ? (
            <div className="mt-4">
              <button onClick={() => setSearchParams({})} className="rounded-xl border border-neon-blue/40 px-4 py-2 text-sm text-neon-blue hover:bg-neon-blue/10">
                Clear uploaded filter
              </button>
            </div>
          ) : null}
        </div>

        <div className="hidden overflow-hidden rounded-[28px] border border-white/10 bg-white/5 xl:block">
          <div className="grid grid-cols-[minmax(0,2fr)_1.1fr_150px_120px_220px] gap-4 border-b border-white/10 px-5 py-4 text-xs font-semibold uppercase tracking-[0.24em] text-gray-400">
            <div>Song</div><div>Album</div><div>Status</div><div>Genre</div><div>Quick actions</div>
          </div>
          <div className="divide-y divide-white/10">
            {filteredSongs.map((song) => (
              <div key={song._id || song.id} className="grid grid-cols-[minmax(0,2fr)_1.1fr_150px_120px_220px] gap-4 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="h-14 w-14 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                    {songCover(song) ? (
                      <img src={songCover(song)} alt={song.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-[10px] uppercase tracking-[0.2em] text-gray-500">No art</div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">{song.name}</p>
                    <p className="truncate text-xs text-gray-400">{songArtistsText(song) || 'No artist linked'}</p>
                    <p className="mt-1 text-xs text-gray-500">{songDuration(song)}</p>
                  </div>
                </div>
                <div className="truncate text-sm text-gray-300">{song.album?.name || 'No album'}</div>
                <div className="flex flex-wrap items-start gap-2">
                  {song.explicit ? <span className="inline-flex w-fit whitespace-nowrap rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs text-red-200">Explicit</span> : null}
                  {song.has_uploaded_audio ? <span className="inline-flex w-fit whitespace-nowrap rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-200">Audio ready</span> : <span className="inline-flex w-fit whitespace-nowrap rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-xs text-orange-200">No audio</span>}
                </div>
                <div className="text-sm text-gray-300">{song.genre?.name || song.genre || 'Uncategorized'}</div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => navigate('/admin/songs/edit/' + (song._id || song.id))} className="rounded-xl border border-white/10 px-3 py-2 text-xs text-white hover:bg-white/5">Edit</button>
                  <button onClick={() => deleteSong(song._id || song.id)} className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200 hover:bg-red-500/20">Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-4 xl:hidden">
          {filteredSongs.map((song) => (
            <div key={song._id || song.id} className="rounded-[24px] border border-white/10 bg-white/5 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-14 w-14 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                    {songCover(song) ? <img src={songCover(song)} alt={song.name} className="h-full w-full object-cover" /> : null}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{song.name}</p>
                    <p className="text-xs text-gray-400">{songArtistsText(song) || 'No artist linked'}</p>
                  </div>
                </div>
                <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-gray-300">{songDuration(song)}</span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 text-xs text-gray-400">
                <span className="rounded-xl border border-white/10 bg-black/20 px-3 py-1.5">{song.album?.name || 'No album'}</span>
                <span className="rounded-xl border border-white/10 bg-black/20 px-3 py-1.5">{song.genre?.name || song.genre || 'Uncategorized'}</span>
                {song.has_uploaded_audio ? <span className="inline-flex w-fit whitespace-nowrap rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-emerald-200">Audio ready</span> : <span className="inline-flex w-fit whitespace-nowrap rounded-xl border border-orange-500/30 bg-orange-500/10 px-3 py-1.5 text-orange-200">No audio</span>}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button onClick={() => navigate('/admin/songs/edit/' + (song._id || song.id))} className="rounded-xl border border-white/10 px-3 py-2 text-xs text-white">Edit</button>
                <button onClick={() => deleteSong(song._id || song.id)} className="rounded-xl border border-red-500/30 px-3 py-2 text-xs text-red-200">Delete</button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between rounded-[28px] border border-white/10 bg-white/5 p-5">
          <div className="text-sm text-gray-300">
            {loading ? 'Loading songs...' : `${filteredSongs.length} songs shown of ${songs.length}`}
          </div>
          <button disabled={loading} onClick={load} className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white disabled:opacity-50 hover:bg-white/5">
            Refresh
          </button>
        </div>
      </motion.section>
    </AdminLayout>
  );
}
