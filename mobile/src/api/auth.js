import { Platform } from 'react-native';
import client from './client';
import { setToken, removeToken } from '../storage/token';

const getClientPlatformMeta = () => ({
  platform: Platform.OS,
  deviceName: Platform.OS === 'ios' ? 'StudyArena on iOS' : 'StudyArena on Android',
});

export const loginUser = async (email, password) => {
  const meta = getClientPlatformMeta();
  const response = await client.post('/auth/login', {
    email,
    password,
    platform: meta.platform,
    deviceName: meta.deviceName,
  });
  const payload = response.data.data;
  if (payload && payload.token) {
    await setToken(payload.token);
  }
  return payload;
};

export const registerUser = async (name, email, password) => {
  const response = await client.post('/auth/register', { name, email, password });
  return response.data;
};

export const verifyEmail = async (email, otp) => {
  const meta = getClientPlatformMeta();
  const response = await client.post('/auth/verify-email', {
    email,
    otp,
    platform: meta.platform,
    deviceName: meta.deviceName,
  });
  const payload = response.data.data;
  if (payload && payload.token) {
    await setToken(payload.token);
  }
  return payload;
};

export const resendOtp = async (email, purpose = 'registration') => {
  const response = await client.post('/auth/resend-otp', { email, purpose });
  return response.data;
};

export const forgotPassword = async (email) => {
  const response = await client.post('/auth/forgot-password', { email });
  return response.data;
};

export const resetPassword = async (email, otp, newPassword) => {
  const response = await client.post('/auth/reset-password', { email, otp, newPassword });
  return response.data;
};

export const changePassword = async (currentPassword, newPassword) => {
  const response = await client.post('/auth/change-password', { currentPassword, newPassword });
  await removeToken();
  return response.data;
};

export const logoutUser = async () => {
  try {
    await client.post('/auth/logout');
  } catch (err) {
    console.error('Logout error on server', err);
  } finally {
    await removeToken();
  }
};

export const getCurrentUser = async () => {
  const response = await client.get('/auth/me');
  return response.data.data || response.data;
};

export const updateProfile = async (profileData) => {
  const response = await client.patch('/auth/profile', profileData);
  return response.data.data || response.data;
};

export const recordActivity = async (date) => {
  const response = await client.post('/auth/activity', { date });
  return response.data.data || response.data;
};

export const getActiveSessions = async () => {
  const response = await client.get('/auth/sessions', {
    params: { _t: Date.now() },
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    },
  });
  return response.data.data || [];
};

export const revokeSession = async (sessionId) => {
  const response = await client.delete(`/auth/sessions/${sessionId}`);
  return response.data;
};

export const revokeOtherSessions = async () => {
  const response = await client.post('/auth/sessions/revoke-others');
  return response.data;
};

export const revokeAllSessions = async () => {
  try {
    await client.post('/auth/sessions/revoke-all');
  } catch (err) {
    console.error('Revoke all sessions error on server', err);
  } finally {
    await removeToken();
  }
};
