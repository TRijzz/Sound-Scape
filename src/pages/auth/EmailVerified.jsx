import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useMusic } from '../../contexts/MusicContext';

const EmailVerified = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useMusic();
  
  // Get user data from location state
  const user = location.state?.user;
  const tokens = location.state?.tokens;

  useEffect(() => {
    // Auto-login and redirect after a short delay
    const timer = setTimeout(() => {
      if (user) {
        login(user, tokens);
      }
      navigate('/onboarding');
    }, 3000);

    return () => clearTimeout(timer);
  }, [user, tokens, login, navigate]);

  const handleContinue = () => {
    if (user) {
      login(user, tokens);
    }
    navigate('/onboarding');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-4">
      <motion.div 
        className="w-full max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="bg-gray-800/80 backdrop-blur-lg rounded-2xl p-8 border border-gray-700 shadow-2xl">
          {/* Animated Checkmark */}
          <motion.div 
            className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-8"
            initial={{ scale: 0 }}
            animate={{ 
              scale: [0, 1.1, 1],
              rotate: [0, 10, -10, 0]
            }}
            transition={{ 
              duration: 0.8,
              ease: "easeOut"
            }}
          >
            <svg 
              className="w-14 h-14 text-green-400" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <motion.path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M5 13l4 4L19 7"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              />
            </svg>
          </motion.div>
          
          {/* Success Message */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="text-center"
          >
            <h1 className="text-3xl font-bold text-white mb-3">Email Verified!</h1>
            <p className="text-gray-300 mb-8">
              Welcome to Music Station, <span className="font-medium text-white">{user?.username || 'User'}</span>!<br />
              Your email has been successfully verified.
            </p>
            
            {/* Loading Animation */}
            <div className="flex flex-col items-center mb-8">
              <div className="relative w-full h-1.5 bg-gray-700 rounded-full overflow-hidden mb-4">
                <motion.div 
                  className="h-full bg-green-500 rounded-full"
                  initial={{ width: '0%' }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 3, ease: 'linear' }}
                />
              </div>
              <p className="text-sm text-gray-400">Taking you to your dashboard...</p>
            </div>
            
            {/* Continue Button */}
            <button
              onClick={handleContinue}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-medium py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg shadow-green-500/20"
            >
              Continue to App
              <svg 
                className="w-5 h-5 ml-2 inline-block" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
            
            {/* Additional Info */}
            <p className="text-xs text-gray-500 mt-6">
              Having trouble? <a href="/support" className="text-green-400 hover:underline">Contact support</a>
            </p>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default EmailVerified;
