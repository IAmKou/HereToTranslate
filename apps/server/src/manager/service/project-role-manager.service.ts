import { CreateProjectRoleDto } from '#LocalProject/Dtos';
import { ProjectRoleEntity, UserEntity } from '#LocalProject/Entities';
import { Permission, PermissionFlags } from '@here-to-translate/common';
import { Maybe } from '@here-to-translate/common/types';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { In, Repository } from 'typeorm';
import { CommonHttpServiceImpl } from '#LocalProject/Utils/common-http-service.impl';
import { InjectRepository } from '@nestjs/typeorm';
import { ProjectManagerService } from './project-manager.service';

@Injectable()
export class ProjectRoleManagerService extends CommonHttpServiceImpl {
  protected override readonly logger = new Logger(
    ProjectRoleManagerService.name
  );

  constructor(
    @InjectRepository(ProjectRoleEntity)
    private readonly projectRoleRepository: Repository<ProjectRoleEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly projectManager: ProjectManagerService
  ) {
    super();
  }

  async fetchUsersInRole(uid: bigint, projectId: bigint, roleId: bigint) {
    this.logger.debug(
      `Fetching users for role [${roleId}] in project [${projectId}]`
    );
    await this.projectManager.testPermissions(
      projectId,
      uid,
      PermissionFlags.ViewProject
    );

    const roleExists = await this.projectRoleRepository.exists({
      where: { id: roleId },
    });
    if (!roleExists) {
      this.logger.debug(
        `Role [${roleId}] does not exist in project [${projectId}]`
      );
      throw new NotFoundException(`Unknown role`);
    }

    return await this.projectRoleRepository
      .createQueryBuilder('role')
      .where('role.id = :roleId', { roleId })
      .andWhere('role.project = :projectId', { projectId })
      .innerJoin('role.users', 'users')
      .select([
        'users.id AS id',
        'users.username AS username',
        'users.fullName AS fullName',
      ])
      .getRawMany<UserEntity>();
  }

  async createProjectRole(
    uid: bigint,
    projectId: bigint,
    roleData: CreateProjectRoleDto
  ) {

    this.logger.debug('Check PermissionFlags.ManageRoles:', PermissionFlags.ManageRoles);
    this.logger.debug('All PermissionFlags:', PermissionFlags);
    await this.projectManager.testPermissions(
      projectId,
      uid,
      PermissionFlags.ManageMembers
    );
    this.logger.debug(
      `Adding role to project [${projectId}] for user [${uid}]`,
      roleData
    );
    let permissionFlags = roleData.permissionFlags ?? PermissionFlags.None;
    // Nếu có ProjectAdmin thì gán tất cả quyền (trừ DeleteProject và RemoveOwner)
    const hasProjectAdmin = (BigInt(permissionFlags) & PermissionFlags.ProjectAdmin) === PermissionFlags.ProjectAdmin;
    if (hasProjectAdmin) {
      const ALL_FLAGS = Object.entries(PermissionFlags)
        .filter(([key, value]) =>
          typeof value === 'bigint' &&
          key !== 'None' &&
          key !== 'Owner' &&
          key !== 'DeleteProject' &&
          key !== 'RemoveOwner'
        )
        .reduce((acc, [_, value]) => acc | BigInt(value), BigInt(0));
      permissionFlags = ALL_FLAGS;
    }
    const newRole = this.projectRoleRepository.create({
      project: { id: BigInt(projectId) },
      name: roleData.name,
      permissionFlags: new Permission(permissionFlags),
    });
    try {
      const savedRole = await this.projectRoleRepository.save(newRole);
      this.logger.debug(`Role created successfully with ID: ${savedRole.id}`);
      return savedRole;
    } catch (error) {
      this.unknownErrorHanlder(error, 'Failed to create project role');
    }
  }

  async fetchProjectRoles(
    uid: bigint,
    projectId: bigint,
    roleId?: Maybe<bigint>
  ) {
    this.logger.debug(
      `Fetching roles [${roleId ?? 'All'}] for project [${projectId}]`
    );
    // Phải có quyền ViewProject để xem roles
    await this.projectManager.testPermissions(
      projectId,
      uid,
      PermissionFlags.ViewProject
    );
    const query = this.projectRoleRepository
      .createQueryBuilder('role')
      .where('role.project = :projectId', { projectId })
      .select(['role.id', 'role.name', 'role.permissionFlags']);

    if (roleId) {
      this.logger.debug(
        `Fetching role with ID [${roleId}] for project [${projectId}]`
      );
      return await query.andWhere('role.id = :roleId', { roleId }).getOne();
    }

    return await query.getMany();
  }

  async updateProjectRole(
    uid: bigint,
    projectId: bigint,
    roleId: bigint,
    updateData: Partial<CreateProjectRoleDto>
  ) {
    this.logger.debug(
      `Updating role [${roleId}] for project [${projectId}]`,
      updateData
    );
    // Phải có quyền ManageRoles để sửa role
    await this.projectManager.testPermissions(
      projectId,
      uid,
      PermissionFlags.ManageRoles
    );
    const role = await this.projectRoleRepository.findOne({
      where: { id: BigInt(roleId), project: { id: BigInt(projectId) } },
    });
    if (!role) {
      this.logger.debug(
        `Role [${roleId}] does not exist in project [${projectId}]`
      );
      throw new NotFoundException(`Unknown role`);
    }
    if (updateData.name) {
      role.name = updateData.name;
    }
    if (updateData.permissionFlags) {
      let permissionFlags = updateData.permissionFlags;
      const hasProjectAdmin = (BigInt(permissionFlags) & PermissionFlags.ProjectAdmin) === PermissionFlags.ProjectAdmin;
      if (hasProjectAdmin) {
        const ALL_FLAGS = Object.entries(PermissionFlags)
          .filter(([key, value]) =>
            typeof value === 'bigint' &&
            key !== 'None' &&
            key !== 'Owner' &&
            key !== 'DeleteProject' &&
            key !== 'RemoveOwner'
          )
          .reduce((acc, [_, value]) => acc | BigInt(value), BigInt(0));
        permissionFlags = ALL_FLAGS;
      }
      role.permissionFlags = new Permission(permissionFlags);
    }
    try {
      const updatedRole = await this.projectRoleRepository.save(role);
      this.logger.debug(`Role updated successfully with ID: ${updatedRole.id}`);
      return updatedRole;
    } catch (error) {
      this.unknownErrorHanlder(error, 'Failed to update project role');
    }
  }

  async deleteProjectRole(uid: bigint, projectId: bigint, roleId: bigint) {
    // Phải có quyền ManageRoles để xóa role
    await this.projectManager.testPermissions(
      projectId,
      uid,
      PermissionFlags.ManageRoles
    );
    this.logger.debug(`Deleting role [${roleId}] for project [${projectId}]`);
    const role = await this.projectRoleRepository.findOne({
      where: { id: BigInt(roleId), project: { id: BigInt(projectId) } },
    });
    if (!role) {
      this.logger.debug(
        `Role [${roleId}] does not exist in project [${projectId}]`
      );
      throw new NotFoundException(`Unknown role`);
    }
    await this.projectRoleRepository.remove(role);
    this.logger.debug(`Role [${roleId}] deleted successfully`);
    return { message: `Role deleted successfully` };
  }

  async addUsersToRole(
    uid: bigint,
    projectId: bigint,
    roleId: bigint,
    userIds: bigint[]
  ) {
    // Phải có quyền ManageMembers để xóa user khỏi role
    await this.projectManager.testPermissions(
      projectId,
      uid,
      PermissionFlags.ManageRoles
    );
    this.logger.debug(
      `Adding users to role [${roleId}] in project [${projectId}]`,
      { userIds }
    );

    const role = await this.projectRoleRepository.findOne({
      where: { id: BigInt(roleId), project: { id: BigInt(projectId) } },
      relations: ['users'],
    });
    if (!role) {
      this.logger.debug(
        `Role [${roleId}] does not exist in project [${projectId}]`
      );
      throw new NotFoundException(`Unknown role`);
    }

    const toAddSet = new Set(userIds.map((id) => BigInt(id)));
    const searchIds = Array.from(toAddSet);

    const usersToAdd = await this.userRepository.findBy({
      id: In(searchIds),
      projects: { id: BigInt(projectId) },
    });
    if (usersToAdd.length !== toAddSet.size) {
      const missingIds = searchIds.filter((id) => !usersToAdd.some(u => u.id === id));
      throw new BadRequestException({
        message: `Some users do not exist in the project`,
        data: missingIds,
      });
    }

    // Chỉ thêm user vào mảng users của role, không tạo mới role!
    const existingUserIds = new Set(role.users.map((u) => u.id.toString()));
    for (const user of usersToAdd) {
      if (!existingUserIds.has(user.id.toString())) {
        role.users.push(user);
      }
    }

    try {
      const savedRole = await this.projectRoleRepository.save(role);
      this.logger.debug(`Users added to role successfully`, { savedRole });
      return savedRole;
    } catch (error) {
      this.unknownErrorHanlder(error, 'Failed to add users to project role');
    }
  }

  async removeUsersFromRole(
    uid: bigint,
    projectId: bigint,
    roleId: bigint,
    userIds: bigint[]
  ) {
    // Phải có quyền ManageMembers để thêm user vào role
    await this.projectManager.testPermissions(
      projectId,
      uid,
      PermissionFlags.ManageMembers
    );
    this.logger.debug(
      `Removing users from role [${roleId}] in project [${projectId}]`,
      { userIds }
    );

    // Find the role with users relation
    const role = await this.projectRoleRepository.findOne({
      where: { id: BigInt(roleId), project: { id: BigInt(projectId) } },
      relations: ['users', 'project'],
    });

    if (!role) {
      this.logger.debug(
        `Role [${roleId}] does not exist in project [${projectId}]`
      );
      throw new NotFoundException(`Unknown role`);
    }

    const toRemoveSet = new Set(userIds.map((id) => BigInt(id)));

    try {
      // Delete the relationships directly from the join table
      await this.projectRoleRepository
        .createQueryBuilder()
        .delete()
        .from('user_project_roles')
        .where('roleId = :roleId', { roleId: role.id })
        .andWhere('userId IN (:...userIds)', { userIds: Array.from(toRemoveSet) })
        .execute();

      this.logger.debug(`Users removed from role successfully`);
      return { message: `Users removed from role successfully` };
    } catch (error) {
      this.unknownErrorHanlder(
        error,
        'Failed to remove users from project role'
      );
    }
  }

  async fixEveryoneRolePermissions(projectId: bigint) {
    this.logger.debug(`Fixing Everyone role permissions for project [${projectId}]`);

    const everyoneRole = await this.projectRoleRepository.findOne({
      where: { project: { id: projectId }, name: 'Everyone' },
    });

    if (!everyoneRole) {
      this.logger.debug(`Everyone role not found for project [${projectId}]`);
      return;
    }

    // Fix permissions to only include ViewProject
    everyoneRole.permissionFlags = new Permission(
      BigInt(PermissionFlags.ViewProject)
    );

    try {
      await this.projectRoleRepository.save(everyoneRole);
      this.logger.debug(`Everyone role permissions fixed for project [${projectId}]`);
    } catch (error) {
      this.unknownErrorHanlder(error, 'Failed to fix Everyone role permissions');
    }
  }
}
