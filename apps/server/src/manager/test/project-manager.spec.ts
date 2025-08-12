import 'reflect-metadata';
// Test and TestingModule are no longer needed since we're using direct instantiation
import { ProjectManagerService } from '../service/project-manager.service';
// getRepositoryToken is not available in this version, using string tokens instea
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PermissionFlags } from '@here-to-translate/common';

// Mock NestJS TypeORM InjectRepository decorator
jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

// Mock external services to avoid ESM dependencies
jest.mock('../service/github-manager.service');
jest.mock('../service/notification-manager.service');
jest.mock('../service/activity-manager.service');
jest.mock('../service/task-status-manager.service');
jest.mock('../service/workflow-manager.service');

describe('ProjectManagerService', () => {
  let service: ProjectManagerService;
  let mockCategoryRepository: any;
  let mockProjectRepository: any;
  let mockUserRepository: any;
  let mockProjectRoleRepository: any;
  let mockBranchRepository: any;
  let mockCommitRepository: any;
  let mockDataSource: any;
  let mockGitHubService: any;
  let mockNotificationService: any;
  let mockActivityManagerService: any;
  let mockStatusManagerService: any;
  let mockWorkflowManagerService: any;

  const mockUser = { id: 1n, username: 'testuser', fullName: 'Test User', email: 'test@example.com' };
  const mockProject = {
    id: 1n,
    name: 'Test Project',
    description: 'Test Description',
    isPrivate: false,
    createdAt: new Date(),
    createdBy: mockUser,
    members: [mockUser]
  };
  const mockBranch = { id: 1n, name: 'main', project: mockProject, user: mockUser, createdAt: new Date() };
  const mockCommit = { id: 1n, message: 'Initial commit', contentSnapshot: '{}', createdAt: new Date() };

  beforeEach(() => {
    mockCategoryRepository = {
      exists: jest.fn(),
      findOne: jest.fn(),
    };
    mockProjectRepository = {
      exists: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      findOneOrFail: jest.fn(),
      createQueryBuilder: jest.fn(() => ({
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orWhere: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getMany: jest.fn(),
        getOne: jest.fn(),
        getRawMany: jest.fn(),
      })),
    };
    mockUserRepository = {
      exists: jest.fn(),
      findOne: jest.fn(),
      findOneOrFail: jest.fn(),
      createQueryBuilder: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getRawMany: jest.fn(),
      })),
    };
    mockProjectRoleRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(() => ({
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getRawOne: jest.fn(),
        getMany: jest.fn(),
      })),
    };
    mockBranchRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      findOneOrFail: jest.fn(),
      createQueryBuilder: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        getMany: jest.fn(),
      })),
    };
    mockCommitRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOneOrFail: jest.fn(),
    };
     mockDataSource = {
      createQueryRunner: jest.fn(() => ({
        connect: jest.fn(),
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        rollbackTransaction: jest.fn(),
        release: jest.fn(),
        manager: {
          findOne: jest.fn(),
          create: jest.fn(),
          save: jest.fn(),
          remove: jest.fn(),
          update: jest.fn(),
          delete: jest.fn(),
        },
        query: jest.fn(),
      })),
    };
    mockGitHubService = {
      createRepository: jest.fn(),
      pushInitialFile: jest.fn(),
      deleteRepository: jest.fn(),
      createBranch: jest.fn(),
      commitChange: jest.fn(),
      listCommits: jest.fn(),
    };
    mockNotificationService = {
      createNotification: jest.fn(),
    };
    mockActivityManagerService = {
      logProjectUpdate: jest.fn(),
      logBranchCreate: jest.fn(),
      logCommitCreate: jest.fn(),
    };
    mockStatusManagerService = {
      createDefaultStatuses: jest.fn(),
    };
    mockWorkflowManagerService = {
      createDefaultWorkflow: jest.fn(),
    };

    // Use direct instantiation instead of Test.createTestingModule
    service = new ProjectManagerService(
      mockCategoryRepository,
      mockProjectRepository,
      mockUserRepository,
      mockProjectRoleRepository,
      mockBranchRepository,
      mockCommitRepository,
      mockDataSource,
      mockGitHubService,
      mockNotificationService,
      mockActivityManagerService,
      mockStatusManagerService,
      mockWorkflowManagerService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('testPermissions', () => {
    it('should return permission when user has access', async () => {
      mockProjectRepository.exists!.mockResolvedValue(true);
      mockUserRepository.exists!.mockResolvedValue(true);
      mockProjectRoleRepository.createQueryBuilder = jest.fn(() => ({
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ userPermissionFlags: PermissionFlags.ViewProject }),
      }));

      const result = await service.testPermissions(1n, 1n, PermissionFlags.ViewProject);

      expect(result).toBeDefined();
      expect(mockProjectRepository.exists).toHaveBeenCalledWith({
        where: { id: 1n },
      });
      expect(mockUserRepository.exists).toHaveBeenCalledWith({
        where: { id: 1n },
      });
    });

    it('should throw NotFoundException when project does not exist', async () => {
      mockProjectRepository.exists!.mockResolvedValue(false);

      await expect(service.testPermissions(1n, 1n, PermissionFlags.ViewProject))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when user does not exist', async () => {
      mockProjectRepository.exists!.mockResolvedValue(true);
      mockUserRepository.exists!.mockResolvedValue(false);

      await expect(service.testPermissions(1n, 1n, PermissionFlags.ViewProject))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user lacks permission', async () => {
      mockProjectRepository.exists!.mockResolvedValue(true);
      mockUserRepository.exists!.mockResolvedValue(true);
      mockProjectRoleRepository.createQueryBuilder = jest.fn(() => ({
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ userPermissionFlags: PermissionFlags.None }),
      }));

      await expect(service.testPermissions(1n, 1n, PermissionFlags.ManageProjectMetadata))
        .rejects.toThrow(ForbiddenException);
    });
  });

  describe('createProject', () => {
    it('should create project successfully', async () => {
      const mockQueryRunner = {
        connect: jest.fn(),
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        rollbackTransaction: jest.fn(),
        release: jest.fn(),
        manager: {
          findOne: jest.fn(),
          create: jest.fn(),
          save: jest.fn(),
        },
      };

      mockDataSource.createQueryRunner!.mockReturnValue(mockQueryRunner as any);
      mockUserRepository.exists!.mockResolvedValue(true);
      mockCategoryRepository.exists!.mockResolvedValue(true);
      mockQueryRunner.manager.findOne.mockResolvedValue(null); // No existing tags
      mockQueryRunner.manager.create.mockImplementation((entity, data) => data);
      mockQueryRunner.manager.save.mockImplementation((entity) => Promise.resolve({ ...entity, id: 1n }));
      (mockGitHubService.createRepository as jest.Mock).mockResolvedValue(undefined);
      (mockGitHubService.pushInitialFile as jest.Mock).mockResolvedValue(undefined);
      (mockStatusManagerService.createDefaultStatuses as jest.Mock).mockResolvedValue([]);
      (mockWorkflowManagerService.createDefaultWorkflow as jest.Mock).mockResolvedValue(undefined);

      const result = await service.createProject(1n, {
        name: 'Test Project',
        description: 'Test Description',
        isPrivate: false,
        tags: ['tag1', 'tag2'],
        categoryId: '1',
        targetLanguages: ['en', 'es'],
      });

      expect(result).toBeDefined();
      expect(result.message).toBe('Project created successfully');
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should throw BadRequestException when user does not exist', async () => {
      mockUserRepository.exists!.mockResolvedValue(false);

      await expect(service.createProject(1n, {
        name: 'Test Project',
        description: 'Test Description',
        isPrivate: false,
        tags: [],
        categoryId: '1',
        targetLanguages: [],
      })).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when category does not exist', async () => {
      mockUserRepository.exists!.mockResolvedValue(true);
      mockCategoryRepository.exists!.mockResolvedValue(false);

      await expect(service.createProject(1n, {
        name: 'Test Project',
        description: 'Test Description',
        isPrivate: false,
        tags: [],
        categoryId: '1',
        targetLanguages: [],
      })).rejects.toThrow(BadRequestException);
    });

    it('should rollback transaction on error', async () => {
      const mockQueryRunner = {
        connect: jest.fn(),
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        rollbackTransaction: jest.fn(),
        release: jest.fn(),
        manager: {
          findOne: jest.fn(),
          create: jest.fn(),
          save: jest.fn(),
        },
      };

      mockDataSource.createQueryRunner!.mockReturnValue(mockQueryRunner as any);
      mockUserRepository.exists!.mockResolvedValue(true);
      mockCategoryRepository.exists!.mockResolvedValue(true);
      mockQueryRunner.manager.save.mockRejectedValue(new Error('Database error'));

      await expect(service.createProject(1n, {
        name: 'Test Project',
        description: 'Test Description',
        isPrivate: false,
        tags: [],
        categoryId: '1',
        targetLanguages: [],
      })).rejects.toThrow();

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });
  });

  describe('fetchProject', () => {
    it('should return project metadata for public project', async () => {
      const publicProject = { ...mockProject, isPrivate: false };
      (mockProjectRepository.findOne as jest.Mock).mockResolvedValue(publicProject);
      mockProjectRepository.createQueryBuilder = jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(publicProject),
      }));

      const result = await service.fetchProject(undefined, 1n);

      expect(result).toBeDefined();
      expect(mockProjectRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1n },
        select: ['isPrivate'],
      });
    });

    it('should return full project data for user with access', async () => {
      const privateProject = { ...mockProject, isPrivate: true };
      
      // Mock the project exists check
      mockProjectRepository.exists!.mockResolvedValue(true);
      mockUserRepository.exists!.mockResolvedValue(true);
      
      // Mock the project data retrieval
      (mockProjectRepository.findOne as jest.Mock).mockResolvedValue(privateProject);
      mockProjectRepository.createQueryBuilder = jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(privateProject),
      }));
      
      // Mock the permission check
      mockProjectRoleRepository.createQueryBuilder = jest.fn(() => ({
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ userPermissionFlags: PermissionFlags.ViewProject }),
      }));

      const result = await service.fetchProject(1n, 1n);

      expect(result).toBeDefined();
    });

    it('should throw NotFoundException when project does not exist', async () => {
      // Mock the project exists check to return false
      mockProjectRepository.exists!.mockResolvedValue(false);

      await expect(service.fetchProject(1n, 1n))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for private project without access', async () => {
      const privateProject = { ...mockProject, isPrivate: true };
      
      // Mock the project exists check
      mockProjectRepository.exists!.mockResolvedValue(true);
      mockUserRepository.exists!.mockResolvedValue(true);
      
      // Mock the project data retrieval
      (mockProjectRepository.findOne as jest.Mock).mockResolvedValue(privateProject);
      
      // Mock the permission check to return no permissions
      mockProjectRoleRepository.createQueryBuilder = jest.fn(() => ({
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ userPermissionFlags: PermissionFlags.None }),
      }));

      await expect(service.fetchProject(1n, 1n))
        .rejects.toThrow(ForbiddenException);
    });
  });

  describe('updateProjectMetadata', () => {
    it('should update project metadata successfully', async () => {
      const mockQueryRunner = {
        connect: jest.fn(),
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        rollbackTransaction: jest.fn(),
        release: jest.fn(),
        manager: {
          findOne: jest.fn(),
          create: jest.fn(),
          save: jest.fn(),
        },
      };

      // Mock the project exists check
      mockProjectRepository.exists!.mockResolvedValue(true);
      mockUserRepository.exists!.mockResolvedValue(true);

      mockDataSource.createQueryRunner!.mockReturnValue(mockQueryRunner as any);
      mockProjectRoleRepository.createQueryBuilder = jest.fn(() => ({
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ userPermissionFlags: PermissionFlags.ManageProjectMetadata }),
        getMany: jest.fn().mockResolvedValue([]), // Add this for getting project members
      }));
      mockQueryRunner.manager.findOne.mockResolvedValue({
        ...mockProject,
        tags: [], // Add empty tags array to prevent the map error
      });
      mockQueryRunner.manager.save.mockResolvedValue(mockProject);
      mockActivityManagerService.logProjectUpdate!.mockResolvedValue(undefined);
      mockNotificationService.createNotification!.mockResolvedValue(undefined);

      const result = await service.updateProjectMetadata(1n, 1n, {
        name: 'Updated Project',
        description: 'Updated Description',
      });

      expect(result).toBeDefined();
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should throw ForbiddenException when user lacks permission', async () => {
      // Mock the project exists check
      mockProjectRepository.exists!.mockResolvedValue(true);
      mockUserRepository.exists!.mockResolvedValue(true);
      
      mockProjectRoleRepository.createQueryBuilder = jest.fn(() => ({
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ userPermissionFlags: PermissionFlags.None }),
      }));

      await expect(service.updateProjectMetadata(1n, 1n, {
        name: 'Updated Project',
      })).rejects.toThrow(ForbiddenException);
    });
  });

  describe('deleteProject', () => {
    it('should delete project successfully', async () => {
      const mockQueryRunner = {
        connect: jest.fn(),
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        rollbackTransaction: jest.fn(),
        release: jest.fn(),
        manager: {
          remove: jest.fn(),
        },
      };

      mockDataSource.createQueryRunner!.mockReturnValue(mockQueryRunner as any);
      (mockProjectRepository.findOne as jest.Mock).mockResolvedValue({
        ...mockProject,
        createdBy: { id: 1n },
      });
      (mockGitHubService.deleteRepository as jest.Mock).mockResolvedValue(undefined);
      mockQueryRunner.manager.remove.mockResolvedValue(undefined);

      const result = await service.deleteProject(1n, 1n);

      expect(result).toBeDefined();
      expect(result.message).toBe('Project deleted successfully');
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should throw ForbiddenException when user is not owner', async () => {
      (mockProjectRepository.findOne as jest.Mock).mockResolvedValue({
        ...mockProject,
        createdBy: { id: 2n },
      });

      await expect(service.deleteProject(1n, 1n))
        .rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when project does not exist', async () => {
      (mockProjectRepository.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.deleteProject(1n, 1n))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('addUserToProject', () => {
    it('should add user to project successfully', async () => {
      const mockQueryRunner = {
        connect: jest.fn(),
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        rollbackTransaction: jest.fn(),
        release: jest.fn(),
        manager: {
          findOne: jest.fn(),
          create: jest.fn(),
          save: jest.fn(),
        },
      };

      // Mock the project exists check
      mockProjectRepository.exists!.mockResolvedValue(true);
      mockUserRepository.exists!.mockResolvedValue(true);

      mockDataSource.createQueryRunner!.mockReturnValue(mockQueryRunner as any);
      mockProjectRoleRepository.createQueryBuilder = jest.fn(() => ({
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ userPermissionFlags: PermissionFlags.ManageMembers }),
      }));
      (mockProjectRepository.findOne as jest.Mock).mockResolvedValue({
        ...mockProject,
        members: [],
      });
      (mockUserRepository.findOne as jest.Mock).mockResolvedValue({ id: 2n, username: 'newuser' });
      mockQueryRunner.manager.findOne.mockResolvedValue(null); // No existing Everyone role
      mockQueryRunner.manager.create.mockImplementation((_: any, data: any) => data);
      mockQueryRunner.manager.save.mockResolvedValue(undefined);

      const result = await service.addUserToProject(1n, 2n, 1n);

      expect(result).toBeDefined();
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should throw BadRequestException when user is already a member', async () => {
      // Mock the project exists check
      mockProjectRepository.exists!.mockResolvedValue(true);
      mockUserRepository.exists!.mockResolvedValue(true);
      
      mockProjectRoleRepository.createQueryBuilder = jest.fn(() => ({
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ userPermissionFlags: PermissionFlags.ManageMembers }),
      }));
      (mockProjectRepository.findOne as jest.Mock).mockResolvedValue({
        ...mockProject,
        members: [{ id: 2n }],
      });

      await expect(service.addUserToProject(1n, 2n, 1n))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('createBranch', () => {
    it('should create branch successfully', async () => {
      const mockQueryRunner = {
        connect: jest.fn(),
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        rollbackTransaction: jest.fn(),
        release: jest.fn(),
        manager: {
          findOne: jest.fn(),
          create: jest.fn(),
          save: jest.fn(),
        },
      };

      // Mock the project exists check
      mockProjectRepository.exists!.mockResolvedValue(true);
      mockUserRepository.exists!.mockResolvedValue(true);

      // Mock the permission check
      mockProjectRoleRepository.createQueryBuilder = jest.fn(() => ({
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ userPermissionFlags: PermissionFlags.ManageBranches }),
      }));

      mockDataSource.createQueryRunner!.mockReturnValue(mockQueryRunner as any);
      mockProjectRepository.findOneOrFail!.mockResolvedValue({
        ...mockProject,
        defaultBranch: { id: 1n },
      });
      // Mock branchRepository.create to return a proper object
      mockBranchRepository.create!.mockImplementation((data: any) => data);
      // Mock branchRepository.save to return a proper object with id
      mockBranchRepository.save!.mockResolvedValue({ 
        ...mockBranch, 
        id: 2n,
        visibleToRoles: [], // Add this property to prevent the error
      });
      mockQueryRunner.manager.create.mockImplementation((entity, data) => data);
      mockQueryRunner.manager.save.mockResolvedValue({ 
        ...mockBranch, 
        id: 2n,
        visibleToRoles: [], // Add this property to prevent the error
      });
      (mockGitHubService.createBranch as jest.Mock).mockResolvedValue(undefined);
      (mockGitHubService.pushInitialFile as jest.Mock).mockResolvedValue(undefined);
      (mockActivityManagerService.logBranchCreate as jest.Mock).mockResolvedValue(undefined);

      const result = await service.createBranch(1n, 1n, 'New Branch');

      expect(result).toBeDefined();
      expect(mockBranchRepository.create).toHaveBeenCalled();
      expect(mockBranchRepository.save).toHaveBeenCalled();
    });

    it('should throw ForbiddenException when user lacks permission', async () => {
      // Mock the project exists check
      mockProjectRepository.exists!.mockResolvedValue(true);
      mockUserRepository.exists!.mockResolvedValue(true);
      
      mockProjectRoleRepository.createQueryBuilder = jest.fn(() => ({
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ userPermissionFlags: PermissionFlags.None }),
      }));

      await expect(service.createBranch(1n, 1n, 'New Branch'))
        .rejects.toThrow(ForbiddenException);
    });
  });

  describe('submitCommit', () => {
    it('should submit commit successfully', async () => {
      // Mock the project exists check
      mockProjectRepository.exists!.mockResolvedValue(true);
      mockUserRepository.exists!.mockResolvedValue(true);
      
      mockProjectRoleRepository.createQueryBuilder = jest.fn(() => ({
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ userPermissionFlags: PermissionFlags.PushCommit }),
      }));
      (mockCommitRepository.create as jest.Mock).mockImplementation((data: any) => data);
      mockCommitRepository.save!.mockResolvedValue(mockCommit);
      (mockActivityManagerService.logCommitCreate as jest.Mock).mockResolvedValue(undefined);

      const result = await service.submitCommit(1n, 1n, 1n, 'test.txt', 'content', 'Test commit');

      expect(result).toBeDefined();
      expect(mockCommitRepository.create).toHaveBeenCalled();
      expect(mockCommitRepository.save).toHaveBeenCalled();
    });

    it('should throw ForbiddenException when user lacks permission', async () => {
      // Mock the project exists check
      mockProjectRepository.exists!.mockResolvedValue(true);
      mockUserRepository.exists!.mockResolvedValue(true);
      
      mockProjectRoleRepository.createQueryBuilder = jest.fn(() => ({
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ userPermissionFlags: PermissionFlags.None }),
      }));

      await expect(service.submitCommit(1n, 1n, 1n, 'test.txt', 'content', 'Test commit'))
        .rejects.toThrow(ForbiddenException);
    });
  });

  describe('reviewCommit', () => {
    it('should approve commit successfully', async () => {
      // Mock the project exists check
      mockProjectRepository.exists!.mockResolvedValue(true);
      mockUserRepository.exists!.mockResolvedValue(true);
      
      mockProjectRoleRepository.createQueryBuilder = jest.fn(() => ({
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ userPermissionFlags: PermissionFlags.ReviewCommit }),
      }));
      mockCommitRepository.findOneOrFail!.mockResolvedValue({
        ...mockCommit,
        project: { id: 1n },
        branch: { id: 1n },
      });
      (mockBranchRepository.findOne as jest.Mock).mockResolvedValue({ name: 'main' });
      (mockCommitRepository.save as jest.Mock).mockResolvedValue(mockCommit);
      (mockGitHubService.commitChange as jest.Mock).mockResolvedValue(undefined);

      const result = await service.reviewCommit(1n, 1n, 1n, true, 'Approved');

      expect(result).toBeDefined();
      expect(mockCommitRepository.save).toHaveBeenCalled();
      expect(mockGitHubService.commitChange).toHaveBeenCalled();
    });

    it('should reject commit successfully', async () => {
      // Mock the project exists check
      mockProjectRepository.exists!.mockResolvedValue(true);
      mockUserRepository.exists!.mockResolvedValue(true);
      
      mockProjectRoleRepository.createQueryBuilder = jest.fn(() => ({
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ userPermissionFlags: PermissionFlags.ReviewCommit }),
      }));
      mockCommitRepository.findOneOrFail!.mockResolvedValue({
        ...mockCommit,
        project: { id: 1n },
        branch: { id: 1n },
      });
      (mockCommitRepository.save as jest.Mock).mockResolvedValue(mockCommit);

      const result = await service.reviewCommit(1n, 1n, 1n, false, 'Rejected');

      expect(result).toBeDefined();
      expect(mockCommitRepository.save).toHaveBeenCalled();
      expect(mockGitHubService.commitChange).not.toHaveBeenCalled();
    });
  });

  describe('getProjectMembers', () => {
    it('should return project members with roles', async () => {
      const mockRoles = [
        {
          id: 1n,
          name: 'Owner',
          users: [mockUser],
          permissionFlags: { value: PermissionFlags.ViewProject },
        },
        {
          id: 2n,
          name: 'Everyone',
          users: [mockUser],
          permissionFlags: { value: PermissionFlags.ViewProject },
        },
      ];

      (mockProjectRoleRepository.find as jest.Mock).mockResolvedValue(mockRoles);

      const result = await service.getProjectMembers(1n);

      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(result[0].roles).toHaveLength(2);
    });
  });

  describe('getProjectMembersWithRoles', () => {
    it('should return project members with detailed role information', async () => {
      const mockProjectWithMembers = {
        ...mockProject,
        members: [mockUser],
        createdBy: mockUser,
      };

      (mockProjectRepository.findOne as jest.Mock).mockResolvedValue(mockProjectWithMembers);
      mockDataSource.getRepository = jest.fn(() => ({
        createQueryBuilder: jest.fn(() => ({
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue([]),
        })),
      }));
      (mockProjectRoleRepository.find as jest.Mock).mockResolvedValue([
        {
          id: 1n,
          name: 'Owner',
          users: [mockUser],
          permissionFlags: { value: PermissionFlags.ViewProject },
        },
      ]);
      (mockProjectRoleRepository.findOne as jest.Mock).mockResolvedValue({
        id: 2n,
        name: 'Everyone',
        users: [mockUser],
        permissionFlags: { value: PermissionFlags.ViewProject },
      });

      const result = await service.getProjectMembersWithRoles(1n);

      expect(result).toBeDefined();
      expect(result.members).toHaveLength(1);
      expect(result.projectRoles).toHaveLength(2);
    });
  });
});
