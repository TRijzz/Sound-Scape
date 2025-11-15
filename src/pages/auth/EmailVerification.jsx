import { useEffect, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useMusic } from '../../contexts/MusicContext';
import apiService from '../../services/api';

const EmailVerification = () => {
  const location = useLocation();
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('Enter the 6-digit verification code sent to your email');
  const [email, setEmail] = useState(location.state?.email || '');
  const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', '']);
  const [isResending, setIsResending] = useState(false);
  const navigate = useNavigate();
  const { login } = useMusic();
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
      
      const response = await apiService.verifyEmail({ email, code });
      
      if (response.success && response.user) {
        const tokens = (response.accessToken && response.refreshToken) ? {
          accessToken: response.accessToken,
          refreshToken: response.refreshToken
        } : null;
        if (tokens) {
          localStorage.setItem('authTokens', JSON.stringify(tokens));
        }
        navigate('/email-verified', {
          state: {
            user: response.user,
            tokens
          },
          replace: true
        });
      } else {
        // Fallback: show success and proceed to verified page
        setStatus('success');
        navigate('/email-verified', {
          state: { user: response?.user || null },
          replace: true
        });
      }
      
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
      
      const response = await apiService.resendVerificationEmail(email);
      
      if (response && response.success) {
        setStatus('success');
        setMessage(`A new verification code has been sent to ${email}.`);
        setVerificationCode(['', '', '', '', '', '']);
        inputRefs[0]?.focus();
        
        // Clear success message after 5 seconds
        setTimeout(() => {
          if (status === 'success') {
            setStatus('idle');
            setMessage('Enter the 6-digit verification code sent to ' + email);
          }
        }, 5000);
      } else {
        throw new Error(response?.message || 'Failed to resend verification code');
      }
    } catch (error) {
      console.error('Resend error:', error);
      setStatus('error');
      const errorMessage = error?.response?.data?.message || 
                         error?.details?.message || 
                         error?.message || 
                         'Failed to resend verification email. Please try again.';
      setMessage(errorMessage);
      
      // Clear error message after 5 seconds
      setTimeout(() => {
        if (status === 'error') {
          setStatus('idle');
          setMessage('Enter the 6-digit verification code sent to ' + email);
        }
      }, 5000);
    } finally {
      setIsResending(false);
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

          {status === 'success' && (
            <div className="text-center">
              <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-12 h-12 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Email Verified!</h2>
              <p className="text-gray-300 mb-8">Your email has been successfully verified. Setting up your account...</p>
              
              <div className="w-full bg-neon-blue/80 text-dark-bg font-medium py-3 px-4 rounded-lg flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-dark-bg" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Setting up your account...
              </div>
            </div>
          )}

          <div className="mt-8">
            <button
              type="button"
              onClick={handleVerifyCode}
              disabled={status === 'verifying' || status === 'sending'}
              className="w-full block text-center py-3 px-4 bg-neon-blue text-dark-bg font-medium rounded-lg hover:bg-neon-blue/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Verify Email
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailVerification;
