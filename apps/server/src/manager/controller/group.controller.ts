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
  ValidationPipe,
} from '@nestjs/common';
import { GroupManagerService } from '#LocalProject/Managers/service/group-manager.service';
import { JwtAuthGuard } from '#LocalProject/Auth/guards/jwt.guard';
import { BigIntTransformPipe } from '#LocalProject/Utils/pipes/bigint-transform.pipe';
import { CreateProjectGroupDto, UserIdsArray } from '#LocalProject/Dtos';
import type { AuthenticatedRequest } from '#LocalProject/Auth/types';
import { JsonSerializerInterceptor } from '#LocalProject/Utils/json-serializer.interceptor';

@Controller('projects/:projectId/groups/')
@UseInterceptors(JsonSerializerInterceptor)
export class GroupController {
  constructor(private readonly groups: GroupManagerService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async fetchAllGroups(
    @Param('projectId', BigIntTransformPipe) projectId: bigint,
    @Req() req: AuthenticatedRequest
  ) {
    return this.groups.fetchAllProjectGroups(req.user.id, projectId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':groupId')
  async fetchGroupMetadata(
    @Param('projectId', BigIntTransformPipe) projectId: bigint,
    @Param('groupId', BigIntTransformPipe) groupId: bigint,
    @Req() req: AuthenticatedRequest
  ) {
    return this.groups.fetchProjectGroup(req.user.id, projectId, groupId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('create')
  async createGroup(
    @Param('projectId', BigIntTransformPipe) projectId: bigint,
    @Body(ValidationPipe) groupData: CreateProjectGroupDto,
    @Req() req: AuthenticatedRequest
  ) {
    return this.groups.createProjectGroup(req.user.id, projectId, groupData);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':groupId')
  async updateGroup(
    @Param('projectId', BigIntTransformPipe) projectId: bigint,
    @Param('groupId', BigIntTransformPipe) groupId: bigint,
    @Body(ValidationPipe) groupUpdateData: CreateProjectGroupDto,
    @Req() req: AuthenticatedRequest
  ) {
    return this.groups.updateProjectGroupMetadata(
      req.user.id,
      projectId,
      groupId,
      groupUpdateData
    );
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':groupId')
  async deleteGroup(
    @Param('projectId', BigIntTransformPipe) projectId: bigint,
    @Param('groupId', BigIntTransformPipe) groupId: bigint,
    @Req() req: AuthenticatedRequest
  ) {
    return this.groups.deleteProjectGroup(req.user.id, projectId, groupId);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':groupId/users/add')
  async addUsersToGroup(
    @Param('projectId', BigIntTransformPipe) projectId: bigint,
    @Param('groupId', BigIntTransformPipe) groupId: bigint,
    @Body(ValidationPipe) userIds: UserIdsArray,
    @Req() req: AuthenticatedRequest
  ) {
    return this.groups.addUsersToGroup(
      req.user.id,
      projectId,
      groupId,
      userIds.userIds
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post(':groupId/users/remove')
  async removeUsersFromGroup(
    @Param('projectId', BigIntTransformPipe) projectId: bigint,
    @Param('groupId', BigIntTransformPipe) groupId: bigint,
    @Body(ValidationPipe) userIds: UserIdsArray,
    @Req() req: AuthenticatedRequest
  ) {
    return this.groups.removeUsersFromGroup(
      req.user.id,
      projectId,
      groupId,
      userIds.userIds
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post(':groupId/users/set')
  async setUsersForGroup(
    @Param('projectId', BigIntTransformPipe) projectId: bigint,
    @Param('groupId', BigIntTransformPipe) groupId: bigint,
    @Body(ValidationPipe) userIds: UserIdsArray,
    @Req() req: AuthenticatedRequest
  ) {
    return this.groups.setUsersForGroup(
      req.user.id,
      projectId,
      groupId,
      userIds.userIds
    );
  }
}
