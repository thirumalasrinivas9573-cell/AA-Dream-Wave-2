import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('dw_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshing: Promise<string | null> | null = null;

async function refreshAccessToken() {
  try {
    // Refresh token is httpOnly cookie only — never read from localStorage
    const { data } = await axios.post(
      `${import.meta.env.VITE_API_URL || '/api'}/auth/refresh`,
      {},
      { withCredentials: true }
    );
    if (data.token) {
      localStorage.setItem('dw_token', data.token);
      localStorage.removeItem('dw_refresh');
      return data.token as string;
    }
  } catch {
    localStorage.removeItem('dw_token');
    localStorage.removeItem('dw_refresh');
  }
  return null;
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && original && !original._retry) {
      const url = String(original.url || '');
      if (url.includes('/auth/refresh') || url.includes('/auth/login') || url.includes('/auth/signup')) {
        return Promise.reject(error);
      }
      original._retry = true;
      refreshing = refreshing || refreshAccessToken();
      const token = await refreshing;
      refreshing = null;
      if (token) {
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      }
      const path = window.location.pathname;
      const publicPaths = ['/', '/login', '/signup', '/forgot-password', '/contact'];
      if (
        !publicPaths.includes(path) &&
        !path.startsWith('/reset-password') &&
        !path.startsWith('/verify-email')
      ) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
