import axios from 'axios';
import { authService } from './services/auth.service';
import router from './router';

export interface CrudItem {
  id?: number | string;
  name: string;
}

const BASE_URL = 'http://localhost:3000/api';

// Create axios instance
const axiosInstance = axios.create({
  baseURL: BASE_URL,
});

// Add request interceptor
axiosInstance.interceptors.request.use(
  (config) => {
    const token = authService.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      authService.logout();
      router.push('/login');
    }
    return Promise.reject(error);
  }
);

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
