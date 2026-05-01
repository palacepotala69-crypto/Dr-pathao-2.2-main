import axios from 'axios';

const api = axios.create({
  baseURL: process.env.VITE_API_URL || 'https://api.drpathao.com/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor for JWT
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
