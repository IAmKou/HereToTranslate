import { Controller, Post, Body, Get, Patch, Delete, UseGuards, Req, UseInterceptors, ClassSerializerInterceptor, Param } from '@nestjs/common';
import { ProjectManagerService } from '../service/project-manager.service';
import { CreateProjectDto, UpdateProjectDto } from '#LocalProject/Dtos';
import { IsPublicEndpoint } from '../../auth/decorators/is-public-endpoint.decorator';
import { JwtAuthGuard } from '#LocalProject/Auth/guards/jwt.guard';
import type { AuthenticatedRequest } from '#LocalProject/Auth/types';
import { JsonSerializerInterceptor } from '#LocalProject/Utils/json-serializer.interceptor';
import { JwtFallthroughGuard } from '#LocalProject/Auth/guards/jwt-fallthrough.guard';

// @UseInterceptors(ClassSerializerInterceptor)
@Controller('projects')
export class ProjectController {
  constructor(private readonly projects: ProjectManagerService) {}

  @UseInterceptors(JsonSerializerInterceptor)
  @UseGuards(JwtAuthGuard)
  @Post('create')
  async create(@Body() projectData: CreateProjectDto, @Req() req: AuthenticatedRequest) {
    return this.projects.create(req.user.id, projectData);
  }

  @UseInterceptors(JsonSerializerInterceptor)
  @UseGuards(JwtFallthroughGuard)
  @IsPublicEndpoint()
  @Get(':projectId')
  async fetchProject(@Param('projectId') projectId: bigint, @Req() req: AuthenticatedRequest) {
    return this.projects.fetchProject(projectId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':projectId')
  async update(@Param('projectId') projectId: bigint, @Body() projectUpdateData: UpdateProjectDto) {
    return this.projects.updateProject(projectId, projectUpdateData);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':projectId')
  async delete(@Body('projectId') projectId: bigint) {
    await this.projects.deleteProject(projectId);
    return { message: `Project with ID ${projectId} deleted successfully` };
  }
}
