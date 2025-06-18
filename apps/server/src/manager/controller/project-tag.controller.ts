import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { ProjectTagManagerService } from '../service/project-tag-manager.service';

interface CreateProjectTagDto {
  name: string;
}

interface UpdateProjectTagDto {
  name: string;
}

@Controller('project-tag')
export class ProjectTagController {
  constructor(private readonly projectTagService: ProjectTagManagerService) {}

  @Get('all')
  getProjectTags() {
    return this.projectTagService.getProjectTags();
  }

  @Post('create')
  createProjectTag(@Body() newTagData: CreateProjectTagDto) {
    return this.projectTagService.createProjectTag(newTagData);
  }

  @Put('update/:id')
  updateProjectTag(@Param('id') id: string, @Body() tagUpdateData: UpdateProjectTagDto) {
    return this.projectTagService.updateProjectTag(id, tagUpdateData);
  }

  @Delete('delete/:id')
  deleteProjectTag(@Param('id') id: string) {
    return this.projectTagService.deleteProjectTag(id);
  }
} 