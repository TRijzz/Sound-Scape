import React, { useMemo, useState } from 'react';
import apiService from '../../services/api';

const getStoredAdmin = () => {
  try {
    const stored = localStorage.getItem('adminSession');
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

export default function AdminAccountMenu() {
  const [open, setOpen] = useState(false);
  const admin = useMemo(getStoredAdmin, []);
  const username = admin?.username || admin?.name || 'Admin';
  const role = admin?.role || 'admin';
  const lastLogin = admin?.last_login_at ? new Date(admin.last_login_at).toLocaleString() : 'Current session';

  const endSession = () => {
    apiService.setAdminToken(null);
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminSession');
    localStorage.removeItem('adminAccessCode');
    localStorage.removeItem('adminVerified');
    window.location.assign('/admin');
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-3 rounded-lg border border-gray-800 bg-dark-gray/70 px-3 py-2 text-left hover:border-neon-blue/40 hover:bg-light-gray/40"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-neon-blue text-sm font-bold text-dark-bg">
          {username.slice(0, 1).toUpperCase()}
        </span>
        <span className="hidden sm:block">
          <span className="block text-sm font-semibold text-white">{username}</span>
          <span className="block text-xs capitalize text-gray-400">{role}</span>
        </span>
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-72 rounded-xl border border-gray-800 bg-dark-gray p-4 shadow-2xl">
          <div className="border-b border-gray-800 pb-3">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-neon-blue">Admin Profile</div>
            <div className="mt-2 text-lg font-semibold text-white">{username}</div>
            <div className="text-sm capitalize text-gray-300">{role}</div>
            <div className="mt-2 text-xs text-gray-500">Last login: {lastLogin}</div>
          </div>

          <div className="mt-3 grid gap-2">
            <button
              type="button"
              onClick={endSession}
              className="rounded-lg border border-gray-700 px-3 py-2 text-left text-sm text-gray-200 hover:border-neon-blue/40 hover:bg-light-gray/40"
            >
              Log out
            </button>
            <button
              type="button"
              onClick={endSession}
              className="rounded-lg bg-neon-blue px-3 py-2 text-left text-sm font-semibold text-dark-bg hover:bg-neon-blue/85"
            >
              Login as another admin
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
