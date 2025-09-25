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

    // Surface 403 messages from backend to the UI without redirecting
    if (error.response?.status === 403) {
      const backendMessage = error.response?.data?.message || error.response?.data?.error || 'Forbidden';
      // Show a lightweight toast immediately (works even without component-level handling)
      try {
        if (typeof document !== 'undefined') {
          const el = document.createElement('div');
          el.textContent = backendMessage;
          el.setAttribute('role', 'alert');
          el.style.position = 'fixed';
          el.style.top = '20px';
          el.style.right = '20px';
          el.style.zIndex = '99999';
          el.style.background = '#e53e3e';
          el.style.color = '#fff';
          el.style.padding = '12px 16px';
          el.style.borderRadius = '8px';
          el.style.boxShadow = '0 2px 12px rgba(0,0,0,0.2)';
          el.style.fontWeight = '600';
          el.style.fontFamily = 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial';
          el.style.opacity = '0';
          el.style.transition = 'opacity .2s ease, transform .2s ease';
          el.style.transform = 'translateY(-10px)';
          document.body.appendChild(el);
          requestAnimationFrame(() => {
            el.style.opacity = '1';
            el.style.transform = 'translateY(0)';
          });
          setTimeout(() => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(-10px)';
            setTimeout(() => {
              if (el.parentNode) el.parentNode.removeChild(el);
            }, 250);
          }, 2500);
        }
      } catch {
        // Do nothing
      }
      if (backendMessage) {
        error.message = backendMessage;
      }
      return Promise.reject(error);
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
