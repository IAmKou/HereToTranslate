import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationEntity } from '#LocalProject/Entities';

export interface CreateNotificationDto {
  userId: bigint;
  type: string;
  message: string;
}

@Injectable()
export class NotificationManagerService {
  constructor(
    @InjectRepository(NotificationEntity)
    private readonly notificationRepository: Repository<NotificationEntity>,
  ) {}

  async createNotification(data: CreateNotificationDto): Promise<NotificationEntity> {
    const notification = this.notificationRepository.create({
      userId: data.userId,
      type: data.type,
      message: data.message,
    });

    return await this.notificationRepository.save(notification);
  }

  async getNotificationsByUserId(userId: bigint, limit = 50): Promise<NotificationEntity[]> {
    return await this.notificationRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async getNotificationById(id: bigint): Promise<NotificationEntity> {
    const notification = await this.notificationRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return notification;
  }

  async deleteNotification(id: bigint): Promise<void> {
    const result = await this.notificationRepository.delete(id);

    if (result.affected === 0) {
      throw new NotFoundException('Notification not found');
    }
  }

  async deleteAllUserNotifications(userId: bigint): Promise<void> {
    await this.notificationRepository.delete({ userId });
  }

  async getNotificationCount(userId: bigint): Promise<number> {
    return await this.notificationRepository.count({
      where: { userId },
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
