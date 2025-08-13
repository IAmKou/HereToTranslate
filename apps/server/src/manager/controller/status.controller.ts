<<<<<<< Updated upstream
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { StatusManagerService } from '#LocalProject/Managers/service/task-status-manager.service';
=======
import { Body, Controller, Get, Param, Post, Put, Delete, UseGuards, UseInterceptors } from '@nestjs/common';
import { JsonSerializerInterceptor } from '../../util/json-serializer.interceptor';
import { JwtAuthGuard } from '../../auth/guards/jwt.guard';
import { StatusManagerService } from '../service/task-status-manager.service';
>>>>>>> Stashed changes
import { CreateStatusDto, UpdateStatusDto } from '#LocalProject/Dtos';
import { JwtAuthGuard } from '../../auth/guards/jwt.guard';

<<<<<<< Updated upstream
@Controller('projects/:projectId/statuses')
@UseGuards(JwtAuthGuard)
export class StatusController {
  constructor(private readonly statusService: StatusManagerService) {}

  @Post()
  async createStatus(
    @Param('projectId') projectId: string,
    @Body() dto: CreateStatusDto,
  ) {
    return await this.statusService.createStatus(projectId, dto);
  }

  @Get()
  async getProjectStatuses(@Param('projectId') projectId: string) {
    return await this.statusService.getProjectStatuses(projectId);
=======
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
>>>>>>> Stashed changes
  }

  @Put(':id')
  async updateStatus(@Param('id') id: string, @Body() dto: UpdateStatusDto) {
<<<<<<< Updated upstream
    return await this.statusService.updateStatus(id, dto);
=======
    return this.statusService.updateStatus(id, dto);
>>>>>>> Stashed changes
  }

  @Delete(':id')
  async deleteStatus(@Param('id') id: string) {
<<<<<<< Updated upstream
    return await this.statusService.deleteStatus(id);
  }

  @Post('reorder')
  async reorderStatuses(
    @Param('projectId') projectId: string,
    @Body('statusIds') statusIds: string[],
  ) {
    return await this.statusService.reorderStatuses(projectId, statusIds);
  }

  @Post('initialize-defaults')
  async createDefaultStatuses(@Param('projectId') projectId: string) {
    return await this.statusService.createDefaultStatuses(projectId);
  }
=======
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


>>>>>>> Stashed changes
}
