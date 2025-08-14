import 'reflect-metadata';
import { NotFoundException } from '@nestjs/common';
import { TaskManagerService } from '../service/task-manager.service';

jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

jest.mock('#LocalProject/Entities', () => ({
  ProjectGroupEntity: class {},
  TaskEntity: class { id!: bigint; },
  UserEntity: class { id!: bigint; username!: string; },
  TaskStatusEntity: class { id!: bigint; name!: string; type!: string; color?: string },
  WorkflowEntity: class { id!: bigint; project?: any },
  WorkflowTransitionEntity: class { id!: bigint; name!: string; conditionType!: string; toStatus!: any },
  TaskStatusHistoryEntity: class {},
  StatusType: { TODO: 'todo', IN_PROGRESS: 'in_progress', DONE: 'done' },
  TransitionConditionType: {
    ROLE: 'role', USER: 'user', GROUP: 'group', ASSIGNEE_ONLY: 'assignee_only', CREATOR_ONLY: 'creator_only', ANYONE: 'anyone'
  },
}));

jest.mock('#LocalProject/Managers/service/project-manager.service', () => ({
  ProjectManagerService: class {},
}));
jest.mock('#LocalProject/Managers/service/translation-manager.service', () => ({
  TranslationService: class {},
}));
jest.mock('#LocalProject/Utils/gateway/task.gateway', () => ({
  TaskGateway: class {},
}));

jest.mock('../service/task-assignment-manager.service', () => ({
  TaskAssignmentManagerService: class {},
}));
jest.mock('../service/file-manager.service', () => ({
  FileService: class {},
}));

describe('TaskManagerService', () => {
  let service: TaskManagerService;

  // Repositories
  let taskRepository: any;
  let userRepository: any;
  let projectGroupRepository: any;
  let statusRepository: any;
  let workflowRepository: any;
  let transitionRepository: any;
  let statusHistoryRepository: any;

  // Services
  const projectService: any = { testPermissions: jest.fn() };
  const translationService: any = {};
  const taskGateway: any = { emitTaskUpdate: jest.fn(), emitTaskDelete: jest.fn() };
  const statusManagerService: any = { createDefaultStatuses: jest.fn() };
  const taskAssignmentService: any = {};

  beforeEach(() => {
    taskRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      findOneOrFail: jest.fn(),
      find: jest.fn(),
      findAndCount: jest.fn(),
      remove: jest.fn(),
    };
    userRepository = {
      findOne: jest.fn(),
      findOneOrFail: jest.fn(),
    };
    projectGroupRepository = { findOne: jest.fn() };
    statusRepository = { findOne: jest.fn(), findOneOrFail: jest.fn() };
    workflowRepository = { findOne: jest.fn() };
    transitionRepository = { findOne: jest.fn(), find: jest.fn() };
    statusHistoryRepository = { create: jest.fn(), save: jest.fn(), find: jest.fn() };

    service = new TaskManagerService(
      taskRepository,
      userRepository,
      projectGroupRepository,
      statusRepository,
      workflowRepository,
      transitionRepository,
      statusHistoryRepository,
      projectService,
      translationService,
      taskGateway,
      statusManagerService,
      taskAssignmentService,
    );
  });

  describe('createTask', () => {
    it('creates a task with default workflow and status', async () => {
      // permissions ok
      projectService.testPermissions.mockResolvedValue(undefined);

      // creator
      const creator = { id: 1n };
      userRepository.findOneOrFail.mockResolvedValueOnce(creator);

      // assignedTo undefined
      userRepository.findOne.mockResolvedValueOnce(undefined);

      // group undefined
      projectGroupRepository.findOne.mockResolvedValueOnce(undefined);

      // no workflowId provided -> find default workflow (may be undefined)
      workflowRepository.findOne.mockResolvedValueOnce(undefined);

      // find default status for project
      const defaultStatus = { id: 10n, name: 'Todo', type: 'todo' };
      statusRepository.findOne
        .mockResolvedValueOnce(defaultStatus); // first call: default status

      const createdTask = { id: 99n };
      taskRepository.create.mockReturnValue(createdTask);
      taskRepository.save.mockResolvedValue(createdTask);

      // createStatusHistory flow
      taskRepository.findOneOrFail.mockResolvedValueOnce(createdTask);
      statusHistoryRepository.create.mockReturnValue({});
      statusHistoryRepository.save.mockResolvedValue({});

      const task = await service.createTask({
        title: 'Title',
        description: 'Desc',
        createdById: '1',
        projectId: '100',
      });

      expect(taskRepository.create).toHaveBeenCalled();
      expect(taskRepository.save).toHaveBeenCalledWith(createdTask);
      expect(statusHistoryRepository.create).toHaveBeenCalled();
      expect(statusHistoryRepository.save).toHaveBeenCalled();
      expect(taskGateway.emitTaskUpdate).toHaveBeenCalledWith(createdTask);
      expect(task).toBe(createdTask);
    });

    it('throws NotFound when workflowId provided but not found', async () => {
      projectService.testPermissions.mockResolvedValue(undefined);
      userRepository.findOneOrFail.mockResolvedValueOnce({ id: 1n });
      // workflowId provided and not found
      workflowRepository.findOne.mockResolvedValueOnce(null);

      await expect(
        service.createTask({ title: 't', createdById: '1', projectId: '100', workflowId: '200' })
      ).rejects.toThrow(NotFoundException);
    });

    it('creates defaults when no default status exists and fallback missing', async () => {
      projectService.testPermissions.mockResolvedValue(undefined);
      userRepository.findOneOrFail.mockResolvedValueOnce({ id: 1n });
      userRepository.findOne.mockResolvedValueOnce(undefined);
      projectGroupRepository.findOne.mockResolvedValueOnce(undefined);
      workflowRepository.findOne.mockResolvedValueOnce(undefined);

      // No default status
      statusRepository.findOne
        .mockResolvedValueOnce(null) // default status
        .mockResolvedValueOnce(null); // fallback TODO status

      // After creating defaults, default status exists
      statusManagerService.createDefaultStatuses.mockResolvedValue(undefined);
      statusRepository.findOneOrFail.mockResolvedValueOnce({ id: 10n, name: 'Todo', type: 'todo' });

      const createdTask = { id: 5n };
      taskRepository.create.mockReturnValue(createdTask);
      taskRepository.save.mockResolvedValue(createdTask);
      taskRepository.findOneOrFail.mockResolvedValueOnce(createdTask);
      statusHistoryRepository.create.mockReturnValue({});
      statusHistoryRepository.save.mockResolvedValue({});

      await service.createTask({ title: 'A', createdById: '1', projectId: '100' });

      expect(statusManagerService.createDefaultStatuses).toHaveBeenCalledWith('100');
      expect(statusRepository.findOneOrFail).toHaveBeenCalled();
    });
  });

  describe('transitionTask', () => {
    it('transitions task to a new status and creates history', async () => {
      const task = {
        id: 1n,
        status: { id: 10n, name: 'Todo', type: 'todo' },
        workflow: { id: 7n },
        createdBy: { id: 1n },
        assignedTo: { id: 2n },
      };
      taskRepository.findOne
        .mockResolvedValueOnce(task) // initial find in transitionTask
        .mockResolvedValueOnce({ id: 1n }); // for getTask at the end

      userRepository.findOneOrFail.mockResolvedValueOnce({ id: 3n });
      const toStatus = { id: 11n, name: 'In Progress', type: 'in_progress' };
      statusRepository.findOneOrFail.mockResolvedValueOnce(toStatus);

      // Allow transition
      transitionRepository.findOne.mockResolvedValueOnce({
        id: 123n,
        name: 'Start',
        conditionType: 'anyone',
      });

      taskRepository.save.mockResolvedValueOnce(undefined);
      taskRepository.findOneOrFail.mockResolvedValueOnce(task);
      statusHistoryRepository.create.mockReturnValue({});
      statusHistoryRepository.save.mockResolvedValue({});

      const result = await service.transitionTask('1', { toStatusId: '11' } as any, '3');

      expect(taskRepository.save).toHaveBeenCalled();
      expect(statusHistoryRepository.create).toHaveBeenCalled();
      expect(statusHistoryRepository.save).toHaveBeenCalled();
      expect(taskGateway.emitTaskUpdate).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('throws when task not found', async () => {
      taskRepository.findOne.mockResolvedValueOnce(null);
      await expect(service.transitionTask('1', { toStatusId: '2' } as any, '3')).rejects.toThrow(
        NotFoundException
      );
    });
  });
});


