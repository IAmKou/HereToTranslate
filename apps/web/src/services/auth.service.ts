import axios from 'axios';
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
}

export interface User {
  id: string;
  username: string;
  role: {
    id: number;
    name: string;
  };
}

class AuthService {
  private user: User | null = null;

  constructor() {
    // Configure axios to send cookies with requests
    axios.defaults.withCredentials = true;
  }

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await axios.post<AuthResponse>(`${getBaseUrl()}/auth/login`, credentials);
    this.user = response.data.user as User;
    return response.data;
  }

  async register(data: RegisterData): Promise<any> {
    const response = await axios.post(`${getBaseUrl()}/auth/register`, data);
    return response.data;
  }

  async loginWithGoogle(idToken: string): Promise<AuthResponse> {
    const response = await axios.post<AuthResponse>(`${getBaseUrl()}/auth/google`, { idToken }, {
      withCredentials: true,
    });
    this.user = response.data.user as User;
    return response.data;
  }


  async refreshTokens(): Promise<AuthResponse> {
    try {
      const response = await axios.post<AuthResponse>(`${getBaseUrl()}/auth/refresh`);
      this.user = response.data.user as User;
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
      const response = await axios.get<User>(`${getBaseUrl()}/auth/me`, {
        withCredentials: true,
      });

      const user = response.data;
      if (typeof user.role === 'number') {
        user.role = { id: user.role, name: '' };
      }

      this.user = user;
      return this.user;
    } catch (error) {
      this.user = null;
      return null;
    }
  }


  isAuthenticated(): boolean {
    return !!this.user;
  }

  isAdmin(): boolean {
    const id = this.user?.role?.id;
    return id == 1 || id == 2;

  }


  getUser(): User | null {
    return this.user;
  }

  private clearAuthData(): void {
    this.user = null;
  }
}

export const authService = new AuthService();
