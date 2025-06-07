import axios from 'axios';
import { authService } from './auth.service';

const API_URL = 'http://localhost:3000/api/project-groups';

// Types
export interface Group {
  id: number;
  name: string;
  project: {
    id: number;
    name: string;
  };
  members?: GroupMember[];
}

export interface GroupMember {
  id: number;
  user: {
    id: number;
    username: string;
    fullName: string;
    email: string;
  };
  addedAt: string;
}

export interface CreateGroupRequest {
  name: string;
  project_id: number;
}

export interface UpdateGroupRequest {
  name: string;
}

export interface AddMemberRequest {
  userId: number;
}

// API Service
export const groupService = {
  async getGroups(projectId?: number): Promise<Group[]> {
    const token = authService.getToken();
    const params = projectId ? { projectId } : {};
    const response = await axios.get(API_URL, {
    //   headers: { Authorization: `Bearer ${token}` },
      params
    });
    return response.data;
  },

  async getGroup(id: number): Promise<Group> {
    const token = authService.getToken();
    const response = await axios.get(`${API_URL}/${id}`, {
    //   headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  async createGroup(data: CreateGroupRequest): Promise<Group> {
    const token = authService.getToken();
    const response = await axios.post(API_URL, data, {
    //   headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  async updateGroup(id: number, data: UpdateGroupRequest): Promise<Group> {
    const token = authService.getToken();
    // const response = await axios.patch(`${API_URL}/${id}`, data, {
    //   headers: { Authorization: `Bearer ${token}` }
    // });
    const response = await axios.patch(`${API_URL}/${id}`, data);
    return response.data;
  },

  async deleteGroup(id: number): Promise<void> {
    const token = authService.getToken();
    // await axios.delete(`${API_URL}/${id}`, {
    //   headers: { Authorization: `Bearer ${token}` }
    // });
    await axios.delete(`${API_URL}/${id}`);
  },

  async addMember(groupId: number, data: AddMemberRequest): Promise<GroupMember> {
    const token = authService.getToken();
    const response = await axios.post(`${API_URL}/${groupId}/members`, data, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  async removeMember(groupId: number, userId: number): Promise<void> {
    const token = authService.getToken();
    await axios.delete(`${API_URL}/${groupId}/members/${userId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
  },

  async getGroupMembers(groupId: number): Promise<GroupMember[]> {
    const token = authService.getToken();
    const response = await axios.get(`${API_URL}/${groupId}/members`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  }
};