import { createContext, useContext, useState, useEffect } from 'react';
import apiClient from '../services/apiClient.js';
import { getUserFriendlyError } from '../utils/errorUtils.js';

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
      }
      return { success: false, message: data.message || 'Unable to log in. Please check your details and try again.' };
    } catch (error) {
      if (error.response?.data?.unverified) {
        return { success: false, message: error.response.data.message, unverified: true };
      }
      return { success: false, message: getUserFriendlyError(error, 'auth_login') };
    }
  };

  const register = async (userData) => {
    try {
      const { data } = await apiClient.post('/auth/register', userData);
      if (data.success) {
        return { success: true, message: data.message };
      }
      return { success: false, message: data.message || 'We couldn\'t create your account. Please try again.' };
    } catch (error) {
      return { success: false, message: getUserFriendlyError(error, 'auth_register') };
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
      return { success: false, message: data.message || 'Verification failed. Please try again.' };
    } catch (error) {
      return { success: false, message: getUserFriendlyError(error, 'auth_otp') };
    }
  };

  const resendOtp = async (email, purpose = 'registration') => {
    try {
      const { data } = await apiClient.post('/auth/resend-otp', { email, purpose });
      return { success: true, message: data.message };
    } catch (error) {
      return { success: false, message: getUserFriendlyError(error, 'auth_otp') };
    }
  };

  const forgotPassword = async (email) => {
    try {
      const { data } = await apiClient.post('/auth/forgot-password', { email });
      if (data.success) {
        return { success: true, message: data.message };
      }
      return { success: false, message: data.message || 'Unable to request password reset. Please try again.' };
    } catch (error) {
      return { success: false, message: getUserFriendlyError(error, 'auth_login') };
    }
  };

  const resetPassword = async (email, otp, newPassword) => {
    try {
      const { data } = await apiClient.post('/auth/reset-password', { email, otp, newPassword });
      if (data.success) {
        localStorage.setItem('studyarena_token', data.data.token);
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${data.data.token}`;
        setUser(data.data.user);
        setIsAuthenticated(true);
        return { success: true };
      }
      return { success: false, message: data.message || 'Failed to reset password. Please try again.' };
    } catch (error) {
      return { success: false, message: getUserFriendlyError(error, 'auth_otp') };
    }
  };

  const logout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch (e) {
      console.error('[AuthContext] Logout request error:', e);
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
      return { success: false, message: data.message || 'We couldn\'t save your profile. Please try again.' };
    } catch (error) {
      return { success: false, message: getUserFriendlyError(error, 'profile_update') };
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, isAuthenticated, isLoading, 
      login, register, verifyEmail, resendOtp, forgotPassword, resetPassword, 
      logout, updateProfile, refreshUser: checkAuth 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
