import axios from 'axios';
import { authService } from './services/auth.service';
import router from './router';

export interface CrudItem {
  id?: number | string;
  name: string;
}

const BASE_URL = 'http://localhost:3000/api';

const axiosInstance = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

// Response interceptor for 401 errors
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Refresh token if 401 and request hasn't been retried
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        await authService.refreshTokens();
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        await authService.logout();
        router.push('/login');
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Exported API methods
export const api = {
  async getAll(type: 'test' | 'mongo'): Promise<CrudItem[]> {
    const res = await axiosInstance.get<CrudItem[]>(`/${type}`);
    return res.data;
  },

  async create(type: 'test' | 'mongo', data: CrudItem): Promise<CrudItem> {
    const res = await axiosInstance.post<CrudItem>(`/${type}`, data);
    return res.data;
  },

  async update(type: 'test' | 'mongo', id: string | number, data: CrudItem): Promise<CrudItem> {
    const res = await axiosInstance.put<CrudItem>(`/${type}/${id}`, data);
    return res.data;
  },

  async remove(type: 'test' | 'mongo', id: string | number): Promise<void> {
    await axiosInstance.delete(`/${type}/${id}`);
  },
};

export default axiosInstance;
