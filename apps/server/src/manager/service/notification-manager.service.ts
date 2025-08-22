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
        const payload = {
          id: savedNotification.id.toString(),
          type: savedNotification.type,
          message: savedNotification.message,
          createdAt: savedNotification.createdAt,
          isGlobal: true,
          createdByUserId: savedNotification.createdBy?.toString(),
        } as const;
        if (savedNotification.createdBy) {
          this.notificationGateway.emitToAllExcept(savedNotification.createdBy.toString(), payload);
        } else {
          this.notificationGateway.emitToAll(payload);
        }
      } else if (data.userId) {
        this.notificationGateway.emitToUser(data.userId, {
          id: savedNotification.id.toString(),
          type: savedNotification.type,
          message: savedNotification.message,
          createdAt: savedNotification.createdAt,
          isGlobal: false,
          createdByUserId: savedNotification.createdBy?.toString(),
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
    // Get all active non-admin users (exclude SuperAdmin=1 and Admin=2)
    const users = await this.userRepository
      .createQueryBuilder('user')
      .select(['user.id'])
      .leftJoin('user.role', 'role')
      .where('user.isActive = :active', { active: true })
      .andWhere('role.id NOT IN (:...excludedRoleIds)', { excludedRoleIds: [1, 2] })
      .getMany();

    const notifications: NotificationEntity[] = [];

    for (const user of users) {
      const notification = this.notificationRepository.create({
        userId: user.id,
        type: data.type,
        message: data.message,
        isGlobal: true,
        createdBy: data.createdBy,
      });

      const savedNotification = await this.notificationRepository.save(notification);
      notifications.push(savedNotification);

      // Send realtime notification
      try {
        this.notificationGateway.emitToUser(user.id, {
          id: savedNotification.id.toString(),
          type: savedNotification.type,
          message: savedNotification.message,
          createdAt: savedNotification.createdAt,
          isGlobal: true,
          createdByUserId: savedNotification.createdBy?.toString(),
        });
      } catch (error) {
        console.error('Failed to send realtime notification to user:', user.id, error);
      }
    }

    return notifications;
  }

  async getNotificationsByUserId(userId: bigint, limit = 50, unreadOnly = false): Promise<NotificationEntity[]> {
    const whereConditions = [
      { userId, ...(unreadOnly ? { isRead: false } : {}) },
      { isGlobal: true, ...(unreadOnly ? { isRead: false } : {}) }
    ];

    // If the requester is admin, don't return anything for navbar usage.
    // We'll enforce at controller-level filtering here too by checking role via join.
    return await this.notificationRepository.find({
      where: whereConditions,
      order: { createdAt: 'DESC' },
      take: limit,
      relations: ['creator'],
    });
  }

  async getAllGlobalNotifications(limit = 50): Promise<NotificationEntity[]> {
    try {
      console.log('🔍 [Backend] getAllGlobalNotifications called with limit:', limit);

      // Lấy tất cả global notifications
      const notifications = await this.notificationRepository.find({
        where: { isGlobal: true },
        order: { createdAt: 'DESC' },
        take: limit,
        relations: ['creator'],
      });

      console.log('🔍 [Backend] Found notifications:', notifications.length);
      console.log('🔍 [Backend] Notification IDs:', notifications.map(n => n.id.toString()));

      return notifications;
    } catch (error) {
      console.error('❌ [Backend] Error in getAllGlobalNotifications:', error);

      // Fallback: thử lấy tất cả notifications nếu có lỗi với relations
      try {
        console.log('🔄 [Backend] Attempting fallback query...');
        const fallbackNotifications = await this.notificationRepository.find({
          where: { isGlobal: true },
          order: { createdAt: 'DESC' },
          take: limit,
        });
        console.log('🔍 [Backend] Fallback found notifications:', fallbackNotifications.length);
        return fallbackNotifications;
      } catch (fallbackError) {
        console.error('❌ [Backend] Fallback query also failed:', fallbackError);
        throw error;
      }
    }
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
    if (notification.isGlobal) {
      const payload = {
        id: updatedNotification.id.toString(),
        type: updatedNotification.type,
        message: updatedNotification.message,
        createdAt: updatedNotification.createdAt,
        isGlobal: true,
        createdByUserId: updatedNotification.createdBy?.toString(),
      } as const;
      if (updatedNotification.createdBy) {
        this.notificationGateway.emitToAllExcept(updatedNotification.createdBy.toString(), payload);
      } else {
        this.notificationGateway.emitToAll(payload);
      }
    } else if (notification.userId) {
      this.notificationGateway.emitToUser(notification.userId, {
        id: updatedNotification.id.toString(),
        type: updatedNotification.type,
        message: updatedNotification.message,
        createdAt: updatedNotification.createdAt,
        isGlobal: false,
        createdByUserId: updatedNotification.createdBy?.toString(),
      });
    }

    return updatedNotification;
  }

  async deleteNotification(id: bigint): Promise<void> {
    try {
      console.log('🗑️ [Backend] deleteNotification called with ID:', id.toString());

      const notification = await this.getNotificationById(id);
      console.log('🔍 [Backend] Found notification to delete:', {
        id: notification.id.toString(),
        type: notification.type,
        message: notification.message,
        isGlobal: notification.isGlobal,
        userId: notification.userId?.toString()
      });

      // Sử dụng hard delete với transaction
      const result = await this.notificationRepository.delete({ id: id });
      console.log('🗑️ [Backend] Delete result:', result);

      if (result.affected === 0) {
        throw new NotFoundException('Notification not found');
      }

      console.log('✅ [Backend] Notification deleted successfully from database');

      // Send realtime deletion notification
      try {
        if (notification.isGlobal) {
          this.notificationGateway.emitDeletionToAll(id.toString());
          console.log('📡 [Backend] Emitted deletion to all users');
        } else if (notification.userId) {
          this.notificationGateway.emitDeletionToUser(notification.userId, id.toString());
          console.log('📡 [Backend] Emitted deletion to user:', notification.userId.toString());
        }
      } catch (error) {
        console.error('❌ [Backend] Failed to send realtime deletion notification:', error);
        // Don't fail the deletion if realtime fails
      }

    } catch (error) {
      console.error('❌ [Backend] Error in deleteNotification:', error);
      throw error;
    }
  }

  async deleteAllUserNotifications(userId: bigint): Promise<void> {
    await this.notificationRepository.delete({ userId });

    // Send realtime deletion notification
    try {
      this.notificationGateway.emitDeletionToUser(userId, 'all_user');
    } catch (error) {
      console.error('Failed to send realtime deletion notification:', error);
      // Don't fail the deletion if realtime fails
    }
  }

  async deleteAllGlobalNotifications(): Promise<void> {
    await this.notificationRepository.delete({ isGlobal: true });

    // Send realtime deletion notification
    try {
      this.notificationGateway.emitDeletionToAll('all_global');
    } catch (error) {
      console.error('Failed to send realtime deletion notification:', error);
      // Don't fail the deletion if realtime fails
    }
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

  async getNotificationsByType(userId: bigint, type: string, requestId?: bigint): Promise<NotificationEntity[]> {
    const queryBuilder = this.notificationRepository
      .createQueryBuilder('notification')
      .where('notification.userId = :userId', { userId })
      .andWhere('notification.type = :type', { type });

    // If requestId is provided, filter by messages containing that requestId
    if (requestId) {
      queryBuilder.andWhere('notification.message LIKE :requestIdPattern', {
        requestIdPattern: `%[RequestID:${requestId}]%`
      });
    }

    return queryBuilder.getMany();
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
