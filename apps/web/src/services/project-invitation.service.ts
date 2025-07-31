import axiosInstance from '../api';

export interface ProjectInvitation {
  id: string;
  projectId: string;
  invitedUserId: string;
  invitedByUserId: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  message?: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  project?: {
    id: string;
    name: string;
    description?: string;
  };
  invitedUser?: {
    id: string;
    fullName: string;
    email: string;
    username?: string;
  };
  invitedByUser?: {
    id: string;
    fullName: string;
    email: string;
    username?: string;
  };
}

export interface CreateInvitationData {
  invitedUserId: string;
  message?: string;
}

export interface UpdateInvitationStatusData {
  status: 'accepted' | 'declined';
}

class ProjectInvitationService {
  async createInvitation(projectId: string, data: CreateInvitationData): Promise<{ message: string; invitation: ProjectInvitation }> {
    const response = await axiosInstance.post(`/projects/${projectId}/invitations`, data);
    return response.data;
  }

  async getProjectInvitations(projectId: string): Promise<{ invitations: ProjectInvitation[] }> {
    const response = await axiosInstance.get(`/projects/${projectId}/invitations`);
    return response.data;
  }

  async getMyInvitations(status?: string): Promise<{ invitations: ProjectInvitation[] }> {
    const params = status ? { status } : {};
    const response = await axiosInstance.get('/projects/invitations/my', { params });
    return response.data;
  }

  async respondToInvitation(invitationId: string, status: 'accepted' | 'declined'): Promise<{ message: string; invitation: ProjectInvitation }> {
    const response = await axiosInstance.patch(`/projects/invitations/${invitationId}/respond`, { status });
    return response.data;
  }

  async cancelInvitation(invitationId: string): Promise<{ message: string }> {
    const response = await axiosInstance.delete(`/projects/invitations/${invitationId}`);
    return response.data;
  }
}

export const projectInvitationService = new ProjectInvitationService();
