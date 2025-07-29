import axiosInstance from '../utils/axios';

export interface CreateGlobalNotificationData {
  type: string;
  message: string;
}

export interface UpdateNotificationData {
  type?: string;
  message?: string;
}

export interface GlobalNotification {
  id: string;
  type: string;
  message: string;
  isGlobal: boolean;
  createdAt: string;
  createdBy?: {
    id: string;
    username: string;
    fullName?: string;
  };
}

export interface GlobalNotificationsResponse {
  notifications: GlobalNotification[];
}

export interface NotificationCountResponse {
  count: number;
}

export interface CreateNotificationForAllResponse {
  message: string;
  count: number;
}

class AdminNotificationService {
  async getGlobalNotifications(limit?: number): Promise<GlobalNotificationsResponse> {
    const params = limit ? { limit } : {};
    const response = await axiosInstance.get('/admin/notifications/global', { params });
    return response.data;
  }

  async getGlobalNotificationCount(): Promise<NotificationCountResponse> {
    const response = await axiosInstance.get('/admin/notifications/global/count');
    return response.data;
  }

  async getNotificationById(id: string): Promise<GlobalNotification> {
    const response = await axiosInstance.get(`/admin/notifications/${id}`);
    return response.data;
  }

  async createGlobalNotification(data: CreateGlobalNotificationData): Promise<GlobalNotification> {
    const response = await axiosInstance.post('/admin/notifications/global', data);
    return response.data;
  }

  async createNotificationForAllUsers(data: CreateGlobalNotificationData): Promise<CreateNotificationForAllResponse> {
    const response = await axiosInstance.post('/admin/notifications/global/all-users', data);
    return response.data;
  }

  async updateNotification(id: string, data: UpdateNotificationData): Promise<GlobalNotification> {
    const response = await axiosInstance.put(`/admin/notifications/${id}`, data);
    return response.data;
  }

  async deleteNotification(id: string): Promise<{ message: string }> {
    const response = await axiosInstance.delete(`/admin/notifications/${id}`);
    return response.data;
  }

  async deleteAllGlobalNotifications(): Promise<{ message: string }> {
    const response = await axiosInstance.delete('/admin/notifications/global/all');
    return response.data;
  }

  async getNotificationStats(): Promise<{ globalNotifications: number }> {
    const response = await axiosInstance.get('/admin/notifications/stats/overview');
    return response.data;
  }
}

export const adminNotificationService = new AdminNotificationService();
