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
  avatarUrl?: string;
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
  avatarUrl?: string; // optional avatar path from API
  role: {
    id: number;
    name: string;
  };
}

export interface UpdateUserRoleDto {
  role: number;
}

export class UserService {
  api;

  constructor() {
    this.api = axios.create({
      baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true,
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
    const response = await this.api.get<UserProfile>('/users/profile');
    console.log('[FE] getUserProfile response', response.data);
    return {
      ...response.data,
      id: BigInt(response.data.id),
      createdAt: new Date(response.data.createdAt),
    };
  }

  async updateProfile(data: UpdateProfileData): Promise<UserProfile> {
    const response = await this.api.put(`/users/update`, data);

    return {
      ...response.data,
      createdAt: new Date(response.data.createdAt),
    };
  }

  async changePassword(data: ChangePasswordData): Promise<void> {
    await this.api.patch(`/users/change-password`, data);
  }

  async getAllUsers(): Promise<User[]> {
    const response = await this.api.get('/users/admin/all');
    return response.data.map((user: any) => ({
      ...user,
      createdAt: this.normalizeDate(user.createdAt)
    }));
  }

  async updateUserRole(userId: string, role: number): Promise<User> {
    const response = await this.api.put(`/users/admin/${userId}/role/${role}`);
    console.log('Updated user role response:', response.data);
    return response.data;
  }

  async updateUserStatus(userId: string, isActive: boolean): Promise<User> {
    const response = await this.api.put(`/users/admin/${userId}/toggle-status`);
    return response.data;
  }

  async toggleUserStatus(userId: string): Promise<User> {
    const response = await this.api.put(`/users/admin/${userId}/toggle-status`);
    return response.data;
  }

  async getUsers(): Promise<User[]> {
    const response = await this.api.get('/users');
    return response.data;
  }
}

export const userService = new UserService();

export async function uploadAvatar(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('avatar', file);

  const res = await userService.api.post('/users/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });

  console.log('[FE] uploadAvatar response', res.data);

  if (!res.data.avatarUrl) {
    throw new Error('No avatarUrl received from server');
  }

  return res.data.avatarUrl;
}

export function getAvatarUrl(userId: number): string {
  return `${userService.api.defaults.baseURL}/users/avatar/${userId}`;
}
