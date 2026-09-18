import axios from 'axios';
import { getToken, removeToken } from '../storage/token';
import { removeCachedUser } from '../storage/user';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://study-o20l.onrender.com/api';

const client = axios.create({
  baseURL: API_URL,
  timeout: 45000,
  headers: {
    'Content-Type': 'application/json',
  },
});

client.interceptors.request.use(
  async (config) => {
    config.metadata = { startTime: Date.now() };

    const token = await getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
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
