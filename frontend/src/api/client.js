import axios from 'axios';

const STORAGE_TOKEN = 'sa_token';
const STORAGE_USER = 'sa_usuario';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const api = axios.create({ baseURL });

// Interceptor de request: agrega el token JWT en cada peticion protegida.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(STORAGE_TOKEN);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor de response: ante un 401 limpia la sesion y redirige al login.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(STORAGE_TOKEN);
      localStorage.removeItem(STORAGE_USER);
      if (window.location.pathname !== '/login') {
        window.location.assign('/login');
      }
    }
    return Promise.reject(error);
  }
);

export { STORAGE_TOKEN, STORAGE_USER };
export default api;
