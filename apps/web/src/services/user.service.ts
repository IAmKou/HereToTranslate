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

class UserService {
  async getUserProfile(): Promise<UserProfile> {
    const token = authService.getAccessToken();
    if (!token) {
      throw new Error('No access token available');
    }

    const response = await axios.get<UserProfile>(`${BASE_URL}/users/profile`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    return {
      ...response.data,
      id: BigInt(response.data.id),
      createdAt: new Date(response.data.createdAt)
    };
  }
}

export const userService = new UserService(); 