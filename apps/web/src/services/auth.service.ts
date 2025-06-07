import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

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

export interface User {
  username: string;
  role: string;
}

export const authService = {
  token: localStorage.getItem('token'),
  user: localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user') || '{}') : null,

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await axios.post<AuthResponse>(`${API_URL}/auth/login`, credentials);
    this.setAuthData(response.data);
    return response.data;
  },

  async register(data: RegisterData): Promise<any> {
    const response = await axios.post(`${API_URL}/auth/register`, data);
    return response.data;
  },

  async loginWithGoogle(idToken: string): Promise<AuthResponse> {
    const response = await axios.post<AuthResponse>(`${API_URL}/auth/google`, { idToken });
    this.setAuthData(response.data);
    return response.data;
  },

  async logout(): Promise<void> {
    try {
      // Call the server to invalidate the token
      await axios.post(`${API_URL}/auth/logout`);
    } catch (error) {
      console.error('Logout API call failed:', error);
    } finally {
      // Clear local storage and state regardless of API call success
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      this.token = null;
      this.user = null;
    }
  },

  async forgotPassword(email: string): Promise<any> {
    try {
      const response = await axios.post(`${API_URL}/auth/forgot-password`, { email });
      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw new Error(error.response.data.message || 'An error occurred');
      }
      console.log(error)
      throw new Error('Cannot connect to server');
    }
  },

  async resetPassword(email: string, newPassword: string): Promise<any> {
    try {
      const response = await axios.post(`${API_URL}/auth/reset-password`, {
        email,
        newPassword
      });
      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw new Error(error.response.data.message || 'An error occurred');
      }
      throw new Error('Cannot connect to server');
    }
  },

  isAuthenticated(): boolean {
    return !!this.token;
  },

  isAdmin(): boolean {
    return this.user?.role === 'admin';
  },

  getToken(): string | null {
    return this.token;
  },

  getUser(): User | null {
    return this.user;
  },

  setAuthData(data: AuthResponse): void {
    this.token = data.token;
    this.user = {
      username: data.username,
      role: data.role
    };
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(this.user));
  }
}