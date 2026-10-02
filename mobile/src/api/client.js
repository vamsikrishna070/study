import axios from 'axios';
import { Platform } from 'react-native';
import { getToken, removeToken } from '../storage/token';
import { removeCachedUser } from '../storage/user';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://study-o20l.onrender.com/api';

const defaultDeviceName = Platform.OS === 'ios' ? 'StudyArena on iOS' : 'StudyArena on Android';

const client = axios.create({
  baseURL: API_URL,
  timeout: 45000,
  headers: {
    'Content-Type': 'application/json',
    'x-platform': Platform.OS,
    'x-device-name': defaultDeviceName,
    'x-client-type': 'mobile',
  },
});

client.defaults.headers.common['x-platform'] = Platform.OS;
client.defaults.headers.common['x-device-name'] = defaultDeviceName;
client.defaults.headers.common['x-client-type'] = 'mobile';

client.interceptors.request.use(
  async (config) => {
    config.metadata = { startTime: Date.now() };

    if (config.headers) {
      if (typeof config.headers.set === 'function') {
        config.headers.set('x-platform', Platform.OS);
        config.headers.set('x-device-name', defaultDeviceName);
        config.headers.set('x-client-type', 'mobile');
      } else {
        config.headers['x-platform'] = Platform.OS;
        config.headers['x-device-name'] = defaultDeviceName;
        config.headers['x-client-type'] = 'mobile';
      }
    }

    const token = await getToken();
    if (token) {
      if (config.headers && typeof config.headers.set === 'function') {
        config.headers.set('Authorization', `Bearer ${token}`);
      } else {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

client.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    if (error.response && error.response.status === 401) {
      const url = String(error.config?.url || '');
      const isPortalEndpoint = url.includes('/portal/') || url.includes('/portal');
      if (!isPortalEndpoint) {
        await removeToken();
        await removeCachedUser();
      }
    }
    return Promise.reject(error);
  }
);

export default client;
