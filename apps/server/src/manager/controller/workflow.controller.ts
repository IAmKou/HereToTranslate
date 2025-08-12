import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkflowEntity,TransitionConditionType, WorkflowTransitionEntity, TaskStatusEntity, ProjectEntity} from '#LocalProject/Entities';
import { CreateWorkflowDto, UpdateWorkflowDto, CreateTransitionDto , UpdateTransitionDto} from '#LocalProject/Dtos';

@Injectable()
export class WorkflowManagerService {
  constructor(
    @InjectRepository(WorkflowEntity)
    private readonly workflowRepository: Repository<WorkflowEntity>,
    @InjectRepository(WorkflowTransitionEntity)
    private readonly transitionRepository: Repository<WorkflowTransitionEntity>,
    @InjectRepository(TaskStatusEntity)
    private readonly statusRepository: Repository<TaskStatusEntity>,
    @InjectRepository(ProjectEntity)
    private readonly projectRepository: Repository<ProjectEntity>,
  ) {}

  async createWorkflow(projectId: string, dto: CreateWorkflowDto) {
    const project = await this.projectRepository.findOneOrFail({
      where: { id: BigInt(projectId) },
    });

    // If this is set as default, unset other defaults
    if (dto.isDefault) {
      await this.workflowRepository.update(
        { project: { id: BigInt(projectId) } },
        { isDefault: false }
      );
    }

    const workflow = this.workflowRepository.create({
      ...dto,
      project,
    });

    return await this.workflowRepository.save(workflow);
  }

  async updateWorkflow(id: string, dto: UpdateWorkflowDto) {
    const workflow = await this.workflowRepository.findOneOrFail({
      where: { id: BigInt(id) },
      relations: ['project'],
    });

    // If setting as default, unset other defaults in the same project
    if (dto.isDefault) {
      await this.workflowRepository.update(
        { project: { id: workflow.project.id } },
        { isDefault: false }
      );
    }

    Object.assign(workflow, dto);
    return await this.workflowRepository.save(workflow);
  }

  async deleteWorkflow(id: string) {
    const workflow = await this.workflowRepository.findOne({
      where: { id: BigInt(id) },
    });

    if (!workflow) {
      throw new NotFoundException('Workflow not found');
    }

    // Check if workflow is being used by tasks
    const taskCount = await this.workflowRepository
      .createQueryBuilder('workflow')
      .leftJoin('task', 'task', 'task.workflowId = workflow.id')
      .where('workflow.id = :id', { id })
      .getCount();

    if (taskCount > 0) {
      throw new BadRequestException('Cannot delete workflow that is being used by tasks');
    }

    await this.workflowRepository.remove(workflow);
    return { success: true };
  }

  async getProjectWorkflows(projectId: string) {
    return await this.workflowRepository.find({
      where: { project: { id: BigInt(projectId) }, isActive: true },
      order: { createdAt: 'ASC' },
    });
  }

  async createTransition(workflowId: string, dto: CreateTransitionDto) {
    const workflow = await this.workflowRepository.findOneOrFail({
      where: { id: BigInt(workflowId) },
    });

    const fromStatus = await this.statusRepository.findOneOrFail({
      where: { id: BigInt(dto.fromStatusId) },
    });

    const toStatus = await this.statusRepository.findOneOrFail({
      where: { id: BigInt(dto.toStatusId) },
    });

    // Check if transition already exists
    const existingTransition = await this.transitionRepository.findOne({
      where: {
        workflow: { id: BigInt(workflowId) },
        fromStatus: { id: BigInt(dto.fromStatusId) },
        toStatus: { id: BigInt(dto.toStatusId) },
      },
    });

    if (existingTransition) {
      throw new BadRequestException('Transition already exists');
    }

    const transition = this.transitionRepository.create({
      name: dto.name,
      workflow,
      fromStatus,
      toStatus,
      conditionType: dto.conditionType || TransitionConditionType.ANYONE,
      conditionData: dto.conditionData,
    });

    return await this.transitionRepository.save(transition);
  }

  async updateTransition(id: string, dto: UpdateTransitionDto) {
    const transition = await this.transitionRepository.findOneOrFail({
      where: { id: BigInt(id) },
      relations: ['workflow', 'fromStatus', 'toStatus'],
    });

    if (dto.fromStatusId) {
      transition.fromStatus = await this.statusRepository.findOneOrFail({
        where: { id: BigInt(dto.fromStatusId) },
      });
    }

    if (dto.toStatusId) {
      transition.toStatus = await this.statusRepository.findOneOrFail({
        where: { id: BigInt(dto.toStatusId) },
      });
    }

    Object.assign(transition, {
      name: dto.name ?? transition.name,
      conditionType: dto.conditionType ?? transition.conditionType,
      conditionData: dto.conditionData ?? transition.conditionData,
      isActive: dto.isActive ?? transition.isActive,
    });

    return await this.transitionRepository.save(transition);
  }

  async deleteTransition(id: string) {
    const transition = await this.transitionRepository.findOneOrFail({
      where: { id: BigInt(id) },
    });

    await this.transitionRepository.remove(transition);
    return { success: true };
  }

  async getWorkflowTransitions(workflowId: string) {
    return await this.transitionRepository.find({
      where: { workflow: { id: BigInt(workflowId) }, isActive: true },
      relations: ['fromStatus', 'toStatus'],
      order: { createdAt: 'ASC' },
    });
  }

  async createDefaultWorkflow(projectId: string, statuses: TaskStatusEntity[]) {
    const project = await this.projectRepository.findOneOrFail({
      where: { id: BigInt(projectId) },
    });

    // Create default workflow
    const workflow = this.workflowRepository.create({
      name: 'Default Workflow',
      description: 'Auto-generated default workflow',
      project,
      isDefault: true,
    });

    const savedWorkflow = await this.workflowRepository.save(workflow);

    // Create basic transitions (linear flow)
    const transitions = [];
    for (let i = 0; i < statuses.length - 1; i++) {
      const fromStatus = statuses[i];
      const toStatus = statuses[i + 1];

      const transition = this.transitionRepository.create({
        name: `${fromStatus.name} → ${toStatus.name}`,
        workflow: savedWorkflow,
        fromStatus,
        toStatus,
        conditionType: TransitionConditionType.ANYONE,
      });

      transitions.push(await this.transitionRepository.save(transition));
    }

    // Add backward transitions (for reopening tasks)
    for (let i = statuses.length - 1; i > 0; i--) {
      const fromStatus = statuses[i];
      const toStatus = statuses[i - 1];

      const transition = this.transitionRepository.create({
        name: `${fromStatus.name} → ${toStatus.name}`,
        workflow: savedWorkflow,
        fromStatus,
        toStatus,
        conditionType: TransitionConditionType.ANYONE,
      });

      transitions.push(await this.transitionRepository.save(transition));
    }

    return { workflow: savedWorkflow, transitions };
  }

  async getWorkflowVisualization(workflowId: string) {
    const workflow = await this.workflowRepository.findOneOrFail({
      where: { id: BigInt(workflowId) },
    });

    const transitions = await this.transitionRepository.find({
      where: { workflow: { id: BigInt(workflowId) }, isActive: true },
      relations: ['fromStatus', 'toStatus'],
    });

    const statuses = await this.statusRepository.find({
      where: { project: { id: workflow.project.id }, isActive: true },
      order: { position: 'ASC' },
    });

    // Build adjacency list for visualization
    const nodes = statuses.map(status => ({
      id: status.id.toString(),
      name: status.name,
      color: status.color,
      type: status.type,
      position: status.position,
    }));

    const edges = transitions.map(transition => ({
      id: transition.id.toString(),
      name: transition.name,
      from: transition.fromStatus.id.toString(),
      to: transition.toStatus.id.toString(),
      conditionType: transition.conditionType,
    }));

    return {
      workflow: {
        id: workflow.id.toString(),
        name: workflow.name,
        description: workflow.description,
      },
      nodes,
      edges,
    };
  }
}