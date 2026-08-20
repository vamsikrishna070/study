import React, { createContext, useState, useEffect } from 'react';
import { getToken, removeToken } from '../storage/token';
import { loginUser, registerUser, logoutUser, getCurrentUser } from '../api/auth';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const token = await getToken();
        // Ensure token is actually a string and not "null", "undefined", or empty
        if (token && token !== 'null' && token !== 'undefined') {
          try {
            const userData = await getCurrentUser();
            setUser(userData.user || userData);
          } catch (error) {
            console.log('Error loading user (AuthContext). Token might be invalid.', error?.message || error);
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
      // Registration successful, but email not verified. Don't set user.
      return data;
    } catch (error) {
      console.error('Register error:', error?.message || error);
      throw error;
    }
  };

  const verify = async (email, otp) => {
    try {
      const { verifyEmail } = require('../api/auth');
      const data = await verifyEmail(email, otp);
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
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, verify, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};
