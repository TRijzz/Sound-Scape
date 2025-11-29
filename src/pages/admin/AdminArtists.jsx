import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import apiService from '../../services/api';
import AdminLayout from './AdminLayout';

export default function AdminArtists() {
  const [artists, setArtists] = useState([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [name, setName] = useState('');
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState('');
  const canCreate = useMemo(()=>name.trim().length>0, [name]);

  const load = async (reset=false) => {
    setLoading(true);
    try {
      const res = await apiService.getArtists(page, limit, search);
      const list = Array.isArray(res?.artists) ? res.artists : Array.isArray(res) ? res : [];
      const pag = res?.pagination || null;
      setPagination(pag);
      setArtists(reset ? list : (page===1 ? list : [...artists, ...list]));
    } finally { setLoading(false); }
  };

  useEffect(()=>{ load(true); /* eslint-disable-line */ }, [page, limit, search]);

  const createArtist = async () => {
    if (!canCreate) return;
    const payload = { name: name.trim() };
    const created = await apiService.createArtist(payload);
    setArtists(prev => [created, ...prev]);
    setName('');
  };

  const saveArtist = async () => {
    if (!editId) return;
    const updated = await apiService.updateArtist(editId, { name: editName.trim() });
    setArtists(prev => prev.map(a => ((a._id || a.id) === (updated._id || updated.id) ? updated : a)));
    setEditId(null); setEditName('');
  };

  const deleteArtist = async (id) => {
    await apiService.deleteArtist(id);
    setArtists(prev => prev.filter(a => (a._id || a.id) !== id));
  };

  return (
    <AdminLayout>
      <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="space-y-4">
        <div className="flex items-center gap-2">
          <input value={search} onChange={e=>{ setPage(1); setSearch(e.target.value); }} placeholder="Search artists" className="px-3 py-2 rounded-lg bg-light-gray/50 text-white border border-gray-700 flex-1" />
          <button disabled={loading} onClick={()=>load(true)} className="px-3 py-2 rounded-lg bg-gray-700 text-white disabled:opacity-50">Refresh</button>
        </div>
        <div className="flex items-center gap-2">
          <input value={name} onChange={e=>setName(e.target.value)} placeholder="New artist name" className="px-3 py-2 rounded-lg bg-light-gray/50 text-white border border-gray-700 flex-1" />
          <button onClick={createArtist} disabled={!canCreate} className="px-3 py-2 rounded-lg bg-neon-blue text-dark-bg disabled:opacity-50">Create</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {artists.map(a => (
            <div key={a._id || a.id} className="flex items-center justify-between p-3 rounded-lg bg-light-gray/30">
              {editId === (a._id || a.id) ? (
                <div className="flex items-center gap-2 w-full">
                  <input className="px-3 py-2 rounded bg-light-gray/50 text-white border border-gray-700 flex-1" value={editName} onChange={e=>setEditName(e.target.value)} />
                  <button onClick={saveArtist} className="px-3 py-1 rounded bg-neon-blue text-dark-bg">Save</button>
                  <button onClick={()=>{ setEditId(null); setEditName(''); }} className="px-3 py-1 rounded bg-gray-700 text-white">Cancel</button>
                </div>
              ) : (
                <>
                  <div className="truncate">{a.name}</div>
                  <div className="flex items-center gap-2">
                    <button onClick={()=>{ setEditId(a._id || a.id); setEditName(a.name || ''); }} className="px-3 py-1 rounded bg-gray-600 text-white">Edit</button>
                    <button onClick={()=>deleteArtist(a._id || a.id)} className="px-3 py-1 rounded bg-red-500/80 text-white">Delete</button>
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
