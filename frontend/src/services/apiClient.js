import axios from 'axios';

const apiClient = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL || ''}/api`,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('studyarena_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const url = String(error.config?.url || '');
      const isPortalEndpoint = url.includes('/portal/') || url.includes('/portal');
      if (!isPortalEndpoint) {
        localStorage.removeItem('studyarena_token');
        localStorage.removeItem('studyarena_cached_user');
        window.dispatchEvent(new Event('unauthorized'));
      }
    }
    return Promise.reject(error);
  },
);

export default apiClient;