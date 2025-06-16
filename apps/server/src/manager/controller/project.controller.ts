import { Controller, Post, Body, Get, Patch, Delete } from '@nestjs/common';
import { ProjectManagerService } from '../service/project-manager.service';
import { CreateProjectDto, UpdateProjectDto } from '#LocalProject/Dtos';
import { IsPublicEndpoint } from '../../auth/decorators/is-public-endpoint.decorator';

@Controller('projects')
export class ProjectController {
  constructor(private readonly projects: ProjectManagerService) {}

  @IsPublicEndpoint()
  @Post('create')
  create(@Body() projectData: CreateProjectDto) {
    return this.projects.create(projectData);
  }

  @Get(':projectId')
  project(@Body('projectId') projectId: bigint) {
    return this.projects.fetchProject(projectId);
  }

  @Patch(':projectId')
  update(@Body('projectId') projectId: bigint, @Body() projectUpdateData: UpdateProjectDto) {
    return this.projects.updateProject(projectId, projectUpdateData);
  }

  @Delete(':projectId')
  delete(@Body('projectId') projectId: bigint) {
    return this.projects.deleteProject(projectId);
  }
}
