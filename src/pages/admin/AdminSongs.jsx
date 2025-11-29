import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import apiService from '../../services/api';
import AdminLayout from './AdminLayout';

export default function AdminSongs() {
  const [songs, setSongs] = useState([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [name, setName] = useState('');
  const [durationMs, setDurationMs] = useState('');
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editDuration, setEditDuration] = useState('');
  const canCreate = useMemo(()=>name.trim().length>0 && /^[0-9]+$/.test(String(durationMs)), [name, durationMs]);

  const load = async (reset=false) => {
    setLoading(true);
    try {
      const res = await apiService.getSongs(page, limit, search);
      const list = Array.isArray(res?.songs) ? res.songs : Array.isArray(res) ? res : [];
      const pag = res?.pagination || null;
      setPagination(pag);
      setSongs(reset ? list : (page===1 ? list : [...songs, ...list]));
    } finally { setLoading(false); }
  };

  useEffect(()=>{ load(true); /* eslint-disable-line */ }, [page, limit, search]);

  const createSong = async () => {
    if (!canCreate) return;
    const payload = { name: name.trim(), duration_ms: parseInt(String(durationMs), 10) };
    const created = await apiService.createSong(payload);
    setSongs(prev => [created, ...prev]);
    setName(''); setDurationMs('');
  };

  const saveSong = async () => {
    if (!editId) return;
    const updates = {};
    if (editName.trim()) updates.name = editName.trim();
    if (editDuration && /^[0-9]+$/.test(String(editDuration))) updates.duration_ms = parseInt(String(editDuration), 10);
    const updated = await apiService.updateSong(editId, updates);
    setSongs(prev => prev.map(s => ((s._id || s.id) === (updated._id || updated.id) ? updated : s)));
    setEditId(null); setEditName(''); setEditDuration('');
  };

  const deleteSong = async (id) => {
    await apiService.deleteSong(id);
    setSongs(prev => prev.filter(s => (s._id || s.id) !== id));
  };

  return (
    <AdminLayout>
      <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="space-y-4">
        <div className="flex items-center gap-2">
          <input value={search} onChange={e=>{ setPage(1); setSearch(e.target.value); }} placeholder="Search songs" className="px-3 py-2 rounded-lg bg-light-gray/50 text-white border border-gray-700 flex-1" />
          <button disabled={loading} onClick={()=>load(true)} className="px-3 py-2 rounded-lg bg-gray-700 text-white disabled:opacity-50">Refresh</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <input value={name} onChange={e=>setName(e.target.value)} placeholder="New song name" className="px-3 py-2 rounded-lg bg-light-gray/50 text-white border border-gray-700" />
          <input value={durationMs} onChange={e=>setDurationMs(e.target.value)} placeholder="Duration (ms)" className="px-3 py-2 rounded-lg bg-light-gray/50 text-white border border-gray-700" />
          <button onClick={createSong} disabled={!canCreate} className="px-3 py-2 rounded-lg bg-neon-blue text-dark-bg disabled:opacity-50">Create</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {songs.map(s => (
            <div key={s._id || s.id} className="flex items-center justify-between p-3 rounded-lg bg-light-gray/30">
              {editId === (s._id || s.id) ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 w-full">
                  <input className="px-3 py-2 rounded bg-light-gray/50 text-white border border-gray-700" value={editName} onChange={e=>setEditName(e.target.value)} placeholder="Name" />
                  <input className="px-3 py-2 rounded bg-light-gray/50 text-white border border-gray-700" value={editDuration} onChange={e=>setEditDuration(e.target.value)} placeholder="Duration (ms)" />
                  <div className="flex items-center gap-2">
                    <button onClick={saveSong} className="px-3 py-1 rounded bg-neon-blue text-dark-bg">Save</button>
                    <button onClick={()=>{ setEditId(null); setEditName(''); setEditDuration(''); }} className="px-3 py-1 rounded bg-gray-700 text-white">Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="truncate">{s.name}</div>
                  <div className="flex items-center gap-2">
                    <button onClick={()=>{ setEditId(s._id || s.id); setEditName(s.name || ''); setEditDuration(String(s.duration_ms || '')); }} className="px-3 py-1 rounded bg-gray-600 text-white">Edit</button>
                    <button onClick={()=>deleteSong(s._id || s.id)} className="px-3 py-1 rounded bg-red-500/80 text-white">Delete</button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-400">{pagination ? `Page ${pagination.page} / ${pagination.pages}` : ''}</div>
          <div className="flex gap-2">
            <button disabled={loading || page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))} className="px-3 py-2 rounded bg-gray-700 text-white disabled:opacity-50">Prev</button>
            <button disabled={loading || (pagination && page>=pagination.pages)} onClick={()=>setPage(p=>p+1)} className="px-3 py-2 rounded bg-gray-700 text-white disabled:opacity-50">Next</button>
          </div>
        </div>
      </motion.section>
    </AdminLayout>
  );
}
