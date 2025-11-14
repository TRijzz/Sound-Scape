import { useEffect, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import apiService from '../../services/api';

const EmailVerification = () => {
  const location = useLocation();
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('Enter the 6-digit verification code sent to your email');
  const [email, setEmail] = useState(location.state?.email || '');
  const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', '']);
  const [isResending, setIsResending] = useState(false);
  const navigate = useNavigate();
  const inputRefs = [];

  // Handle code input changes
  const handleCodeChange = (e, index) => {
    const value = e.target.value;
    if (value && !/^\d*$/.test(value)) return; // Only allow numbers
    
    const newCode = [...verificationCode];
    newCode[index] = value.slice(-1); // Take only the last character
    setVerificationCode(newCode);
    
    // Auto-focus to next input
    if (value && index < 5) {
      inputRefs[index + 1]?.focus();
    }
    
    // If all fields are filled, submit the code
    if (newCode.every(digit => digit) && index === 5) {
      handleVerifyCode();
    }
  };
  
  // Handle backspace to move to previous input
  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace' && !verificationCode[index] && index > 0) {
      inputRefs[index - 1]?.focus();
    }
  };
  
  // Verify the entered code
  const handleVerifyCode = async () => {
    const code = verificationCode.join('');
    if (code.length !== 6) {
      setStatus('error');
      setMessage('Please enter a valid 6-digit code');
      return;
    }
    
    try {
      setStatus('verifying');
      setMessage('Verifying your code...');
      
      await apiService.verifyEmail({ email, code });
      
      setStatus('success');
      setMessage('Your email has been verified successfully! Redirecting to login...');
      
      // Clear any existing tokens to force re-login
      localStorage.removeItem('authTokens');
      
      // Redirect to login after a short delay
      setTimeout(() => {
        navigate('/login', { 
          state: { 
            message: 'Email verified successfully! Please log in to continue.'
          } 
        });
      }, 2000);
      
    } catch (error) {
      console.error('Verification error:', error);
      setStatus('error');
      const errorMessage = error?.details?.message || 
                         error?.message || 
                         'The verification code is invalid or has expired.';
      setMessage(errorMessage);
      
      // Clear the code on error
      setVerificationCode(['', '', '', '', '', '']);
      inputRefs[0]?.focus();
    }
  };

  // Handle resend verification code
  const handleResendCode = async () => {
    if (!email) {
      setStatus('error');
      setMessage('No email address found. Please try signing up again.');
      return;
    }

    try {
      setIsResending(true);
      setStatus('sending');
      setMessage('Sending a new verification code...');
      
      await apiService.resendVerificationEmail(email);
      
      setStatus('success');
      setMessage(`A new verification code has been sent to ${email}.`);
      
      // Clear the code and refocus first input
      setVerificationCode(['', '', '', '', '', '']);
      inputRefs[0]?.focus();
    } catch (error) {
      console.error('Resend error:', error);
      setStatus('error');
      setMessage(error.response?.data?.message || 'Failed to resend verification email. Please try again.');
    }
  };

  // Set initial email from location state if available
  useEffect(() => {
    if (location.state?.email) {
      setEmail(location.state.email);
      setStatus('idle');
      setMessage('Enter the 6-digit verification code sent to ' + location.state.email);
    } else {
      setStatus('error');
      setMessage('No email address found. Please try signing up again.');
    }
  }, [location.state]);

  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-light-gray/50 backdrop-blur-md rounded-2xl p-8 border border-gray-700">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">
              {status === 'success' ? '✓ Email Verified' : 'Verify Your Email'}
            </h2>
            <p className="text-gray-300">{message}</p>
          </div>

          {status !== 'success' && email && (
            <>
              <div className="flex justify-center space-x-2 mb-6">
                {verificationCode.map((digit, index) => (
                  <input
                    key={index}
                    ref={el => inputRefs[index] = el}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength="1"
                    value={digit}
                    onChange={(e) => handleCodeChange(e, index)}
                    onKeyDown={(e) => handleKeyDown(e, index)}
                    className="w-12 h-12 text-2xl text-center bg-dark-gray border border-gray-600 rounded-lg focus:border-neon-blue focus:ring-2 focus:ring-neon-blue/50 outline-none transition-all"
                    disabled={status === 'verifying' || status === 'sending'}
                  />
                ))}
              </div>

              <div className="text-center">
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={isResending || status === 'verifying'}
                  className="text-sm text-neon-blue hover:text-neon-blue/80 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isResending ? 'Sending...' : "Didn't receive a code? Resend"}
                </button>
              </div>
            </>
          )}

          <div className="mt-8">
            <Link
              to="/login"
              className="w-full block text-center py-3 px-4 bg-neon-blue text-dark-bg font-medium rounded-lg hover:bg-neon-blue/90 transition-colors"
            >
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailVerification;
