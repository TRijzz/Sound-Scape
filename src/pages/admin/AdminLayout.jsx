import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import AdminGuard from './AdminGuard';

export default function AdminLayout({ children }) {
  return (
    <AdminGuard>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Admin</h1>
          <Link to="/" className="text-sm text-gray-400 hover:text-white">Back to site</Link>
        </div>
        <div className="flex gap-3 border-b border-gray-800 pb-2">
          <NavLink to="/admin/artists" className={({isActive})=>`px-3 py-2 rounded ${isActive?'bg-neon-blue/20 text-neon-blue':'text-gray-300 hover:text-white hover:bg-light-gray'}`}>Artists</NavLink>
          <NavLink to="/admin/albums" className={({isActive})=>`px-3 py-2 rounded ${isActive?'bg-neon-blue/20 text-neon-blue':'text-gray-300 hover:text-white hover:bg-light-gray'}`}>Albums</NavLink>
          <NavLink to="/admin/songs" className={({isActive})=>`px-3 py-2 rounded ${isActive?'bg-neon-blue/20 text-neon-blue':'text-gray-300 hover:text-white hover:bg-light-gray'}`}>Songs</NavLink>
        </div>
        {children}
      </div>
    </AdminGuard>
  );
}
