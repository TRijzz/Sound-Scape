import React, { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import apiService from '../../services/api';

const emptyForm = {
  username: '',
  password: '',
};

const getErrorMessage = (err, fallback) => {
  const details = err?.details?.errors;
  if (details && typeof details === 'object') {
    const messages = Object.values(details).filter(Boolean);
    if (messages.length) return messages.join(', ');
  }
  return err?.message || fallback;
};

export default function AdminGuard({ children }) {
  const location = useLocation();
  const [adminVerified, setAdminVerified] = useState(false);
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const completeAdminSession = useCallback((adminToken, admin) => {
    apiService.setAdminToken(adminToken);
    localStorage.setItem('adminToken', adminToken);
    localStorage.removeItem('adminAccessCode');
    localStorage.removeItem('adminVerified');
    if (admin) localStorage.setItem('adminSession', JSON.stringify(admin));
    setAdminVerified(true);
  }, []);

  useEffect(() => {
    const verifyStoredToken = async (token) => {
      try {
        setError('');
        apiService.setAdminToken(token);
        const response = await apiService.verifyAdminAccess(token);
        completeAdminSession(token, response?.admin);
      } catch (err) {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminAccessCode');
        localStorage.removeItem('adminVerified');
        localStorage.removeItem('adminSession');
        apiService.setAdminToken(null);
      }
    };

    localStorage.removeItem('adminAccessCode');
    localStorage.removeItem('adminVerified');

    const storedToken = localStorage.getItem('adminToken');
    if (storedToken) verifyStoredToken(storedToken);
  }, [completeAdminSession]);

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const payload = {
        username: form.username.trim(),
        password: form.password,
      };

      const response = mode === 'create'
        ? await apiService.registerAdmin(payload)
        : await apiService.loginAdmin({ username: payload.username, password: payload.password });

      completeAdminSession(response.adminToken, response.admin);
    } catch (err) {
      setError(getErrorMessage(err, mode === 'create' ? 'Could not create admin' : 'Admin login failed'));
    } finally {
      setLoading(false);
    }
  };

  if (!adminVerified && location.pathname.startsWith('/admin')) {
    const creating = mode === 'create';

    return (
      <div className="min-h-screen bg-dark-bg p-6 text-white">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto mt-16 max-w-md rounded-xl border border-gray-800 bg-dark-gray/70 p-6 shadow-2xl"
        >
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neon-blue">Sound Scape Admin</p>
            <h2 className="mt-2 text-2xl font-semibold">{creating ? 'Create admin account' : 'Admin login'}</h2>
            <p className="mt-2 text-sm text-gray-300">
              {creating
                ? 'Create an admin account to manage Sound Scape.'
                : 'Use your admin username and password to continue.'}
            </p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <input
              type="text"
              value={form.username}
              onChange={(e) => updateField('username', e.target.value)}
              placeholder="Admin username"
              autoComplete="username"
              className="w-full rounded-lg border border-gray-700 bg-light-gray/50 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-neon-blue"
            />

            <input
              type="password"
              value={form.password}
              onChange={(e) => updateField('password', e.target.value)}
              placeholder="Password"
              autoComplete={creating ? 'new-password' : 'current-password'}
              className="w-full rounded-lg border border-gray-700 bg-light-gray/50 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-neon-blue"
            />

            {error && <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</div>}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-neon-blue px-4 py-3 font-semibold text-dark-bg transition hover:bg-neon-blue/85 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Please wait...' : creating ? 'Create admin' : 'Log in'}
            </button>
          </form>

          <button
            type="button"
            onClick={() => {
              setMode(creating ? 'login' : 'create');
              setError('');
            }}
            className="mt-5 w-full text-sm text-gray-300 hover:text-neon-blue"
          >
            {creating ? 'Already have an admin account? Log in' : 'Need to create an admin account?'}
          </button>
        </motion.div>
      </div>
    );
  }

  return children;
}
