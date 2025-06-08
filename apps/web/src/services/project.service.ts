import axios from 'axios';
import { authService } from './auth.service';

const API_URL = 'http://localhost:3000/api/projects';

export interface Project {
  id: number;
  name: string;
  description?: string;
  createdAt: string;
}

export const projectService = {
  async getProjects(): Promise<Project[]> {
    const token = authService.getToken();
    const response = await axios.get(API_URL, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  }
};