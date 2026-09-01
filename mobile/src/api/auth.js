import client from './client';
import { setToken, removeToken } from '../storage/token';

export const loginUser = async (email, password) => {
  const response = await client.post('/auth/login', { email, password });
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
  const response = await client.post('/auth/verify-email', { email, otp });
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
  const payload = response.data.data;
  if (payload && payload.token) {
    await setToken(payload.token);
  }
  return payload;
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
