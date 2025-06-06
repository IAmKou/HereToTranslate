import axios from 'axios';

const BASE_URL = 'http://localhost:3000/api';

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  phone: string;
  fullName: string;
  roleId: number;
}

export interface AuthResponse {
  token: string;
  role: string;
  username: string;
}

class AuthService {
  private token: string | null = localStorage.getItem('token');
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

  async logout(): Promise<void> {
    try {
      // Call the server to invalidate the token
      await axios.post(`${BASE_URL}/auth/logout`);
    } catch (error) {
      console.error('Logout API call failed:', error);
    } finally {
      // Clear local storage and state regardless of API call success
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      this.token = null;
      this.user = null;
    }
  }

  isAuthenticated(): boolean {
    return !!this.token;
  }

  isAdmin(): boolean {
    return this.user?.role === 'admin';
  }

  getToken(): string | null {
    return this.token;
  }

  getUser(): { username: string; role: string } | null {
    return this.user;
  }

  private setAuthData(data: AuthResponse): void {
    this.token = data.token;
    this.user = {
      username: data.username,
      role: data.role
    };
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(this.user));
  }
}

export const authService = new AuthService(); 