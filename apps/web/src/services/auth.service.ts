import axios from 'axios';
import { ref } from 'vue';
import { getEnvironmentConfig } from '../utils/environment';

// Dynamic BASE_URL that updates based on current environment
const getBaseUrl = () => getEnvironmentConfig().apiUrl;

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterData {
  username: string;
  password: string;
  email: string;
  phone: string;
  fullName: string;
}

export interface AuthResponse {
  user: User;
  token?: string;
  refreshToken?: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: {
    id: number;
    name: string;
  };
  isActive: boolean;
  phone?: string;
  createdAt: string;
  avatarUrl?: string;
}

class AuthService {
  private user: User | null = null;
  private authState = ref<User | null>(null);
  private token: string | null = null;

  constructor() {
    // Load token from localStorage on initialization
    this.token = localStorage.getItem('access_token');
    if (this.token) {
      this.setAuthHeader(this.token);
    }

    // Add request interceptor to ensure token is always included
    axios.interceptors.request.use(
      (config) => {
        const token = this.token || localStorage.getItem('access_token');
        if (token && config.headers) {
          config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Add response interceptor to handle token expiration
    axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          console.log('🚨 Token expired or invalid, clearing auth data');
          this.clearAuthData();
          // Optionally redirect to login
          // window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  private setAuthHeader(token: string) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    console.log(
      '✅ Auth header set with token:',
      token.substring(0, 20) + '...'
    );
  }

  private clearAuthHeader() {
    delete axios.defaults.headers.common['Authorization'];
    console.log('🗑️ Auth header cleared');
  }

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      console.log('🔐 Attempting login with username:', credentials.username);
      console.log('🌐 API URL:', getBaseUrl());

      const response = await axios.post<AuthResponse>(
        `${getBaseUrl()}/auth/login`,
        credentials,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('📥 Login response:', response.data);
      if (response.data.refreshToken) {
        localStorage.setItem('refresh_token', response.data.refreshToken);
      }

      if (response.data && response.data.user) {
        this.user = response.data.user as User;
        this.authState.value = response.data.user as User;

        // Store token if provided in response
        if (response.data.token) {
          this.token = response.data.token;
          localStorage.setItem('access_token', this.token);
          this.setAuthHeader(this.token);

          console.log('✅ Token stored in localStorage');
          console.log('🔑 Token preview:', this.token.substring(0, 50) + '...');
        }

        console.log(
          '✅ User authenticated:',
          this.user.username,
          'Role:',
          this.user.role
        );
        return response.data;
      } else {
        throw new Error('Invalid response from server - no user data');
      }
    } catch (error: any) {
      console.error('❌ Login failed:', error);
      console.error('❌ Error response:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);

      this.clearAuthData();
      throw error;
    }
  }

  async register(data: RegisterData): Promise<any> {
    const response = await axios.post(`${getBaseUrl()}/auth/register`, data);
    return response.data;
  }

  async loginWithGoogle(idToken: string): Promise<AuthResponse> {
    console.log('🔍 AuthService - loginWithGoogle called');
    console.log('🔍 AuthService - Current API URL:', getBaseUrl());

    try {
      const response = await axios.post<AuthResponse>(
        `${getBaseUrl()}/auth/google`,
        { idToken },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('🔍 AuthService - Backend response:', response.data);

      if (!response.data || !response.data.user) {
        throw new Error('Invalid response from server - no user data');
      }

      this.user = response.data.user as User;
      this.authState.value = response.data.user as User;

      // Store token if provided in response
      if (response.data.token) {
        this.token = response.data.token;
        localStorage.setItem('access_token', this.token);
        this.setAuthHeader(this.token);
      }

      return response.data;
    } catch (error: any) {
      console.error('❌ AuthService - loginWithGoogle failed:', error);
      throw error;
    }
  }

  async refreshTokens(): Promise<AuthResponse> {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
      this.clearAuthData();
      throw new Error('No refresh token available');
    }
    try {
      const response = await axios.post(
        `${getBaseUrl()}/auth/refresh`,
        {},
        {
          headers: {
            Authorization: `Bearer ${refreshToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
      this.user = response.data.user as User;
      this.authState.value = response.data.user as User;

      if (response.data.token) {
        this.token = response.data.token;

        if (typeof this.token === "string") {
          localStorage.setItem('access_token', this.token);
        }
        if (this.token) {
          this.setAuthHeader(this.token);
        }
      }

      if (response.data.refreshToken) {
        localStorage.setItem('refresh_token', response.data.refreshToken);
      }

      return response.data;
    } catch (error) {
      this.clearAuthData();
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      await axios.post(`${getBaseUrl()}/auth/logout`, {});
    } catch (error) {
      console.error('Logout API call failed:', error);
    } finally {
      this.clearAuthData();
    }
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      // Ensure we have a token before making the request
      if (!this.token && !localStorage.getItem('access_token')) {
        console.log('🚫 No token available for getCurrentUser');
        return null;
      }

      const response = await axios.get<User>(`${getBaseUrl()}/auth/me`);

      const user = response.data;
      if (typeof user.role === 'number') {
        user.role = { id: user.role, name: '' };
      }

      this.user = user;
      this.authState.value = user;
      return this.user;
    } catch (error) {
      console.error('❌ getCurrentUser failed:', error);
      this.clearAuthData();
      return null;
    }
  }

  // Test token validity
  async testToken(): Promise<boolean> {
    try {
      const response = await axios.get(`${getBaseUrl()}/auth/test-token`);
      console.log('✅ Token test successful:', response.data);
      return true;
    } catch (error) {
      console.error('❌ Token test failed:', error);
      return false;
    }
  }

  isAuthenticated(): boolean {
    return !!(this.user && this.user.id && this.token);
  }

  isAdmin(): boolean {
    const id = this.user?.role?.id;
    return id == 1 || id == 2;
  }

  getUser(): User | null {
    return this.user;
  }

  getAuthState() {
    return this.authState;
  }

  getToken(): string | null {
    return this.token || localStorage.getItem('access_token');
  }

  clearAuthData(): void {
    this.user = null;
    this.authState.value = null;
    this.token = null;
    this.clearAuthHeader();
    localStorage.removeItem('access_token');

    console.log('🔍 AuthService - All auth data cleared');
  }
}

export const authService = new AuthService();
