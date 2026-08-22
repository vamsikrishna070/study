import axios from 'axios';
import { getToken, removeToken } from '../storage/token';

// Use environment variable, fallback to production Render API URL for physical devices and standalone builds
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://study-o20l.onrender.com/api';

console.log('=============================================');
console.log('[API CONFIG] API BASE URL:', API_URL);
console.log('=============================================');

const client = axios.create({
  baseURL: API_URL,
  timeout: 45000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT token and log diagnostics
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
    
    // Development Diagnostics Logging
    if (__DEV__) {
      console.log(`\n[API REQUEST START]`);
      console.log(`METHOD: ${config.method?.toUpperCase()}`);
      console.log(`URL: ${config.baseURL}${config.url}`);
      console.log(`TIMEOUT: ${config.timeout || 45000}ms`);
      console.log(`HAS_AUTH: ${!!token}`);
      console.log(`CONTENT_TYPE: ${config.headers['Content-Type'] || 'multipart/form-data (auto)'}`);
    }
    
    return config;
  },
  (error) => {
    if (__DEV__) {
      console.error('[API REQUEST ERROR]', error?.message || error);
    }
    return Promise.reject(error);
  }
);

// Response interceptor to handle diagnostics and token expiry
client.interceptors.response.use(
  (response) => {
    if (__DEV__) {
      const duration = response.config?.metadata?.startTime 
        ? `${Date.now() - response.config.metadata.startTime}ms`
        : 'unknown';
      console.log(`\n[API RESPONSE SUCCESS]`);
      console.log(`STATUS: ${response.status}`);
      console.log(`URL: ${response.config?.baseURL}${response.config?.url}`);
      console.log(`RESPONSE TIME: ${duration}`);
    }
    return response;
  },
  async (error) => {
    if (__DEV__) {
      const duration = error.config?.metadata?.startTime 
        ? `${Date.now() - error.config.metadata.startTime}ms`
        : 'unknown';
      console.log(`\n[API ERROR DIAGNOSTICS]`);
      console.log(`ERROR MESSAGE: ${error.message}`);
      console.log(`ERROR CODE: ${error.code || 'UNKNOWN'}`);
      console.log(`BASE URL: ${error.config?.baseURL || API_URL}`);
      console.log(`ENDPOINT: ${error.config?.url || 'unknown'}`);
      console.log(`TIMEOUT CONFIGURED: ${error.config?.timeout || 45000}ms`);
      console.log(`ELAPSED DURATION: ${duration}`);
      console.log(`STATUS: ${error.response?.status || 'NO HTTP RESPONSE (NETWORK ERROR / TIMEOUT)'}`);
      if (error.response?.data) {
        console.log(`BACKEND RESPONSE:`, error.response.data);
      }
    }
    
    // We can handle 401 Unauthorized here (e.g., dispatch a logout action)
    if (error.response && error.response.status === 401) {
      console.log('[API] Unauthorized error (401). Token might be expired.');
      await removeToken();
    }
    return Promise.reject(error);
  }
);

export default client;
