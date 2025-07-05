import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
  UseInterceptors,
  ValidationPipe,
} from '@nestjs/common';
import { CreateProjectDto, UpdateProjectMetadataDto } from '#LocalProject/Dtos';
import { IsPublicEndpoint } from '#LocalProject/Auth/decorators/is-public-endpoint.decorator';
import { JwtAuthGuard } from '#LocalProject/Auth/guards/jwt.guard';
import type { AuthenticatedRequest } from '#LocalProject/Auth/types';
import { JwtFallthroughGuard } from '#LocalProject/Auth/guards/jwt-fallthrough.guard';
import { JsonSerializerInterceptor } from '#LocalProject/Utils/json-serializer.interceptor';
import { BigIntTransformPipe } from '#LocalProject/Utils/pipes/bigint-transform.pipe';
import { ProjectManagerService } from '../service/project-manager.service';
import { UserEntity } from '#LocalProject/Entities';

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

  @UseGuards(JwtAuthGuard)
  @Get('me/projects')
  async getMyProjects(@Req() req: AuthenticatedRequest) {
    const userId = req.user.id;
    return this.projects.fetchAllUserProjects(userId);
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
    @Body(ValidationPipe) projectUpdateData: UpdateProjectMetadataDto,
    @Req() req: AuthenticatedRequest
  ) {
    console.log(projectUpdateData);
    return this.projects.updateProjectMetadata(
      req.user.id,
      projectId,
      projectUpdateData
    );
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':projectId')
  async delete(@Param('projectId', BigIntTransformPipe) projectId: bigint) {
    await this.projects.deleteProject(projectId);
    return { message: `Project with ID ${projectId} deleted successfully` };
  }

  @UseGuards(JwtAuthGuard)
  @Post(':projectId/search-user')
  async searchUserToAdd(
    @Param('projectId', BigIntTransformPipe) projectId: bigint,
    @Body('identifier') identifier: string
  ): Promise<{ user: UserEntity | null }> {
    if (!identifier?.trim()) {
      throw new BadRequestException('Identifier is required');
    }

    const user = await this.projects.findUserToProject(
      projectId,
      identifier.trim()
    );
    return {
      user,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post(':projectId/add-user')
  async addUserToProject(
    @Param('projectId', BigIntTransformPipe) projectId: bigint,
    @Body('identifier') identifier: string
  ) {
    if (!identifier?.trim()) {
      throw new BadRequestException('Identifier is required');
    }

    try {
      const updatedProject = await this.projects.addUserToProject(
        projectId,
        identifier.trim()
      );
      return {
        message: 'User added successfully',
        project: updatedProject,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException(error);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get(':projectId/members')
  async getAllMembers(
    @Param('projectId', BigIntTransformPipe) projectId: bigint
  ) {
    const members = await this.projects.getProjectMembers(projectId);
    return { members };
  }
}
