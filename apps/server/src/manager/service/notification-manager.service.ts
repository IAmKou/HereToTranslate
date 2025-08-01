import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationEntity, UserEntity } from '#LocalProject/Entities';
import { NotificationGateway } from '../../util/gateway/notification.gateway';

export interface CreateNotificationDto {
  userId?: bigint;
  type: string;
  message: string;
  isGlobal?: boolean;
  createdBy?: bigint;
}

export interface CreateGlobalNotificationDto {
  type: string;
  message: string;
  createdBy: bigint;
}

export interface UpdateNotificationDto {
  type?: string;
  message?: string;
}

@Injectable()
export class NotificationManagerService {
  constructor(
    @InjectRepository(NotificationEntity)
    private readonly notificationRepository: Repository<NotificationEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly notificationGateway: NotificationGateway,
  ) {}

  async createNotification(data: CreateNotificationDto): Promise<NotificationEntity> {
    const notification = this.notificationRepository.create({
      userId: data.userId,
      type: data.type,
      message: data.message,
      isGlobal: data.isGlobal || false,
      createdBy: data.createdBy,
    });

    const savedNotification = await this.notificationRepository.save(notification);

    // Send realtime notification
    try {
      if (data.isGlobal) {
        this.notificationGateway.emitToAll({
          id: savedNotification.id.toString(),
          type: savedNotification.type,
          message: savedNotification.message,
          createdAt: savedNotification.createdAt,
          isGlobal: true,
        });
      } else if (data.userId) {
        this.notificationGateway.emitToUser(data.userId, {
          id: savedNotification.id.toString(),
          type: savedNotification.type,
          message: savedNotification.message,
          createdAt: savedNotification.createdAt,
          isGlobal: false,
        });
      }
    } catch (error) {
      console.error('Failed to send realtime notification:', error);
      // Don't fail the notification creation if realtime fails
    }

    return savedNotification;
  }

  async createGlobalNotification(data: CreateGlobalNotificationDto): Promise<NotificationEntity> {
    return this.createNotification({
      type: data.type,
      message: data.message,
      isGlobal: true,
      createdBy: data.createdBy,
    });
  }

  async createNotificationForAllUsers(data: CreateGlobalNotificationDto): Promise<NotificationEntity[]> {
    // Get all active users
    const users = await this.userRepository.find({
      where: { isActive: true },
      select: ['id'],
    });

    const notifications: NotificationEntity[] = [];

    // Create individual notifications for each user
    for (const user of users) {
      const notification = await this.createNotification({
        userId: user.id,
        type: data.type,
        message: data.message,
        createdBy: data.createdBy,
        isGlobal: false,
      });
      notifications.push(notification);
    }

    return notifications;
  }

  async getNotificationsByUserId(userId: bigint, limit = 50, unreadOnly = false): Promise<NotificationEntity[]> {
    const whereConditions = [
      { userId, ...(unreadOnly ? { isRead: false } : {}) },
      { isGlobal: true, ...(unreadOnly ? { isRead: false } : {}) }
    ];

    return await this.notificationRepository.find({
      where: whereConditions,
      order: { createdAt: 'DESC' },
      take: limit,
      relations: ['creator'],
    });
  }

  async getAllGlobalNotifications(limit = 50): Promise<NotificationEntity[]> {
    return await this.notificationRepository.find({
      where: { isGlobal: true },
      order: { createdAt: 'DESC' },
      take: limit,
      relations: ['creator'],
    });
  }

  async getNotificationById(id: bigint): Promise<NotificationEntity> {
    const notification = await this.notificationRepository.findOne({
      where: { id },
      relations: ['user', 'creator'],
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return notification;
  }

  async updateNotification(id: bigint, data: UpdateNotificationDto): Promise<NotificationEntity> {
    const notification = await this.getNotificationById(id);

    if (data.type !== undefined) {
      notification.type = data.type;
    }
    if (data.message !== undefined) {
      notification.message = data.message;
    }

    const updatedNotification = await this.notificationRepository.save(notification);

    // TODO: Send realtime update
    // if (notification.isGlobal) {
    //   this.notificationGateway.emitToAll({
    //     id: updatedNotification.id.toString(),
    //     type: updatedNotification.type,
    //     message: updatedNotification.message,
    //     createdAt: updatedNotification.createdAt,
    //     isGlobal: true,
    //   });
    // } else if (notification.userId) {
    //   this.notificationGateway.emitToUser(notification.userId, {
    //     id: updatedNotification.id.toString(),
    //     type: updatedNotification.type,
    //     message: updatedNotification.message,
    //     createdAt: updatedNotification.createdAt,
    //     isGlobal: false,
    //   });
    // }

    return updatedNotification;
  }

  async deleteNotification(id: bigint): Promise<void> {
    const notification = await this.getNotificationById(id);
    const result = await this.notificationRepository.delete(id);

    if (result.affected === 0) {
      throw new NotFoundException('Notification not found');
    }

    // TODO: Send realtime deletion
    // if (notification.isGlobal) {
    //   this.notificationGateway.server.emit('notification_deleted', { id: id.toString() });
    // } else if (notification.userId) {
    //   this.notificationGateway.server.to(`user_${notification.userId}`).emit('notification_deleted', { id: id.toString() });
    // }
  }

  async deleteAllUserNotifications(userId: bigint): Promise<void> {
    await this.notificationRepository.delete({ userId });
  }

  async deleteAllGlobalNotifications(): Promise<void> {
    await this.notificationRepository.delete({ isGlobal: true });
    // TODO: Send realtime deletion
    // this.notificationGateway.server.emit('all_global_notifications_deleted');
  }

  async getNotificationCount(userId: bigint): Promise<number> {
    return await this.notificationRepository.count({
      where: [
        { userId },
        { isGlobal: true }
      ],
    });
  }

  async getUnreadNotificationCount(userId: bigint): Promise<number> {
    return await this.notificationRepository.count({
      where: [
        { userId, isRead: false },
        { isGlobal: true, isRead: false }
      ],
    });
  }

  async markAsRead(notificationId: bigint, userId: bigint): Promise<void> {
    const notification = await this.getNotificationById(notificationId);

    // Check if user has access to this notification
    if (!notification.isGlobal && notification.userId !== userId) {
      throw new Error('Unauthorized access to notification');
    }

    // Only mark as read if not already read
    if (!notification.isRead) {
      notification.isRead = true;
      notification.readAt = new Date();
      await this.notificationRepository.save(notification);
    }
  }

  async markAllAsRead(userId: bigint): Promise<void> {
    await this.notificationRepository.update(
      [
        { userId, isRead: false },
        { isGlobal: true, isRead: false }
      ],
      {
        isRead: true,
        readAt: new Date()
      }
    );
  }

  async getGlobalNotificationCount(): Promise<number> {
    return await this.notificationRepository.count({
      where: { isGlobal: true },
    });
  }

  // Helper methods for common notification types
  async notifyUserRequestStatus(userId: bigint, requestTitle: string, status: string): Promise<NotificationEntity> {
    return this.createNotification({
      userId,
      type: 'request_status',
      message: `Your request "${requestTitle}" has been ${status}`,
    });
  }

  async notifyUserProjectInvite(userId: bigint, projectName: string): Promise<NotificationEntity> {
    return this.createNotification({
      userId,
      type: 'project_invite',
      message: `You have been invited to join project "${projectName}"`,
    });
  }

  async notifyUserNewMessage(userId: bigint, fromUser: string): Promise<NotificationEntity> {
    return this.createNotification({
      userId,
      type: 'new_message',
      message: `You have a new message from ${fromUser}`,
    });
  }
}
