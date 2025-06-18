import { Injectable, BadRequestException, Logger, InternalServerErrorException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ProjectEntity, UserEntity, ProjectRoleEntity, ProjectTagEntity, CategoryEntity } from '#LocalProject/Entities';
import { MaybeException } from '#LocalProject/Exceptions';
import { CreateDiscussionDto, CreateProjectDto, CreateProjectGroupDto, CreateProjectRoleDto, UpdateProjectGroupDto, UpdateProjectMetadataDto } from '#LocalProject/Dtos';
import { PermissionFlags, Permission, IntoPermission } from '@here-to-translate/common';
import { Maybe } from '@here-to-translate/common/types';
import { GroupManagerService } from './group-manager.service';
import { RoleManagerService } from './role-manager.service';
import { ManagerService } from './manager-service.base';
import { DiscussionManagerService } from './discussion-manager.service';

@Injectable()
export class ProjectManagerService extends ManagerService {
  protected override readonly logger = new Logger(ProjectManagerService.name);
  constructor(
    @InjectRepository(CategoryEntity)
    private readonly categoryRepository: Repository<CategoryEntity>,
    @InjectRepository(ProjectEntity)
    private readonly projectRepository: Repository<ProjectEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(ProjectRoleEntity)
    private readonly projectRoleRepository: Repository<ProjectRoleEntity>,
    private dataSource: DataSource,
    private readonly groupManager: GroupManagerService,
    private readonly roleManager: RoleManagerService,
    private readonly discussionManager: DiscussionManagerService
  ) {
    super();
  }

  /** Ensures the user exists and has the required permission for the project.
   * @param projectId  - Project ID
   * @param uid        - User ID
   * @param permission - Permission to check
   * @returns {Permission} - `Permission` instance corresponding to the user's permissions.
   * @throws {NotFoundException} - If the project or user does not exist.
   * @throws {ForbiddenException} - If the user does not have the required permission.
   */
  async testPermissions(projectId: bigint, uid: bigint, against: IntoPermission): Promise<Permission> {
    const permissionAgainst = new Permission(against);
    this.logger.debug(`Checking if user [${uid}] has ${permissionAgainst} for project [${projectId}]`);

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

    const userPermissionFlags = await this.projectRoleRepository.createQueryBuilder('role')
      .innerJoin('role.user', 'user')
      .where('role.project = :projectId', { projectId })
      .andWhere('user.id = :userId', { userId: uid })
      .select([
        `BIT_OR(role.permissionFlags) as userPermissionFlags`,
      ])
      .getRawOne<{ userPermissionFlags: bigint }>()
      .then(result => BigInt(result?.userPermissionFlags || 0));

    if ((userPermissionFlags & permissionAgainst.value) !== permissionAgainst.value) {
      this.logger.debug(`User [${uid}] does not have permission [${permissionAgainst}] for project [${projectId}]`);
      throw new ForbiddenException(`You do not have permission to perform this action`);
    }

    return new Permission(userPermissionFlags);
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

    const categoryExists = await this.categoryRepository.exists({
      where: { id: BigInt(categoryId) }
    });

    if (!categoryExists) {
      throw new BadRequestException(`Unknown category`);
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
        createdBy: { id: uid },
        isPublic,
        tags: projectTags,
        createdAt: new Date(),
        category: { id: BigInt(categoryId) }
      });

      const savedProject = await queryRunner.manager.save(project);

      const projectRole = queryRunner.manager.create(ProjectRoleEntity, {
        project: savedProject,
        user: { id: uid },
        permissionFlags: new Permission(PermissionFlags.Owner),
        name: 'Project Owner'
      });

      const everyoneRole = queryRunner.manager.create(ProjectRoleEntity, {
        project: savedProject,
        user: { id: BigInt(0) },
        permissionFlags: new Permission(PermissionFlags.ViewProject),
        name: 'Everyone'
      });

      await queryRunner.manager.save(projectRole);
      await queryRunner.manager.save(everyoneRole);
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
      this.unknownErrorHanlder(error, 'Failed to create project');
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
    try {
      const fullProject = await projectMetadataQuery
        .leftJoinAndSelect('project.projectRoles', 'projectRoles')
        .getOne();

      return fullProject;
    } catch (error) {
      this.logger.error(`Failed to fetch project with ID ${projectId}: ` + ((error as MaybeException)?.message || 'Unknown error'));
      throw new InternalServerErrorException('Failed to fetch project');
    }
  }

  async updateProjectMetadata(uid: bigint, projectId: bigint, updateData: Partial<UpdateProjectMetadataDto>) {
    this.logger.debug(`Updating project with ID: ${projectId}`, updateData);
    this.testPermissions(projectId, uid, PermissionFlags.ManageProjectMetadata);

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
      this.unknownErrorHanlder(error, 'Failed to update project metadata');
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

    try {
      await this.projectRepository.remove(project);
      this.logger.debug(`Project [${projectId}] deleted successfully`);
      return { message: `Project deleted successfully` };
    } catch (error) {
      this.unknownErrorHanlder(error, 'Failed to delete project');
    }
  }

  async addProjectRole(uid: bigint, projectId: bigint, roleData: CreateProjectRoleDto) {
    this.logger.debug(`Adding role to project [${projectId}] for user [${uid}]`, roleData);
    const userPermissionFlags = await this.testPermissions(projectId, uid, Permission.from(PermissionFlags.ManageRoles));
    return this.roleManager.createProjectRole(projectId, roleData, userPermissionFlags);
  };

  async fetchProjectRoles(uid: bigint, projectId: bigint, roleId?: Maybe<bigint>) {
    this.logger.debug(`Fetching roles [${roleId ?? 'All'}] for project [${projectId}]`);
    await this.testPermissions(projectId, uid, PermissionFlags.ViewProject);

    return this.roleManager.fetchProjectRoles(projectId, roleId);
  }

  async updateProjectRole(uid: bigint, projectId: bigint, roleId: bigint, updateData: Partial<CreateProjectRoleDto>) {
    const userPermissionFlags = await this.testPermissions(projectId, uid, PermissionFlags.ManageRoles);

    this.logger.debug(`Updating role [${roleId}] for project [${projectId}]`, updateData);
    return this.roleManager.updateProjectRole(projectId, roleId, updateData, userPermissionFlags);
  }

  async deleteProjectRole(uid: bigint, projectId: bigint, roleId: bigint) {
    await this.testPermissions(projectId, uid, PermissionFlags.ManageRoles);
    return this.roleManager.deleteProjectRole(projectId, roleId);
  }

  async addUsersToRole(uid: bigint, projectId: bigint, roleId: bigint, userIds: bigint[]) {
    this.logger.debug(`Adding users to role [${roleId}] in project [${projectId}]`, { userIds });
    await this.testPermissions(projectId, uid, PermissionFlags.ManageMembers);

    return this.roleManager.addUsersToRole(projectId, roleId, userIds);
  }

  async removeUsersFromRole(uid: bigint, projectId: bigint, roleId: bigint, userIds: bigint[]) {
    this.logger.debug(`Removing users from role [${roleId}] in project [${projectId}]`, { userIds });
    await this.testPermissions(projectId, uid, PermissionFlags.ManageMembers);

    return this.roleManager.removeUsersFromRole(projectId, roleId, userIds);
  }

  // @RequirePermissions(PermissionFlags.ManageGroups)
  async createProjectGroup(uid: bigint, projectId: bigint, data: CreateProjectGroupDto) {
    this.logger.debug(`Creating project group for project [${projectId}]`, data);
    await this.testPermissions(projectId, uid, PermissionFlags.ManageGroups);
    return this.groupManager.createProjectGroup(projectId, data);
  }

  async fetchProjectGroups(uid: bigint, projectId: bigint, groupId?: Maybe<bigint>) {
    this.logger.debug(`Fetching project groups for project [${projectId}]`, { groupId: groupId ?? 'All' });
    await this.testPermissions(projectId, uid, PermissionFlags.ViewProject);
    return this.groupManager.fetchProjectGroup(projectId, groupId);
  }

  async updateProjectGroupMetadata(uid: bigint, projectId: bigint, groupId: bigint, updateData: UpdateProjectGroupDto) {
    this.logger.debug(`Updating project group [${groupId}] for project [${projectId}]`, updateData);
    await this.testPermissions(projectId, uid, PermissionFlags.ManageGroups);
    return this.groupManager.updateProjectGroupMetadata(projectId, groupId, updateData);
  }

  async deleteProjectGroup(uid: bigint, projectId: bigint, groupId: bigint) {
    this.logger.debug(`Deleting project group [${groupId}] for project [${projectId}]`);
    await this.testPermissions(projectId, uid, PermissionFlags.ManageGroups);
    return this.groupManager.deleteProjectGroup(projectId, groupId);
  }

  async addUsersToGroup(uid: bigint, projectId: bigint, groupId: bigint, userIds: bigint[]) {
    this.logger.debug(`Adding users to group [${groupId}] in project [${projectId}]`, { userIds });
    await this.testPermissions(projectId, uid, PermissionFlags.ManageGroups);

    return this.groupManager.addUsersToGroup(projectId, groupId, userIds);
  }

  async removeUsersFromGroup(uid: bigint, projectId: bigint, groupId: bigint, userIds: bigint[]) {
    this.logger.debug(`Removing users from group [${groupId}] in project [${projectId}]`, { userIds });
    await this.testPermissions(projectId, uid, PermissionFlags.ManageGroups);

    return this.groupManager.removeUsersFromGroup(projectId, groupId, userIds);
  }

  async createDiscussion(uid: bigint, projectId: bigint, data: CreateDiscussionDto) {
    await this.testPermissions(projectId, uid, PermissionFlags.ManageDiscussions);
    return this.discussionManager.createDiscussion(projectId, data);
  }

  async updateDiscussionMetadata(uid: bigint, projectId: bigint, threadId: bigint, discussionUpdateData: any) {
    await this.testPermissions(projectId, uid, PermissionFlags.ManageDiscussions);
    return this.discussionManager.updateDiscussionMetadata(threadId, discussionUpdateData);
  }

  async archiveDiscussion(uid: bigint, projectId: bigint, threadId: bigint) {
    await this.testPermissions(projectId, uid, PermissionFlags.ManageDiscussions);
    return this.discussionManager.archiveDiscussion(threadId);
  }
}
