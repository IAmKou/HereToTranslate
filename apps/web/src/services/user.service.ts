import axios from 'axios';
import { authService } from './auth.service';

const API_URL = 'http://localhost:3000/api/users';

export interface User {
  id: number;
  username: string;
  fullName: string;
  email: string;
}

export const userService = {
  async getUsers(): Promise<User[]> {
    const token = authService.getToken();
    const response = await axios.get(API_URL, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  }
};