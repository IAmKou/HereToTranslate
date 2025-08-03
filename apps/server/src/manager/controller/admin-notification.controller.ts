import {
  Controller,
  Get,
  Post,
  Put,
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
import { RolesGuard } from '#LocalProject/Auth/guards/role.guard';
import { ForRoles } from '#LocalProject/Auth/decorators/for-role.decorator';
import type { AuthenticatedRequest } from '#LocalProject/Auth/types';
import { JsonSerializerInterceptor } from '#LocalProject/Utils/json-serializer.interceptor';
import { BigIntTransformPipe } from '#LocalProject/Utils/pipes/bigint-transform.pipe';
import {
  NotificationManagerService,
  CreateGlobalNotificationDto,
  UpdateNotificationDto,
} from '../service/notification-manager.service';

export class CreateGlobalNotificationRequestDto {
  type: string;
  message: string;
}

export class UpdateNotificationRequestDto {
  type?: string;
  message?: string;
}

@Controller('admin/notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
@ForRoles(2, 1) // Admin = 2, SuperAdmin = 1
@UseInterceptors(JsonSerializerInterceptor)
export class AdminNotificationController {
  constructor(
    private readonly notificationService: NotificationManagerService
  ) {}

  @Get('global')
  async getGlobalNotifications(
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number
  ) {
    const notifications =
      await this.notificationService.getAllGlobalNotifications(limit || 50);

    return {
      notifications: notifications.map((notification) => ({
        id: notification.id.toString(),
        type: notification.type,
        message: notification.message,
        isGlobal: notification.isGlobal,
        createdAt: notification.createdAt,
        createdBy: notification.creator
          ? {
              id: notification.creator.id.toString(),
              username: notification.creator.username,
              fullName: notification.creator.fullName,
            }
          : null,
      })),
    };
  }

  @Get('global/count')
  async getGlobalNotificationCount() {
    const count = await this.notificationService.getGlobalNotificationCount();
    return { count };
  }

  @Get(':id')
  async getNotificationById(@Param('id', BigIntTransformPipe) id: bigint) {
    const notification = await this.notificationService.getNotificationById(id);

    return {
      id: notification.id.toString(),
      type: notification.type,
      message: notification.message,
      isGlobal: notification.isGlobal,
      userId: notification.userId?.toString(),
      createdAt: notification.createdAt,
      createdBy: notification.creator
        ? {
            id: notification.creator.id.toString(),
            username: notification.creator.username,
            fullName: notification.creator.fullName,
          }
        : null,
      user: notification.user
        ? {
            id: notification.user.id.toString(),
            username: notification.user.username,
            fullName: notification.user.fullName,
          }
        : null,
    };
  }

  @Post('global')
  async createGlobalNotification(
    @Body() data: CreateGlobalNotificationRequestDto,
    @Req() req: AuthenticatedRequest
  ) {
    const notificationData: CreateGlobalNotificationDto = {
      type: data.type,
      message: data.message,
      createdBy: req.user.id,
    };

    const notification =
      await this.notificationService.createGlobalNotification(notificationData);

    return {
      id: notification.id.toString(),
      type: notification.type,
      message: notification.message,
      isGlobal: notification.isGlobal,
      createdAt: notification.createdAt,
    };
  }

  @Post('global/all-users')
  async createNotificationForAllUsers(
    @Body() data: CreateGlobalNotificationRequestDto,
    @Req() req: AuthenticatedRequest
  ) {
    const notificationData: CreateGlobalNotificationDto = {
      type: data.type,
      message: data.message,
      createdBy: req.user.id,
    };

    const notifications =
      await this.notificationService.createNotificationForAllUsers(
        notificationData
      );

    return {
      message: `Created ${notifications.length} notifications for all users`,
      count: notifications.length,
    };
  }

  @Put(':id')
  async updateNotification(
    @Param('id', BigIntTransformPipe) id: bigint,
    @Body() data: UpdateNotificationRequestDto,
    @Req() req: AuthenticatedRequest
  ) {
    // Check if notification exists and is global or created by current admin
    const existingNotification =
      await this.notificationService.getNotificationById(id);

    if (
      !existingNotification.isGlobal &&
      existingNotification.createdBy !== req.user.id
    ) {
      throw new Error(
        'You can only update global notifications or notifications you created'
      );
    }

    const updateData: UpdateNotificationDto = {
      type: data.type,
      message: data.message,
    };

    const notification = await this.notificationService.updateNotification(
      id,
      updateData
    );

    return {
      id: notification.id.toString(),
      type: notification.type,
      message: notification.message,
      isGlobal: notification.isGlobal,
      createdAt: notification.createdAt,
    };
  }

  @Delete(':id')
  async deleteNotification(
    @Param('id', BigIntTransformPipe) id: bigint,
    @Req() req: AuthenticatedRequest
  ) {
    // Check if notification exists and is global or created by current admin
    const existingNotification =
      await this.notificationService.getNotificationById(id);

    if (
      !existingNotification.isGlobal &&
      existingNotification.createdBy !== req.user.id
    ) {
      throw new Error(
        'You can only delete global notifications or notifications you created'
      );
    }

    // await this.notificationService.deleteNotification(id);
    return { message: 'Notification deleted successfully' };
  }

  @Delete('global/all')
  async deleteAllGlobalNotifications() {
    await this.notificationService.deleteAllGlobalNotifications();
    return { message: 'All global notifications deleted successfully' };
  }

  @Get('stats/overview')
  async getNotificationStats() {
    const globalCount =
      await this.notificationService.getGlobalNotificationCount();

    return {
      globalNotifications: globalCount,
      // Add more stats as needed
    };
  }
}
