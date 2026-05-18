import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const Toast = ({ message, type = 'error', onClose, duration = 4000 }) => {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const bgColor = type === 'error' ? 'bg-red-500/90' : type === 'success' ? 'bg-green-500/90' : 'bg-blue-500/90';
  const borderColor = type === 'error' ? 'border-red-400' : type === 'success' ? 'border-green-400' : 'border-blue-400';

  return (
    <motion.div
      initial={{ opacity: 0, y: -50, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      className={`${bgColor} ${borderColor} border-2 rounded-lg shadow-lg px-4 py-3 min-w-[300px] max-w-[500px]`}
    >
      <div className="flex items-center justify-between">
        <p className="text-white text-sm font-medium pr-4">{message}</p>
        <button
          onClick={onClose}
          className="text-white hover:text-gray-200 transition-colors flex-shrink-0"
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </motion.div>
  );
};

export const ToastContainer = ({ toasts, removeToast }) => {
  return (
    <div className="fixed top-4 right-4 z-[100] pointer-events-none">
      <div className="space-y-2">
        <AnimatePresence>
          {toasts.map((toast) => (
            <div key={toast.id} className="pointer-events-auto">
              <Toast
                message={toast.message}
                type={toast.type}
                onClose={() => removeToast(toast.id)}
                duration={toast.duration}
              />
            </div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Toast;

