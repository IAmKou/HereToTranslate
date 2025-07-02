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
    const response = await axios.post<AuthResponse>(`${BASE_URL}/auth/login`, credentials);
    this.user = response.data.user as User;
    return response.data;
  }

  async register(data: RegisterData): Promise<any> {
    const response = await axios.post(`${BASE_URL}/auth/register`, data);
    return response.data;
  }

  async loginWithGoogle(idToken: string): Promise<AuthResponse> {
    const response = await axios.post<AuthResponse>(`${BASE_URL}/auth/google`, { idToken });
    this.user = response.data.user as User;
    return response.data;
  }

  async refreshTokens(): Promise<AuthResponse> {
    try {
      const response = await axios.post<AuthResponse>(`${BASE_URL}/auth/refresh`);
      this.user = response.data.user as User;
      return response.data;
    } catch (error) {
      this.clearAuthData();
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      await axios.post(`${BASE_URL}/auth/logout`);
    } catch (error) {
      console.error('Logout API call failed:', error);
    } finally {
      this.clearAuthData();
    }
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      const response = await axios.get<User>(`${BASE_URL}/auth/me`);

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
