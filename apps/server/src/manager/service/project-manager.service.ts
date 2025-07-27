import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository, Not } from 'typeorm';
import {
  BranchEntity,
  CategoryEntity,
  CommitEntity,
  ProjectEntity,
  ProjectRoleEntity,
  ProjectTagEntity,
  UserEntity,
  RequestEntity, CommitStatus
} from '#LocalProject/Entities';
import { CreateProjectDto, UpdateProjectMetadataDto } from '#LocalProject/Dtos';
import {
  IntoPermission,
  Permission,
  PermissionFlags,
} from '@here-to-translate/common';
import { Maybe } from '@here-to-translate/common/types';
import { CommonHttpServiceImpl } from '#LocalProject/Utils/common-http-service.impl';
import { GitHubService } from '#LocalProject/Managers/service/github-manager.service';

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
    @InjectRepository(BranchEntity)
    private readonly branchRepository: Repository<BranchEntity>,
    @InjectRepository(CommitEntity)
    private readonly commitRepository: Repository<CommitEntity>,
    private readonly dataSource: DataSource,
    private readonly githubService: GitHubService
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
    // against có thể là bigint hoặc string, luôn convert về bigint
    const permissionValue = BigInt(against);
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
      throw new ForbiddenException('You do not have permission to perform this action');
    }

    return new Permission(userPermissionFlags);
  }

  async createProject(uid: bigint, data: CreateProjectDto) {
    const { name, description, isPrivate, tags = [], categoryId } = data;

    this.logger.debug('Received project data:', data);

    const userExists = await this.userRepository.exists({ where: { id: BigInt(uid) } });
    if (!userExists) throw new BadRequestException('Unknown user');

    const categoryExists = await this.categoryRepository.exists({ where: { id: BigInt(categoryId) } });
    if (!categoryExists) throw new BadRequestException('Unknown category');

    const queryRunner = this.dataSource.createQueryRunner();
    if (!queryRunner) throw new InternalServerErrorException('Database connection error');

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Handle tags
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

      // Create project without defaultBranch yet
      const project = this.projectRepository.create({
        name,
        description,
        createdBy: { id: uid },
        isPrivate,
        tags: projectTags,
        createdAt: new Date(),
        category: { id: BigInt(categoryId) },
      });

      const savedProject = await queryRunner.manager.save(project);

      // Create 'main' branch in DB
      const mainBranch = queryRunner.manager.create(BranchEntity, {
        name: 'main',
        project: savedProject,
        user: { id: uid },
        createdAt: new Date(),
      });

      const savedBranch = await queryRunner.manager.save(mainBranch);

      // Create initial commit
      const initialCommit = queryRunner.manager.create(CommitEntity, {
        branch: savedBranch,
        project: savedProject,
        author: { id: uid },
        message: 'Initial commit',
        contentSnapshot: '{}',
        createdAt: new Date(),
      });

      await queryRunner.manager.save(initialCommit);

      // Update defaultBranch reference in project
      savedProject.defaultBranch = savedBranch;
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

      const githubRepoName = `project-${savedProject.id}`;

      // Create GitHub repo without auto init
      await this.githubService.createRepository(githubRepoName, isPrivate);

      // Push README to 'main' branch (create it in GitHub)
      await this.githubService.pushInitialFile({
        repo: githubRepoName,
        path: 'README.md',
        message: 'Initial commit',
        content: `# ${name}\n\n${description || ''}`,
        branch: 'main', // ✅ must match DB
      });

      await queryRunner.commitTransaction();

      this.logger.debug(`Project created successfully with ID: ${savedProject.id}`);

      return {
        message: 'Project created successfully',
        projectId: savedProject.id,
        branchId: savedBranch.id,
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
    const tags = request.tags?.map((tag) => tag.name) ?? [];

    const createProjectDto: any = {
      name: request.title, // Chỉ lưu tên gốc, không prefix
      description: request.description,
      isPrivate: true,
      tags,
    };
    if (request.category?.id) {
      createProjectDto.categoryId = request.category.id.toString();
    }

    return this.createProject(uid, createProjectDto);
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
        .andWhere('projectRoles.name != :systemRole', { systemRole: 'Everyone' })
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
      relations: ['defaultBranch', 'createdBy'],
    });

    if (!project) {
      this.logger.debug(`Project [${projectId}] does not exist`);
      throw new NotFoundException(`Unknown project`);
    }

    // Chỉ cho phép owner xóa project
    if (!project.createdBy || String(project.createdBy.id) !== String(userId)) {
      this.logger.debug(`User [${userId}] không phải owner, không được xóa project [${projectId}]`);
      throw new ForbiddenException('Only project owner can delete the project');
    }

    const repoName = `project-${projectId}`;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await this.githubService.deleteRepository(repoName);

      await queryRunner.manager.remove(project);

      await queryRunner.commitTransaction();

      this.logger.debug(`Project [${projectId}] and repo deleted successfully`);
      return { message: `Project deleted successfully` };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Failed to delete project:', error);
      throw new InternalServerErrorException('Failed to delete project');
    } finally {
      await queryRunner.release();
    }
  }

  async findUserToProject(
    projectId: bigint,
    identifier: string
  ): Promise<Array<{ id: bigint; fullName: string; email: string; phone: string }>> {
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
      .andWhere(existingMemberIds.length ? 'user.id NOT IN (:...existingMemberIds)' : '1=1', {
        existingMemberIds,
      })
      .andWhere(`user.roleId NOT IN (:...excludedRoles)`, {
        excludedRoles: [2, 1],
      })
      .limit(10)
      .getRawMany();

    return users;
  }


  async addUserToProject(
    projectId: bigint,
    userId: bigint
  ): Promise<ProjectEntity> {
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
      const everyoneRole = await queryRunner.manager.findOne(ProjectRoleEntity, {
        where: {
          project: { id: projectId },
          name: 'Everyone',
        },
        relations: ['users'],
      });

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
        console.log(`[addUserToProject] Created new role 'Everyone' for project ${projectId} with permissionFlags:`, newEveryoneRole.permissionFlags.value.toString(), newEveryoneRole.permissionFlags.resolveNames());
      } else {
        // Add user to existing Everyone role
        const existingUserIds = new Set(everyoneRole.users.map((u) => u.id.toString()));
        if (!existingUserIds.has(user.id.toString())) {
          everyoneRole.users.push(user);
          await queryRunner.manager.save(everyoneRole);
        }
        // LOG: Đã thêm user vào role Everyone
        console.log(`[addUserToProject] Added user ${userId} to existing role 'Everyone' for project ${projectId} with permissionFlags:`, everyoneRole.permissionFlags.value.toString(), everyoneRole.permissionFlags.resolveNames());
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
        roles: { id: string; name: string; permissionFlags?: string | number | bigint }[];
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
      roles: { id: string; name: string; permissionFlags?: string | number | bigint }[];
    }[];
    projectRoles: { id: string; name: string; permissionFlags: string | number | bigint }[];
  }> {
    // Get project with members first
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
      relations: ['members'],
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Get all roles except Everyone role first
    const roles = await this.projectRoleRepository.find({
      where: {
        project: { id: projectId },
        name: Not('Everyone')
      },
      relations: ['users'],
    });

    // Get Everyone role separately
    const everyoneRole = await this.projectRoleRepository.findOne({
      where: {
        project: { id: projectId },
        name: 'Everyone'
      },
      relations: ['users'],
    });

    // If Everyone role doesn't exist or has wrong permissions, fix it
    if (!everyoneRole) {
      this.logger.warn(`Everyone role not found for project ${projectId}, creating it`);
      const newEveryoneRole = this.projectRoleRepository.create({
        project: { id: projectId },
        permissionFlags: new Permission(BigInt(PermissionFlags.ViewProject)),
        name: 'Everyone',
        users: project.members, // Add all project members to Everyone role
      });
      await this.projectRoleRepository.save(newEveryoneRole);
    } else if (everyoneRole.permissionFlags.value !== BigInt(PermissionFlags.ViewProject)) {
      this.logger.warn(`Fixing Everyone role permissions for project ${projectId}`);
      everyoneRole.permissionFlags = new Permission(BigInt(PermissionFlags.ViewProject));
      // Add any missing members to Everyone role
      const everyoneUserIds = new Set(everyoneRole.users.map(u => u.id.toString()));
      const missingUsers = project.members.filter(m => !everyoneUserIds.has(m.id.toString()));
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
        roles: { id: string; name: string; permissionFlags?: string | number | bigint }[];
      }
    > = {};

    // First add all project members
    for (const member of project.members) {
      memberMap[member.id.toString()] = {
        id: member.id.toString(),
        username: member.username,
        fullName: member.fullName,
        email: member.email,
        roles: [],
      };
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
      projectRoles: roles.map(role => ({
        id: role.id.toString(),
        name: role.name,
        permissionFlags: role.permissionFlags.value.toString(), // Ensure proper serialization
      }))
    };
  }

  async createBranch(
    projectId: bigint,
    userId: bigint,
    displayName: string,
    fromBranchId?: bigint,
    visibleToRoleIds?: bigint[]
  ): Promise<BranchEntity> {
    await this.testPermissions(
      projectId,
      userId,
      PermissionFlags.ManageBranches
    );

    if (!fromBranchId) {
      const project = await this.projectRepository.findOneOrFail({
        where: { id: projectId },
        relations: ['defaultBranch'],
      });

      fromBranchId = project.defaultBranch.id;
    }

    const branch = this.branchRepository.create({
      name: '',
      project: { id: projectId } as any,
      user: { id: userId } as any,
    });

    if (visibleToRoleIds?.length) {
      const roles = await this.projectRoleRepository.find({
        where: { id: In(visibleToRoleIds) },
      });
      branch.visibleToRoles = roles;
    } else {
      branch.visibleToRoles = [];
    }

    const savedBranch = await this.branchRepository.save(branch);

    const githubBranchName = `branch-${savedBranch.id}`;
    const baseBranchName = `branch-${fromBranchId}`;
    const repoName = `project-${projectId}`;
    try {
      await this.githubService.createBranch(
        repoName,
        githubBranchName,
        baseBranchName
      );
      // Push initial file để branch tồn tại trên GitHub
      await this.githubService.pushInitialFile({
        repo: repoName,
        path: 'README.md',
        message: 'Initial commit on new branch',
        content: `# Branch ${githubBranchName}`,
        branch: githubBranchName,
      });
    } catch (err: any) {
      // Nếu repo hoặc base branch chưa tồn tại, tạo repo và branch main trước
      if (err.status === 404) {
        // Tạo repo nếu chưa có
        try {
          await this.githubService.createRepository(repoName, true);
        } catch (repoErr: any) {
          if (repoErr.status !== 422) throw repoErr; // 422: repo đã tồn tại
        }
        // Tạo branch main nếu chưa có
        try {
          await this.githubService.createBranch(repoName, 'main', 'main');
        } catch (mainErr: any) {
          // Nếu branch main đã tồn tại thì bỏ qua
          if (mainErr.status !== 422 && mainErr.status !== 404) throw mainErr;
        }
        // Thử lại tạo branch mới
        await this.githubService.createBranch(repoName, githubBranchName, baseBranchName);
        // Push initial file cho branch mới
        await this.githubService.pushInitialFile({
          repo: repoName,
          path: 'README.md',
          message: 'Initial commit on new branch',
          content: `# Branch ${githubBranchName}`,
          branch: githubBranchName,
        });
      } else {
        throw err;
      }
    }

    savedBranch.name = displayName;
    return this.branchRepository.save(savedBranch);
  }

  async renameBranchName(
    branchId: bigint,
    userId: bigint,
    projectId: bigint,
    newName: string
  ) {
    await this.testPermissions(
      projectId,
      userId,
      PermissionFlags.ManageBranches
    );

    const branch = await this.branchRepository.findOneOrFail({
      where: { id: branchId },
      relations: ['project'],
    });

    if (branch.project.id !== projectId) {
      throw new ForbiddenException('Branch does not belong to this project');
    }

    branch.name = newName;
    return this.branchRepository.save(branch);
  }

  async listBranchesForProject(
    projectId: bigint,
    userId: bigint
  ): Promise<BranchEntity[]> {
    console.log('listBranchesForProject called with projectId:', projectId, 'userId:', userId);
    await this.testPermissions(projectId, userId, PermissionFlags.ViewProject);

    const result = await this.branchRepository
      .createQueryBuilder('branch')
      .where('branch.projectId = :projectId', { projectId })
      .getMany();
    console.log('Branches for project', projectId, ':', result);
    return result;
  }

  async submitCommit(
    projectId: bigint,
    userId: bigint,
    branchId: bigint,
    filePath: string,
    content: string,
    message: string
  ): Promise<CommitEntity> {
    await this.testPermissions(projectId, userId, PermissionFlags.PushCommit);

    const commit = this.commitRepository.create({
      project: { id: projectId } as any,
      branch: { id: branchId } as any,
      author: { id: userId } as any,
      message,
      contentSnapshot: content,
      filePath,
      status: CommitStatus.Pending,
    });

    return this.commitRepository.save(commit);
  }

  async reviewCommit(
    projectId: bigint,
    commitId: bigint,
    reviewerId: bigint,
    approve: boolean,
    reviewMessage?: string
  ) {
    await this.testPermissions(projectId, reviewerId, PermissionFlags.ReviewCommit);

    const commit = await this.commitRepository.findOneOrFail({
      where: { id: commitId },
      relations: ['project', 'branch'],
    });

    commit.status = approve ? CommitStatus.Approved : CommitStatus.Rejected;
    commit.reviewedByUserId = reviewerId;
    commit.reviewMessage = reviewMessage;

    await this.commitRepository.save(commit);

    if (approve) {
      const githubRepo = `project-${commit.project.id}`;
      // Lấy tên branch thực tế từ DB
      const branchEntity = await this.branchRepository.findOne({ where: { id: commit.branch.id } });
      if (!branchEntity) throw new Error('Branch not found');
      const githubBranch = branchEntity.name;

      this.logger.log(`[GITHUB] Start pushing commit to GitHub: repo=${githubRepo}, branch=${githubBranch}, path=${commit.filePath}`);
      try {
        await this.githubService.commitChange({
          repo: githubRepo,
          branch: githubBranch,
          path: commit.filePath,
          content: commit.contentSnapshot,
          message: commit.message,
        });
        this.logger.log(`[GITHUB] Successfully pushed commit to GitHub: repo=${githubRepo}, branch=${githubBranch}, path=${commit.filePath}`);
      } catch (err) {
        this.logger.error(`[GITHUB] Failed to push commit to GitHub: repo=${githubRepo}, branch=${githubBranch}, path=${commit.filePath}`, err);
        throw err;
      }
    }

    return commit;
  }

  async getLocalCommits(projectId: bigint, branchId: bigint) {
    return this.commitRepository.find({
      where: { project: { id: projectId }, branch: { id: branchId } },
      relations: ['author'],
      order: { createdAt: 'DESC' }
    });
  }

  async listCommits(projectId: bigint, branchId: bigint) {
    return this.githubService.listCommits(projectId, branchId);
  }

}
