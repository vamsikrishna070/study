import { createContext, useContext, useState, useEffect } from 'react';
import apiClient from '../services/apiClient.js';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
    const handleUnauthorized = () => {
      setUser(null);
      setIsAuthenticated(false);
    };
    window.addEventListener('unauthorized', handleUnauthorized);
    return () => window.removeEventListener('unauthorized', handleUnauthorized);
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('studyarena_token');
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      const { data } = await apiClient.get('/auth/me');
      if (data.success) {
        setUser(data.data);
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('studyarena_token');
      delete apiClient.defaults.headers.common['Authorization'];
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const { data } = await apiClient.post('/auth/login', { email, password });
      if (data.success) {
        localStorage.setItem('studyarena_token', data.data.token);
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${data.data.token}`;
        setUser(data.data.user);
        setIsAuthenticated(true);
        return { success: true };
      } else {
        return { success: false, unverified: data.unverified, message: data.message || 'Login failed' };
      }
    } catch (error) {
      if (error.response?.data?.unverified) {
        return { success: false, unverified: true, message: error.response.data.message };
      }
      return { success: false, message: error.response?.data?.message || 'Login failed' };
    }
  };

  const register = async (userData) => {
    try {
      const { data } = await apiClient.post('/auth/register', userData);
      if (data.success) {
        // Registration now sends an OTP, no longer logging the user in immediately
        return { success: true, message: data.message };
      }
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Registration failed' };
    }
  };

  const verifyEmail = async (email, otp) => {
    try {
      const { data } = await apiClient.post('/auth/verify-email', { email, otp });
      if (data.success) {
        localStorage.setItem('studyarena_token', data.data.token);
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${data.data.token}`;
        setUser(data.data.user);
        setIsAuthenticated(true);
        return { success: true };
      }
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Verification failed' };
    }
  };

  const resendOtp = async (email, purpose = 'registration') => {
    try {
      const { data } = await apiClient.post('/auth/resend-otp', { email, purpose });
      return { success: true, message: data.message };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Failed to resend OTP' };
    }
  };

  const forgotPassword = async (email) => {
    try {
      const { data } = await apiClient.post('/auth/forgot-password', { email });
      if (data.success) {
        return { success: true, message: data.message };
      }
    } catch (error) {
      if (error.response) {
        return { success: false, message: error.response.data?.message || 'Failed to send reset email' };
      }
      return { success: false, message: 'Unable to connect to StudyArena. Please check your internet connection.' };
    }
  };

  const resetPassword = async (email, otp, newPassword) => {
    try {
      const { data } = await apiClient.post('/auth/reset-password', { email, otp, newPassword });
      if (data.success) {
        // Reset password logs user in
        localStorage.setItem('studyarena_token', data.data.token);
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${data.data.token}`;
        setUser(data.data.user);
        setIsAuthenticated(true);
        return { success: true };
      }
    } catch (error) {
      if (error.response) {
        return { success: false, message: error.response.data?.message || 'Failed to reset password' };
      }
      return { success: false, message: 'Unable to connect to StudyArena. Please check your internet connection.' };
    }
  };

  const logout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch (e) {
      // ignore
    }
    localStorage.removeItem('studyarena_token');
    delete apiClient.defaults.headers.common['Authorization'];
    setUser(null);
    setIsAuthenticated(false);
  };

  const updateProfile = async (profileData) => {
    try {
      const { data } = await apiClient.patch('/auth/profile', profileData);
      if (data.success) {
        setUser(data.data);
        return { success: true };
      }
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Update failed' };
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, isAuthenticated, isLoading, 
      login, register, verifyEmail, resendOtp, forgotPassword, resetPassword, 
      logout, updateProfile 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
