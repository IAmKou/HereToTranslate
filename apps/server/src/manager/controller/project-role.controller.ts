import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
  UseInterceptors,
  ValidationPipe
} from '@nestjs/common';
import { JwtAuthGuard } from '#LocalProject/Auth/guards/jwt.guard';
import { BigIntTransformPipe } from '#LocalProject/Utils/pipes/bigint-transform.pipe';
import type { AuthenticatedRequest } from '#LocalProject/Auth/types';
import { CreateProjectRoleDto, UpdateProjectRoleDto, UserIdsArray } from '#LocalProject/Dtos';
import { ProjectRoleManagerService } from '#LocalProject/Managers/service/project-role-manager.service';
import { JsonSerializerInterceptor } from '#LocalProject/Utils/json-serializer.interceptor';

@Controller('projects/:projectId/roles')
@UseInterceptors(JsonSerializerInterceptor)
export class ProjectRoleController {
  constructor(private readonly roles: ProjectRoleManagerService) {
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async fetchAllRoles(
    @Param('projectId', BigIntTransformPipe) projectId: bigint,
    @Req() req: AuthenticatedRequest
  ) {
    return this.roles.fetchProjectRoles(req.user.id, projectId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('/:roleId')
  async fetchRoleMetadata(
    @Param('projectId', BigIntTransformPipe) projectId: bigint,
    @Param('roleId', BigIntTransformPipe) roleId: bigint,
    @Req() req: AuthenticatedRequest
  ) {
    return this.roles.fetchProjectRoles(req.user.id, projectId, roleId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('/:roleId/users')
  async fetchUsersInRole(
    @Param('projectId', BigIntTransformPipe) projectId: bigint,
    @Param('roleId', BigIntTransformPipe) roleId: bigint,
    @Req() req: AuthenticatedRequest
  ) {
    return this.roles.fetchUsersInRole(req.user.id, projectId, roleId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('/create')
  async createRole(
    @Param('projectId', BigIntTransformPipe) projectId: bigint,
    @Body(ValidationPipe) roleData: CreateProjectRoleDto,
    @Req() req: AuthenticatedRequest
  ) {
    return this.roles.createProjectRole(req.user.id, projectId, roleData);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('/:roleId')
  async updateRole(
    @Param('projectId', BigIntTransformPipe) projectId: bigint,
    @Param('roleId', BigIntTransformPipe) roleId: bigint,
    @Body(ValidationPipe) roleUpdateData: UpdateProjectRoleDto,
    @Req() req: AuthenticatedRequest
  ) {
    return this.roles.updateProjectRole(req.user.id, projectId, roleId, roleUpdateData);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('/:roleId')
  async deleteRole(
    @Param('projectId', BigIntTransformPipe) projectId: bigint,
    @Param('roleId', BigIntTransformPipe) roleId: bigint,
    @Req() req: AuthenticatedRequest
  ) {
    return this.roles.deleteProjectRole(req.user.id, projectId, roleId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('/:roleId/users/add')
  async addUsersToRole(
    @Param('projectId', BigIntTransformPipe) projectId: bigint,
    @Param('roleId', BigIntTransformPipe) roleId: bigint,
    @Body(ValidationPipe) userIds: UserIdsArray,
    @Req() req: AuthenticatedRequest
  ) {
    return this.roles.addUsersToRole(req.user.id, projectId, roleId, userIds.userIds);
  }

  @UseGuards(JwtAuthGuard)
  @Post('/:roleId/users/remove')
  async removeUsersFromRole(
    @Param('projectId', BigIntTransformPipe) projectId: bigint,
    @Param('roleId', BigIntTransformPipe) roleId: bigint,
    @Body(ValidationPipe) userIds: UserIdsArray,
    @Req() req: AuthenticatedRequest
  ) {
    return this.roles.removeUsersFromRole(req.user.id, projectId, roleId, userIds.userIds);
  }

}
