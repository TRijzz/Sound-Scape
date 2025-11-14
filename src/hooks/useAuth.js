import { useState, useEffect, createContext, useContext } from 'react';
import apiService from '../services/api.js';

const AUTH_STORAGE_KEY = 'music_station_auth';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Load user from localStorage on mount
  useEffect(() => {
    const savedAuth = localStorage.getItem(AUTH_STORAGE_KEY);
    if (savedAuth) {
      try {
        const authData = JSON.parse(savedAuth);
        setUser(authData.user);
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Failed to load auth data from localStorage:', error);
        localStorage.removeItem(AUTH_STORAGE_KEY);
      }
    }
  }, []);

  const login = async (credentials) => {
    setIsLoading(true);
    try {
      // For now, simulate API call with mock data
      // Later, replace with actual API call: const response = await apiService.login(credentials);
      
      // Mock response - replace with real API call
      const mockUser = {
        id: '1',
        email: credentials.email,
        username: credentials.email.split('@')[0],
        createdAt: new Date().toISOString()
      };

      const authData = {
        user: mockUser,
        token: 'mock-jwt-token',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
      };

      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authData));
      setUser(mockUser);
      setIsAuthenticated(true);
      
      return { success: true, user: mockUser };
    } catch (error) {
      console.error('Login failed:', error);
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (userData) => {
    setIsLoading(true);
    try {
      // For now, simulate API call with mock data
      // Later, replace with actual API call: const response = await apiService.signup(userData);
      
      // Mock response - replace with real API call
      const mockUser = {
        id: Date.now().toString(),
        email: userData.email,
        username: userData.username,
        createdAt: new Date().toISOString()
      };

      const authData = {
        user: mockUser,
        token: 'mock-jwt-token',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
      };

      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authData));
      setUser(mockUser);
      setIsAuthenticated(true);
      
      return { success: true, user: mockUser };
    } catch (error) {
      console.error('Signup failed:', error);
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    setUser(null);
    setIsAuthenticated(false);
  };

  const updateUser = (updates) => {
    setUser(prev => ({ ...prev, ...updates }));
    const authData = JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY) || '{}');
    if (authData.user) {
      authData.user = { ...authData.user, ...updates };
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authData));
    }
  };

  const value = {
    user,
    isAuthenticated,
    isLoading,
    login,
    signup,
    logout,
    updateUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook for authentication actions
export const useAuthActions = () => {
  const { login, signup, logout, isLoading } = useAuth();

  const handleLogin = async (credentials) => {
    const result = await login(credentials);
    return result;
  };

  const handleSignup = async (userData) => {
    const result = await signup(userData);
    return result;
  };

  const handleLogout = () => {
    logout();
  };

  return {
    handleLogin,
    handleSignup,
    handleLogout,
    isLoading
  };
};
