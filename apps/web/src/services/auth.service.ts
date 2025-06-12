import axios from 'axios';

const BASE_URL = 'http://localhost:3000/api';

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
  accessToken: string;
  refreshToken: string;
  role: string;
  username: string;
}

class AuthService {
  private accessToken: string | null = localStorage.getItem('accessToken');
  private refreshToken: string | null = localStorage.getItem('refreshToken');
  private user: { username: string; role: string } | null = JSON.parse(localStorage.getItem('user') || 'null');

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await axios.post<AuthResponse>(`${BASE_URL}/auth/login`, credentials);
    this.setAuthData(response.data);
    return response.data;
  }

  async register(data: RegisterData): Promise<any> {
    const response = await axios.post(`${BASE_URL}/auth/register`, data);
    return response.data;
  }

  async loginWithGoogle(idToken: string): Promise<AuthResponse> {
    const response = await axios.post<AuthResponse>(`${BASE_URL}/auth/google`, { idToken });
    this.setAuthData(response.data);
    return response.data;
  }

  async refreshTokens(): Promise<AuthResponse> {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await axios.post<AuthResponse>(`${BASE_URL}/auth/refresh`, {
        refreshToken: this.refreshToken,
      });
      this.setAuthData(response.data);
      return response.data;
    } catch (error) {
      this.clearAuthData();
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      if (this.refreshToken) {
        await axios.post(`${BASE_URL}/auth/logout`, {
          refreshToken: this.refreshToken,
        });
      }
    } catch (error) {
      console.error('Logout API call failed:', error);
    } finally {
      this.clearAuthData();
    }
  }

  isAuthenticated(): boolean {
    return !!this.accessToken;
  }

  isAdmin(): boolean {
    return this.user?.role === 'admin';
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  getRefreshToken(): string | null {
    return this.refreshToken;
  }

  getUser(): { username: string; role: string } | null {
    return this.user;
  }

  private setAuthData(data: AuthResponse): void {
    this.accessToken = data.accessToken;
    this.refreshToken = data.refreshToken;
    this.user = {
      username: data.username,
      role: data.role
    };
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    localStorage.setItem('user', JSON.stringify(this.user));
  }

  private clearAuthData(): void {
    this.accessToken = null;
    this.refreshToken = null;
    this.user = null;
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  }
}

export const authService = new AuthService(); 