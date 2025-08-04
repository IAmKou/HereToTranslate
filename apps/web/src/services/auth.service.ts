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
  token?: string; // Add token to the response interface
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
  private token: string | null = null; // Add token storage

  constructor() {
    // Configure axios to send cookies with requests
    axios.defaults.withCredentials = true;
    
    // Load token from localStorage on initialization
    this.token = localStorage.getItem('access_token');
    if (this.token) {
      this.setAuthHeader(this.token);
    }
  }

  // Add method to set Authorization header
  private setAuthHeader(token: string) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  // Add method to clear Authorization header
  private clearAuthHeader() {
    delete axios.defaults.headers.common['Authorization'];
  }

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await axios.post<AuthResponse>(`${getBaseUrl()}/auth/login`, credentials);

      // Only set user if login was successful
      if (response.data && response.data.user) {
        this.user = response.data.user as User;
        this.authState.value = response.data.user as User;
        
        // Store token if provided in response
        if (response.data.token) {
          this.token = response.data.token;
          localStorage.setItem('access_token', this.token);
          this.setAuthHeader(this.token);
          console.log('✅ AuthService - Token stored and header set');
        }
        
        console.log('✅ AuthService - User set after successful login:', this.user);
      } else {
        console.error('❌ AuthService - No user data in response');
        throw new Error('Invalid response from server - no user data');
      }

      return response.data;
    } catch (error: any) {
      console.error('❌ AuthService - login failed:', error);
      console.error('❌ AuthService - Error response:', error.response?.data);
      console.error('❌ AuthService - Error status:', error.response?.status);

      // Clear user data on login failure to ensure clean state
      this.user = null;
      this.authState.value = null;
      this.token = null;
      this.clearAuthHeader();
      localStorage.removeItem('access_token');
      console.log('❌ AuthService - Login failed, user data cleared');

      // Re-throw the error so LoginView can handle it
      throw error;
    }
  }

  async register(data: RegisterData): Promise<any> {
    const response = await axios.post(`${getBaseUrl()}/auth/register`, data);
    return response.data;
  }

  async loginWithGoogle(idToken: string): Promise<AuthResponse> {
    console.log('🔍 AuthService - loginWithGoogle called with token:', idToken ? `${idToken.substring(0, 50)}...` : 'No token');
    console.log('🔍 AuthService - Current API URL:', getBaseUrl());

    try {
      const response = await axios.post<AuthResponse>(`${getBaseUrl()}/auth/google`, { idToken }, {
        withCredentials: true,
      });

      console.log('🔍 AuthService - Backend response status:', response.status);
      console.log('🔍 AuthService - Backend response data:', response.data);
      console.log('🔍 AuthService - Response headers:', response.headers);

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
      
      console.log('🔍 AuthService - User stored in service:', this.user);
      console.log('🔍 AuthService - User role:', this.user?.role);

      return response.data;
    } catch (error: any) {
      console.error('❌ AuthService - loginWithGoogle failed:', error);
      console.error('❌ AuthService - Error response:', error.response?.data);
      console.error('❌ AuthService - Error status:', error.response?.status);
      throw error;
    }
  }

  async refreshTokens(): Promise<AuthResponse> {
    try {
      const response = await axios.post<AuthResponse>(`${getBaseUrl()}/auth/refresh`);
      this.user = response.data.user as User;
      this.authState.value = response.data.user as User;
      
      // Update token if provided
      if (response.data.token) {
        this.token = response.data.token;
        localStorage.setItem('access_token', this.token);
        this.setAuthHeader(this.token);
      }
      
      return response.data;
    } catch (error) {
      this.clearAuthData();
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      await axios.post(`${getBaseUrl()}/auth/logout`);
    } catch (error) {
      console.error('Logout API call failed:', error);
    } finally {
      this.clearAuthData();
    }
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      const response = await axios.get<User>(`${getBaseUrl()}/auth/me`);

      const user = response.data;
      if (typeof user.role === 'number') {
        user.role = { id: user.role, name: '' };
      }

      this.user = user;
      this.authState.value = user;
      return this.user;
    } catch (error) {
      this.user = null;
      this.authState.value = null;
      return null;
    }
  }

  isAuthenticated(): boolean {
    // Only return true if user exists and has an id
    return !!(this.user && this.user.id);
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

  clearAuthData(): void {
    this.user = null;
    this.authState.value = null;
    this.token = null;
    this.clearAuthHeader();
    localStorage.removeItem('access_token');
    console.log('🔍 AuthService - User data cleared');
  }
}

export const authService = new AuthService();
