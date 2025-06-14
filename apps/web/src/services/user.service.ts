import axios from 'axios';
import { authService } from './auth.service';

const BASE_URL = 'http://localhost:3000/api';

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
  createdAt: string;
  role: {
    id: number;
    name: string;
  };
}

export interface UpdateUserRoleDto {
  role: number;
}

class UserService {
  async getUserProfile(): Promise<UserProfile> {
    const token = authService.getAccessToken();
    if (!token) {
      throw new Error('No access token available');
    }

    const response = await axios.get<UserProfile>(`${BASE_URL}/users/profile`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return {
      ...response.data,
      id: BigInt(response.data.id),
      createdAt: new Date(response.data.createdAt),
    };
  }

  async updateProfile(data: UpdateProfileData): Promise<UserProfile> {
    const token = authService.getAccessToken();
    if (!token) {
      throw new Error('No access token available');
    }

    const response = await axios.put<UserProfile>(
      `${BASE_URL}/users/profile`,
      data,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return {
      ...response.data,
      id: BigInt(response.data.id),
      createdAt: new Date(response.data.createdAt),
    };
  }

  async changePassword(data: ChangePasswordData): Promise<void> {
    const token = authService.getAccessToken();
    if (!token) {
      throw new Error('No access token available');
    }

    await axios.put(`${BASE_URL}/users/change-password`, data, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  async getAllUsers(): Promise<User[]> {
    const token = authService.getAccessToken();
    if (!token) {
      throw new Error('No access token available');
    }

    const response = await axios.get(`${BASE_URL}/users/admin/all`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  }

  async updateUserRole(userId: string, role: number): Promise<User> {
    const token = authService.getAccessToken();
    if (!token) {
      throw new Error('No access token available');
    }
    const response = await axios.put(
      `${BASE_URL}/users/admin/${userId}/role`,
      { role },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  }

  async toggleUserStatus(userId: string): Promise<User> {
    const token = authService.getAccessToken();
    if (!token) {
      throw new Error('No access token available');
    }

    const response = await axios.put(
      `${BASE_URL}/users/admin/${userId}/toggle-status`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  }
}

export const userService = new UserService();
