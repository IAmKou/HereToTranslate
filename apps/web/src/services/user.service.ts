import axios from 'axios';

export interface UserProfile {
  id: bigint;
  username: string;
  email: string;
  phone: string;
  fullName: string;
  role: {
    name: string;
  } | null;
  createdAt: Date;
}

export interface UpdateProfileData {
  fullName?: string;
  phone?: string;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  phone: string;
  fullName: string;
  isActive: boolean;
  createdAt: Date;
  role: {
    id: number;
    name: string;
  };
}

export interface UpdateUserRoleDto {
  role: number;
}

export class UserService {
  private api;

  constructor() {
    this.api = axios.create({
      baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor to include auth token
    this.api.interceptors.request.use((config) => {
      const token = localStorage.getItem('accessToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
  }

  private normalizeDate(dateValue: any): Date {
    if (dateValue instanceof Date) {
      return dateValue;
    }
    if (typeof dateValue === 'number') {
      return new Date(dateValue);
    }
    if (typeof dateValue === 'string') {
      return new Date(dateValue);
    }
    return new Date();
  }

  async getUserProfile(): Promise<UserProfile> {
    const response = await this.api.get<UserProfile>('/user/profile');

    return {
      ...response.data,
      id: BigInt(response.data.id),
      createdAt: new Date(response.data.createdAt),
    };
  }

  async updateProfile(data: UpdateProfileData): Promise<UserProfile> {
    const response = await this.api.put<UserProfile>('/user/update', data);

    return {
      ...response.data,
      id: BigInt(response.data.id),
      createdAt: new Date(response.data.createdAt),
    };
  }

  async changePassword(data: ChangePasswordData): Promise<void> {
    await this.api.put('/user/change-password', data);
  }

  async getAllUsers(): Promise<User[]> {
    const response = await this.api.get('/user/admin/all');
    // Normalize dates in the response
    return response.data.map((user: any) => ({
      ...user,
      createdAt: this.normalizeDate(user.createdAt)
    }));
  }

  async updateUserRole(userId: string, role: number): Promise<User> {
    const response = await this.api.put(`/user/admin/${userId}/role/${role}`);
    console.log('Updated user role response:', response.data);
    return response.data;
  }

  async updateUserStatus(userId: string, isActive: boolean): Promise<User> {
    const response = await this.api.put(`/user/admin/${userId}/toggle-status`);
    return response.data;
  }

  async toggleUserStatus(userId: string): Promise<User> {
    const response = await this.api.put(`/user/admin/${userId}/toggle-status`);
    return response.data;
  }

  async getUsers(): Promise<User[]> {
    const response = await this.api.get('/users');
    return response.data;
  }
}

export const userService = new UserService();
