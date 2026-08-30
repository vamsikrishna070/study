import React, { createContext, useState, useEffect } from 'react';
import { getToken, removeToken } from '../storage/token';
import { loginUser, registerUser, verifyEmail, logoutUser, getCurrentUser, recordActivity } from '../api/auth';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isNewRegistration, setIsNewRegistration] = useState(false);

  const getLocalDateString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const syncDailyActivity = async () => {
    try {
      const todayStr = getLocalDateString();
      const res = await recordActivity(todayStr);
      if (res && res.user) {
        setUser(res.user);
      }
    } catch (e) {
      console.error('[Mobile AuthContext] recordActivity error:', e);
    }
  };

  const refreshUser = async () => {
    try {
      const token = await getToken();
      if (token && token !== 'null' && token !== 'undefined') {
        const userData = await getCurrentUser();
        setUser(userData.user || userData);
        syncDailyActivity();
      }
    } catch (error) {
      console.error('Error in refreshUser:', error);
    }
  };

  useEffect(() => {
    const loadUser = async () => {
      try {
        const token = await getToken();
        if (token && token !== 'null' && token !== 'undefined') {
          try {
            const userData = await getCurrentUser();
            setUser(userData.user || userData);
            syncDailyActivity();
          } catch (error) {
            console.error('Error loading user (AuthContext). Token might be invalid.', error?.message || error);
            await removeToken();
            setUser(null);
          }
        } else {
          setUser(null);
        }
      } catch (e) {
        console.error('Error in loadUser initialization:', e);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, []);

  const login = async (email, password) => {
    try {
      const data = await loginUser(email, password);
      setIsNewRegistration(false);
      setUser(data.user || data);
      return data;
    } catch (error) {
      console.error('Login error:', error?.message || error);
      throw error;
    }
  };

  const register = async (name, email, password) => {
    try {
      const data = await registerUser(name, email, password);
      return data;
    } catch (error) {
      console.error('Register error:', error?.message || error);
      throw error;
    }
  };

  const verify = async (email, otp) => {
    try {
      const data = await verifyEmail(email, otp);
      setIsNewRegistration(true);
      setUser(data.user || data);
      return data;
    } catch (error) {
      console.error('Verify error:', error?.message || error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await logoutUser();
    } catch (error) {
      console.error('Logout error:', error?.message || error);
    } finally {
      setIsNewRegistration(false);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      isNewRegistration,
      setIsNewRegistration,
      login, 
      register, 
      verify, 
      logout, 
      setUser,
      refreshUser
    }}>
      {children}
    </AuthContext.Provider>
  );
};
