import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { ProjectService } from './project.service';
import { ProjectResponseDto } from './dto/project.dto';
import { Public } from '../auth/public.decorator';

@Controller('projects')
// @UseGuards(JwtAuthGuard)
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Get()
  @Public() // Optional: Remove this if you want to require authentication
  async findAll(): Promise<ProjectResponseDto[]> {
    return this.projectService.findAll();
  }
}