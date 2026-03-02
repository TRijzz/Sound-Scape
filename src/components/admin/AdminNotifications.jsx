import React, { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const AdminNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [status, setStatus] = useState('connecting'); // 'connecting', 'connected', 'error'
  const [lastEvent, setLastEvent] = useState(null);
  const eventSourceRef = useRef(null);

  const connect = useCallback(() => {
      // Close existing connection if any
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      // Check for auth
      const authTokens = JSON.parse(localStorage.getItem('authTokens') || '{}');
      const adminAccessCode = localStorage.getItem('adminAccessCode');

      if (!authTokens.accessToken && !adminAccessCode) {
        setStatus('no-auth');
        return;
      }

      // Build URL with available credentials
      let url = `http://localhost:5000/api/admin/notifications/events?`;
      if (authTokens.accessToken) url += `token=${authTokens.accessToken}&`;
      if (adminAccessCode) url += `admin_code=${adminAccessCode}`;

      console.log('[AdminNotifications] Connecting to SSE:', url);
      const eventSource = new EventSource(url);
      eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      console.log('[AdminNotifications] SSE Connection Opened');
      setStatus('connected');
    };

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('[AdminNotifications] Received SSE message:', data);
      setLastEvent({ type: data.type, time: new Date().toLocaleTimeString() });

      if (data.type === 'HEARTBEAT') return;

      if (data.type === 'CONNECTED') {
        // Success message when first connected
        const id = 'conn-' + Date.now();
        setNotifications(prev => [{ 
          id, 
          message: data.message, 
          type: 'SYSTEM',
          storage_location: 'Backend listening...',
          genre_info: 'Ready',
          analytics_info: 'Waiting for activity'
        }, ...prev]);
        setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 5000);
      }

      if (data.type === 'SONG_PLAYED' || data.type === 'TEST_EVENT' || data.type === 'SUCCESS') {
        const id = Date.now() + Math.random();
        setNotifications(prev => [{ ...data, id }, ...prev].slice(0, 5));
        setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 8000);
      }
    };

    eventSource.onerror = (err) => {
      console.error('[AdminNotifications] SSE Error:', err);
      setStatus('error');
      eventSource.close();
      // Try to reconnect after 5 seconds
      setTimeout(connect, 5000);
    };
  }, []);

  useEffect(() => {
    connect();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [connect]);

  return (
    <div className="fixed top-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none max-w-sm">
      {/* Small Status Indicator */}
      <div className="flex justify-end pr-2 opacity-100 transition-opacity">
        <div 
          onClick={() => connect()} 
          className={`text-[9px] px-2 py-0.5 rounded-full font-mono flex items-center gap-1.5 cursor-pointer hover:brightness-110 ${
          status === 'connected' ? 'bg-green-500/20 text-green-400' : 
          status === 'error' ? 'bg-red-500/20 text-red-400' : 
          status === 'no-auth' ? 'bg-orange-500/20 text-orange-400' : 'bg-yellow-500/20 text-yellow-400'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${
            status === 'connected' ? 'bg-green-400 animate-pulse' : 
            status === 'error' ? 'bg-red-400' : 
            status === 'no-auth' ? 'bg-orange-400' : 'bg-yellow-400 animate-bounce'
          }`}></span>
          {status === 'connected' ? 'LIVE SYNC' : 
           status === 'error' ? 'SYNC ERROR (RETRYING)' : 
           status === 'no-auth' ? 'NO AUTH' : 'CONNECTING...'}
        </div>
        {lastEvent && (
          <div className="text-[7px] text-gray-500 font-mono mt-0.5 pr-1 uppercase">
            Last: {lastEvent.type} @ {lastEvent.time}
          </div>
        )}
      </div>

      <AnimatePresence>
        {notifications.map((n) => (
          <motion.div
            key={n.id}
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.95 }}
            className="bg-gray-900/95 backdrop-blur-md border border-gray-800 border-l-4 border-l-neon-blue p-4 rounded-lg shadow-2xl pointer-events-auto"
          >
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] font-bold text-neon-blue uppercase tracking-wider">Live Activity</span>
              <button 
                onClick={() => setNotifications(prev => prev.filter(notif => notif.id !== n.id))}
                className="text-gray-500 hover:text-white transition-colors"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="text-white text-sm font-semibold mb-2 leading-tight">{n.message}</div>
            <div className="space-y-1.5 border-t border-gray-800 pt-2">
              <div className="flex items-center gap-2">
                <span className="text-gray-400 text-[10px] font-mono shrink-0">PATH:</span>
                <div className="text-gray-300 text-[10px] font-mono truncate bg-black/40 px-1.5 py-0.5 rounded">{n.storage_location.replace('📁 Storage Location: ', '')}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-400 text-[10px] font-mono shrink-0">GENRE:</span>
                <div className="text-neon-blue text-[10px] font-bold bg-neon-blue/10 px-1.5 py-0.5 rounded">{n.genre_info.replace('🏷️ Genre Identified: ', '')}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-400 text-[10px] font-mono shrink-0">LOG:</span>
                <div className="text-green-500 text-[9px] font-medium italic">{n.analytics_info.replace('📊 Recorded listening history for genre: ', '')}</div>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default AdminNotifications;
