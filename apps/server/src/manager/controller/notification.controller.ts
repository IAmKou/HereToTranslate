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
} from '@nestjs/common';
import { JwtAuthGuard } from '#LocalProject/Auth/guards/jwt.guard';
import type { AuthenticatedRequest } from '#LocalProject/Auth/types';
import { JsonSerializerInterceptor } from '#LocalProject/Utils/json-serializer.interceptor';
import { BigIntTransformPipe } from '#LocalProject/Utils/pipes/bigint-transform.pipe';
import { NotificationManagerService, CreateNotificationDto } from '../service/notification-manager.service';

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
  ) {
    const notifications = await this.notificationService.getNotificationsByUserId(
      req.user.id,
      limit || 50,
    );

    return {
      notifications: notifications.map(notification => ({
        id: notification.id.toString(),
        type: notification.type,
        message: notification.message,
        createdAt: notification.createdAt,
      })),
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('count')
  async getUserNotificationCount(@Req() req: AuthenticatedRequest) {
    const count = await this.notificationService.getNotificationCount(req.user.id);
    return { count };
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getNotification(
    @Param('id', BigIntTransformPipe) id: bigint,
    @Req() req: AuthenticatedRequest,
  ) {
    const notification = await this.notificationService.getNotificationById(id);

    // Check if notification belongs to the authenticated user
    if (notification.userId !== req.user.id) {
      throw new Error('Unauthorized access to notification');
    }

    return {
      id: notification.id.toString(),
      type: notification.type,
      message: notification.message,
      createdAt: notification.createdAt,
    };
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
    if (notification.userId !== req.user.id) {
      throw new Error('Unauthorized access to notification');
    }

    await this.notificationService.deleteNotification(id);
    return { message: 'Notification deleted successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @Delete()
  async deleteAllUserNotifications(@Req() req: AuthenticatedRequest) {
    await this.notificationService.deleteAllUserNotifications(req.user.id);
    return { message: 'All notifications deleted successfully' };
  }
}
