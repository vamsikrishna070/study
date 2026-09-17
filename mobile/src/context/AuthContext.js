import React, { createContext, useState, useEffect } from 'react';
import { getToken, removeToken } from '../storage/token';
import { getCachedUser, setCachedUser, removeCachedUser } from '../storage/user';
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
        await setCachedUser(res.user);
      }
    } catch (e) {
      console.warn('[Mobile AuthContext] recordActivity error:', e?.message || e);
    }
  };

  const refreshUser = async () => {
    try {
      const token = await getToken();
      if (token && token !== 'null' && token !== 'undefined') {
        const userData = await getCurrentUser();
        const freshUser = userData.user || userData;
        if (freshUser) {
          setUser(freshUser);
          await setCachedUser(freshUser);
          syncDailyActivity();
        }
      }
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.warn('[Mobile AuthContext] refreshUser 401 Unauthorized: token expired.');
        await removeToken();
        await removeCachedUser();
        setUser(null);
      } else {
        console.warn('[Mobile AuthContext] refreshUser network error (retaining session):', error?.message || error);
      }
    }
  };

  useEffect(() => {
    let isMounted = true;

    const loadUser = async () => {
      try {
        const [token, cachedUser] = await Promise.all([
          getToken(),
          getCachedUser(),
        ]);

        const hasValidToken = Boolean(token && token !== 'null' && token !== 'undefined');

        if (hasValidToken) {
          if (cachedUser) {

            if (isMounted) {
              setUser(cachedUser);
              setLoading(false);
            }
          }


          try {
            const userData = await getCurrentUser();
            const freshUser = userData.user || userData;
            if (isMounted && freshUser) {
              setUser(freshUser);
              await setCachedUser(freshUser);
              syncDailyActivity();
            }
          } catch (netError) {
            if (netError.response && netError.response.status === 401) {

              console.warn('[Mobile AuthContext] Token expired or invalid on server (401). Clearing session.');
              await removeToken();
              await removeCachedUser();
              if (isMounted) setUser(null);
            } else {


              console.warn('[Mobile AuthContext] Network unavailable or slow during startup; keeping authenticated session.');
            }
          }
        } else {
          if (isMounted) {
            setUser(null);
          }
        }
      } catch (e) {
        console.error('[Mobile AuthContext] Error in loadUser initialization:', e);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadUser();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (email, password) => {
    try {
      const data = await loginUser(email, password);
      setIsNewRegistration(false);
      const authenticatedUser = data.user || data;
      setUser(authenticatedUser);
      await setCachedUser(authenticatedUser);
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
      const authenticatedUser = data.user || data;
      setUser(authenticatedUser);
      await setCachedUser(authenticatedUser);
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
      await removeToken();
      await removeCachedUser();
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
