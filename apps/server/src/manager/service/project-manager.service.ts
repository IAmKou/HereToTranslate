import { Injectable, BadRequestException, Logger, InternalServerErrorException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { ProjectEntity, UserEntity, ProjectRoleEntity, ProjectTagEntity, ProjectGroupEntity } from '#LocalProject/Entities';
import { MaybeException } from '#LocalProject/Exceptions';
import { CreateProjectDto, CreateProjectGroupDto, CreateProjectRoleDto, UpdateProjectGroupDto, UpdateProjectMetadataDto } from '#LocalProject/Dtos';
import { PermissionFlags, Permission } from '@here-to-translate/common';
import { Maybe } from '@here-to-translate/common/types';

@Injectable()
export class ProjectManagerService {
  private readonly logger = new Logger(ProjectManagerService.name);
  constructor(
    @InjectRepository(ProjectEntity)
    private readonly projectRepository: Repository<ProjectEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(ProjectRoleEntity)
    private readonly projectRoleRepository: Repository<ProjectRoleEntity>,
    @InjectRepository(ProjectGroupEntity)
    private readonly projectGroupRepository: Repository<ProjectGroupEntity>,
    private dataSource: DataSource
  ) { }

  /** Ensures the user exists and has the required permission for the project.
   * Throws `BadRequestException` if the user does not have the permission.
   */
  async ensureUserPermissionsIn(projectId: bigint, uid: bigint, permission: PermissionFlags) {
    this.logger.debug(`Checking if user [${uid}] has permission [${permission}] for project [${projectId}]`);

    const projectExists = await this.projectRepository.exists({
      where: { id: BigInt(projectId) }
    });
    if (!projectExists) {
      this.logger.debug(`Project [${projectId}] does not exist`);
      throw new NotFoundException(`Unknown project`);
    }
    const userExists = await this.userRepository.exists({
      where: { id: BigInt(uid) }
    });
    if (!userExists) {
      this.logger.debug(`User [${uid}] does not exist`);
      throw new NotFoundException(`Unknown user`);
    }

    const userHasPermission = await this.projectRoleRepository.createQueryBuilder('role')
      .innerJoin('role.user', 'user')
      .where('role.project = :projectId', { projectId })
      .andWhere('user.id = :userId', { userId: uid })
      .select([
        `MAX((role.permissionFlags & ${permission}) = ${permission}) as hasPermission`,
      ])
      .getRawOne<{ hasPermission: boolean }>()
      .then(result => Boolean(Number(result?.hasPermission)));

    if (!userHasPermission) {
      this.logger.debug(`User [${uid}] does not have permission [${permission}] for project [${projectId}]`);
      throw new ForbiddenException(`You do not have permission to perform this action`);
    }
  }

  async createProject(uid: bigint, data: CreateProjectDto) {
    const {
      name,
      description,
      isPublic,
      tags = [],
      categoryId
    } = data;

    this.logger.debug('Received project data:', data);

    const userExists = await this.userRepository.exists({
      where: { id: BigInt(uid) }
    });

    if (!userExists) {
      throw new BadRequestException(`Unknown user`);
    }

    const queryRunner = this.dataSource.createQueryRunner();

    if (!queryRunner) {
      throw new InternalServerErrorException('Database connection error');
    }

    this.logger.debug('Starting transaction for project creation');
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const projectTags: Array<Partial<ProjectTagEntity>> = [];
      for (const tag of tags) {
        const existingTag = await queryRunner.manager.findOne(ProjectTagEntity, { where: { name: tag } });
        if (existingTag) {
          projectTags.push({ id: existingTag.id });
        } else {
          const newTag = queryRunner.manager.create(ProjectTagEntity, { name: tag });
          const savedTag = await queryRunner.manager.save(newTag);
          projectTags.push({ id: savedTag.id });
        }
      }
      const project = this.projectRepository.create({
        name,
        description,
        createdBy: { id: BigInt(uid) },
        isPublic,
        tags: projectTags,
        createdAt: new Date(),
        category: { id: BigInt(categoryId) }
      });

      const savedProject = await queryRunner.manager.save(project);

      const projectRole = queryRunner.manager.create(ProjectRoleEntity, {
        project: savedProject,
        user: { id: BigInt(uid) },
        permissionFlags: new Permission(PermissionFlags.All),
        name: 'Project Owner'
      });

      await queryRunner.manager.save(projectRole);
      await queryRunner.commitTransaction();

      this.logger.debug(`Project created successfully with ID: ${savedProject.id}`);
      return {
        message: 'Project created successfully',
        projectId: savedProject.id,
      };
    } catch (error) {
      this.logger.debug('Rolling back transaction');
      await queryRunner.rollbackTransaction();
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Failed to create project: ' + ((error as MaybeException)?.message || 'Unknown error'));
      throw new InternalServerErrorException('Failed to create project');
    } finally {
      this.logger.debug('Project creation transaction released');
      await queryRunner.release();
    }
  }

  async fetchProject(uid: Maybe<bigint>, projectId: bigint) {
    this.logger.debug(`Fetching project with ID: ${projectId}`);

    const project = await this.projectRepository.findOne({
      where: { id: projectId },
      select: ['isPublic']
    });

    if (!project) {
      this.logger.debug(`Project [${projectId}] does not exist`);
      throw new NotFoundException(`Unknown project`);
    }

    const userCanViewProject =
      (typeof uid !== 'undefined')
      && await this.projectRoleRepository.createQueryBuilder('role')
        .innerJoin('role.user', 'user')
        .where('role.project = :projectId', { projectId })
        .andWhere('user.id = :userId', { userId: uid })
        .select([
          `MAX((role.permissionFlags & ${PermissionFlags.ViewProject}) = ${PermissionFlags.ViewProject}) as canViewProject`,
        ])
        .getRawOne<{ canViewProject: boolean }>()
        .then(result => Boolean(Number(result?.canViewProject)));

    if (!userCanViewProject && !project.isPublic) {
      this.logger.debug(`User with ID ${uid} does not have access to project with ID ${projectId}`);
      throw new ForbiddenException(`You do not have access to this project`);
    }

    const projectQueryBuilder = this.projectRepository.createQueryBuilder('project')
    const projectMetadataQuery = projectQueryBuilder
      .select([
        'project.id',
        'project.name',
        'project.description',
        'project.isPublic',
        'project.createdAt',
        'createdBy.id',
        'createdBy.username',
        'createdBy.fullName',
        'tags'
      ])
      .where('project.id = :projectId', { projectId })
      .leftJoin('project.createdBy', 'createdBy')
      .leftJoin('project.tags', 'tags')

    if (!userCanViewProject) {
      this.logger.debug(`Project with ID ${projectId} is public, allowing metadata access`);
      return projectMetadataQuery.getOne();
    }

    this.logger.debug(`User with ID ${uid} has access to project with ID ${projectId}, fetching full project data`);
    const fullProject = await projectMetadataQuery
      .leftJoinAndSelect('project.projectRoles', 'projectRoles')
      .getOne();

    return fullProject;
  }

  async updateProject(projectId: bigint, updateData: Partial<UpdateProjectMetadataDto>) {
    this.logger.debug(`Updating project with ID: ${projectId}`, updateData);

    const queryRunner = this.dataSource.createQueryRunner();
    if (!queryRunner) {
      this.logger.error('Database connection error');
      throw new InternalServerErrorException('Database connection error');
    }

    this.logger.debug('Starting transaction for project update');
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const project = await queryRunner.manager.findOne(
        ProjectEntity,
        {
          where: { id: projectId },
          relations: ['tags']
        }
      );
      if (!project) {
        this.logger.debug(`Project with ID ${projectId} not found`);
        throw new BadRequestException(`Unknown project`);
      }

      const newTags = new Map<bigint, string>(project.tags.map(tag => [tag.id, tag.name]));
      for (const toAdd of updateData.addTags ?? []) {
        const existingTag = await queryRunner.manager.findOne(
          ProjectTagEntity, { where: { name: toAdd }, select: ['id', 'name'] });
        if (existingTag) {
          newTags.set(existingTag.id, existingTag.name);
        } else {
          const newTag = queryRunner.manager.create(ProjectTagEntity, { name: toAdd });
          const savedTag = await queryRunner.manager.save(newTag);
          newTags.set(savedTag.id, savedTag.name);
        }
      }
      for (const toRemove of updateData.removeTags ?? []) {
        const existingTag = await queryRunner.manager.findOne(
          ProjectTagEntity, { where: { name: toRemove }, select: ['id'] });
        if (existingTag) {
          newTags.delete(existingTag.id);
        }
      }

      delete updateData.addTags;
      delete updateData.removeTags;

      Object.assign(
        project,
        updateData,
        {
          tags: Array.from(newTags.entries()).map(([id, name]) => ({ id, name }))
        }
      );

      const updatedProject = await queryRunner.manager.save(project);
      await queryRunner.commitTransaction();
      this.logger.debug(`Project updated successfully with ID: ${updatedProject.id}`);
      return updatedProject;
    }
    catch (error) {
      this.logger.debug('Rolling back transaction');
      await queryRunner.rollbackTransaction();
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Failed to update project: ' + ((error as MaybeException)?.message || 'Unknown error'));
      throw new InternalServerErrorException('Failed to update project');
    } finally {
      this.logger.debug('Project update transaction released');
      await queryRunner.release();
    }
  }

  async deleteProject(projectId: bigint) {
    this.logger.debug(`Deleting project with ID: ${projectId}`);

    const project = await this.projectRepository.findOne({ where: { id: projectId } });

    if (!project) {
      this.logger.debug(`Project [${projectId}] does not exist`);
      throw new NotFoundException(`Unknown project`);
    }

    await this.projectRepository.remove(project);
  }

  async addProjectRole(uid: bigint, projectId: bigint, roleData: CreateProjectRoleDto) {
    this.logger.debug(`Adding role to project [${projectId}] for user [${uid}]`, roleData);
    await this.ensureUserPermissionsIn(projectId, uid, PermissionFlags.ManageRoles);

    const newRole = this.projectRoleRepository.create({
      project: { id: BigInt(projectId) },
      user: { id: BigInt(uid) },
      name: roleData.name,
      permissionFlags: new Permission(roleData.permissions),
    });

    try {
      const savedRole = await this.projectRoleRepository.save(newRole);
      this.logger.debug(`Role created successfully with ID: ${savedRole.id}`);
      return savedRole;
    } catch (error) {
      this.logger.error('Failed to create role: ' + ((error as MaybeException)?.message || 'Unknown error'));
      throw new InternalServerErrorException('Failed to create role');
    }
  };

  async fetchProjectRoles(uid: bigint, projectId: bigint, roleId?: Maybe<bigint>) {
    this.logger.debug(`Fetching roles [${roleId ?? 'All'}] for project [${projectId}]`);
    await this.ensureUserPermissionsIn(projectId, uid, PermissionFlags.ViewProject);

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

  async updateProjectRoleMetadata(uid: bigint, projectId: bigint, roleId: bigint, updateData: Partial<CreateProjectRoleDto>) {
    this.logger.debug(`Updating role [${roleId}] for project [${projectId}]`, updateData);
    await this.ensureUserPermissionsIn(projectId, uid, PermissionFlags.ManageRoles);

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
      role.permissionFlags = new Permission(updateData.permissions);
    }
    try {
      const updatedRole = await this.projectRoleRepository.save(role);
      this.logger.debug(`Role updated successfully with ID: ${updatedRole.id}`);
      return updatedRole;
    } catch (error) {
      this.logger.error('Failed to update role: ' + ((error as MaybeException)?.message || 'Unknown error'));
      throw new InternalServerErrorException('Failed to update role');
    }
  }

  async deleteProjectRole(uid: bigint, projectId: bigint, roleId: bigint) {
    this.logger.debug(`Deleting role [${roleId}] for project [${projectId}]`);
    await this.ensureUserPermissionsIn(projectId, uid, PermissionFlags.ManageRoles);

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

  async addUsersToRole(uid: bigint, projectId: bigint, roleId: bigint, userIds: bigint[]) {
    this.logger.debug(`Adding users to role [${roleId}] in project [${projectId}]`, { userIds });
    await this.ensureUserPermissionsIn(projectId, uid, PermissionFlags.ManageMembers);

    const role = await this.projectRoleRepository.findOne({
      where: { id: BigInt(roleId), project: { id: BigInt(projectId) } }
    });
    if (!role) {
      this.logger.debug(`Role [${roleId}] does not exist in project [${projectId}]`);
      throw new NotFoundException(`Unknown role`);
    }

    const usersToAdd = await this.userRepository.findBy({
      id: In(userIds.map(id => BigInt(id)))
    });
    if (usersToAdd.length !== userIds.length) {
      throw new BadRequestException(`Some users do not exist`);
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
      this.logger.error('Failed to add users to role: ' + ((error as MaybeException)?.message || 'Unknown error'));
      throw new InternalServerErrorException('Failed to add users to role');
    }
  }

  async removeUsersFromRole(uid: bigint, projectId: bigint, roleId: bigint, userIds: bigint[]) {
    this.logger.debug(`Removing users from role [${roleId}] in project [${projectId}]`, { userIds });
    await this.ensureUserPermissionsIn(projectId, uid, PermissionFlags.ManageMembers);

    const role = await this.projectRoleRepository.findOne({
      where: { id: BigInt(roleId), project: { id: BigInt(projectId) } }
    });
    if (!role) {
      this.logger.debug(`Role [${roleId}] does not exist in project [${projectId}]`);
      throw new NotFoundException(`Unknown role`);
    }

    const usersToRemove = await this.projectRoleRepository.find({
      where: {
        id: In(userIds.map(id => BigInt(id))),
        project: { id: BigInt(projectId) },
        user: { id: In(userIds.map(id => BigInt(id))) }
      }
    });

    if (usersToRemove.length !== userIds.length) {
      throw new BadRequestException(`Some users do not exist in this role`);
    }

    try {
      await this.projectRoleRepository.remove(usersToRemove);
      this.logger.debug(`Users removed from role successfully`);
      return { message: `Users removed from role successfully`, roleId, userIds };
    } catch (error) {
      this.logger.error('Failed to remove users from role: ' + ((error as MaybeException)?.message || 'Unknown error'));
      throw new InternalServerErrorException('Failed to remove users from role');
    }
  }

  async createProjectGroup(uid: bigint, projectId: bigint, data: CreateProjectGroupDto) {
    this.logger.debug(`Creating project group for project [${projectId}]`, data);
    await this.ensureUserPermissionsIn(projectId, uid, PermissionFlags.ManageGroups);

    const group = this.projectGroupRepository.create({
      project: { id: BigInt(projectId) },
      name: data.name,
      permissionFlags: new Permission(data.permissionFlags)
    });

    try {
      const savedGroup = await this.projectGroupRepository.save(group);
      this.logger.debug(`Project group created successfully with ID: ${savedGroup.id}`);
      return savedGroup;
    } catch (error) {
      this.logger.error('Failed to create project group: ' + ((error as MaybeException)?.message || 'Unknown error'));
      throw new InternalServerErrorException('Failed to create project group');
    }
  }

  async fetchProjectGroups(uid: bigint, projectId: bigint, groupId?: Maybe<bigint>) {
    this.logger.debug(`Fetching project groups for project [${projectId}]`, { groupId });
    await this.ensureUserPermissionsIn(projectId, uid, PermissionFlags.ViewProject);
    const query = this.projectGroupRepository.createQueryBuilder('group')
      .where('group.project = :projectId', { projectId })
      .select([
        'group.id',
        'group.name',
        'group.permissionFlags',
      ]);
    if (groupId) {
      this.logger.debug(`Fetching group with ID [${groupId}] for project [${projectId}]`);
      return await query
        .andWhere('group.id = :groupId', { groupId })
        .getOne();
    }
    return await query.getMany();
  }

  async updateProjectGroupMetadata(uid: bigint, projectId: bigint, groupId: bigint, updateData: UpdateProjectGroupDto) {
    this.logger.debug(`Updating project group [${groupId}] for project [${projectId}]`, updateData);
    await this.ensureUserPermissionsIn(projectId, uid, PermissionFlags.ManageGroups);

    const group = await this.projectGroupRepository.findOne({
      where: { id: BigInt(groupId), project: { id: BigInt(projectId) } }
    });
    if (!group) {
      this.logger.debug(`Group [${groupId}] does not exist in project [${projectId}]`);
      throw new NotFoundException(`Unknown group`);
    }

    if (updateData.name) {
      group.name = updateData.name;
    }
    if (updateData.permissionFlags) {
      group.permissionFlags = new Permission(updateData.permissionFlags);
    }

    try {
      const updatedGroup = await this.projectGroupRepository.save(group);
      this.logger.debug(`Project group updated successfully with ID: ${updatedGroup.id}`);
      return updatedGroup;
    } catch (error) {
      this.logger.error('Failed to update project group: ' + ((error as MaybeException)?.message || 'Unknown error'));
      throw new InternalServerErrorException('Failed to update project group');
    }
  }

  async deleteProjectGroup(uid: bigint, projectId: bigint, groupId: bigint) {
    this.logger.debug(`Deleting project group [${groupId}] for project [${projectId}]`);
    await this.ensureUserPermissionsIn(projectId, uid, PermissionFlags.ManageGroups);

    const group = await this.projectGroupRepository.findOne({
      where: { id: BigInt(groupId), project: { id: BigInt(projectId) } }
    });
    if (!group) {
      this.logger.debug(`Group [${groupId}] does not exist in project [${projectId}]`);
      throw new NotFoundException(`Unknown group`);
    }

    await this.projectGroupRepository.remove(group);
    this.logger.debug(`Project group [${groupId}] deleted successfully`);
    return { message: `Project group deleted successfully` };
  }

  async addUsersToGroup(uid: bigint, projectId: bigint, groupId: bigint, userIds: bigint[]) {
    this.logger.debug(`Adding users to group [${groupId}] in project [${projectId}]`, { userIds });
    await this.ensureUserPermissionsIn(projectId, uid, PermissionFlags.ManageGroups);

    const group = await this.projectGroupRepository.findOne({
      where: { id: BigInt(groupId), project: { id: BigInt(projectId) } }
    });
    if (!group) {
      this.logger.debug(`Group [${groupId}] does not exist in project [${projectId}]`);
      throw new NotFoundException(`Unknown group`);
    }

    const usersToAdd = await this.userRepository.findBy({
      id: In(userIds.map(id => BigInt(id)))
    });
    if (usersToAdd.length !== userIds.length) {
      throw new BadRequestException(`Some users do not exist`);
    }

    group.members = [...(group.members || []), ...usersToAdd];

    try {
      const updatedGroup = await this.projectGroupRepository.save(group);
      this.logger.debug(`Users added to group successfully`, { updatedGroup });
      return updatedGroup;
    } catch (error) {
      this.logger.error('Failed to add users to group: ' + ((error as MaybeException)?.message || 'Unknown error'));
      throw new InternalServerErrorException('Failed to add users to group');
    }
  }

  async removeUsersFromGroup(uid: bigint, projectId: bigint, groupId: bigint, userIds: bigint[]) {
    this.logger.debug(`Removing users from group [${groupId}] in project [${projectId}]`, { userIds });
    await this.ensureUserPermissionsIn(projectId, uid, PermissionFlags.ManageGroups);

    const toRemoveSet = new Set(userIds.map(id => BigInt(id)));
    const searchIds = Array.from(toRemoveSet);

    const affectedUsersCount = await this.projectRoleRepository.countBy({
      id: groupId,
      project: { id: projectId },
      user: { id: In(searchIds) }
    })

    if (affectedUsersCount !== userIds.length) {
      throw new BadRequestException(`Some users do not exist in this group`);
    }

    try {
      const updatedGroup = await this.projectGroupRepository.delete({
        id: groupId,
        project: { id: projectId },
        members: { id: In(searchIds) }
      });
      this.logger.debug(`Users removed from group successfully`, { updatedGroup });
      return updatedGroup;
    } catch (error) {
      this.logger.error('Failed to remove users from group: ' + ((error as MaybeException)?.message || 'Unknown error'));
      throw new InternalServerErrorException('Failed to remove users from group');
    }
  }
}
