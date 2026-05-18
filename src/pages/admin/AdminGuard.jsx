import React, { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import apiService from '../../services/api';

const emptyForm = {
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
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
  const [message, setMessage] = useState('');

  const completeAdminSession = useCallback((adminToken, admin) => {
    apiService.setAdminToken(adminToken);
    localStorage.setItem('adminToken', adminToken);
    localStorage.removeItem('adminAccessCode');
    localStorage.removeItem('adminVerified');
    if (admin) localStorage.setItem('adminSession', JSON.stringify(admin));
    setAdminVerified(true);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const resetToken = params.get('token');
    if (location.pathname === '/admin/reset-password' && resetToken) {
      setMode('reset');
      setForm((prev) => ({ ...prev, resetToken }));
      return;
    }

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
  }, [completeAdminSession, location.pathname, location.search]);

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      if (mode === 'forgot') {
        const response = await apiService.forgotAdminPassword(form.username.trim() || form.email.trim());
        setMessage(response?.message || 'If an admin account matches, reset instructions have been sent.');
        setForm(emptyForm);
        return;
      }

      if (mode === 'reset') {
        const token = form.resetToken || new URLSearchParams(location.search).get('token');
        if (!token) throw new Error('Reset token is missing');
        if (form.password.length < 8) throw new Error('Password must be at least 8 characters');
        if (form.password !== form.confirmPassword) throw new Error('Passwords do not match');
        const response = await apiService.resetAdminPassword(token, form.password);
        setMessage(response?.message || 'Admin password reset successful. You can log in now.');
        setMode('login');
        setForm(emptyForm);
        return;
      }

      const payload = {
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password,
      };

      if (mode === 'create' && !payload.email) {
        throw new Error('Recovery email is required for admin password resets');
      }

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
    const forgot = mode === 'forgot';
    const resetting = mode === 'reset';
    const title = resetting ? 'Reset admin password' : forgot ? 'Forgot admin password' : creating ? 'Create admin account' : 'Admin login';
    const description = resetting
        ? 'Choose a new password for your admin account.'
      : forgot
        ? 'Enter your admin username or recovery email. We will send a reset link to the recovery email on file.'
        : creating
          ? 'Create an admin account to manage Sound Scape. A recovery email is required for password resets.'
          : 'Use your admin username or recovery email and password to continue.';

    return (
      <div className="min-h-screen bg-dark-bg p-6 text-white">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto mt-16 max-w-md rounded-xl border border-gray-800 bg-dark-gray/70 p-6 shadow-2xl"
        >
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neon-blue">Sound Scape Admin</p>
            <h2 className="mt-2 text-2xl font-semibold">{title}</h2>
            <p className="mt-2 text-sm text-gray-300">{description}</p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            {!resetting && (
              <input
                type="text"
                value={form.username}
                onChange={(e) => updateField('username', e.target.value)}
                placeholder={forgot ? 'Admin username or recovery email' : 'Admin username or email'}
                autoComplete="username"
                className="w-full rounded-lg border border-gray-700 bg-light-gray/50 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-neon-blue"
              />
            )}

            {creating && (
              <input
                type="email"
                value={form.email}
                onChange={(e) => updateField('email', e.target.value)}
                placeholder="Recovery email"
                required
                autoComplete="email"
                className="w-full rounded-lg border border-gray-700 bg-light-gray/50 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-neon-blue"
              />
            )}

            {!forgot && (
              <input
                type="password"
                value={form.password}
                onChange={(e) => updateField('password', e.target.value)}
                placeholder={resetting ? 'New password' : 'Password'}
                autoComplete={creating || resetting ? 'new-password' : 'current-password'}
                className="w-full rounded-lg border border-gray-700 bg-light-gray/50 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-neon-blue"
              />
            )}

            {resetting && (
              <input
                type="password"
                value={form.confirmPassword}
                onChange={(e) => updateField('confirmPassword', e.target.value)}
                placeholder="Confirm new password"
                autoComplete="new-password"
                className="w-full rounded-lg border border-gray-700 bg-light-gray/50 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-neon-blue"
              />
            )}

            {error && <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</div>}
            {message && <div className="rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-300">{message}</div>}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-neon-blue px-4 py-3 font-semibold text-dark-bg transition hover:bg-neon-blue/85 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Please wait...' : resetting ? 'Reset password' : forgot ? 'Send reset link' : creating ? 'Create admin' : 'Log in'}
            </button>
          </form>

          <div className="mt-5 space-y-3 text-center text-sm">
            {!creating && !forgot && !resetting && (
              <button
                type="button"
                onClick={() => {
                  setMode('forgot');
                  setError('');
                  setMessage('');
                }}
                className="block w-full text-gray-300 hover:text-neon-blue"
              >
                Forgot password?
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setMode(creating || forgot || resetting ? 'login' : 'create');
                setError('');
                setMessage('');
              }}
              className="block w-full text-gray-300 hover:text-neon-blue"
            >
              {creating || forgot || resetting ? 'Back to admin login' : 'Need to create an admin account?'}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return children;
}
