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
import { JwtAuthGuard } from '#LocalProject/Auth/guards/jwt.guard';
import { BigIntTransformPipe } from '#LocalProject/Utils/pipes/bigint-transform.pipe';
import type { AuthenticatedRequest } from '#LocalProject/Auth/types';
import {
  CreateProjectRoleDto,
  UpdateProjectRoleDto,
  UserIdsArray,
} from '#LocalProject/Dtos';
import { ProjectRoleManagerService } from '#LocalProject/Managers/service/project-role-manager.service';
import { ProjectManagerService } from '#LocalProject/Managers/service/project-manager.service';
import { JsonSerializerInterceptor } from '#LocalProject/Utils/json-serializer.interceptor';
import { PermissionFlags } from '@here-to-translate/common';

@Controller('projects/:projectId/roles')
@UseInterceptors(JsonSerializerInterceptor)
export class ProjectRoleController {
  constructor(
    private readonly roles: ProjectRoleManagerService,
    private readonly projectManager: ProjectManagerService
  ) {}

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
    return this.roles.updateProjectRole(
      req.user.id,
      projectId,
      roleId,
      roleUpdateData
    );
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
    return this.roles.addUsersToRole(
      req.user.id,
      projectId,
      roleId,
      userIds.userIds
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('/:roleId/users/remove')
  async removeUsersFromRole(
    @Param('projectId', BigIntTransformPipe) projectId: bigint,
    @Param('roleId', BigIntTransformPipe) roleId: bigint,
    @Body(ValidationPipe) userIds: UserIdsArray,
    @Req() req: AuthenticatedRequest
  ) {
    return this.roles.removeUsersFromRole(
      req.user.id,
      projectId,
      roleId,
      userIds.userIds
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('/fix-everyone-role')
  async fixEveryoneRole(
    @Param('projectId', BigIntTransformPipe) projectId: bigint,
    @Req() req: AuthenticatedRequest
  ) {
    // Only project owner or admin can fix roles
    await this.projectManager.testPermissions(
      projectId,
      req.user.id,
      PermissionFlags.ProjectAdmin
    );
    await this.roles.fixEveryoneRolePermissions(projectId);
    return { message: 'Everyone role permissions fixed successfully' };
  }
}

// Controller mới cho permissions
@Controller('permissions')
export class PermissionsController {
  @UseGuards(JwtAuthGuard)
  @Get()
  async getAvailablePermissions() {
    const permissions = Object.entries(PermissionFlags)
      .filter(([key, value]) => key !== 'None' && key !== 'Owner' && typeof value === 'bigint')
      .map(([key, value]) => ({
        value: key,
        label: key.replace(/([A-Z])/g, ' $1').trim(),
        description: this.getPermissionDescription(key)
      }));
    return permissions;
  }

  private getPermissionDescription(permission: string): string {
    const descriptions: Record<string, string> = {
      'ProjectAdmin': 'Quản trị dự án - tất cả quyền',
      'ManageMembers': 'Quản lý thành viên - thêm/xóa/đổi vai trò',
      'ManageBranches': 'Quản lý nhánh dự án',
      'ManageRoles': 'Quản lý vai trò trong dự án',
      'ManageWorkspaces': 'Quản lý workspace',
      'ManageGroups': 'Quản lý nhóm dự án',
      'ManageProjectMetadata': 'Quản lý thông tin dự án',
      'ManageDiscussions': 'Quản lý thảo luận',
      'ViewAudit': 'Xem nhật ký audit',
      'ReviewCommit': 'Duyệt commit trong workspace',
      'PushCommit': 'Đẩy commit vào workspace',
      'ReviewRequests': 'Duyệt request trong workspace',
      'ViewRequest': 'Xem request trong workspace',
      'ManageWorkspaceMetadata': 'Quản lý thông tin workspace',
      'ViewWorkspace': 'Xem workspace',
      'ManageComments': 'Quản lý bình luận trong thảo luận',
      'PostComment': 'Đăng bình luận',
      'Vote': 'Bình chọn trong thảo luận',
      'AttachFiles': 'Đính kèm file trong thảo luận',
      'ViewThread': 'Xem thảo luận',
      'ViewProject': 'Xem thông tin dự án'
    };
    return descriptions[permission] || permission;
  }
}
