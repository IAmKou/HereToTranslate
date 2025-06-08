import axios from 'axios';
import { authService } from './auth.service';

const API_URL = 'http://localhost:3000/api/users';

export interface Role {
  id: number;
  name: string;
}

export interface User {
  id: number | bigint;
  username: string;
  fullName: string;
  email: string;
  phone: string;
  isActive: boolean;
  createdAt: string;
  role: Role;
}

export const userService = {
  // Get all users (admin only)
  async getUsers(): Promise<User[]> {
    const token = authService.getToken();
    const response = await axios.get(API_URL, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  // Get a specific user by ID (admin only)
  async getUserById(id: number | bigint): Promise<User> {
    const token = authService.getToken();
    const response = await axios.get(`${API_URL}/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  // Update a user's role (admin only)
  async updateUserRole(id: number | bigint, roleId: number): Promise<User> {
    const token = authService.getToken();
    // const response = await axios.put(`${API_URL}/${id}/role`, { roleId }, {
    //   headers: { Authorization: `Bearer ${token}` }
    // });
    const response = await axios.put(`${API_URL}/${id}/role`, { roleId });
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
  },

  async getRoles(): Promise<{id: number, name: string}[]> {
    // Mock data for roles
    return [
      { id: 1, name: 'admin' },
      { id: 2, name: 'member' },
      { id: 3, name: 'translator' },
      { id: 4, name: 'client' }
    ];
    const response = await fetch('/api/roles');
    if (!response.ok) {
      throw new Error('Failed to fetch roles');
    }
    return response.json();
  }
};