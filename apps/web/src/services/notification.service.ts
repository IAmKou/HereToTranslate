import axiosInstance from '../api';

export interface Notification {
  id: string;
  type: string;
  message: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
  updatedAt: string;
  isGlobal: boolean;
  createdBy?: {
    id: string;
    username: string;
    fullName?: string;
  };
}

export interface NotificationCount {
  total: number;
  unread: number;
}

export interface CreateNotificationData {
  type: string;
  message: string;
}

export interface UpdateNotificationData {
  type?: string;
  message?: string;
}

class NotificationService {
  async getUserNotifications(limit?: number, unreadOnly = false): Promise<{ notifications: Notification[] }> {
    const params: any = {};
    if (limit) params.limit = limit;
    if (unreadOnly) params.unreadOnly = 'true';

    const response = await axiosInstance.get('/notifications', { params });
    return response.data;
  }

  async getNotificationCount(): Promise<NotificationCount> {
    const response = await axiosInstance.get('/notifications/count');
    return response.data;
  }

  async getNotificationById(id: string): Promise<Notification> {
    const response = await axiosInstance.get(`/notifications/${id}`);
    return response.data;
  }

  async markAsRead(id: string): Promise<{ message: string }> {
    const response = await axiosInstance.patch(`/notifications/${id}/read`);
    return response.data;
  }

  async markAllAsRead(): Promise<{ message: string }> {
    const response = await axiosInstance.patch('/notifications/mark-all-read');
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

  async updateNotification(id: string, data: UpdateNotificationData): Promise<Notification> {
    const response = await axiosInstance.put(`/notifications/${id}`, data);
    return response.data;
  }
}

export const notificationService = new NotificationService();
