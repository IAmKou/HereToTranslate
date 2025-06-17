import { Controller, Post, Body, Get, Patch, Delete, UseGuards, Req, UseInterceptors, ClassSerializerInterceptor, Param, ValidationPipe } from '@nestjs/common';
import { ProjectManagerService } from '../service/project-manager.service';
import { CreateProjectDto, UpdateProjectDto } from '#LocalProject/Dtos';
import { IsPublicEndpoint } from '#LocalProject/Auth/decorators/is-public-endpoint.decorator';
import { JwtAuthGuard } from '#LocalProject/Auth/guards/jwt.guard';
import type { AuthenticatedRequest } from '#LocalProject/Auth/types';
import { JsonSerializerInterceptor } from '#LocalProject/Utils/json-serializer.interceptor';
import { JwtFallthroughGuard } from '#LocalProject/Auth/guards/jwt-fallthrough.guard';
import { BigIntTransformPipe } from '#LocalProject/Utils/pipes/bigint-transform.pipe';

// @UseInterceptors(ClassSerializerInterceptor)
@Controller('projects')
@UseInterceptors(JsonSerializerInterceptor)
export class ProjectController {
  constructor(private readonly projects: ProjectManagerService) {}

  @UseGuards(JwtAuthGuard)
  @Post('create')
  async create(
    @Body(ValidationPipe) projectData: CreateProjectDto,
    @Req() req: AuthenticatedRequest
  ) {
    return this.projects.createProject(req.user.id, projectData);
  }

  @UseGuards(JwtFallthroughGuard)
  @IsPublicEndpoint()
  @Get(':projectId')
  async fetchProject(
    @Param('projectId', BigIntTransformPipe) projectId: bigint,
    @Req() req: Partial<AuthenticatedRequest>
  ) {
    return this.projects.fetchProject(req.user?.id, BigInt(projectId));
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':projectId')
  async update(
    @Param('projectId', BigIntTransformPipe) projectId: bigint,
    @Body(ValidationPipe) projectUpdateData: UpdateProjectDto
  ) {
    return this.projects.updateProject(projectId, projectUpdateData);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':projectId')
  async delete(@Body('projectId', BigIntTransformPipe) projectId: bigint) {
    await this.projects.deleteProject(projectId);
    return { message: `Project with ID ${projectId} deleted successfully` };
  }
}
