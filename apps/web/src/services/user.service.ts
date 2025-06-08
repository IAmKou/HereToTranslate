import axios from 'axios';
import { authService } from './auth.service';

const API_URL = 'http://localhost:3000/api/users';

export interface User {
  id: number;
  username: string;
  fullName: string;
  email: string;
  phone: string;
  role: {
    id: number;
    name: string;
  };
}

export interface UpdateProfileData {
  fullName?: string;
  email?: string;
  phone?: string;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export const userService = {
  async getUsers(): Promise<User[]> {
    const token = authService.getToken();
    const response = await axios.get(API_URL, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  async getProfile(): Promise<User> {
    const token = authService.getToken();
    const response = await axios.get(`${API_URL}/profile`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  async updateProfile(data: UpdateProfileData): Promise<User> {
    const token = authService.getToken();
    const response = await axios.put(`${API_URL}/profile`, data, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  async changePassword(data: ChangePasswordData): Promise<{ message: string }> {
    const token = authService.getToken();
    const response = await axios.put(`${API_URL}/change-password`, data, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  }
};