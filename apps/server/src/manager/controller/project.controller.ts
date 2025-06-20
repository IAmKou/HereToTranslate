import { Controller, Post, Body, Get, Patch, Delete, UseGuards, Req, UseInterceptors, Param, ValidationPipe } from '@nestjs/common';
import { CreateDiscussionDto, CreateProjectDto, CreateProjectGroupDto, CreateProjectRoleDto, PostCommentDto, UpdateCommentDto, UpdateDiscussionDto, UpdateProjectMetadataDto, UpdateProjectRoleDto, UserIdsArray } from '#LocalProject/Dtos';
import { IsPublicEndpoint } from '#LocalProject/Auth/decorators/is-public-endpoint.decorator';
import { JwtAuthGuard } from '#LocalProject/Auth/guards/jwt.guard';
import type { AuthenticatedRequest } from '#LocalProject/Auth/types';
import { JwtFallthroughGuard } from '#LocalProject/Auth/guards/jwt-fallthrough.guard';
import { JsonSerializerInterceptor } from '#LocalProject/Utils/json-serializer.interceptor';
import { BigIntTransformPipe } from '#LocalProject/Utils/pipes/bigint-transform.pipe';
import { ProjectManagerService } from '../service/project-manager.service';
import { DiscussionManagerService } from '../service/discussion-manager.service';

// @UseInterceptors(ClassSerializerInterceptor)
@Controller('projects')
@UseInterceptors(JsonSerializerInterceptor)
export class ProjectController {
  constructor(
    private readonly projects: ProjectManagerService,
    private readonly discussions: DiscussionManagerService
  ) {}

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
    return this.projects.updateProjectMetadata(req.user.id, projectId, projectUpdateData);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':projectId')
  async delete(@Body('projectId', BigIntTransformPipe) projectId: bigint) {
    await this.projects.deleteProject(projectId);
    return { message: `Project with ID ${projectId} deleted successfully` };
  }

  @UseGuards(JwtAuthGuard)
  @Get(':projectId/roles')
  async fetchAllRoles(
    @Param('projectId', BigIntTransformPipe) projectId: bigint,
    @Req() req: AuthenticatedRequest
  ) {
    return this.projects.fetchProjectRoles(req.user.id, projectId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':projectId/roles/:roleId')
  async fetchRoleMetadata(
    @Param('projectId', BigIntTransformPipe) projectId: bigint,
    @Param('roleId', BigIntTransformPipe) roleId: bigint,
    @Req() req: AuthenticatedRequest
  ) {
    return this.projects.fetchProjectRoles(req.user.id, projectId, roleId);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':projectId/roles/create')
  async createRole(
    @Param('projectId', BigIntTransformPipe) projectId: bigint,
    @Body(ValidationPipe) roleData: CreateProjectRoleDto,
    @Req() req: AuthenticatedRequest
  ) {
    return this.projects.addProjectRole(req.user.id, projectId, roleData);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':projectId/roles/:roleId')
  async updateRole(
    @Param('projectId', BigIntTransformPipe) projectId: bigint,
    @Param('roleId', BigIntTransformPipe) roleId: bigint,
    @Body(ValidationPipe) roleUpdateData: UpdateProjectRoleDto,
    @Req() req: AuthenticatedRequest
  ) {
    return this.projects.updateProjectRole(req.user.id, projectId, roleId, roleUpdateData);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':projectId/roles/:roleId')
  async deleteRole(
    @Param('projectId', BigIntTransformPipe) projectId: bigint,
    @Param('roleId', BigIntTransformPipe) roleId: bigint,
    @Req() req: AuthenticatedRequest
  ) {
    return this.projects.deleteProjectRole(req.user.id, projectId, roleId);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':projectId/roles/:roleId/users/add')
  async addUsersToRole(
    @Param('projectId', BigIntTransformPipe) projectId: bigint,
    @Param('roleId', BigIntTransformPipe) roleId: bigint,
    @Body(ValidationPipe) userIds: UserIdsArray,
    @Req() req: AuthenticatedRequest
  ) {
    return this.projects.addUsersToRole(req.user.id, projectId, roleId, userIds.userIds);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':projectId/roles/:roleId/users/remove')
  async removeUsersFromRole(
    @Param('projectId', BigIntTransformPipe) projectId: bigint,
    @Param('roleId', BigIntTransformPipe) roleId: bigint,
    @Body(ValidationPipe) userIds: UserIdsArray,
    @Req() req: AuthenticatedRequest
  ) {
    return this.projects.removeUsersFromRole(req.user.id, projectId, roleId, userIds.userIds);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':projectId/groups')
  async fetchAllGroups(
    @Param('projectId', BigIntTransformPipe) projectId: bigint,
    @Req() req: AuthenticatedRequest
  ) {
    return this.projects.fetchProjectGroups(req.user.id, projectId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':projectId/groups/:groupId')
  async fetchGroupMetadata(
    @Param('projectId', BigIntTransformPipe) projectId: bigint,
    @Param('groupId', BigIntTransformPipe) groupId: bigint,
    @Req() req: AuthenticatedRequest
  ) {
    return this.projects.fetchProjectGroups(req.user.id, projectId, groupId);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':projectId/groups/create')
  async createGroup(
    @Param('projectId', BigIntTransformPipe) projectId: bigint,
    @Body(ValidationPipe) groupData: CreateProjectGroupDto,
    @Req() req: AuthenticatedRequest
  ) {
    return this.projects.createProjectGroup(req.user.id, projectId, groupData);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':projectId/groups/:groupId')
  async updateGroup(
    @Param('projectId', BigIntTransformPipe) projectId: bigint,
    @Param('groupId', BigIntTransformPipe) groupId: bigint,
    @Body(ValidationPipe) groupUpdateData: CreateProjectGroupDto,
    @Req() req: AuthenticatedRequest
  ) {
    return this.projects.updateProjectGroupMetadata(req.user.id, projectId, groupId, groupUpdateData);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':projectId/groups/:groupId')
  async deleteGroup(
    @Param('projectId', BigIntTransformPipe) projectId: bigint,
    @Param('groupId', BigIntTransformPipe) groupId: bigint,
    @Req() req: AuthenticatedRequest
  ) {
    return this.projects.deleteProjectGroup(req.user.id, projectId, groupId);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':projectId/groups/:groupId/users/add')
  async addUsersToGroup(
    @Param('projectId', BigIntTransformPipe) projectId: bigint,
    @Param('groupId', BigIntTransformPipe) groupId: bigint,
    @Body(ValidationPipe) userIds: UserIdsArray,
    @Req() req: AuthenticatedRequest
  ) {
    return this.projects.addUsersToGroup(req.user.id, projectId, groupId, userIds.userIds);
  }


  @UseGuards(JwtAuthGuard)
  @Post(':projectId/groups/:groupId/users/remove')
  async removeUsersFromGroup(
    @Param('projectId', BigIntTransformPipe) projectId: bigint,
    @Param('groupId', BigIntTransformPipe) groupId: bigint,
    @Body(ValidationPipe) userIds: UserIdsArray,
    @Req() req: AuthenticatedRequest
  ) {
    return this.projects.removeUsersFromGroup(req.user.id, projectId, groupId, userIds.userIds);
  }

  @UseGuards(JwtFallthroughGuard)
  @IsPublicEndpoint()
  @Get(':projectId/discussions')
  async fetchProjectDiscussions(
    @Param('projectId', BigIntTransformPipe) projectId: bigint,
    @Req() req: Partial<AuthenticatedRequest>
  ) {
    return this.discussions.fetchDiscussions(req.user?.id, projectId);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':projectId/discussions/create')
  async createDiscussion(
    @Param('projectId', BigIntTransformPipe) projectId: bigint,
    @Body(ValidationPipe) discussionData: CreateDiscussionDto,
    @Req() req: AuthenticatedRequest
  ) {
    return this.projects.createDiscussion(req.user.id, projectId, discussionData);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':projectId/discussions/:threadId')
  async updateDiscussionMetadata(
    @Param('projectId', BigIntTransformPipe) projectId: bigint,
    @Param('threadId', BigIntTransformPipe) threadId: bigint,
    @Body(ValidationPipe) discussionUpdateData: UpdateDiscussionDto, // Replace with actual DTO
    @Req() req: AuthenticatedRequest
  ) {
    return this.projects.updateDiscussionMetadata(req.user.id, projectId, threadId, discussionUpdateData);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':projectId/discussions/:threadId/archive')
  async archiveDiscussion(
    @Param('projectId', BigIntTransformPipe) projectId: bigint,
    @Param('threadId', BigIntTransformPipe) threadId: bigint,
    @Req() req: AuthenticatedRequest
  ) {
    return this.projects.archiveDiscussion(req.user.id, projectId, threadId);
  }

  @UseGuards(JwtFallthroughGuard)
  @IsPublicEndpoint()
  @Get(':projectId/discussions/:threadId')
  async fetchDiscussionThread(
    @Param('projectId', BigIntTransformPipe) projectId: bigint,
    @Param('threadId', BigIntTransformPipe) threadId: bigint,
    @Req() req: Partial<AuthenticatedRequest>
  ) {
    // TODO: Some threads can be publicly accessed without authentication
    return this.discussions.fetchDiscussion(req.user?.id, projectId, threadId);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':projectId/discussions/:threadId/post')
  async postDiscussionComment(
    @Param('threadId', BigIntTransformPipe) threadId: bigint,
    @Body(ValidationPipe) commentData: PostCommentDto,
    @Req() req: AuthenticatedRequest
  ) {
    return this.discussions.postComment(req.user.id, threadId, commentData);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':projectId/discussions/:threadId/:commentId')
  async updateDiscussionComment(
    @Param('threadId', BigIntTransformPipe) threadId: bigint,
    @Param('commentId', BigIntTransformPipe) commentId: bigint,
    @Body(ValidationPipe) commentUpdateData: UpdateCommentDto,
    @Req() req: AuthenticatedRequest
  ) {
    return this.discussions.updateDiscussionComment(req.user.id, threadId, commentId, commentUpdateData);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':projectId/discussions/:threadId/:commentId')
  async deleteDiscussionComment(
    @Param('threadId', BigIntTransformPipe) threadId: bigint,
    @Param('commentId', BigIntTransformPipe) commentId: bigint,
    @Req() req: AuthenticatedRequest
  ) {
    return this.discussions.deleteDiscussionComment(req.user.id, threadId, commentId);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':projectId/discussions/:threadId/:commentId/upvote')
  async upvoteDiscussionComment(
    @Param('threadId', BigIntTransformPipe) threadId: bigint,
    @Param('commentId', BigIntTransformPipe) commentId: bigint,
    @Req() req: AuthenticatedRequest
  ) {
    return this.discussions.upvoteDiscussionComment(req.user.id, threadId, commentId);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':projectId/discussions/:threadId/:commentId/downvote')
  async downvoteDiscussionComment(
    @Param('threadId', BigIntTransformPipe) threadId: bigint,
    @Param('commentId', BigIntTransformPipe) commentId: bigint,
    @Req() req: AuthenticatedRequest
  ) {
    return this.discussions.downvoteDiscussionComment(req.user.id, threadId, commentId);
  }
}
