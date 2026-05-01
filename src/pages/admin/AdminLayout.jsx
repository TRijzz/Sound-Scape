import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import AdminGuard from './AdminGuard';
import AdminNotifications from '../../components/admin/AdminNotifications';
import AdminAccountMenu from '../../components/admin/AdminAccountMenu';

export default function AdminLayout({ children }) {
  return (
    <AdminGuard>
      <div className="p-6 space-y-6 relative">
        <AdminNotifications />
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Admin</h1>
          <div className="flex items-center gap-3">
            <Link to="/" className="text-sm text-gray-400 hover:text-white">Back to site</Link>
            <AdminAccountMenu />
          </div>
        </div>
        <div className="flex gap-3 border-b border-gray-800 pb-2">
          <NavLink to="/admin/artists" className={({isActive})=>`px-3 py-2 rounded ${isActive?'bg-neon-blue/20 text-neon-blue':'text-gray-300 hover:text-white hover:bg-light-gray'}`}>Artists</NavLink>
          <NavLink to="/admin/albums" className={({isActive})=>`px-3 py-2 rounded ${isActive?'bg-neon-blue/20 text-neon-blue':'text-gray-300 hover:text-white hover:bg-light-gray'}`}>Albums</NavLink>
          <NavLink to="/admin/songs" className={({isActive})=>`px-3 py-2 rounded ${isActive?'bg-neon-blue/20 text-neon-blue':'text-gray-300 hover:text-white hover:bg-light-gray'}`}>Songs</NavLink>
          <NavLink to="/admin/vinyls" className={({isActive})=>`px-3 py-2 rounded ${isActive?'bg-neon-blue/20 text-neon-blue':'text-gray-300 hover:text-white hover:bg-light-gray'}`}>Vinyls</NavLink>
          <NavLink to="/admin/users" className={({isActive})=>`px-3 py-2 rounded ${isActive?'bg-neon-blue/20 text-neon-blue':'text-gray-300 hover:text-white hover:bg-light-gray'}`}>Users</NavLink>
          <NavLink to="/admin/lyrics" className={({isActive})=>`px-3 py-2 rounded ${isActive?'bg-neon-blue/20 text-neon-blue':'text-gray-300 hover:text-white hover:bg-light-gray'}`}>Lyrics</NavLink>
          <NavLink to="/admin/categories" className={({isActive})=>`px-3 py-2 rounded ${isActive?'bg-neon-blue/20 text-neon-blue':'text-gray-300 hover:text-white hover:bg-light-gray'}`}>Categories</NavLink>
        </div>
        {children}
      </div>
    </AdminGuard>
  );
}
