import axios from 'axios';
import { authService } from './services/auth.service';
import { getEnvironmentConfig } from './utils/environment';
import router from './router';

export interface CrudItem {
  id?: number | string;
  name: string;
}

// Dynamic baseURL that updates based on current environment
const axiosInstance = axios.create({
  baseURL: getEnvironmentConfig().apiUrl,
  withCredentials: true,
});

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as typeof error.config & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        await authService.refreshTokens(); // this must send credentials
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

export default axiosInstance;
