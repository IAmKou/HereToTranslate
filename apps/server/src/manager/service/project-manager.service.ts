import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import {
  BranchEntity,
  CategoryEntity,
  CommitEntity,
  ProjectEntity,
  ProjectRoleEntity,
  ProjectTagEntity,
  UserEntity,
  RequestEntity,
  CommitStatus,
  FileEntity,
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
    @InjectRepository(FileEntity)
    private readonly fileRepository: Repository<FileEntity>,
    @InjectRepository(RequestEntity)
    private readonly requestRepository: Repository<RequestEntity>,
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
    const permissionAgainst = new Permission(against);
    this.logger.debug(
      `Checking if user [${uid}] has ${permissionAgainst} for project [${projectId}]`
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

    if (
      permissionAgainst.applyMask(userPermissionFlags).value !==
      permissionAgainst.value
    ) {
      this.logger.debug(
        `User [${uid}] does not have permission [${permissionAgainst}] for project [${projectId}]`
      );
      throw new ForbiddenException(
        `You do not have permission to perform this action`
      );
    }

    return new Permission(userPermissionFlags);
  }

  async createProject(
    uid: bigint,
    data: CreateProjectDto,
    files?: FileEntity[]
  ) {
    const { name, description, isPrivate, tags = [], categoryId } = data;

    this.logger.debug('Received project data:', data);

    const userExists = await this.userRepository.exists({
      where: { id: BigInt(uid) },
    });

    if (!userExists) {
      throw new BadRequestException(`Unknown user`);
    }

    const categoryExists = await this.categoryRepository.exists({
      where: { id: BigInt(categoryId) },
    });

    if (!categoryExists) {
      throw new BadRequestException(`Unknown category`);
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Handle tags
      const projectTags: Array<Partial<ProjectTagEntity>> = [];
      for (const tag of tags) {
        const existingTag = await queryRunner.manager.findOne(ProjectTagEntity, {
          where: { name: tag },
        });
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
        isPrivate,
        tags: projectTags,
        createdAt: new Date(),
        category: { id: BigInt(categoryId) },
      });
      const savedProject = await queryRunner.manager.save(project);

      const mainBranch = queryRunner.manager.create(BranchEntity, {
        name: 'main',
        project: savedProject,
        user: { id: uid },
        createdAt: new Date(),
      });
      const savedBranch = await queryRunner.manager.save(mainBranch);

      if (files?.length) {
        for (const file of files) {
          file.project = savedProject;
          file.branch = savedBranch;
          await queryRunner.manager.save(file);

          try {
            await this.githubService.pushInitialFile({
              repo: `project-${savedProject.id}`,
              path: `uploads/${Date.now()}_${file.fileName.replace(/[\\/:*?"<>|]/g, '_')}`,
              content: file.fileContent.toString('base64'),
              message: `Uploaded ${file.fileName}`,
            });
          } catch (uploadErr) {
            this.logger.error(`Failed to upload file ${file.fileName} to GitHub`, uploadErr);
          }
        }
      }

      // Initial commit
      const initialCommit = queryRunner.manager.create(CommitEntity, {
        branch: savedBranch,
        project: savedProject,
        author: { id: uid },
        message: 'Initial commit',
        contentSnapshot: '{}',
        createdAt: new Date(),
      });
      await queryRunner.manager.save(initialCommit);

      // Set default branch
      savedProject.defaultBranch = savedBranch;
      await queryRunner.manager.save(savedProject);

      // Roles
      const ownerRole = queryRunner.manager.create(ProjectRoleEntity, {
        project: savedProject,
        permissionFlags: new Permission(PermissionFlags.Owner),
        name: 'Project Owner',
      });

      const everyoneRole = queryRunner.manager.create(ProjectRoleEntity, {
        project: savedProject,
        permissionFlags: new Permission(
          PermissionFlags.ViewProject | PermissionFlags.ManageDiscussions
        ),
        name: 'Everyone',
      });

      const savedOwnerRole = await queryRunner.manager.save(ownerRole);
      await queryRunner.manager.save(everyoneRole);
      savedOwnerRole.users = [<UserEntity>{ id: uid }];
      await queryRunner.manager.save(savedOwnerRole);

      // GitHub repo
      const githubRepoName = `project-${savedProject.id}`;
      await this.githubService.createRepository(githubRepoName, isPrivate);
      await this.githubService.pushInitialFile({
        repo: githubRepoName,
        path: 'README.md',
        message: 'Initial commit',
        content: `# ${name}\n\n${description || ''}`,
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

    const createProjectDto: CreateProjectDto = {
      name: request.title,
      description: request.description,
      isPrivate: true,
      tags,
      categoryId: request.category?.id?.toString(),
    };

    const requestFiles = await this.fileRepository.find({
      where: { request: { id: request.id } },
    });

    return this.createProject(uid, createProjectDto, requestFiles);
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

  async deleteProject(projectId: bigint) {
    this.logger.debug(`Deleting project with ID: ${projectId}`);

    const project = await this.projectRepository.findOne({
      where: { id: projectId },
      relations: ['defaultBranch'],
    });

    if (!project) {
      this.logger.debug(`Project [${projectId}] does not exist`);
      throw new NotFoundException(`Unknown project`);
    }

    const request = await this.requestRepository.findOne({
      where: {project : {id: projectId}},
    });
     if (request){
       this.logger.warn(`Project [${projectId}] is linked to a request and cannot be deleted.`);
       throw new BadRequestException('Project cannot be deleted because it is linked to a request.');
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
  ): Promise<
    Array<{ id: bigint; fullName: string; email: string; phone: string }>
  > {
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

    project.members.push(user);
    const updatedProject = await this.projectRepository.save(project);

    const memberRole = await this.projectRoleRepository.findOne({
      where: {
        project: { id: projectId },
        name: 'Everyone',
      },
      relations: ['users'],
    });

    if (memberRole) {
      const existingUserIds = new Set(
        memberRole.users.map((u) => u.id.toString())
      );
      if (!existingUserIds.has(user.id.toString())) {
        memberRole.users.push(user);
        await this.projectRoleRepository.save(memberRole);
      }
    } else {
      this.logger.warn(`'Everyone' role not found for project ${projectId}`);
    }

    return updatedProject;
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
        roles: { id: string; name: string }[];
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
        memberMap[key].roles.push({ id: role.id.toString(), name: role.name });
      }
    }
    return Object.values(memberMap);
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
    await this.githubService.createBranch(
      `project-${projectId}`,
      githubBranchName,
      baseBranchName
    );

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
    console.log(
      'listBranchesForProject called with projectId:',
      projectId,
      'userId:',
      userId
    );
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
    await this.testPermissions(
      projectId,
      reviewerId,
      PermissionFlags.ReviewCommit
    );

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
      const githubBranch = `branch-${commit.branch.id}`;

      await this.githubService.commitChange({
        repo: githubRepo,
        branch: githubBranch,
        path: commit.filePath,
        content: commit.contentSnapshot,
        message: commit.message,
      });
    }

    return commit;
  }
}
