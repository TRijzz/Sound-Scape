import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import apiService from '../../services/api';

export default function AdminGuard({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [adminVerified, setAdminVerified] = useState(false);
  const [adminCode, setAdminCode] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const storedCode = localStorage.getItem('adminAccessCode');
    if (storedCode) {
      setAdminCode(storedCode);
      verify(storedCode);
    }
  }, []);

  const verify = async (codeToVerify) => {
    try {
      setError('');
      // Check if codeToVerify is a valid string, otherwise use state
      const isExplicitCode = typeof codeToVerify === 'string';
      const code = (isExplicitCode ? codeToVerify : adminCode).trim();
      
      if (!code) { setError('Enter access code'); return; }
      
      apiService.setAdminCode(code);
      await apiService.verifyAdminAccess(code);
      
      localStorage.setItem('adminAccessCode', code);
      setAdminVerified(true);
    } catch (err) {
      setError(err?.message || 'Verification failed');
      // Only clear storage if we were verifying a stored code
      if (typeof codeToVerify === 'string') {
        localStorage.removeItem('adminAccessCode'); 
      }
    }
  };

  if (!adminVerified && location.pathname.startsWith('/admin')) {
    return (
      <div className="p-6">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="max-w-md mx-auto bg-dark-gray/60 border border-gray-800 rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-2">Admin Access</h2>
          <p className="text-gray-300 mb-4">Enter the admin access code to continue.</p>
          <div className="space-y-3">
            <input type="password" value={adminCode} onChange={(e)=>setAdminCode(e.target.value)} placeholder="Access code" className="w-full px-4 py-2 rounded-lg bg-light-gray/50 text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-neon-blue" />
            {error && <div className="text-red-400 text-sm">{error}</div>}
            <div className="flex justify-end">
              <button onClick={verify} className="px-4 py-2 rounded-lg bg-neon-blue text-dark-bg">Verify</button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return children;
}
