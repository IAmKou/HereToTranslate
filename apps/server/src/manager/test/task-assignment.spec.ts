import 'reflect-metadata';
import { NotFoundException } from '@nestjs/common';
import { Repository, DataSource } from 'typeorm';
import { TaskAssignmentManagerService } from '../service/task-assignment-manager.service';
import { AssignTaskDto, ReassignTaskDto } from '#LocalProject/Dtos';
import { AssignmentRole, HistoryAction } from '#LocalProject/Entities';
import { PermissionFlags } from '@here-to-translate/common';

// Mock TypeORM
jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

// Mock entities
jest.mock('#LocalProject/Entities', () => ({
  TaskEntity: class {
    id!: bigint;
    title!: string;
    assignedTo?: any;
    reviewer?: any;
    approver?: any;
    projectId?: bigint;
    createdBy!: any;
    assignments?: any[];
    status?: any;
  },
  AssignmentHistoryEntity: class {
    id!: bigint;
    task!: any;
    action!: HistoryAction;
    role!: AssignmentRole;
    fromUser?: any;
    toUser?: any;
    actionBy!: any;
    reason!: string;
    notes?: string;
  },
  AssignmentRole: {
    TRANSLATOR: 'translator',
    REVIEWER: 'reviewer',
    APPROVER: 'approver',
  },
  HistoryAction: {
    ASSIGNED: 'assigned',
    REASSIGNED: 'reassigned',
  },
  UserEntity: class {
    id!: bigint;
    email!: string;
  },
  ProjectEntity: class {
    id!: bigint;
    name!: string;
    members!: any[];
    createdBy?: any;
  },
}));

// Mock services
jest.mock('../service/notification-manager.service', () => ({
  NotificationManagerService: class {
    createNotification = jest.fn();
  },
}));

jest.mock('../../mailer/mailer.service', () => ({
  MailService: class {
    sendTaskAssignmentNotification = jest.fn();
  },
}));

jest.mock('../service/project-manager.service', () => ({
  ProjectManagerService: class {
    testPermissions = jest.fn();
  },
}));

describe('TaskAssignmentManagerService', () => {
  let service: TaskAssignmentManagerService;
  let taskRepository: jest.Mocked<Repository<any>>;
  let assignmentHistoryRepository: jest.Mocked<Repository<any>>;
  let projectRepository: jest.Mocked<Repository<any>>;
  let dataSource: jest.Mocked<DataSource>;
  let notificationService: any;
  let mailService: any;
  let projectManagerService: any;
  let queryRunner: any;

  beforeEach(() => {
    // Mock repositories
    taskRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
    } as any;

    assignmentHistoryRepository = {
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    } as any;

    projectRepository = {
      findOne: jest.fn(),
    } as any;

    // Mock DataSource and QueryRunner
    queryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      manager: {
        findOne: jest.fn(),
        save: jest.fn(),
      },
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
    };

    dataSource = {
      createQueryRunner: jest.fn().mockReturnValue(queryRunner),
    } as any;

    // Mock services
    notificationService = {
      createNotification: jest.fn(),
    };

    mailService = {
      sendTaskAssignmentNotification: jest.fn(),
    };

    projectManagerService = {
      testPermissions: jest.fn(),
    };

    service = new TaskAssignmentManagerService(
      taskRepository,
      assignmentHistoryRepository,
      projectRepository,
      dataSource,
      notificationService,
      mailService,
      projectManagerService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('assignTask', () => {
    const mockProjectId = '123';
    const mockAssignedByUserId = '456';
    const mockTaskId = '789';
    const mockAssignedToId = '101';

    const mockAssignTaskDto: AssignTaskDto = {
      taskId: mockTaskId,
      assignedToId: mockAssignedToId,
      role: AssignmentRole.TRANSLATOR,
      notes: 'Test assignment',
      dueDate: '2024-12-31',
    };

    const mockTask = {
      id: BigInt(mockTaskId),
      title: 'Test Task',
      assignedTo: { id: BigInt('999') },
      reviewer: { id: BigInt('888') },
      approver: { id: BigInt('777') },
      projectId: BigInt(mockProjectId),
      createdBy: { id: BigInt(mockAssignedByUserId) },
    };

    const mockUser = {
      id: BigInt(mockAssignedToId),
      email: 'test@example.com',
    };

    it('should successfully assign a task to a translator', async () => {
      // Arrange
      queryRunner.manager.findOne
        .mockResolvedValueOnce(mockTask) // Task
        .mockResolvedValueOnce(mockUser); // User
      projectManagerService.testPermissions.mockResolvedValue(undefined);

      // Act
      const result = await service.assignTask(mockProjectId, mockAssignTaskDto, mockAssignedByUserId);

      // Assert
      expect(queryRunner.connect).toHaveBeenCalled();
      expect(queryRunner.startTransaction).toHaveBeenCalled();
      expect(queryRunner.manager.findOne).toHaveBeenCalledTimes(2);
      expect(queryRunner.manager.save).toHaveBeenCalledWith(mockTask);
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalled();
      expect(result.message).toBe('Task assigned successfully');
    });

    it('should throw NotFoundException when task is not found', async () => {
      // Arrange
      queryRunner.manager.findOne.mockResolvedValueOnce(null);

      // Act & Assert
      await expect(service.assignTask(mockProjectId, mockAssignTaskDto, mockAssignedByUserId))
        .rejects.toThrow(NotFoundException);
      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalled();
    });

    it('should throw NotFoundException when user is not found', async () => {
      // Arrange
      queryRunner.manager.findOne
        .mockResolvedValueOnce(mockTask)
        .mockResolvedValueOnce(null);

      // Act & Assert
      await expect(service.assignTask(mockProjectId, mockAssignTaskDto, mockAssignedByUserId))
        .rejects.toThrow(NotFoundException);
      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalled();
    });

    it('should assign task to reviewer role', async () => {
      // Arrange
      const reviewerDto = { ...mockAssignTaskDto, role: AssignmentRole.REVIEWER };
      queryRunner.manager.findOne
        .mockResolvedValueOnce(mockTask)
        .mockResolvedValueOnce(mockUser);
      projectManagerService.testPermissions.mockResolvedValue(undefined);

      // Act
      await service.assignTask(mockProjectId, reviewerDto, mockAssignedByUserId);

      // Assert
      expect(queryRunner.manager.save).toHaveBeenCalledWith(expect.objectContaining({
        reviewer: mockUser,
      }));
    });

    it('should assign task to approver role', async () => {
      // Arrange
      const approverDto = { ...mockAssignTaskDto, role: AssignmentRole.APPROVER };
      queryRunner.manager.findOne
        .mockResolvedValueOnce(mockTask)
        .mockResolvedValueOnce(mockUser);
      projectManagerService.testPermissions.mockResolvedValue(undefined);

      // Act
      await service.assignTask(mockProjectId, approverDto, mockAssignedByUserId);

      // Assert
      expect(queryRunner.manager.save).toHaveBeenCalledWith(expect.objectContaining({
        approver: mockUser,
      }));
    });

    it('should update due date when provided', async () => {
      // Arrange
      const dueDate = '2024-12-31';
      const dtoWithDueDate = { ...mockAssignTaskDto, dueDate };
      queryRunner.manager.findOne
        .mockResolvedValueOnce(mockTask)
        .mockResolvedValueOnce(mockUser);
      projectManagerService.testPermissions.mockResolvedValue(undefined);

      // Act
      await service.assignTask(mockProjectId, dtoWithDueDate, mockAssignedByUserId);

      // Assert
      expect(queryRunner.manager.save).toHaveBeenCalledWith(expect.objectContaining({
        dueDate: new Date(dueDate),
      }));
    });

    it('should handle transaction rollback on error', async () => {
      // Arrange
      const error = new Error('Database error');
      queryRunner.manager.findOne.mockRejectedValue(error);

      // Act & Assert
      await expect(service.assignTask(mockProjectId, mockAssignTaskDto, mockAssignedByUserId))
        .rejects.toThrow(error);
      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalled();
    });
  });

  describe('reassignTask', () => {
    const mockProjectId = '123';
    const mockReassignedByUserId = '456';
    const mockAssignmentId = '789';
    const mockNewAssigneeId = '101';

    const mockReassignTaskDto: ReassignTaskDto = {
      assignmentId: mockAssignmentId,
      newAssigneeId: mockNewAssigneeId,
      reason: 'Reassignment needed',
      notes: 'Test reassignment',
    };

    it('should successfully reassign a task', async () => {
      // Arrange
      const mockTask = {
        id: BigInt(mockAssignmentId),
        projectId: BigInt(mockProjectId),
      } as any;
      taskRepository.findOne.mockResolvedValue(mockTask);
      projectManagerService.testPermissions.mockResolvedValue(undefined);

      // Mock the assignTask method
      const assignTaskSpy = jest.spyOn(service, 'assignTask').mockResolvedValue({
        message: 'Task reassigned successfully',
        task: mockTask,
      });

      // Act
      const result = await service.reassignTask(mockProjectId, mockReassignTaskDto, mockReassignedByUserId);

      // Assert
      expect(assignTaskSpy).toHaveBeenCalledWith(
        mockProjectId,
        expect.objectContaining({
          taskId: mockAssignmentId,
          assignedToId: mockNewAssigneeId,
          role: AssignmentRole.TRANSLATOR,
          notes: mockReassignTaskDto.notes,
        }),
        mockReassignedByUserId
      );
      expect(result.message).toBe('Task reassigned successfully');
    });
  });

  describe('getTaskAssignments', () => {
    const mockTaskId = '123';

    it('should return task assignments successfully', async () => {
      // Arrange
      const mockTask = {
        id: BigInt(mockTaskId),
        assignedTo: { id: BigInt('456'), name: 'Translator' },
        reviewer: { id: BigInt('789'), name: 'Reviewer' },
        approver: { id: BigInt('101'), name: 'Approver' },
        assignments: [{ id: BigInt('1'), role: AssignmentRole.TRANSLATOR }],
      };
      taskRepository.findOne.mockResolvedValue(mockTask);

      // Act
      const result = await service.getTaskAssignments(mockTaskId);

      // Assert
      expect(taskRepository.findOne).toHaveBeenCalledWith({
        where: { id: BigInt(mockTaskId) },
        relations: ['assignedTo', 'reviewer', 'approver', 'assignments'],
      });
      expect(result.task).toBe(mockTask);
      expect(result.assignments).toBe(mockTask.assignments);
      expect(result.currentAssignments).toEqual({
        translator: mockTask.assignedTo,
        reviewer: mockTask.reviewer,
        approver: mockTask.approver,
      });
    });

    it('should throw NotFoundException when task is not found', async () => {
      // Arrange
      taskRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.getTaskAssignments(mockTaskId))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('getAssignmentHistory', () => {
    const mockTaskId = '123';

    it('should return assignment history successfully', async () => {
      // Arrange
      const mockHistory = [
        { id: BigInt('1'), action: HistoryAction.ASSIGNED, role: AssignmentRole.TRANSLATOR },
        { id: BigInt('2'), action: HistoryAction.REASSIGNED, role: AssignmentRole.REVIEWER },
      ];
      assignmentHistoryRepository.find.mockResolvedValue(mockHistory);

      // Act
      const result = await service.getAssignmentHistory(mockTaskId);

      // Assert
      expect(assignmentHistoryRepository.find).toHaveBeenCalledWith({
        where: { task: { id: BigInt(mockTaskId) } },
        relations: ['fromUser', 'toUser', 'actionBy'],
        order: { createdAt: 'DESC' },
      });
      expect(result).toBe(mockHistory);
    });
  });

  describe('getProjectParticipants', () => {
    const mockProjectId = '123';

    it('should return project participants successfully', async () => {
      // Arrange
      const mockProject = {
        id: BigInt(mockProjectId),
        name: 'Test Project',
        createdBy: { id: BigInt('456'), name: 'Creator' },
        members: [
          { id: BigInt('789'), name: 'Member 1' },
          { id: BigInt('101'), name: 'Member 2' },
        ],
      };
      projectRepository.findOne.mockResolvedValue(mockProject);

      // Act
      const result = await service.getProjectParticipants(mockProjectId);

      // Assert
      expect(projectRepository.findOne).toHaveBeenCalledWith({
        where: { id: BigInt(mockProjectId) },
        relations: ['members', 'createdBy'],
      });
      expect(result).toHaveLength(3); // creator + 2 members
      expect(result).toContain(mockProject.createdBy);
      expect(result).toContain(mockProject.members[0]);
      expect(result).toContain(mockProject.members[1]);
    });

    it('should throw NotFoundException when project is not found', async () => {
      // Arrange
      projectRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.getProjectParticipants(mockProjectId))
        .rejects.toThrow(NotFoundException);
    });

    it('should handle project with no members', async () => {
      // Arrange
      const mockProject = {
        id: BigInt(mockProjectId),
        name: 'Test Project',
        createdBy: { id: BigInt('456'), name: 'Creator' },
        members: [],
      };
      projectRepository.findOne.mockResolvedValue(mockProject);

      // Act
      const result = await service.getProjectParticipants(mockProjectId);

      // Assert
      expect(result).toHaveLength(1); // only creator
      expect(result).toContain(mockProject.createdBy);
    });
  });

  describe('private methods', () => {
    describe('validateAssignmentPermissions', () => {
      it('should call project manager service with correct permissions', async () => {
        // Arrange
        const projectId = '123';
        const userId = '456';
        projectManagerService.testPermissions.mockResolvedValue(undefined);

        // Act
        await (service as any).validateAssignmentPermissions(projectId, userId);

        // Assert
        expect(projectManagerService.testPermissions).toHaveBeenCalledWith(
          BigInt(projectId),
          BigInt(userId),
          PermissionFlags.ManageTasks
        );
      });
    });

    describe('validateReassignmentPermissions', () => {
      it('should call project manager service with correct permissions', async () => {
        // Arrange
        const projectId = '123';
        const userId = '456';
        projectManagerService.testPermissions.mockResolvedValue(undefined);

        // Act
        await (service as any).validateReassignmentPermissions(projectId, userId);

        // Assert
        expect(projectManagerService.testPermissions).toHaveBeenCalledWith(
          BigInt(projectId),
          BigInt(userId),
          PermissionFlags.ManageTasks
        );
      });
    });

    describe('getTaskWithAssignments', () => {
      it('should return task with assignments', async () => {
        // Arrange
        const taskId = '123';
        const mockTask = { id: BigInt(taskId), title: 'Test Task' };
        taskRepository.findOne.mockResolvedValue(mockTask);

        // Act
        const result = await (service as any).getTaskWithAssignments(taskId);

        // Assert
        expect(taskRepository.findOne).toHaveBeenCalledWith({
          where: { id: BigInt(taskId) },
          relations: ['assignedTo', 'reviewer', 'approver', 'assignments', 'status'],
        });
        expect(result).toBe(mockTask);
      });
    });
  });
});
