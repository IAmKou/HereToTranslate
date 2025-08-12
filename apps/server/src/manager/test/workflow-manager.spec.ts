import { WorkflowManagerService } from '../service/workflow-manager.service';
import { Repository } from 'typeorm';
import { 
  WorkflowEntity, 
  WorkflowTransitionEntity, 
  TaskStatusEntity, 
  ProjectEntity,
  TransitionConditionType 
} from '#LocalProject/Entities';
import { 
  CreateWorkflowDto, 
  UpdateWorkflowDto, 
  CreateTransitionDto, 
  UpdateTransitionDto 
} from '#LocalProject/Dtos';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('WorkflowManagerService', () => {
  let service: WorkflowManagerService;
  let mockWorkflowRepository: jest.Mocked<Repository<WorkflowEntity>>;
  let mockTransitionRepository: jest.Mocked<Repository<WorkflowTransitionEntity>>;
  let mockStatusRepository: jest.Mocked<Repository<TaskStatusEntity>>;
  let mockProjectRepository: jest.Mocked<Repository<ProjectEntity>>;

  const mockProject: any = {
    id: 1n,
    name: 'Test Project',
    description: 'Test project description',
  };

  const mockWorkflow: any = {
    id: 1n,
    name: 'Test Workflow',
    description: 'Test workflow description',
    isDefault: false,
    isActive: true,
    project: mockProject,
    createdAt: new Date(),
  };

  const mockStatus1: any = {
    id: 1n,
    name: 'To Do',
    color: '#ff0000',
    type: 'TODO',
    position: 1,
    isActive: true,
  };

  const mockStatus2: any = {
    id: 2n,
    name: 'In Progress',
    color: '#ffff00',
    type: 'IN_PROGRESS',
    position: 2,
    isActive: true,
  };

  const mockStatus3: any = {
    id: 3n,
    name: 'Done',
    color: '#00ff00',
    type: 'DONE',
    position: 3,
    isActive: true,
  };

  const mockTransition: any = {
    id: 1n,
    name: 'Start Work',
    workflow: mockWorkflow,
    fromStatus: mockStatus1,
    toStatus: mockStatus2,
    conditionType: TransitionConditionType.ANYONE,
    conditionData: null,
    isActive: true,
    createdAt: new Date(),
  };

  beforeEach(() => {
    // Create mocks for repositories
    mockWorkflowRepository = {
      findOneOrFail: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
      find: jest.fn(),
      update: jest.fn(),
      createQueryBuilder: jest.fn(),
    } as any;

    mockTransitionRepository = {
      findOneOrFail: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
      find: jest.fn(),
    } as any;

    mockStatusRepository = {
      findOneOrFail: jest.fn(),
      find: jest.fn(),
    } as any;

    mockProjectRepository = {
      findOneOrFail: jest.fn(),
    } as any;

    // Create service instance
    service = new WorkflowManagerService(
      mockWorkflowRepository,
      mockTransitionRepository,
      mockStatusRepository,
      mockProjectRepository
    );

    // Reset mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createWorkflow', () => {
    const createWorkflowDto: CreateWorkflowDto = {
      name: 'New Workflow',
      description: 'New workflow description',
      isDefault: false,
    };

    it('should create a workflow successfully', async () => {
      mockProjectRepository.findOneOrFail.mockResolvedValue(mockProject);
      mockWorkflowRepository.create.mockReturnValue(mockWorkflow);
      mockWorkflowRepository.save.mockResolvedValue(mockWorkflow);

      const result = await service.createWorkflow('1', createWorkflowDto);

      expect(result).toEqual(mockWorkflow);
      expect(mockProjectRepository.findOneOrFail).toHaveBeenCalledWith({
        where: { id: 1n },
      });
      expect(mockWorkflowRepository.create).toHaveBeenCalledWith({
        ...createWorkflowDto,
        project: mockProject,
      });
      expect(mockWorkflowRepository.save).toHaveBeenCalledWith(mockWorkflow);
    });

    it('should create a default workflow and unset other defaults', async () => {
      const defaultWorkflowDto = { ...createWorkflowDto, isDefault: true };
      mockProjectRepository.findOneOrFail.mockResolvedValue(mockProject);
      mockWorkflowRepository.update.mockResolvedValue({ affected: 2 } as any);
      mockWorkflowRepository.create.mockReturnValue(mockWorkflow);
      mockWorkflowRepository.save.mockResolvedValue(mockWorkflow);

      const result = await service.createWorkflow('1', defaultWorkflowDto);

      expect(result).toEqual(mockWorkflow);
      expect(mockWorkflowRepository.update).toHaveBeenCalledWith(
        { project: { id: 1n } },
        { isDefault: false }
      );
    });

    it('should throw error when project not found', async () => {
      mockProjectRepository.findOneOrFail.mockRejectedValue(new Error('Project not found'));

      await expect(service.createWorkflow('999', createWorkflowDto)).rejects.toThrow('Project not found');
    });
  });

  describe('updateWorkflow', () => {
    const updateWorkflowDto: UpdateWorkflowDto = {
      name: 'Updated Workflow',
      description: 'Updated description',
      isActive: true,
    };

    it('should update a workflow successfully', async () => {
      const workflowWithProject = { ...mockWorkflow, project: mockProject };
      mockWorkflowRepository.findOneOrFail.mockResolvedValue(workflowWithProject);
      mockWorkflowRepository.save.mockResolvedValue(workflowWithProject);

      const result = await service.updateWorkflow('1', updateWorkflowDto);

      expect(result).toEqual(workflowWithProject);
      expect(mockWorkflowRepository.findOneOrFail).toHaveBeenCalledWith({
        where: { id: 1n },
        relations: ['project'],
      });
      expect(mockWorkflowRepository.save).toHaveBeenCalledWith(workflowWithProject);
    });

    it('should update workflow to default and unset other defaults', async () => {
      const defaultUpdateDto = { ...updateWorkflowDto, isDefault: true };
      const workflowWithProject = { ...mockWorkflow, project: mockProject };
      mockWorkflowRepository.findOneOrFail.mockResolvedValue(workflowWithProject);
      mockWorkflowRepository.update.mockResolvedValue({ affected: 1 } as any);
      mockWorkflowRepository.save.mockResolvedValue(workflowWithProject);

      const result = await service.updateWorkflow('1', defaultUpdateDto);

      expect(result).toEqual(workflowWithProject);
      expect(mockWorkflowRepository.update).toHaveBeenCalledWith(
        { project: { id: 1n } },
        { isDefault: false }
      );
    });

    it('should throw error when workflow not found', async () => {
      mockWorkflowRepository.findOneOrFail.mockRejectedValue(new Error('Workflow not found'));

      await expect(service.updateWorkflow('999', updateWorkflowDto)).rejects.toThrow('Workflow not found');
    });
  });

  describe('deleteWorkflow', () => {
    it('should delete a workflow successfully', async () => {
      const mockQueryBuilder = {
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
      };

      mockWorkflowRepository.findOne.mockResolvedValue(mockWorkflow);
      mockWorkflowRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);
      mockWorkflowRepository.remove.mockResolvedValue(mockWorkflow);

      const result = await service.deleteWorkflow('1');

      expect(result).toEqual({ success: true });
      expect(mockWorkflowRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1n },
      });
      expect(mockWorkflowRepository.remove).toHaveBeenCalledWith(mockWorkflow);
    });

    it('should throw NotFoundException when workflow not found', async () => {
      mockWorkflowRepository.findOne.mockResolvedValue(null);

      await expect(service.deleteWorkflow('999')).rejects.toThrow(
        new NotFoundException('Workflow not found')
      );
    });

    it('should throw BadRequestException when workflow is being used by tasks', async () => {
      const mockQueryBuilder = {
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(5),
      };

      mockWorkflowRepository.findOne.mockResolvedValue(mockWorkflow);
      mockWorkflowRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      await expect(service.deleteWorkflow('1')).rejects.toThrow(
        new BadRequestException('Cannot delete workflow that is being used by tasks')
      );
    });
  });

  describe('getProjectWorkflows', () => {
    it('should return project workflows', async () => {
      const workflows = [mockWorkflow];
      mockWorkflowRepository.find.mockResolvedValue(workflows);

      const result = await service.getProjectWorkflows('1');

      expect(result).toEqual(workflows);
      expect(mockWorkflowRepository.find).toHaveBeenCalledWith({
        where: { project: { id: 1n }, isActive: true },
        order: { createdAt: 'ASC' },
      });
    });

    it('should return empty array when no workflows found', async () => {
      mockWorkflowRepository.find.mockResolvedValue([]);

      const result = await service.getProjectWorkflows('1');

      expect(result).toEqual([]);
    });
  });

  describe('createTransition', () => {
    const createTransitionDto: CreateTransitionDto = {
      name: 'New Transition',
      fromStatusId: '1',
      toStatusId: '2',
      conditionType: TransitionConditionType.ANYONE,
    };

    it('should create a transition successfully', async () => {
      mockWorkflowRepository.findOneOrFail.mockResolvedValue(mockWorkflow);
      mockStatusRepository.findOneOrFail
        .mockResolvedValueOnce(mockStatus1) // fromStatus
        .mockResolvedValueOnce(mockStatus2); // toStatus
      mockTransitionRepository.findOne.mockResolvedValue(null);
      mockTransitionRepository.create.mockReturnValue(mockTransition);
      mockTransitionRepository.save.mockResolvedValue(mockTransition);

      const result = await service.createTransition('1', createTransitionDto);

      expect(result).toEqual(mockTransition);
      expect(mockWorkflowRepository.findOneOrFail).toHaveBeenCalledWith({
        where: { id: 1n },
      });
      expect(mockTransitionRepository.create).toHaveBeenCalledWith({
        name: createTransitionDto.name,
        workflow: mockWorkflow,
        fromStatus: mockStatus1,
        toStatus: mockStatus2,
        conditionType: createTransitionDto.conditionType,
        conditionData: createTransitionDto.conditionData,
      });
    });

    it('should throw BadRequestException when transition already exists', async () => {
      mockWorkflowRepository.findOneOrFail.mockResolvedValue(mockWorkflow);
      mockStatusRepository.findOneOrFail
        .mockResolvedValueOnce(mockStatus1)
        .mockResolvedValueOnce(mockStatus2);
      mockTransitionRepository.findOne.mockResolvedValue(mockTransition);

      await expect(service.createTransition('1', createTransitionDto)).rejects.toThrow(
        new BadRequestException('Transition already exists')
      );
    });

    it('should throw error when workflow not found', async () => {
      mockWorkflowRepository.findOneOrFail.mockRejectedValue(new Error('Workflow not found'));

      await expect(service.createTransition('999', createTransitionDto)).rejects.toThrow('Workflow not found');
    });
  });

  describe('updateTransition', () => {
    const updateTransitionDto: UpdateTransitionDto = {
      name: 'Updated Transition',
      conditionType: TransitionConditionType.ASSIGNEE_ONLY,
      isActive: true,
    };

    it('should update a transition successfully', async () => {
      const transitionWithRelations = {
        ...mockTransition,
        workflow: mockWorkflow,
        fromStatus: mockStatus1,
        toStatus: mockStatus2,
      };

      mockTransitionRepository.findOneOrFail.mockResolvedValue(transitionWithRelations);
      mockTransitionRepository.save.mockResolvedValue(transitionWithRelations);

      const result = await service.updateTransition('1', updateTransitionDto);

      expect(result).toEqual(transitionWithRelations);
      expect(mockTransitionRepository.findOneOrFail).toHaveBeenCalledWith({
        where: { id: 1n },
        relations: ['workflow', 'fromStatus', 'toStatus'],
      });
      expect(mockTransitionRepository.save).toHaveBeenCalledWith(transitionWithRelations);
    });

    it('should update transition with new status IDs', async () => {
      const updateWithStatusDto = {
        ...updateTransitionDto,
        fromStatusId: '2',
        toStatusId: '3',
      };

      const transitionWithRelations = {
        ...mockTransition,
        workflow: mockWorkflow,
        fromStatus: mockStatus1,
        toStatus: mockStatus2,
      };

      mockTransitionRepository.findOneOrFail.mockResolvedValue(transitionWithRelations);
      mockStatusRepository.findOneOrFail
        .mockResolvedValueOnce(mockStatus2) // new fromStatus
        .mockResolvedValueOnce(mockStatus3); // new toStatus
      mockTransitionRepository.save.mockResolvedValue(transitionWithRelations);

      const result = await service.updateTransition('1', updateWithStatusDto);

      expect(result).toEqual(transitionWithRelations);
      expect(mockStatusRepository.findOneOrFail).toHaveBeenCalledWith({
        where: { id: 2n },
      });
      expect(mockStatusRepository.findOneOrFail).toHaveBeenCalledWith({
        where: { id: 3n },
      });
    });

    it('should throw error when transition not found', async () => {
      mockTransitionRepository.findOneOrFail.mockRejectedValue(new Error('Transition not found'));

      await expect(service.updateTransition('999', updateTransitionDto)).rejects.toThrow('Transition not found');
    });
  });

  describe('deleteTransition', () => {
    it('should delete a transition successfully', async () => {
      mockTransitionRepository.findOneOrFail.mockResolvedValue(mockTransition);
      mockTransitionRepository.remove.mockResolvedValue(mockTransition);

      const result = await service.deleteTransition('1');

      expect(result).toEqual({ success: true });
      expect(mockTransitionRepository.findOneOrFail).toHaveBeenCalledWith({
        where: { id: 1n },
      });
      expect(mockTransitionRepository.remove).toHaveBeenCalledWith(mockTransition);
    });

    it('should throw error when transition not found', async () => {
      mockTransitionRepository.findOneOrFail.mockRejectedValue(new Error('Transition not found'));

      await expect(service.deleteTransition('999')).rejects.toThrow('Transition not found');
    });
  });

  describe('getWorkflowTransitions', () => {
    it('should return workflow transitions', async () => {
      const transitions = [mockTransition];
      mockTransitionRepository.find.mockResolvedValue(transitions);

      const result = await service.getWorkflowTransitions('1');

      expect(result).toEqual(transitions);
      expect(mockTransitionRepository.find).toHaveBeenCalledWith({
        where: { workflow: { id: 1n }, isActive: true },
        relations: ['fromStatus', 'toStatus'],
        order: { createdAt: 'ASC' },
      });
    });

    it('should return empty array when no transitions found', async () => {
      mockTransitionRepository.find.mockResolvedValue([]);

      const result = await service.getWorkflowTransitions('1');

      expect(result).toEqual([]);
    });
  });

  describe('createDefaultWorkflow', () => {
    const statuses = [mockStatus1, mockStatus2, mockStatus3];

    it('should create default workflow with transitions', async () => {
      mockProjectRepository.findOneOrFail.mockResolvedValue(mockProject);
      mockWorkflowRepository.create.mockReturnValue(mockWorkflow);
      mockWorkflowRepository.save.mockResolvedValue(mockWorkflow);
      mockTransitionRepository.create.mockReturnValue(mockTransition);
      mockTransitionRepository.save.mockResolvedValue(mockTransition);

      const result = await service.createDefaultWorkflow('1', statuses);

      expect(result).toHaveProperty('workflow');
      expect(result).toHaveProperty('transitions');
      expect(result.workflow).toEqual(mockWorkflow);
      expect(result.transitions).toBeInstanceOf(Array);
      expect(mockWorkflowRepository.create).toHaveBeenCalledWith({
        name: 'Default Workflow',
        description: 'Auto-generated default workflow',
        project: mockProject,
        isDefault: true,
      });
    });

    it('should create forward and backward transitions', async () => {
      mockProjectRepository.findOneOrFail.mockResolvedValue(mockProject);
      mockWorkflowRepository.create.mockReturnValue(mockWorkflow);
      mockWorkflowRepository.save.mockResolvedValue(mockWorkflow);
      mockTransitionRepository.create.mockReturnValue(mockTransition);
      mockTransitionRepository.save.mockResolvedValue(mockTransition);

      const result = await service.createDefaultWorkflow('1', statuses);

      // Should create transitions for each pair of consecutive statuses
      // Forward: 1->2, 2->3 (2 transitions)
      // Backward: 3->2, 2->1 (2 transitions)
      // Total: 4 transitions
      expect(result.transitions).toHaveLength(4);
    });

    it('should throw error when project not found', async () => {
      mockProjectRepository.findOneOrFail.mockRejectedValue(new Error('Project not found'));

      await expect(service.createDefaultWorkflow('999', statuses)).rejects.toThrow('Project not found');
    });
  });

  describe('getWorkflowVisualization', () => {
    it('should return workflow visualization data', async () => {
      const transitions = [mockTransition];
      const statuses = [mockStatus1, mockStatus2, mockStatus3];

      mockWorkflowRepository.findOneOrFail.mockResolvedValue(mockWorkflow);
      mockTransitionRepository.find.mockResolvedValue(transitions);
      mockStatusRepository.find.mockResolvedValue(statuses);

      const result = await service.getWorkflowVisualization('1');

      expect(result).toHaveProperty('workflow');
      expect(result).toHaveProperty('nodes');
      expect(result).toHaveProperty('edges');
      expect(result.workflow).toEqual({
        id: '1',
        name: mockWorkflow.name,
        description: mockWorkflow.description,
      });
      expect(result.nodes).toHaveLength(3);
      expect(result.edges).toHaveLength(1);
      expect(result.nodes[0]).toEqual({
        id: '1',
        name: mockStatus1.name,
        color: mockStatus1.color,
        type: mockStatus1.type,
        position: mockStatus1.position,
      });
      expect(result.edges[0]).toEqual({
        id: '1',
        name: mockTransition.name,
        from: '1',
        to: '2',
        conditionType: mockTransition.conditionType,
      });
    });

    it('should throw error when workflow not found', async () => {
      mockWorkflowRepository.findOneOrFail.mockRejectedValue(new Error('Workflow not found'));

      await expect(service.getWorkflowVisualization('999')).rejects.toThrow('Workflow not found');
    });
  });
});
