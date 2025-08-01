import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Req,
  UseGuards,
  UseInterceptors,
  Query,
  ParseIntPipe,
  Patch,
  Put,
} from '@nestjs/common';
import { JwtAuthGuard } from '#LocalProject/Auth/guards/jwt.guard';
import type { AuthenticatedRequest } from '#LocalProject/Auth/types';
import { JsonSerializerInterceptor } from '#LocalProject/Utils/json-serializer.interceptor';
import { BigIntTransformPipe } from '#LocalProject/Utils/pipes/bigint-transform.pipe';
import { NotificationManagerService, CreateNotificationDto, UpdateNotificationDto } from '../service/notification-manager.service';

@Controller('notifications')
@UseInterceptors(JsonSerializerInterceptor)
export class NotificationController {
  constructor(
    private readonly notificationService: NotificationManagerService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async getUserNotifications(
    @Req() req: AuthenticatedRequest,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    const notifications = await this.notificationService.getNotificationsByUserId(
      req.user.id,
      limit || 50,
      unreadOnly === 'true',
    );

    return {
      notifications: notifications.map(notification => ({
        id: notification.id.toString(),
        type: notification.type,
        message: notification.message,
        isRead: notification.isRead,
        readAt: notification.readAt,
        createdAt: notification.createdAt,
        updatedAt: notification.updatedAt,
        isGlobal: notification.isGlobal,
        createdBy: notification.creator ? {
          id: notification.creator.id.toString(),
          username: notification.creator.username,
          fullName: notification.creator.fullName,
        } : null,
      })),
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('count')
  async getUserNotificationCount(@Req() req: AuthenticatedRequest) {
    const totalCount = await this.notificationService.getNotificationCount(req.user.id);
    const unreadCount = await this.notificationService.getUnreadNotificationCount(req.user.id);

    return {
      total: totalCount,
      unread: unreadCount
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getNotification(
    @Param('id', BigIntTransformPipe) id: bigint,
    @Req() req: AuthenticatedRequest,
  ) {
    const notification = await this.notificationService.getNotificationById(id);

    // Check if notification belongs to the authenticated user or is global
    if (!notification.isGlobal && notification.userId !== req.user.id) {
      throw new Error('Unauthorized access to notification');
    }

    return {
      id: notification.id.toString(),
      type: notification.type,
      message: notification.message,
      isRead: notification.isRead,
      readAt: notification.readAt,
      createdAt: notification.createdAt,
      updatedAt: notification.updatedAt,
      isGlobal: notification.isGlobal,
      createdBy: notification.creator ? {
        id: notification.creator.id.toString(),
        username: notification.creator.username,
        fullName: notification.creator.fullName,
      } : null,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/read')
  async markNotificationAsRead(
    @Param('id', BigIntTransformPipe) id: bigint,
    @Req() req: AuthenticatedRequest,
  ) {
    await this.notificationService.markAsRead(id, req.user.id);
    return { message: 'Notification marked as read' };
  }

  @UseGuards(JwtAuthGuard)
  @Patch('mark-all-read')
  async markAllNotificationsAsRead(@Req() req: AuthenticatedRequest) {
    await this.notificationService.markAllAsRead(req.user.id);
    return { message: 'All notifications marked as read' };
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async createNotification(
    @Body() data: Omit<CreateNotificationDto, 'userId'>,
    @Req() req: AuthenticatedRequest,
  ) {
    const notification = await this.notificationService.createNotification({
      ...data,
      userId: req.user.id,
    });

    return {
      id: notification.id.toString(),
      type: notification.type,
      message: notification.message,
      createdAt: notification.createdAt,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async deleteNotification(
    @Param('id', BigIntTransformPipe) id: bigint,
    @Req() req: AuthenticatedRequest,
  ) {
    // First check if notification belongs to user
    const notification = await this.notificationService.getNotificationById(id);
    if (!notification.isGlobal && notification.userId !== req.user.id) {
      throw new Error('Unauthorized access to notification');
    }

    await this.notificationService.deleteNotification(id);
    return { message: 'Notification deleted successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  async updateNotification(
    @Param('id', BigIntTransformPipe) id: bigint,
    @Body() data: UpdateNotificationDto,
    @Req() req: AuthenticatedRequest,
  ) {
    // First check if notification belongs to user
    const notification = await this.notificationService.getNotificationById(id);
    if (!notification.isGlobal && notification.userId !== req.user.id) {
      throw new Error('Unauthorized access to notification');
    }

    const updatedNotification = await this.notificationService.updateNotification(id, data);
    return {
      id: updatedNotification.id.toString(),
      type: updatedNotification.type,
      message: updatedNotification.message,
      isRead: updatedNotification.isRead,
      readAt: updatedNotification.readAt,
      createdAt: updatedNotification.createdAt,
      updatedAt: updatedNotification.updatedAt,
      isGlobal: updatedNotification.isGlobal,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Delete()
  async deleteAllUserNotifications(@Req() req: AuthenticatedRequest) {
    await this.notificationService.deleteAllUserNotifications(req.user.id);
    return { message: 'All notifications deleted successfully' };
  }
}
