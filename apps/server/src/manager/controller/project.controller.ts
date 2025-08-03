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
  UploadedFile,
  InternalServerErrorException,
} from '@nestjs/common';
import { CreateProjectDto, UpdateProjectMetadataDto } from '#LocalProject/Dtos';
import { IsPublicEndpoint } from '#LocalProject/Auth/decorators/is-public-endpoint.decorator';
import { JwtAuthGuard } from '#LocalProject/Auth/guards/jwt.guard';
import type { AuthenticatedRequest } from '#LocalProject/Auth/types';
import { JwtFallthroughGuard } from '#LocalProject/Auth/guards/jwt-fallthrough.guard';
import { JsonSerializerInterceptor } from '#LocalProject/Utils/json-serializer.interceptor';
import { BigIntTransformPipe } from '#LocalProject/Utils/pipes/bigint-transform.pipe';
import { ProjectManagerService } from '../service/project-manager.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { FileService } from '../service/file-manager.service';

@Controller('projects')
@UseInterceptors(JsonSerializerInterceptor)
export class ProjectController {
  constructor(
    private readonly projects: ProjectManagerService,
    private readonly fileService: FileService
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post('create')
  async create(
    @Body(ValidationPipe) projectData: CreateProjectDto,
    @Req() req: AuthenticatedRequest
  ) {
    const result = await this.projects.createProject(req.user.id, projectData);
    console.log('ProjectController.create result:', result);
    return result;
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
  async delete(
    @Param('projectId', BigIntTransformPipe) projectId: bigint,
    @Req() req: AuthenticatedRequest
  ) {
    await this.projects.deleteProject(projectId, req.user.id);
    return { message: `Project with ID ${projectId} deleted successfully` };
  }

  @UseGuards(JwtAuthGuard)
  @Get('admin/count')
  async getAdminProjectsCount(@Req() req: AuthenticatedRequest) {
    const count = await this.projects.getProjectsCount();
    return { count };
  }

  @UseGuards(JwtAuthGuard)
  @Post(':projectId/search-user')
  async searchUserToAdd(
    @Param('projectId', BigIntTransformPipe) projectId: bigint,
    @Body('identifier') identifier: string,
    @Req() req: AuthenticatedRequest
  ): Promise<{ users: Array<{ id: bigint; fullName: string; email: string; phone: string }> }> {
    if (!identifier?.trim()) {
      throw new BadRequestException('Identifier is required');
    }

    const users = await this.projects.findUserToProject(
      projectId,
      identifier.trim(),
      req.user.id
    );

    return { users };
  }


  @UseGuards(JwtAuthGuard)
  @Post(':projectId/add-user')
  async addUserToProject(
    @Param('projectId', BigIntTransformPipe) projectId: bigint,
    @Body('userId', BigIntTransformPipe) userId: bigint,
    @Req() req: AuthenticatedRequest
  ) {
    try {
      const updatedProject = await this.projects.addUserToProject(
        projectId,
        userId,
        req.user.id
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
  @Post(':projectId/remove-user')
  async removeUserFromProject(
    @Param('projectId', BigIntTransformPipe) projectId: bigint,
    @Body('userId', BigIntTransformPipe) userId: bigint
  ) {
    return this.projects.removeUserFromProject(projectId, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':projectId/members')
  async getAllMembers(
    @Param('projectId', BigIntTransformPipe) projectId: bigint
  ) {
    const { members, projectRoles } = await this.projects.getProjectMembersWithRoles(projectId);
    return { members, projectRoles };
  }

  @UseGuards(JwtAuthGuard)
  @Post(':projectId/branches')
  async createBranch(
    @Param('projectId', BigIntTransformPipe) projectId: bigint,
    @Req() req: AuthenticatedRequest,
    @Body() body: { displayName: string; fromBranchId?: bigint }
  ) {
    return this.projects.createBranch(
      projectId,
      req.user.id,
      body.displayName,
      body.fromBranchId
    );
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':projectId/:branchId/rename')
  async editBranch(
    @Param('projectId', BigIntTransformPipe) projectId: bigint,
    @Param('branchId', BigIntTransformPipe) branchId: bigint,
    @Req() req: AuthenticatedRequest,
    @Body() body: { newName: string }
  ) {
    return this.projects.renameBranchName(
      branchId,
      req.user.id,
      projectId,
      body.newName
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get(':projectId/branches')
  async getBranches(
    @Param('projectId', BigIntTransformPipe) projectId: bigint,
    @Req() req: AuthenticatedRequest
  ) {
    return this.projects.listBranchesForProject(projectId, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':projectId/getBranches')
  async getAllBranch(
    @Param('projectId', BigIntTransformPipe) projectId: bigint,
    @Req() req: AuthenticatedRequest
  ) {
    return this.projects.listBranchesForProject(projectId, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':projectId/:branchId/commit')
  async submitCommit(
    @Param('projectId', BigIntTransformPipe) projectId: bigint,
    @Param('branchId', BigIntTransformPipe) branchId: bigint,
    @Req() req: AuthenticatedRequest,
    @Body() body: { filePath: string; content: string; message: string }
  ) {
    return this.projects.submitCommit(
      projectId,
      req.user.id,
      branchId,
      body.filePath,
      body.content,
      body.message
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post(':projectId/:commitId/review')
  async reviewCommit(
    @Param('projectId', BigIntTransformPipe) projectId: bigint,
    @Param('commitId', BigIntTransformPipe) commitId: bigint,
    @Req() req: AuthenticatedRequest,
    @Body() body: { approve: boolean; reviewMessage?: string }
  ) {
    return this.projects.reviewCommit(
      projectId,
      commitId,
      req.user.id,
      body.approve,
      body.reviewMessage
    );
  }

  @Get(':projectId/:branchId/listCommit')
  async getCommitsFromGitHub(
    @Param('projectId', BigIntTransformPipe) projectId: bigint,
    @Param('branchId', BigIntTransformPipe) branchId: bigint
  ) {
    return this.projects.listCommits(projectId, branchId);
  }

  @Get(':projectId/:branchId/local-commits')
  async getLocalCommits(
    @Param('projectId', BigIntTransformPipe) projectId: bigint,
    @Param('branchId', BigIntTransformPipe) branchId: bigint
  ) {
    return this.projects.getLocalCommits(projectId, branchId);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':projectId/files')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  async uploadProjectFile(
    @Param('projectId', BigIntTransformPipe) projectId: bigint,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: AuthenticatedRequest
  ) {
    try {
      console.log('File received at controller:', file);
      if (!file) throw new InternalServerErrorException('No file received at controller');
      const result = await this.fileService.handleUpload(file, req.user.id, projectId);
      console.log('Upload result:', result);
      return result;
    } catch (error) {
      console.error('Upload file error:', error);
      throw new InternalServerErrorException('Upload failed: ' + (error?.toString() || error));
    }
  }
}
