import axiosInstance from '../api';

export interface Notification {
  id: string;
  type: string;
  message: string;
  createdAt: string;
}

export interface CreateNotificationData {
  type: string;
  message: string;
}

class NotificationService {
  async getUserNotifications(limit?: number): Promise<{ notifications: Notification[] }> {
    const params = limit ? { limit } : {};
    const response = await axiosInstance.get('/notifications', { params });
    return response.data;
  }

  async getNotificationCount(): Promise<{ count: number }> {
    const response = await axiosInstance.get('/notifications/count');
    return response.data;
  }

  async getNotificationById(id: string): Promise<Notification> {
    const response = await axiosInstance.get(`/notifications/${id}`);
    return response.data;
  }

  async createNotification(data: CreateNotificationData): Promise<Notification> {
    const response = await axiosInstance.post('/notifications', data);
    return response.data;
  }

  async deleteNotification(id: string): Promise<{ message: string }> {
    const response = await axiosInstance.delete(`/notifications/${id}`);
    return response.data;
  }

  async deleteAllNotifications(): Promise<{ message: string }> {
    const response = await axiosInstance.delete('/notifications');
    return response.data;
  }
}

export const notificationService = new NotificationService();
