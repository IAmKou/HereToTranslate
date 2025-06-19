import { CreateProjectRoleDto } from "#LocalProject/Dtos";
import { ProjectRoleEntity, UserEntity } from "#LocalProject/Entities";
import { Permission } from "@here-to-translate/common";
import { Maybe } from "@here-to-translate/common/types";
import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { In, Repository } from "typeorm";
import { ManagerService } from "./manager-service.base";
import { InjectRepository } from "@nestjs/typeorm";

@Injectable()
export class RoleManagerService extends ManagerService {
  protected override readonly logger = new Logger(RoleManagerService.name);

  constructor(
    @InjectRepository(ProjectRoleEntity)
    private readonly projectRoleRepository: Repository<ProjectRoleEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>
  ) {
    super();
  }

  async createProjectRole(projectId: bigint, roleData: CreateProjectRoleDto, permissionMask: Permission) {
    const newRole = this.projectRoleRepository.create({
      project: { id: BigInt(projectId) },
      name: roleData.name,
      permissionFlags: new Permission(roleData.permissions).applyMask(permissionMask),
    });

    try {
      const savedRole = await this.projectRoleRepository.save(newRole);
      this.logger.debug(`Role created successfully with ID: ${savedRole.id}`);
      return savedRole;
    } catch (error) {
      this.unknownErrorHanlder(error, 'Failed to create project role');
    }
  }

  async fetchProjectRoles(projectId: bigint, roleId?: Maybe<bigint>) {
    this.logger.debug(`Fetching roles [${roleId ?? 'All'}] for project [${projectId}]`);
    const query = this.projectRoleRepository.createQueryBuilder('role')
      .where('role.project = :projectId', { projectId })
      .select([
        'role.id',
        'role.name',
        'role.permissionFlags',
      ])

    if (roleId) {
      this.logger.debug(`Fetching role with ID [${roleId}] for project [${projectId}]`);
      return await query
        .andWhere('role.id = :roleId', { roleId })
        .getOne();
    }

    return await query.getMany();
  }

  async updateProjectRole(projectId: bigint, roleId: bigint, updateData: Partial<CreateProjectRoleDto>, permissionMask: Permission) {
    this.logger.debug(`Updating role [${roleId}] for project [${projectId}]`, updateData);

    const role = await this.projectRoleRepository.findOne({
      where: { id: BigInt(roleId), project: { id: BigInt(projectId) } }
    });
    if (!role) {
      this.logger.debug(`Role [${roleId}] does not exist in project [${projectId}]`);
      throw new NotFoundException(`Unknown role`);
    }
    if (updateData.name) {
      role.name = updateData.name;
    }
    if (updateData.permissions) {
      role.permissionFlags = new Permission(updateData.permissions).applyMask(permissionMask);
    }
    try {
      const updatedRole = await this.projectRoleRepository.save(role);
      this.logger.debug(`Role updated successfully with ID: ${updatedRole.id}`);
      return updatedRole;
    } catch (error) {
      this.unknownErrorHanlder(error, 'Failed to update project role');
    }
  }

  async deleteProjectRole(projectId: bigint, roleId: bigint) {
    this.logger.debug(`Deleting role [${roleId}] for project [${projectId}]`);

    const role = await this.projectRoleRepository.findOne({
      where: { id: BigInt(roleId), project: { id: BigInt(projectId) } }
    });
    if (!role) {
      this.logger.debug(`Role [${roleId}] does not exist in project [${projectId}]`);
      throw new NotFoundException(`Unknown role`);
    }
    await this.projectRoleRepository.remove(role);
    this.logger.debug(`Role [${roleId}] deleted successfully`);
    return { message: `Role deleted successfully` };
  }

  async addUsersToRole(projectId: bigint, roleId: bigint, userIds: bigint[]) {
    this.logger.debug(`Adding users to role [${roleId}] in project [${projectId}]`, { userIds });

    const role = await this.projectRoleRepository.findOne({
      where: { id: BigInt(roleId), project: { id: BigInt(projectId) } }
    });
    if (!role) {
      this.logger.debug(`Role [${roleId}] does not exist in project [${projectId}]`);
      throw new NotFoundException(`Unknown role`);
    }

    const toAddSet = new Set(userIds.map(id => BigInt(id)));
    const searchIds = Array.from(toAddSet);

    const usersToAdd = await this.userRepository.findBy({
      id: In(searchIds),
      projects: { id: BigInt(projectId) }
    });
    if (usersToAdd.length !== toAddSet.size) {
      const missingIds = searchIds.filter(id => !toAddSet.has(id));
      throw new BadRequestException({
        message: `Some users do not exist in the project`,
        data: missingIds
      });
    }

    const rolesToAdd = usersToAdd.map(user => {
      const newRole = this.projectRoleRepository.create({
        project: { id: BigInt(projectId) },
        user,
        name: role.name,
        permissionFlags: role.permissionFlags
      });
      return newRole;
    });

    try {
      const savedRoles = await this.projectRoleRepository.save(rolesToAdd);
      this.logger.debug(`Users added to role successfully`, { savedRoles });
      return savedRoles;
    } catch (error) {
      this.unknownErrorHanlder(error, 'Failed to add users to project role');
    }
  }

  async removeUsersFromRole(projectId: bigint, roleId: bigint, userIds: bigint[]) {
    this.logger.debug(`Removing users from role [${roleId}] in project [${projectId}]`, { userIds });

    const toRemoveSet = new Set(userIds.map(id => BigInt(id)));
    const searchIds = Array.from(toRemoveSet);

    const rolesToRemove = await this.projectRoleRepository.find({
      where: {
        id: In(searchIds),
        project: { id: BigInt(projectId) },
        user: { id: In(searchIds) }
      }
    });
    if (rolesToRemove.length !== toRemoveSet.size) {
      const missingIds = searchIds.filter(id => !toRemoveSet.has(id));
      throw new BadRequestException({
        message: `Some users do not exist in the project role`,
        data: missingIds
      });
    }

    try {
      await this.projectRoleRepository.remove(rolesToRemove);
      this.logger.debug(`Users removed from role successfully`, { rolesToRemove });
      return { message: `Users removed from role successfully` };
    } catch (error) {
      this.unknownErrorHanlder(error, 'Failed to remove users from project role');
    }
  }
}
