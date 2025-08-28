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

  async getDefaultWorkflow(projectId: string) {
    const defaultWorkflow = await this.workflowRepository.findOne({
      where: {
        project: { id: BigInt(projectId) },
        isDefault: true,
        isActive: true
      },
    });

    if (!defaultWorkflow) {
      throw new NotFoundException('No default workflow found for this project');
    }

    return defaultWorkflow;
  }

  async getAvailableTransitionsForTask(taskId: string) {
    // First, get the task with its status and project
    const task = await this.workflowRepository.manager
      .createQueryBuilder()
      .select(['task.id', 'task.statusId', 'task.projectId'])
      .from('task', 'task')
      .where('task.id = :taskId', { taskId })
      .getOne();

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // Normalize raw fields that may vary depending on driver/aliases
    const projectIdRaw: unknown = (task as any).projectId ?? (task as any)['task_projectId'];
    const statusIdRaw: unknown = (task as any).statusId ?? (task as any)['task_statusId'];

    // Validate IDs before converting to BigInt to avoid undefined → BigInt errors
    if (projectIdRaw === undefined || projectIdRaw === null || projectIdRaw === '') {
      throw new BadRequestException('Task is missing projectId');
    }
    if (statusIdRaw === undefined || statusIdRaw === null || statusIdRaw === '') {
      throw new BadRequestException('Task is missing statusId');
    }

    const projectIdBig = BigInt(String(projectIdRaw));
    const statusIdBig = BigInt(String(statusIdRaw));

    // Get the default workflow for the project
    const defaultWorkflow = await this.getDefaultWorkflow(projectIdBig.toString());

    // Get transitions from the default workflow only
    return await this.transitionRepository.find({
      where: {
        workflow: { id: defaultWorkflow.id },
        fromStatus: { id: statusIdBig },
        isActive: true
      },
      relations: ['toStatus'],
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
      relations: ['project'],
    });

    const transitions = await this.transitionRepository.find({
      where: { workflow: { id: BigInt(workflowId) }, isActive: true },
      relations: ['fromStatus', 'toStatus'],
    });

    const statuses = await this.statusRepository.find({
      where: { project: { id: BigInt(workflow.project.id) }, isActive: true },
    });

    const nodes = statuses.map(status => ({
      id: status.id.toString(),
      name: status.name,
      color: status.color,
      type: status.type,
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
        visualizationData: workflow.visualizationData,
      },
      nodes,
      edges,
    };
  }

  async updateWorkflowVisualization(workflowId: string, visualizationData: any) {
    const workflow = await this.workflowRepository.findOneOrFail({
      where: { id: BigInt(workflowId) },
    });

    workflow.visualizationData = visualizationData;
    return await this.workflowRepository.save(workflow);
  }
}
