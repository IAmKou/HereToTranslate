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
  import { StatusManagerService } from '#LocalProject/Managers/service/status-manager.service';
  import { CreateStatusDto, UpdateStatusDto } from '#LocalProject/Dtos';
  import { JwtAuthGuard } from '../../auth/guards/jwt.guard';
  
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
    }
  
    @Put(':id')
    async updateStatus(@Param('id') id: string, @Body() dto: UpdateStatusDto) {
      return await this.statusService.updateStatus(id, dto);
    }
  
    @Delete(':id')
    async deleteStatus(@Param('id') id: string) {
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
  }