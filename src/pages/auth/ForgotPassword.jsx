import { useState } from 'react';
import { Link } from 'react-router-dom';
// Using emoji instead of react-icons for better compatibility

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      setMessage({ text: 'Please enter your email', type: 'error' });
      return;
    }
    
    setIsSubmitting(true);
    // TODO: Implement actual password reset logic
    console.log('Sending reset link to:', email);
    
    // Simulate API call
    setTimeout(() => {
      setMessage({ 
        text: 'If an account exists with this email, you will receive a password reset link.', 
        type: 'success' 
      });
      setIsSubmitting(false);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 flex items-center justify-center px-4">
      <div className="bg-white bg-opacity-10 backdrop-blur-lg rounded-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Reset Password</h1>
          <p className="text-gray-300">Enter your email to receive a reset link</p>
        </div>
        
        {message.text && (
          <div className={`mb-6 p-3 rounded-lg ${message.type === 'error' ? 'bg-red-500/20 text-red-200' : 'bg-green-500/20 text-green-200'}`}>
            {message.text}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-500 text-white py-3 px-4 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center"
          >
            {isSubmitting ? 'Sending...' : 'Send Reset Link'}
          </button>
          
          <div className="text-center mt-4">
            <Link 
              to="/login" 
              className="text-sm text-gray-400 hover:text-white transition-colors flex items-center justify-center"
            >
              ← Back to Sign In
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ForgotPassword;
