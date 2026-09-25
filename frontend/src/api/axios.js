import axios from 'axios';

// In production cross-origin deployments, set VITE_API_URL=https://your-backend.com/api
// For same-host or proxied deployments, leave unset — relative /api will be used.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// ─── Request Interceptor: Attach JWT ──────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response Interceptor: Handle Errors ─────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const { response } = error;

    // Token expired or invalid
    if (response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Redirect to login without full page reload loop
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    // Return a normalized error
    const message =
      response?.data?.message ||
      error.message ||
      'An unexpected error occurred';

    const normalizedError = new Error(message);
    normalizedError.status = response?.status;
    normalizedError.errors = response?.data?.errors;
    normalizedError.data = response?.data;

    return Promise.reject(normalizedError);
  }
);

export default api;
