import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, Not } from 'typeorm';
import {
  CategoryEntity,
  FileEntity,
  ProjectEntity,
  ProjectRoleEntity,
  ProjectTagEntity,
  UserEntity,
  RequestEntity,
  ProjectInvitationEntity,
  InvitationStatus,
} from '#LocalProject/Entities';
import { CreateProjectDto, UpdateProjectMetadataDto } from '#LocalProject/Dtos';
import {
  IntoPermission,
  Permission,
  PermissionFlags,
} from '@here-to-translate/common';
import { Maybe } from '@here-to-translate/common/types';
import { CommonHttpServiceImpl } from '#LocalProject/Utils/common-http-service.impl';
import { NotificationManagerService } from '#LocalProject/Managers/service/notification-manager.service';
import { ActivityManagerService } from './activity-manager.service';

import { BackgroundExtractService } from './background-extract.service';
import { StatusManagerService } from '#LocalProject/Managers/service/task-status-manager.service';
import { WorkflowManagerService } from '#LocalProject/Managers/service/workflow-manager.service';

@Injectable()
export class ProjectManagerService extends CommonHttpServiceImpl {
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
    @InjectRepository(FileEntity)
    private readonly fileRepository: Repository<FileEntity>,
    private readonly dataSource: DataSource,
    private readonly notificationService: NotificationManagerService,
    private readonly activityManagerService: ActivityManagerService,
    private readonly statusManagerService: StatusManagerService,
    private readonly workflowManagerService: WorkflowManagerService,
    private readonly backgroundExtract: BackgroundExtractService
  ) {
    super();
  }

  /** Ensures the user exists and has the required permission for the project.
   * @param projectId  - Project ID
   * @param uid        - User ID
   * @param against - Permission to check
   * @returns {Permission} - `Permission` instance corresponding to the user's permissions.
   * @throws {NotFoundException} - If the project or user does not exist.
   * @throws {ForbiddenException} - If the user does not have the required permission.
   */
  async testPermissions(
    projectId: bigint,
    uid: bigint,
    against: IntoPermission
  ): Promise<Permission> {
    const permissionValue = normalizePermission(against);
    this.logger.debug(
      `Checking if user [${uid}] has permission [${permissionValue}] for project [${projectId}]`
    );

    const projectExists = await this.projectRepository.exists({
      where: { id: BigInt(projectId) },
    });
    if (!projectExists) {
      this.logger.debug(`Project [${projectId}] does not exist`);
      throw new NotFoundException(`Unknown project`);
    }
    const userExists = await this.userRepository.exists({
      where: { id: BigInt(uid) },
    });
    if (!userExists) {
      this.logger.debug(`User [${uid}] does not exist`);
      throw new NotFoundException(`Unknown user`);
    }

    const userPermissionFlags = await this.projectRoleRepository
      .createQueryBuilder('role')
      .innerJoin('role.users', 'user')
      .where('role.project = :projectId', { projectId })
      .andWhere('user.id = :userId', { userId: uid })
      .select([`BIT_OR(role.permissionFlags) as userPermissionFlags`])
      .getRawOne<{ userPermissionFlags: bigint }>()
      .then(
        (result) =>
          new Permission(result?.userPermissionFlags ?? PermissionFlags.None)
      );

    // So sánh bitmask trực tiếp
    if ((userPermissionFlags.value & permissionValue) !== permissionValue) {
      this.logger.debug(
        `User [${uid}] does NOT have permission [${permissionValue}] for project [${projectId}]`
      );
      throw new ForbiddenException(
        'You do not have permission to perform this action'
      );
    }

    return new Permission(userPermissionFlags);
  }

  async createProject(uid: bigint, data: CreateProjectDto) {
    const { name, description, isPrivate, tags = [], categoryId, targetLanguages } = data;

    this.logger.debug('Received project data:', data);
    this.logger.debug(`Project targetLanguages: ${JSON.stringify(targetLanguages)}`);

    const userExists = await this.userRepository.exists({
      where: { id: BigInt(uid) },
    });
    if (!userExists) throw new BadRequestException('Unknown user');

    const categoryExists = await this.categoryRepository.exists({
      where: { id: BigInt(categoryId) },
    });
    if (!categoryExists) throw new BadRequestException('Unknown category');

    const queryRunner = this.dataSource.createQueryRunner();
    if (!queryRunner)
      throw new InternalServerErrorException('Database connection error');

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Handle tags
      const projectTags: Array<Partial<ProjectTagEntity>> = [];
      for (const tag of tags) {
        const existingTag = await queryRunner.manager.findOne(
          ProjectTagEntity,
          { where: { name: tag } }
        );
        if (existingTag) {
          projectTags.push({ id: existingTag.id });
        } else {
          const newTag = queryRunner.manager.create(ProjectTagEntity, {
            name: tag,
          });
          const savedTag = await queryRunner.manager.save(newTag);
          projectTags.push({ id: savedTag.id });
        }
      }

      const project = this.projectRepository.create({
        name,
        description,
        createdBy: { id: uid },
        isPrivate,
        tags: projectTags,
        targetLanguages,
        createdAt: new Date(),
        category: { id: BigInt(categoryId) },
      });

      const savedProject = await queryRunner.manager.save(project);

      this.logger.debug(`Project saved with ID: ${savedProject.id}, targetLanguages: ${JSON.stringify(savedProject.targetLanguages)}`);

      await queryRunner.manager.save(savedProject);

      // Create roles
      const ownerRole = queryRunner.manager.create(ProjectRoleEntity, {
        project: savedProject,
        permissionFlags: new Permission(PermissionFlags.Owner),
        name: 'Project Owner',
      });

      const everyoneRole = queryRunner.manager.create(ProjectRoleEntity, {
        project: savedProject,
        permissionFlags: new Permission(
          // Everyone role should only have ViewProject permission
          BigInt(PermissionFlags.ViewProject)
        ),
        name: 'Everyone',
      });

      const savedOwnerRole = await queryRunner.manager.save(ownerRole);
      const savedEveryoneRole = await queryRunner.manager.save(everyoneRole);

      // Add owner to owner role
      savedOwnerRole.users = [<UserEntity>{ id: uid }];
      await queryRunner.manager.save(savedOwnerRole);

      // Add owner to Everyone role
      savedEveryoneRole.users = [<UserEntity>{ id: uid }];
      await queryRunner.manager.save(savedEveryoneRole);

      // Add owner to project members
      savedProject.members = [<UserEntity>{ id: uid }];
      await queryRunner.manager.save(savedProject);

      await queryRunner.commitTransaction();

      try {
        const createdStatuses = await this.statusManagerService.createDefaultStatuses(
          savedProject.id.toString()
        );
        await this.workflowManagerService.createDefaultWorkflow(
          savedProject.id.toString(),
          createdStatuses
        );
      } catch (err) {
        this.logger.error('Failed to create default statuses/workflow', err);
      }

      this.logger.debug(
        `Project created successfully with ID: ${savedProject.id}`
      );

      return {
        message: 'Project created successfully',
        projectId: savedProject.id,
      };
    } catch (error) {
      this.logger.debug('Rolling back transaction');
      await queryRunner.rollbackTransaction();

      if (error instanceof BadRequestException) throw error;
      this.unknownErrorHanlder(error, 'Failed to create project');
    } finally {
      await queryRunner.release();
    }
  }

  async createProjectFromRequest(request: RequestEntity, uid: bigint) {
    this.logger.debug(`Creating project from request: ${request.title} (ID: ${request.id})`);
    this.logger.debug(`Request targetLanguages: ${JSON.stringify(request.targetLanguages)}`);
    this.logger.debug(`Request files count: ${request.files?.length || 0}`);

    const tags = request.tags?.map((tag) => tag.name) ?? [];

    const createProjectDto: CreateProjectDto = {
      name: request.title, // Chỉ lưu tên gốc, không prefix
      description: request.description,
      isPrivate: true,
      tags,
      categoryId: request.category?.id?.toString() || '1', // Default category if none provided
      targetLanguages: request.targetLanguages || [],
    };

    this.logger.debug(`Project DTO: ${JSON.stringify(createProjectDto)}`);

    // Create project first
    const projectResult = await this.createProject(uid, createProjectDto);

    // Copy files from request to project if they exist
    if (request.files && request.files.length > 0) {
      try {
        const newFileIds: string[] = [];
        for (const file of request.files) {
          // Create a copy of the file for the project
          const projectFile = this.fileRepository.create({
            fileName: file.fileName,
            fileType: file.fileType,
            fileContent: file.fileContent,
            project: { id: projectResult.projectId },
            uploader: { id: uid },
            createdAt: new Date(),
            request: { id: request.id },
            isSyncedFromRequest: true,
          });

          const savedProjectFile = await this.fileRepository.save(projectFile);
          newFileIds.push(savedProjectFile.id.toString());
        }

        this.logger.debug(`Copied ${request.files.length} files from request to project ${projectResult.projectId}`);

        // Enqueue background extraction without Redis/Bull
        if (newFileIds.length > 0) {
          this.backgroundExtract.enqueue(newFileIds);
        }
      } catch (error) {
        this.logger.error('Failed to copy files from request to project', error);
        // Don't fail the entire operation if file copying fails
      }
    }

    this.logger.debug(`Project created successfully from request: ${projectResult.projectId}`);
    return projectResult;
  }

  async getProjectsCount(): Promise<number> {
    return await this.projectRepository.count();
  }

  async fetchAllUserProjects(userId: bigint): Promise<ProjectEntity[]> {
    const qb = this.projectRepository
      .createQueryBuilder('project')
      .leftJoin('project.createdBy', 'createdBy')
      .leftJoin('project.members', 'member')
      .leftJoin('project.tags', 'tags')
      .leftJoin('project.category', 'category')
      .where('createdBy.id = :userId', { userId })
      .orWhere('member.id = :userId', { userId })
      .select([
        'project.id',
        'project.name',
        'project.description',
        'project.isPrivate',
        'project.targetLanguages',
        'project.createdAt',
        'createdBy.id',
        'createdBy.username',
        'createdBy.fullName',
        'category.id',
        'category.name',
        'member.id',
        'member.fullName',
        'tags.id',
        'tags.name',
      ]);

    return await qb.getMany();
  }

  async fetchProject(uid: Maybe<bigint>, projectId: bigint) {
    this.logger.debug(`Fetching project with ID: ${projectId}`);

    const project = await this.projectRepository.findOne({
      where: { id: projectId },
      select: ['isPrivate'],
    });

    if (!project) {
      this.logger.debug(`Project [${projectId}] does not exist`);
      throw new NotFoundException(`Unknown project`);
    }

    const userCanViewProject =
      typeof uid !== 'undefined' &&
      (await this.testPermissions(
        projectId,
        uid,
        PermissionFlags.ViewProject
      ).catch(() => false));

    if (project.isPrivate && !userCanViewProject) {
      this.logger.debug(
        `User with ID ${uid} does not have access to project with ID ${projectId}`
      );
      throw new ForbiddenException(`You do not have access to this project`);
    }

    const queryBuilder = this.projectRepository.createQueryBuilder('project');
    const projectMetadataQuery = queryBuilder
      .select([
        'project.id',
        'project.name',
        'project.description',
        'project.isPrivate',
        'project.isSyncedFromRequest',
        'project.targetLanguages',
        'project.createdAt',
        'createdBy.id',
        'createdBy.username',
        'createdBy.fullName',
        'tags',
        'category.id',
        'category.name',
        'category.description',
      ])
      .where('project.id = :projectId', { projectId })
      .leftJoin('project.createdBy', 'createdBy')
      .leftJoin('project.tags', 'tags')
      .leftJoin('project.category', 'category');

    if (!userCanViewProject) {
      this.logger.debug(
        `Project with ID ${projectId} is public, allowing metadata access`
      );
      return projectMetadataQuery.getOne();
    }

    this.logger.debug(
      `User with ID ${uid} has access to project with ID ${projectId}, fetching full project data`
    );
    try {
      return await projectMetadataQuery
        .leftJoinAndSelect('project.projectRoles', 'projectRoles')
        .andWhere('projectRoles.name != :systemRole', {
          systemRole: 'Everyone',
        })
        .getOne();
    } catch (error) {
      this.unknownErrorHanlder(error, 'Failed to fetch project metadata');
    }
  }

  async updateProjectMetadata(
    uid: bigint,
    projectId: bigint,
    updateData: UpdateProjectMetadataDto
  ) {
    this.logger.debug(`Updating project with ID: ${projectId}`, updateData);
    await this.testPermissions(
      projectId,
      uid,
      PermissionFlags.ManageProjectMetadata
    );

    const queryRunner = this.dataSource.createQueryRunner();
    if (!queryRunner) {
      this.logger.error('Database connection error');
      throw new InternalServerErrorException('Database connection error');
    }

    this.logger.debug('Starting transaction for project update');
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const project = await queryRunner.manager.findOne(ProjectEntity, {
        where: { id: projectId },
        relations: ['tags'],
      });
      if (!project) {
        this.logger.debug(`Project with ID ${projectId} not found`);
        throw new BadRequestException(`Unknown project`);
      }

      // Check if project is synced from request and prevent description updates
      if (project.isSyncedFromRequest && updateData.description !== undefined) {
        this.logger.debug(`Cannot update description for project synced from request: ${projectId}`);
        throw new BadRequestException('Description cannot be updated for projects synced from requests');
      }

      const newTags = new Map<bigint, string>(
        project.tags.map((tag) => [tag.id, tag.name])
      );
      for (const toAdd of updateData.addTags ?? []) {
        const existingTag = await queryRunner.manager.findOne(
          ProjectTagEntity,
          { where: { name: toAdd }, select: ['id', 'name'] }
        );
        if (existingTag) {
          newTags.set(existingTag.id, existingTag.name);
        } else {
          const newTag = queryRunner.manager.create(ProjectTagEntity, {
            name: toAdd,
          });
          const savedTag = await queryRunner.manager.save(newTag);
          newTags.set(savedTag.id, savedTag.name);
        }
      }
      for (const toRemove of updateData.removeTags ?? []) {
        const existingTag = await queryRunner.manager.findOne(
          ProjectTagEntity,
          { where: { name: toRemove }, select: ['id'] }
        );
        if (existingTag) {
          newTags.delete(existingTag.id);
        }
      }

      delete updateData.addTags;
      delete updateData.removeTags;

      let category: CategoryEntity | null | undefined = undefined;
      if (updateData.categoryId !== undefined) {
        category = await queryRunner.manager.findOne(CategoryEntity, {
          where: { id: BigInt(updateData.categoryId) },
        });
        if (!category) {
          throw new BadRequestException(
            `Category with ID ${updateData.categoryId} not found`
          );
        }
      }
      delete updateData.categoryId;

      Object.assign(project, {
        ...updateData,
        category: category ?? project.category,
        tags: Array.from(newTags.entries()).map(([id, name]) => ({ id, name })),
      });

      const updatedProject = await queryRunner.manager.save(project);
      await queryRunner.commitTransaction();
      this.logger.debug(
        `Project updated successfully with ID: ${updatedProject.id}`
      );

      // Log activity
      try {
        await this.activityManagerService.logProjectUpdate(
          Number(projectId),
          Number(uid),
          updateData.name || updatedProject.name
        );
      } catch (error) {
        this.logger.error('Failed to log project update activity:', error);
      }

      // Get project members to notify them about the update
      const projectMembers = await this.projectRoleRepository
        .createQueryBuilder('role')
        .innerJoin('role.users', 'user')
        .where('role.project = :projectId', { projectId })
        .select(['user.id'])
        .getMany();

      const memberIds = projectMembers.flatMap(role =>
        role.users?.map(user => user.id).filter(id => id !== uid) || []
      );

      // Notify all project members about the update
      for (const memberId of memberIds) {
        await this.notificationService.createNotification({
          userId: memberId,
          type: 'PROJECT_UPDATED',
          message: `Project "${updatedProject.name}" has been updated by a team member.`,
          createdBy: uid,
        });
      }

      return updatedProject;
    } catch (error) {
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

  async deleteProject(projectId: bigint, userId: bigint) {
    this.logger.debug(`Deleting project with ID: ${projectId}`);

    const project = await this.projectRepository.findOne({
      where: { id: projectId },
      relations: ['createdBy'],
    });

    if (!project) {
      this.logger.debug(`Project [${projectId}] does not exist`);
      throw new NotFoundException(`Unknown project`);
    }

    // Chỉ cho phép owner xóa project
    if (!project.createdBy || String(project.createdBy.id) !== String(userId)) {
      this.logger.debug(
        `User [${userId}] không phải owner, không được xóa project [${projectId}]`
      );
      throw new ForbiddenException('Only project owner can delete the project');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Prevent deletion if the project was created from a request
      if (project.isSyncedFromRequest) {
        this.logger.debug(`Project [${projectId}] cannot be deleted: project was created from a request.`);
        throw new BadRequestException('Cannot delete project because it was created from a request');
      }

      // Prevent deletion if there are files linked to a request
      const rows = await queryRunner.manager.query(
        'SELECT COUNT(1) AS cnt FROM `file` WHERE `projectId` = ? AND `requestId` IS NOT NULL',
        [projectId]
      );
      const cnt = Number(rows?.[0]?.cnt || 0);
      if (cnt > 0) {
        this.logger.debug(`Project [${projectId}] cannot be deleted: ${cnt} file(s) are linked to request(s).`);
        throw new BadRequestException('Cannot delete project because some files are linked to a request');
      }

      // Use a more robust approach with error handling for each step
      const deletionSteps = [
        // 1. Delete project invitations
        {
          name: 'project invitations',
          query: 'DELETE FROM project_invitations WHERE project_id = ?',
          params: [projectId]
        },
        
        // 2. Delete user-project role relationships
        {
          name: 'user project roles',
          query: 'DELETE FROM user_project_roles WHERE roleId IN (SELECT id FROM projectrole WHERE projectId = ?)',
          params: [projectId]
        },
        
        // 3. Delete project roles
        {
          name: 'project roles',
          query: 'DELETE FROM projectrole WHERE projectId = ?',
          params: [projectId]
        },
        
        // 4. Delete project members
        {
          name: 'project members',
          query: 'DELETE FROM project_members_user WHERE projectId = ?',
          params: [projectId]
        },
        
        // 5. Delete workflow transitions
        {
          name: 'workflow transitions',
          query: 'DELETE FROM workflow_transition WHERE workflowId IN (SELECT id FROM workflow WHERE projectId = ?)',
          params: [projectId]
        },
        
        // 6. Delete workflows
        {
          name: 'workflows',
          query: 'DELETE FROM workflow WHERE projectId = ?',
          params: [projectId]
        },
        
        // 7. Delete task statuses
        {
          name: 'task statuses',
          query: 'DELETE FROM task_status WHERE projectId = ?',
          params: [projectId]
        },
        
        // 8. Delete tasks
        {
          name: 'tasks',
          query: 'DELETE FROM task WHERE projectId = ?',
          params: [projectId.toString()]
        },
        
        // 9. Delete activities
        {
          name: 'activities',
          query: 'DELETE FROM activity WHERE projectId = ?',
          params: [Number(projectId)]
        },
        
        // 10. Delete notifications
        {
          name: 'notifications',
          query: 'DELETE FROM notification WHERE message LIKE ? OR message LIKE ?',
          params: [`%project "${project.name}"%`, `%Project "${project.name}"%`]
        },
        
        // 11. Delete files
        {
          name: 'files',
          query: 'DELETE FROM file WHERE projectId = ?',
          params: [projectId]
        },
        
        // 12. Delete project tags relationship
        {
          name: 'project tags',
          query: 'DELETE FROM project_tags_project_tag WHERE projectId = ?',
          params: [projectId]
        },
        
        // 13. Finally delete the project itself
        {
          name: 'project',
          query: 'DELETE FROM project WHERE id = ?',
          params: [projectId]
        }
      ];

      // Execute each deletion step with error handling
      for (const step of deletionSteps) {
        try {
          this.logger.debug(`Deleting ${step.name} for project ${projectId}`);
          const result = await queryRunner.manager.query(step.query, step.params);
          this.logger.debug(`Deleted ${step.name}: ${result.affectedRows || 0} rows affected`);
        } catch (stepError) {
          this.logger.warn(`Failed to delete ${step.name} for project ${projectId}:`, stepError);
          // Continue with other deletions even if one fails (some tables might not exist or be empty)
        }
      }

      await queryRunner.commitTransaction();

      this.logger.debug(`Project [${projectId}] and all related data deleted successfully`);
      return { message: `Project deleted successfully` };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Failed to delete project:', error);
      throw new InternalServerErrorException(`Failed to delete project: ${error as string}`);
    } finally {
      await queryRunner.release();
    }
  }

  async findUserToProject(
    projectId: bigint,
    identifier: string,
    uid: bigint
  ): Promise<
    Array<{ id: bigint; fullName: string; email: string; phone: string }>
  > {
    await this.testPermissions(projectId, uid, PermissionFlags.ManageMembers);
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
      relations: ['members'],
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const existingMemberIds = project.members.map((m) => m.id);

    const users = await this.userRepository
      .createQueryBuilder('user')
      .select(['user.id', 'user.fullName', 'user.email', 'user.phone'])
      .where(
        `(user.email = :identifier OR user.fullName LIKE :likeIdentifier)`,
        { identifier, likeIdentifier: `%${identifier}%` }
      )
      .andWhere(
        existingMemberIds.length
          ? 'user.id NOT IN (:...existingMemberIds)'
          : '1=1',
        {
          existingMemberIds,
        }
      )
      .andWhere(`user.roleId NOT IN (:...excludedRoles)`, {
        excludedRoles: [2, 1],
      })
      .limit(10)
      .getRawMany();

    return users;
  }

  async addUserToProject(
    projectId: bigint,
    userId: bigint,
    uid: bigint
  ): Promise<ProjectEntity> {
    await this.testPermissions(
      projectId,
      uid,
      PermissionFlags.ManageMembers
    );
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
      relations: ['members'],
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const isAlreadyMember = project.members.some((m) => m.id === userId);
    if (isAlreadyMember) {
      throw new BadRequestException('User is already a member of the project');
    }

    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Start transaction
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Add user to project members
      project.members.push(user);
      await queryRunner.manager.save(project);

      // Add user to Everyone role
      const everyoneRole = await queryRunner.manager.findOne(
        ProjectRoleEntity,
        {
          where: {
            project: { id: projectId },
            name: 'Everyone',
          },
          relations: ['users'],
        }
      );

      if (!everyoneRole) {
        // If Everyone role doesn't exist, create it
        const newEveryoneRole = queryRunner.manager.create(ProjectRoleEntity, {
          project: { id: projectId },
          permissionFlags: new Permission(
            // Everyone role should only have ViewProject permission
            BigInt(PermissionFlags.ViewProject)
          ),
          name: 'Everyone',
          users: [user],
        });
        await queryRunner.manager.save(newEveryoneRole);
        // LOG: Tạo role Everyone mới
        console.log(
          `[addUserToProject] Created new role 'Everyone' for project ${projectId} with permissionFlags:`,
          newEveryoneRole.permissionFlags.value.toString(),
          newEveryoneRole.permissionFlags.resolveNames()
        );
      } else {
        // Add user to existing Everyone role
        const existingUserIds = new Set(
          everyoneRole.users.map((u) => u.id.toString())
        );
        if (!existingUserIds.has(user.id.toString())) {
          everyoneRole.users.push(user);
          await queryRunner.manager.save(everyoneRole);
        }
        // LOG: Đã thêm user vào role Everyone
        console.log(
          `[addUserToProject] Added user ${userId} to existing role 'Everyone' for project ${projectId} with permissionFlags:`,
          everyoneRole.permissionFlags.value.toString(),
          everyoneRole.permissionFlags.resolveNames()
        );
      }

      await queryRunner.commitTransaction();
      return project;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async isUserProjectMember(projectId: bigint, userId: bigint): Promise<boolean> {
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
      relations: ['members'],
    });
    if (!project) return false;
    return project.members.some(member => member.id === userId);
  }

  async removeUserFromProject(projectId: bigint, userId: bigint) {
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
      relations: ['members', 'createdBy'],
    });
    if (!project) throw new NotFoundException('Project not found');
    // Không cho phép remove owner
    if (project.createdBy && String(project.createdBy.id) === String(userId)) {
      throw new ForbiddenException('Cannot remove project owner');
    }
    // Xóa trực tiếp bằng raw SQL
    await this.dataSource.query(
      'DELETE FROM project_members_user WHERE projectId = ? AND userId = ?',
      [projectId, userId]
    );
    return { message: 'User removed from project members' };
  }

  async getProjectMembers(projectId: bigint): Promise<
    {
      id: string;
      username: string;
      fullName: string;
      email: string;
      roles: { id: string; name: string }[];
    }[]
  > {
    const roles = await this.projectRoleRepository.find({
      where: { project: { id: projectId } },
      relations: ['users'],
    });

    const memberMap: Record<
      string,
      {
        id: string;
        username: string;
        fullName: string;
        email: string;
        roles: {
          id: string;
          name: string;
          permissionFlags?: string | number | bigint;
        }[];
      }
    > = {};

    for (const role of roles) {
      for (const user of role.users) {
        const key = user.id.toString();
        if (!memberMap[key]) {
          memberMap[key] = {
            id: key,
            username: user.username,
            fullName: user.fullName,
            email: user.email,
            roles: [],
          };
        }
        memberMap[key].roles.push({
          id: role.id.toString(),
          name: role.name,
          permissionFlags: role.permissionFlags.value.toString(), // Ensure proper serialization
        });
      }
    }
    return Object.values(memberMap);
  }

  async getProjectMembersWithRoles(projectId: bigint): Promise<{
    members: {
      id: string;
      username: string;
      fullName: string;
      email: string;
      avatarUrl?: string;
      joinedAt?: string;
      roles: {
        id: string;
        name: string;
        permissionFlags?: string | number | bigint;
      }[];
    }[];
    projectRoles: {
      id: string;
      name: string;
      permissionFlags: string | number | bigint;
    }[];
  }> {
    // Get project with members first
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
      relations: ['members', 'createdBy'],
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Get accepted invitations to determine join times
    const acceptedInvitations = await this.dataSource
      .getRepository(ProjectInvitationEntity)
      .createQueryBuilder('invitation')
      .where('invitation.projectId = :projectId', { projectId })
      .andWhere('invitation.status = :status', { status: InvitationStatus.ACCEPTED })
      .select(['invitation.invitedUserId', 'invitation.updatedAt'])
      .getMany();

    // Create a map of user join times from invitations
    const userJoinTimes = new Map<string, Date>();
    console.log('🔍 Accepted invitations for project', projectId, ':', acceptedInvitations);
    for (const invitation of acceptedInvitations) {
      const userId = invitation.invitedUserId.toString();
      const joinTime = invitation.updatedAt;
      userJoinTimes.set(userId, joinTime);
      console.log('🔍 Setting join time for user', userId, ':', joinTime);
    }
    console.log('🔍 Final userJoinTimes map:', Object.fromEntries(userJoinTimes));

    // Get all roles except Everyone role first
    const roles = await this.projectRoleRepository.find({
      where: {
        project: { id: projectId },
        name: Not('Everyone'),
      },
      relations: ['users'],
    });

    // Get Everyone role separately
    const everyoneRole = await this.projectRoleRepository.findOne({
      where: {
        project: { id: projectId },
        name: 'Everyone',
      },
      relations: ['users'],
    });

    // If Everyone role doesn't exist or has wrong permissions, fix it
    if (!everyoneRole) {
      this.logger.warn(
        `Everyone role not found for project ${projectId}, creating it`
      );
      const newEveryoneRole = this.projectRoleRepository.create({
        project: { id: projectId },
        permissionFlags: new Permission(BigInt(PermissionFlags.ViewProject)),
        name: 'Everyone',
        users: project.members, // Add all project members to Everyone role
      });
      await this.projectRoleRepository.save(newEveryoneRole);
    } else if (
      everyoneRole.permissionFlags.value !== BigInt(PermissionFlags.ViewProject)
    ) {
      this.logger.warn(
        `Fixing Everyone role permissions for project ${projectId}`
      );
      everyoneRole.permissionFlags = new Permission(
        BigInt(PermissionFlags.ViewProject)
      );
      // Add any missing members to Everyone role
      const everyoneUserIds = new Set(
        everyoneRole.users.map((u) => u.id.toString())
      );
      const missingUsers = project.members.filter(
        (m) => !everyoneUserIds.has(m.id.toString())
      );
      if (missingUsers.length > 0) {
        everyoneRole.users = [...everyoneRole.users, ...missingUsers];
      }
      await this.projectRoleRepository.save(everyoneRole);
    }

    const memberMap: Record<
      string,
      {
        id: string;
        username: string;
        fullName: string;
        email: string;
        avatarUrl?: string;
        joinedAt?: string;
        roles: {
          id: string;
          name: string;
          permissionFlags?: string | number | bigint;
        }[];
      }
    > = {};

    // First add all project members
    for (const member of project.members) {
      memberMap[member.id.toString()] = {
        id: member.id.toString(),
        username: member.username,
        fullName: member.fullName,
        email: member.email,
        avatarUrl: member.avatarUrl,
        roles: [],
        // For project owner, use project creation date as joinedAt
        joinedAt: project.createdBy && member.id === project.createdBy.id ? project.createdAt.toISOString() : undefined,
      };
    }

    // Update joinedAt for non-owner members using invitation times
    for (const member of project.members) {
      if (project.createdBy && member.id !== project.createdBy.id) {
        const joinTime = userJoinTimes.get(member.id.toString());
        if (joinTime) {
          memberMap[member.id.toString()].joinedAt = joinTime.toISOString();
        }
      }
    }

    // Then add roles to members
    for (const role of roles) {
      for (const user of role.users) {
        const key = user.id.toString();
        if (!memberMap[key]) {
          // If user is in a role but not in project members, add them
          memberMap[key] = {
            id: key,
            username: user.username,
            fullName: user.fullName,
            email: user.email,
            avatarUrl: user.avatarUrl,
            roles: [],
          };
        }
        memberMap[key].roles.push({
          id: role.id.toString(),
          name: role.name,
          permissionFlags: role.permissionFlags.value.toString(), // Ensure proper serialization
        });

        // Use invitation accept time if available, otherwise use role creation time
        const joinTime = userJoinTimes.get(key);
        console.log('🔍 Looking up join time for user', key, ':', joinTime);
        if (joinTime && !memberMap[key].joinedAt) {
          memberMap[key].joinedAt = joinTime.toISOString();
          console.log('🔍 Set joinedAt for user', key, 'to:', joinTime.toISOString());
        } else if (role.createdAt && (!memberMap[key].joinedAt || role.createdAt < new Date(memberMap[key].joinedAt || ''))) {
          memberMap[key].joinedAt = role.createdAt.toISOString();
          console.log('🔍 Set joinedAt for user', key, 'to role creation time:', role.createdAt.toISOString());
        }
      }
    }

    // Add Everyone role to all members
    if (everyoneRole) {
      const projectRoles = roles.map((role) => ({
        id: role.id.toString(),
        name: role.name,
        permissionFlags: role.permissionFlags.value.toString(), // Ensure proper serialization
      }));

      // Add Everyone role to roles list
      projectRoles.push({
        id: everyoneRole.id.toString(),
        name: everyoneRole.name,
        permissionFlags: everyoneRole.permissionFlags.value.toString(), // Ensure proper serialization
      });

      // Add Everyone role to all members
      Object.values(memberMap).forEach((member) => {
        member.roles.push({
          id: everyoneRole.id.toString(),
          name: everyoneRole.name,
          permissionFlags: everyoneRole.permissionFlags.value.toString(), // Ensure proper serialization
        });
      });

      return { members: Object.values(memberMap), projectRoles };
    }

    return {
      members: Object.values(memberMap),
      projectRoles: roles.map((role) => ({
        id: role.id.toString(),
        name: role.name,
        permissionFlags: role.permissionFlags.value.toString(), // Ensure proper serialization
      })),
    };
  }

  async lockProjectEdits(projectId: bigint): Promise<void> {
    this.logger.debug(`Locking project edits for project ID: ${projectId}`);

    const project = await this.projectRepository.findOne({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    this.logger.log(`Project ${projectId} edits have been locked`);
  }

  async archive(project: ProjectEntity): Promise<void> {
    this.logger.debug(`Archiving project ID: ${project.id}`);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await queryRunner.manager.delete('task', {
        projectId: project.id.toString(),
      });

      await queryRunner.manager.delete('task_status', {
        project: { id: project.id },
      });

      await queryRunner.manager.delete('workflow_transition', {
        workflow: { project: { id: project.id } },
      });

      await queryRunner.manager.delete('workflow', {
        project: { id: project.id },
      });

      await queryRunner.manager.update(
        'project',
        { id: project.id },
        { isArchived: true }
      );

      await queryRunner.commitTransaction();
      this.logger.log(`Project ${project.id} has been archived successfully`);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to archive project ${project.id}:`, error);
      throw new InternalServerErrorException('Failed to archive project');
    } finally {
      await queryRunner.release();
    }
  }

  async transferProjectOwnership(
    projectId: bigint,
    currentOwnerId: bigint,
    email: string
  ): Promise<ProjectEntity> {
    this.logger.debug(`Transferring project ${projectId} ownership from ${currentOwnerId} to user with email ${email}`);

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new BadRequestException('Invalid email format');
    }

    // Validate email is not empty
    if (!email || email.trim() === '') {
      throw new BadRequestException('Email cannot be empty');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Check if project exists and current user is the owner
      const project = await queryRunner.manager.findOne(ProjectEntity, {
        where: { id: projectId },
        relations: ['createdBy', 'members'],
      });

      if (!project) {
        throw new NotFoundException(`Project with ID ${projectId} not found`);
      }

      this.logger.debug(`Debug ownership check: currentOwnerId=${currentOwnerId}, project.createdBy.id=${project.createdBy.id}, types: currentOwnerId=${typeof currentOwnerId}, project.createdBy.id=${typeof project.createdBy.id}`);

      // Convert both to BigInt for proper comparison
      const currentOwnerBigInt = BigInt(currentOwnerId);
      const projectOwnerBigInt = BigInt(project.createdBy.id);

      if (projectOwnerBigInt !== currentOwnerBigInt) {
        throw new ForbiddenException(`Only the project owner can transfer ownership. Current user ID: ${currentOwnerId}, Project owner ID: ${project.createdBy.id}`);
      }

      // Check if new owner exists by email
      const newOwner = await queryRunner.manager.findOne(UserEntity, {
        where: { email: email },
      });

      if (!newOwner) {
        throw new NotFoundException(`User with email ${email} not found`);
      }

      // Prevent self-transfer
      if (newOwner.id === currentOwnerId) {
        throw new BadRequestException('Cannot transfer ownership to yourself');
      }

      // Check if new owner is already a member of the project
      const isMember = project.members.some(member => member.id === newOwner.id);

      // If new owner is not a member, add them to the project first
      if (!isMember) {
        // Add new owner to project members
        project.members.push(newOwner);
        await queryRunner.manager.save(ProjectEntity, project);

        this.logger.log(`Added user ${newOwner.email} as project member before ownership transfer`);
      }

      // Transfer ownership (assign relation and save to satisfy typings)
      project.createdBy = newOwner;
      await queryRunner.manager.save(ProjectEntity, project);

      // Find all project roles
      const projectRoles = await queryRunner.manager.find(ProjectRoleEntity, {
        where: { project: { id: projectId } },
        relations: ['users'],
      });

      // Remove current owner from ALL roles first
      for (const role of projectRoles) {
        if (role.users.some(user => user.id === currentOwnerId)) {
          role.users = role.users.filter(user => user.id !== currentOwnerId);
          await queryRunner.manager.save(ProjectRoleEntity, role);
        }
      }

      // Find or create Project Owner role
      const ownerRole = projectRoles.find(role => role.name === 'Project Owner');

      if (ownerRole) {
        // Update existing Project Owner role to only have new owner
        ownerRole.users = [newOwner];
        ownerRole.permissionFlags = new Permission(PermissionFlags.Owner);
        await queryRunner.manager.save(ProjectRoleEntity, ownerRole);
      } else {
        // Create new Project Owner role for new owner
        const newOwnerRole = queryRunner.manager.create(ProjectRoleEntity, {
          project: { id: projectId },
          name: 'Project Owner',
          permissionFlags: new Permission(PermissionFlags.Owner),
          users: [newOwner],
        });
        await queryRunner.manager.save(ProjectRoleEntity, newOwnerRole);
      }

      // Remove any duplicate Project Owner roles
      const allOwnerRoles = projectRoles.filter(role => role.name === 'Project Owner');
      if (allOwnerRoles.length > 1) {
        // Keep only the first one, remove the rest
        for (let i = 1; i < allOwnerRoles.length; i++) {
          await queryRunner.manager.remove(ProjectRoleEntity, allOwnerRoles[i]);
        }
      }

      await queryRunner.commitTransaction();

      // Send notifications with separate error handling
      try {
        // Notify new owner about receiving ownership
        await this.notificationService.createNotification({
          userId: newOwner.id,
          type: 'PROJECT_OWNERSHIP_RECEIVED',
          message: `You are now the owner of project "${project.name}"`,
        });

        // Notify old owner about losing ownership
        await this.notificationService.createNotification({
          userId: currentOwnerId,
          type: 'PROJECT_OWNERSHIP_LOST',
          message: `Project ownership of "${project.name}" has been transferred to ${newOwner.username}`,
        });
      } catch (notifError) {
        this.logger.warn(`Failed to send notifications but transfer was successful:`, notifError);
      }

      // Log activity with separate error handling
      try {
        await this.activityManagerService.logProjectUpdate(
          Number(projectId),
          Number(currentOwnerId),
          project.name,
          undefined,
        );
      } catch (logError) {
        this.logger.warn(`Failed to log activity but transfer was successful:`, logError);
      }

      this.logger.log(`Project ${projectId} ownership transferred successfully from ${currentOwnerId} to ${newOwner.id}`);

      // Return updated project with separate error handling
      try {
        return await this.projectRepository.findOneOrFail({
          where: { id: projectId },
          relations: ['createdBy'],
        });
      } catch (returnError) {
        this.logger.warn(`Failed to return updated project but transfer was successful:`, returnError);
        // Return the project we already have
        return project;
      }
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to transfer project ownership:`, error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

}
function normalizePermission(input: IntoPermission): bigint {
  if (typeof input === 'bigint') return input;
  if (typeof input === 'number') return BigInt(input);
  if (typeof input === 'string') {
    return PermissionFlags[input as keyof typeof PermissionFlags] ?? 0n;
  }
  if (typeof input === 'object' && input !== null && 'value' in input) {
    return input.value;
  }
  throw new Error('Invalid permission input type');
}
