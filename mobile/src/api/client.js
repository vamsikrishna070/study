import axios from 'axios';
import { getToken, removeToken } from '../storage/token';

// Use environment variable, fallback to localhost for standard emulator if missing
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:5000/api';

console.log('=============================================');
console.log('[API CONFIG] API BASE URL:', API_URL);
console.log('=============================================');

const client = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT token
client.interceptors.request.use(
  async (config) => {
    const token = await getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Development Logging
    if (__DEV__) {
      console.log(`\n[API REQUEST]`);
      console.log(`METHOD: ${config.method?.toUpperCase()}`);
      console.log(`URL: ${config.baseURL}${config.url}`);
      console.log(`HAS_AUTH: ${!!token}`);
      console.log(`CONTENT_TYPE: ${config.headers['Content-Type'] || 'application/json'}`);
    }
    
    return config;
  },
  (error) => {
    if (__DEV__) {
      console.error('[API REQUEST ERROR]', error);
    }
    return Promise.reject(error);
  }
);

// Response interceptor to handle token expiry or global errors
client.interceptors.response.use(
  (response) => {
    if (__DEV__) {
      console.log(`\n[API RESPONSE]`);
      console.log(`STATUS: ${response.status}`);
      console.log(`URL: ${response.config.baseURL}${response.config.url}`);
    }
    return response;
  },
  async (error) => {
    if (__DEV__) {
      console.log(`\n[API ERROR]`);
      console.log(`STATUS: ${error.response?.status || 'NETWORK ERROR'}`);
      console.log(`URL: ${error.config?.baseURL}${error.config?.url}`);
      console.log(`MESSAGE: ${error.message}`);
      console.log(`BACKEND_RESPONSE:`, error.response?.data);
    }
    
    // We can handle 401 Unauthorized here (e.g., dispatch a logout action)
    if (error.response && error.response.status === 401) {
      console.log('[API] Unauthorized error (401). Token might be expired.');
      await removeToken();
      // Optional: global event emitter to trigger logout navigation
    }
    return Promise.reject(error);
  }
);

export default client;
