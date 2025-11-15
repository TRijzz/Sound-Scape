import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMusic } from '../../contexts/MusicContext';

const VerificationSuccess = ({ user, onLogin }) => {
  const navigate = useNavigate();
  const { login } = useMusic();

  useEffect(() => {
    // Auto-login the user after a short delay
    const timer = setTimeout(() => {
      if (user && onLogin) {
        onLogin(user);
      }
      navigate('/'); // Redirect to home page after login
    }, 2000);

    return () => clearTimeout(timer);
  }, [user, onLogin, navigate]);

  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-light-gray/50 backdrop-blur-md rounded-2xl p-8 border border-gray-700 text-center">
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-12 h-12 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          
          <h2 className="text-2xl font-bold text-white mb-2">Email Verified Successfully!</h2>
          <p className="text-gray-300 mb-6">Welcome, {user?.username || 'User'}! You're being logged in...</p>
          
          <div className="w-full bg-neon-blue/80 text-dark-bg font-medium py-3 px-4 rounded-lg flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-dark-bg" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Logging you in...
          </div>
          
          <p className="text-sm text-gray-400 mt-6">
            If you're not redirected, 
            <button 
              onClick={() => {
                if (user && onLogin) onLogin(user);
                navigate('/');
              }} 
              className="text-neon-blue hover:text-neon-blue/80 ml-1 font-medium"
            >
              click here
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default VerificationSuccess;
