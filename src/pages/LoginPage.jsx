import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useMusic } from '../contexts/MusicContext';
import apiService from '../services/api.js';

const LoginPage = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useMusic();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }
    
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = validateForm();
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Call real backend login
      const response = await apiService.login({
        email: formData.email,
        password: formData.password
      });

      // Check if email is verified
      const isVerified = (response.user && (response.user.emailVerified ?? response.user.isVerified ?? false)) || false;
      if (response.user && !isVerified) {
        // Store tokens temporarily
        if (response.accessToken || response.refreshToken) {
          localStorage.setItem(
            'authTokens',
            JSON.stringify({
              accessToken: response.accessToken,
              refreshToken: response.refreshToken
            })
          );
        }
        
        // Only redirect to verification page if not coming from a successful verification
        const fromVerification = location.state?.fromVerification;
        if (!fromVerification) {
          return navigate('/verify-email', { 
            state: { 
              email: formData.email,
              message: 'Please verify your email before logging in.',
              status: 'verifying'
            } 
          });
        }
        // If coming from verification, continue with login
      }

      // If email is verified, proceed with login
      if (response.accessToken || response.refreshToken) {
        localStorage.setItem(
          'authTokens',
          JSON.stringify({
            accessToken: response.accessToken,
            refreshToken: response.refreshToken
          })
        );
      }

      // Update app auth state
      login(response.user);
      const target = location.state?.from || '/';
      navigate(target);
    } catch (error) {
      console.error('Login error:', error);
      
      // Handle different error cases
      const errorMessage = error?.details?.message || error?.message;
      const statusCode = error?.status;
      
      if (statusCode === 403) {
        // Email not verified
        navigate('/verify-email', { 
          state: { 
            email: formData.email,
            message: 'Please verify your email before logging in.',
            status: 'verifying'
          },
          replace: true
        });
      } else if (statusCode === 401) {
        // Invalid credentials
        setErrors({ general: 'Invalid email or password.' });
      } else if (statusCode === 0 || !navigator.onLine) {
        // Network error
        setErrors({ general: 'Network error. Please check your connection.' });
      } else {
        // Other errors
        setErrors({ 
          general: errorMessage || 'An error occurred during login. Please try again.' 
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center p-4">
      <motion.div
        className="w-full max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-neon-blue font-poppins mb-2">
            Sound Scape
          </h1>
          <p className="text-gray-400">Welcome back</p>
        </div>

        {/* Login Form */}
        <motion.div
          className="bg-light-gray/50 backdrop-blur-md rounded-2xl p-8 border border-gray-700"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* General Error */}
            {errors.general && (
              <motion.div
                className="bg-red-500/20 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {errors.general}
              </motion.div>
            )}

            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                Email or Username
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`w-full px-4 py-3 bg-dark-gray border rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 transition-all duration-200 ${
                  errors.email 
                    ? 'border-red-500 focus:ring-red-500' 
                    : 'border-gray-600 focus:ring-neon-blue focus:border-neon-blue'
                }`}
                placeholder="Enter your email or username"
              />
              {errors.email && (
                <motion.p
                  className="text-red-400 text-sm mt-1"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  {errors.email}
                </motion.p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className={`w-full px-4 py-3 bg-dark-gray border rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 transition-all duration-200 ${
                  errors.password 
                    ? 'border-red-500 focus:ring-red-500' 
                    : 'border-gray-600 focus:ring-neon-blue focus:border-neon-blue'
                }`}
                placeholder="Enter your password"
              />
              {errors.password && (
                <motion.p
                  className="text-red-400 text-sm mt-1"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  {errors.password}
                </motion.p>
              )}
            </div>

            {/* Forgot Password */}
            <div className="text-right">
              <Link
                to="/forgot-password"
                className="text-sm text-neon-blue hover:text-neon-blue/80 transition-colors"
              >
                Forgot Password?
              </Link>
            </div>

            {/* Submit Button */}
            <motion.button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-neon-blue text-dark-bg rounded-xl font-medium hover:bg-neon-blue/80 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 hover:shadow-lg hover:shadow-neon-blue/25"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {isLoading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-dark-bg border-t-transparent rounded-full animate-spin" />
                  <span>Signing in...</span>
                </div>
              ) : (
                'Sign In'
              )}
            </motion.button>
          </form>

          {/* Sign Up Link */}
          <div className="mt-6 text-center">
            <p className="text-gray-400 text-sm">
              Don't have an account?{' '}
              <Link
                to="/signup"
                className="text-neon-blue hover:text-neon-blue/80 transition-colors font-medium"
              >
                Sign up
              </Link>
            </p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default LoginPage;
