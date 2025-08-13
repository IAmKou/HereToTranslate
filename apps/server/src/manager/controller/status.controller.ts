import { Body, Controller, Get, Param, Post, Put, Delete, UseGuards, UseInterceptors } from '@nestjs/common';
import { JsonSerializerInterceptor } from '../../util/json-serializer.interceptor';
import { JwtAuthGuard } from '../../auth/guards/jwt.guard';
import { StatusManagerService } from '../service/task-status-manager.service';
import { CreateStatusDto, UpdateStatusDto } from '#LocalProject/Dtos';

@Controller('task-statuses')
@UseGuards(JwtAuthGuard)
@UseInterceptors(JsonSerializerInterceptor)
export class StatusController {
  constructor(private readonly statusService: StatusManagerService) {}

  @Get('project/:projectId')
  async getProjectStatuses(@Param('projectId') projectId: string) {
    return this.statusService.getProjectStatuses(projectId);
  }

  @Post('project/:projectId')
  async createStatus(@Param('projectId') projectId: string, @Body() dto: CreateStatusDto) {
    return this.statusService.createStatus(projectId, dto);
  }

  @Put(':id')
  async updateStatus(@Param('id') id: string, @Body() dto: UpdateStatusDto) {
    return this.statusService.updateStatus(id, dto);
  }

  @Delete(':id')
  async deleteStatus(@Param('id') id: string) {
    return this.statusService.deleteStatus(id);
  }

  @Post('project/:projectId/defaults')
  async createDefaultStatuses(@Param('projectId') projectId: string) {
    return this.statusService.createDefaultStatuses(projectId);
  }

  @Get('project/:projectId/export')
  async exportStatuses(@Param('projectId') projectId: string) {
    return this.statusService.getProjectStatuses(projectId);
  }


}
