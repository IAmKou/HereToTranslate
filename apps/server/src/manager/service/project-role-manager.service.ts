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

    const permissionMask = await this.projectManager.testPermissions(
      projectId,
      uid,
      PermissionFlags.ManageMembers
    );
    this.logger.debug(
      `Adding role to project [${projectId}] for user [${uid}]`,
      roleData
    );
    const newRole = this.projectRoleRepository.create({
      project: { id: BigInt(projectId) },
      name: roleData.name,
      permissionFlags: new Permission(
        roleData.permissionFlags ?? PermissionFlags.None
      ).applyMask(permissionMask),
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

    const userPermissionFlags = await this.projectManager.testPermissions(
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
      role.permissionFlags = new Permission(
        updateData.permissionFlags
      ).applyMask(userPermissionFlags);
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
    const userPermissionFlags = await this.projectManager.testPermissions(
      projectId,
      uid,
      PermissionFlags.ManageMembers
    );

    this.logger.debug(
      `Adding users to role [${roleId}] in project [${projectId}]`,
      { userIds }
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

    const rolePermissionDoesOverlap =
      role.permissionFlags.value & userPermissionFlags.value;

    if (rolePermissionDoesOverlap !== role.permissionFlags.value) {
      const missingPermissionNames = role.permissionFlags
        .remove(userPermissionFlags)
        .resolveNames();
      this.logger.debug(
        `User [${uid}] does not have some permissions in role [${roleId}]: \n${missingPermissionNames.join(
          ', '
        )}`
      );
    }

    const toAddSet = new Set(userIds.map((id) => BigInt(id)));
    const searchIds = Array.from(toAddSet);

    const usersToAdd = await this.userRepository.findBy({
      id: In(searchIds),
      projects: { id: BigInt(projectId) },
    });
    if (usersToAdd.length !== toAddSet.size) {
      const missingIds = searchIds.filter((id) => !toAddSet.has(id));
      throw new BadRequestException({
        message: `Some users do not exist in the project`,
        data: missingIds,
      });
    }

    const updatedRole = this.projectRoleRepository.create({
      project: { id: BigInt(projectId) },
      users: usersToAdd,
      name: role.name,
      permissionFlags: role.permissionFlags,
    });

    try {
      const savedRoles = await this.projectRoleRepository.save(updatedRole);
      this.logger.debug(`Users added to role successfully`, { savedRoles });
      return savedRoles;
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
    const userPermissionFlags = await this.projectManager.testPermissions(
      projectId,
      uid,
      PermissionFlags.ManageMembers
    );
    this.logger.debug(
      `Removing users from role [${roleId}] in project [${projectId}]`,
      { userIds }
    );

    const role = await this.projectRoleRepository.findOne({
      where: { id: BigInt(roleId), project: { id: BigInt(projectId) } },
      select: ['permissionFlags'],
    });
    if (!role) {
      this.logger.debug(
        `Role [${roleId}] does not exist in project [${projectId}]`
      );
      throw new NotFoundException(`Unknown role`);
    }
    const rolePermissionDoesOverlap =
      role.permissionFlags.value & userPermissionFlags.value;

    if (rolePermissionDoesOverlap !== role.permissionFlags.value) {
      const missingPermissionNames = role.permissionFlags
        .remove(userPermissionFlags)
        .resolveNames();
      this.logger.debug(
        `User [${uid}] does not have some permissions in role [${roleId}]: \n${missingPermissionNames.join(
          ', '
        )}`
      );
    }

    const toRemoveSet = new Set(userIds.map((id) => BigInt(id)));
    const searchIds = Array.from(toRemoveSet);

    const usersToRemove = await this.projectRoleRepository.find({
      where: {
        id: roleId,
        project: { id: BigInt(projectId) },
        users: { id: In(searchIds) },
      },
    });
    if (usersToRemove.length !== toRemoveSet.size) {
      const missingIds = searchIds.filter((id) => !toRemoveSet.has(id));
      throw new BadRequestException({
        message: `Some users do not exist in the project role`,
        data: missingIds,
      });
    }

    try {
      await this.projectRoleRepository.remove(usersToRemove);
      this.logger.debug(`Users removed from role successfully`, {
        rolesToRemove: usersToRemove,
      });
      return { message: `Users removed from role successfully` };
    } catch (error) {
      this.unknownErrorHanlder(
        error,
        'Failed to remove users from project role'
      );
    }
  }
}
