import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 45000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('pension_seva_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token if invalid or expired
      sessionStorage.removeItem('pension_seva_token');
      sessionStorage.removeItem('pension_seva_user');
      const requestUrl = error.config?.url || '';
      if (!requestUrl.startsWith('/auth/')) {
        window.dispatchEvent(new CustomEvent('pension:session-expired', {
          detail: error.response.data?.detail || 'Your sign-in session has expired. Please sign in again.'
        }));
      }
    }
    return Promise.reject(error);
  }
);

export default api;
