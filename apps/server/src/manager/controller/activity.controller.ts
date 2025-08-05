import { Controller, Get, Post, Param, Query, Body, UseGuards, Request } from '@nestjs/common';
import { ActivityManagerService } from '../service/activity-manager.service';
import { JwtAuthGuard } from '../../auth/guards/jwt.guard';

@Controller('projects/:projectId/activities')
@UseGuards(JwtAuthGuard)
export class ActivityController {
  constructor(private readonly activityManagerService: ActivityManagerService) {}

  @Get()
  async getActivities(
    @Param('projectId') projectId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('timeRange') timeRange?: string,
    @Query('userId') userId?: string,
    @Query('types') types?: string,
  ) {
    const parsedPage = page ? parseInt(page, 10) : 1;
    const parsedLimit = limit ? parseInt(limit, 10) : 20;
    const parsedUserId = userId ? parseInt(userId, 10) : undefined;
    const parsedTypes = types ? types.split(',') : undefined;

    return await this.activityManagerService.getActivities({
      projectId: parseInt(projectId, 10),
      page: parsedPage,
      limit: parsedLimit,
      timeRange,
      userId: parsedUserId,
      types: parsedTypes,
    });
  }

  @Post(':activityId/undo')
  async undoActivity(
    @Param('projectId') projectId: string,
    @Param('activityId') activityId: string,
    @Request() req: any,
  ) {
    const success = await this.activityManagerService.undoActivity(
      activityId,
      parseInt(projectId, 10),
    );

    return { success };
  }
}
