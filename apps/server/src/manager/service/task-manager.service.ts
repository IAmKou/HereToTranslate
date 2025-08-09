import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import {
  ProjectGroupEntity,
  TaskEntity,
  UserEntity,
  TaskStatusEntity,
  WorkflowEntity,
  WorkflowTransitionEntity,
  TaskStatusHistoryEntity,
} from '#LocalProject/Entities';
import { ProjectManagerService } from '#LocalProject/Managers/service/project-manager.service';
import { PermissionFlags } from '@here-to-translate/common';
import { TranslationService } from '#LocalProject/Managers/service/translation-manager.service';
import { TaskGateway } from '#LocalProject/Utils/gateway/task.gateway';
import { UpdateTaskDto, TransitionTaskDto } from '#LocalProject/Dtos';
import { TransitionConditionType, StatusType } from '#LocalProject/Entities';
import { StatusManagerService } from './status-manager.service';
import { PageDifficultyService } from './page-difficulty.service';
import { TaskAssignmentService } from './task-assignment.service';
import { AssignTaskDto, PageDifficultyDto, ReassignTaskDto, DifficultyConfigDto } from '#LocalProject/Dtos';
import { PageDifficultyEntity } from '#LocalProject/Entities';

@Injectable()
export class TaskManagerService {
  constructor(
    @InjectRepository(TaskEntity)
    private readonly taskRepository: Repository<TaskEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(ProjectGroupEntity)
    private readonly projectGroupRepository: Repository<ProjectGroupEntity>,
    @InjectRepository(TaskStatusEntity)
    private readonly statusRepository: Repository<TaskStatusEntity>,
    @InjectRepository(WorkflowEntity)
    private readonly workflowRepository: Repository<WorkflowEntity>,
    @InjectRepository(WorkflowTransitionEntity)
    private readonly transitionRepository: Repository<WorkflowTransitionEntity>,
    @InjectRepository(TaskStatusHistoryEntity)
    private readonly statusHistoryRepository: Repository<TaskStatusHistoryEntity>,
    private readonly projectService: ProjectManagerService,
    private readonly translationService: TranslationService,
    private readonly taskGateway: TaskGateway,
    private readonly statusManagerService: StatusManagerService,
    private readonly pageDifficultyService: PageDifficultyService,
    private readonly taskAssignmentService: TaskAssignmentService
  ) {}

  async createTask(params: {
    title: string;
    description?: string;
    createdById: string;
    assignedToId?: string;
    groupId?: string;
    dueDate?: Date;
    projectId?: string;
    branchId?: string;
    fileId?: string;
    filePart?: number;
    language?: string;
    workflowId?: string;
    statusId?: string;
    priority?: string;
    storyPoints?: number;
    customFields?: Record<string, unknown>;
  }) {
    const {
      title,
      description,
      createdById,
      assignedToId,
      groupId,
      dueDate,
      projectId,
      branchId,
      fileId,
      filePart,
      language,
      workflowId,
      statusId,
      priority = 'medium',
      storyPoints,
      customFields,
    } = params;

    if (!createdById) {
      throw new BadRequestException('createdById is required');
    }
    if (!projectId) {
      throw new BadRequestException('projectId is required');
    }

    await this.projectService.testPermissions(
      BigInt(projectId),
      BigInt(createdById),
      PermissionFlags.ViewProject
    );

    const createdBy = await this.userRepository.findOneOrFail({
      where: { id: BigInt(createdById) },
    });

    const assignedTo = assignedToId
      ? await this.userRepository.findOne({
          where: { id: BigInt(assignedToId) },
        })
      : undefined;

    const group = groupId
      ? await this.projectGroupRepository.findOne({
          where: { id: BigInt(groupId) },
        })
      : undefined;

    // Get workflow and default status
    let workflow: WorkflowEntity | undefined;
    let status: TaskStatusEntity;

    if (workflowId) {
      workflow =
        (await this.workflowRepository.findOne({
          where: { id: BigInt(workflowId) },
          relations: ['project'],
        })) || undefined;
      if (!workflow) {
        throw new NotFoundException('Workflow not found');
      }
    } else {
      // Get default workflow for project
      workflow =
        (await this.workflowRepository.findOne({
          where: {
            project: { id: BigInt(projectId) },
            isDefault: true,
            isActive: true,
          },
        })) || undefined;
    }

    if (statusId) {
      status = await this.statusRepository.findOneOrFail({
        where: { id: BigInt(statusId) },
      });
    } else {
      // Get default status for project
      const defaultStatus = await this.statusRepository.findOne({
        where: {
          project: { id: BigInt(projectId) },
          isDefault: true,
          isActive: true,
        },
      });

      if (!defaultStatus) {
        // Fallback to first TODO status
        const fallbackStatus = await this.statusRepository.findOne({
          where: {
            project: { id: BigInt(projectId) },
            type: StatusType.TODO,
            isActive: true,
          },
          order: { position: 'ASC' },
        });

        if (!fallbackStatus) {
          // Create default statuses for the project
          await this.statusManagerService.createDefaultStatuses(projectId);

          // Get the newly created default status
          status = await this.statusRepository.findOneOrFail({
            where: {
              project: { id: BigInt(projectId) },
              isDefault: true,
              isActive: true,
            },
          });
        } else {
          status = fallbackStatus;
        }
      } else {
        status = defaultStatus;
      }
    }

    const task = this.taskRepository.create({
      title,
      description,
      createdBy,
      assignedTo,
      group,
      dueDate,
      projectId,
      branchId,
      fileId,
      filePart,
      language,
      workflow,
      status,
      priority,
      storyPoints,
      customFields,
    } as DeepPartial<TaskEntity>);

    await this.taskRepository.save(task);

    await this.createStatusHistory(task.id, undefined, status, createdBy);

    this.taskGateway.emitTaskUpdate(task);
    return task;
  }

  private async createStatusHistory(
    taskId: bigint,
    fromStatus: TaskStatusEntity | undefined,
    toStatus: TaskStatusEntity,
    changedBy: UserEntity,
    comment?: string
  ) {
    const task = await this.taskRepository.findOneOrFail({
      where: { id: taskId },
    });

    const history = this.statusHistoryRepository.create({
      task,
      fromStatus,
      toStatus,
      changedBy,
      comment,
    });

    await this.statusHistoryRepository.save(history);
  }

  async transitionTask(id: string, dto: TransitionTaskDto, userId: string) {
    const task = await this.taskRepository.findOne({
      where: { id: BigInt(id) },
      relations: ['status', 'workflow', 'createdBy', 'assignedTo'],
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    const user = await this.userRepository.findOneOrFail({
      where: { id: BigInt(userId) },
    });

    const toStatus = await this.statusRepository.findOneOrFail({
      where: { id: BigInt(dto.toStatusId) },
    });

    // Check if transition is allowed
    await this.validateTransition(task, toStatus, user);

    const fromStatus = task.status;

    // Update task status
    task.status = toStatus;

    // Update timestamps based on status type
    if (toStatus.type === StatusType.IN_PROGRESS && !task.startedAt) {
      task.startedAt = new Date();
    } else if (toStatus.type === StatusType.DONE && !task.completedAt) {
      task.completedAt = new Date();
    } else if (toStatus.type === StatusType.TODO && task.completedAt) {
      task.completedAt = undefined;
    }

    await this.taskRepository.save(task);

    // Create status history
    await this.createStatusHistory(
      task.id,
      fromStatus,
      toStatus,
      user,
      dto.comment
    );

    this.taskGateway.emitTaskUpdate(task);

    return this.getTask(id);
  }

  private async validateTransition(
    task: TaskEntity,
    toStatus: TaskStatusEntity,
    user: UserEntity
  ) {
    if (!task.workflow) {
      // If no workflow, allow any transition (for backward compatibility)
      return;
    }

    // Find valid transition
    const transition = await this.transitionRepository.findOne({
      where: {
        workflow: { id: task.workflow.id },
        fromStatus: { id: task.status.id },
        toStatus: { id: toStatus.id },
        isActive: true,
      },
      relations: ['workflow', 'fromStatus', 'toStatus'],
    });

    if (!transition) {
      throw new BadRequestException(
        `Invalid transition from ${task.status.name} to ${toStatus.name}`
      );
    }

    // Check permissions
    const hasPermission = await this.checkTransitionPermission(
      transition,
      task,
      user
    );
    if (!hasPermission) {
      throw new ForbiddenException(
        'You do not have permission to perform this transition'
      );
    }
  }

  private async checkTransitionPermission(
    transition: WorkflowTransitionEntity,
    task: TaskEntity,
    user: UserEntity
  ): Promise<boolean> {
    switch (transition.conditionType) {
      case TransitionConditionType.ANYONE:
        return true;

      case TransitionConditionType.CREATOR_ONLY:
        return task.createdBy.id === user.id;

      case TransitionConditionType.ASSIGNEE_ONLY:
        return task.assignedTo?.id === user.id;

      case TransitionConditionType.USER: {
        const allowedUserIds = transition.conditionData?.userIds || [];
        return allowedUserIds.includes(user.id.toString());
      }

      case TransitionConditionType.GROUP:
        return true; // Placeholder

      case TransitionConditionType.ROLE:
        return true; // Placeholder

      default:
        return false;
    }
  }

  async getTasksByProject(projectId: string) {
    const tasks = await this.taskRepository.find({
      where: { projectId },
      relations: ['createdBy', 'assignedTo', 'group', 'status', 'workflow'],
      order: { createdAt: 'DESC' },
      select: {
        id: true,
        title: true,
        description: true,
        projectId: true,
        branchId: true,
        fileId: true,
        filePart: true,
        language: true,
        dueDate: true,
        createdAt: true,
        startedAt: true,
        completedAt: true,
        priority: true,
        storyPoints: true,
        createdBy: {
          id: true,
          username: true,
          fullName: true,
          avatarUrl: true,
        },
        assignedTo: {
          id: true,
          username: true,
          fullName: true,
          avatarUrl: true,
        },
        group: true,
        status: {
          id: true,
          name: true,
          color: true,
          type: true,
        },
        workflow: {
          id: true,
          name: true,
        },
      },
    });
    return tasks;
  }

  async getTask(id: string) {
    const task = await this.taskRepository.findOne({
      where: { id: BigInt(id) },
      relations: ['createdBy', 'assignedTo', 'group', 'status', 'workflow'],
      select: {
        id: true,
        title: true,
        description: true,
        projectId: true,
        branchId: true,
        fileId: true,
        filePart: true,
        language: true,
        dueDate: true,
        createdAt: true,
        updatedAt: true,
        startedAt: true,
        completedAt: true,
        priority: true,
        storyPoints: true,
        customFields: true,
        createdBy: {
          id: true,
          username: true,
          fullName: true,
          avatarUrl: true,
        },
        assignedTo: {
          id: true,
          username: true,
          fullName: true,
          avatarUrl: true,
        },
        group: true,
        status: {
          id: true,
          name: true,
          color: true,
          type: true,
        },
        workflow: {
          id: true,
          name: true,
        },
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }
    return task;
  }

  async updateTask(id: string, dto: UpdateTaskDto, userId: bigint) {
    const task = await this.taskRepository.findOne({
      where: { id: BigInt(id) },
      relations: ['status', 'workflow', 'createdBy', 'assignedTo'],
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // Update basic fields
    if (dto.title !== undefined) task.title = dto.title;
    if (dto.description !== undefined) task.description = dto.description;
    if (dto.dueDate !== undefined) task.dueDate = new Date(dto.dueDate);
    if (dto.priority !== undefined) task.priority = dto.priority;
    if (dto.storyPoints !== undefined) task.storyPoints = dto.storyPoints;
    if (dto.customFields !== undefined) task.customFields = dto.customFields;

    if (dto.assignedToId !== undefined) {
      task.assignedTo = dto.assignedToId
        ? (await this.userRepository.findOne({
            where: { id: BigInt(dto.assignedToId) },
          })) || undefined
        : undefined;
    }

    if (dto.groupId !== undefined) {
      task.group = dto.groupId
        ? (await this.projectGroupRepository.findOne({
            where: { id: BigInt(dto.groupId) },
          })) || undefined
        : undefined;
    }

    if (dto.workflowId !== undefined) {
      task.workflow = dto.workflowId
        ? (await this.workflowRepository.findOne({
            where: { id: BigInt(dto.workflowId) },
          })) || undefined
        : undefined;
    }

    // Handle status transition separately using transitionTask
    if (dto.statusId !== undefined) {
      await this.transitionTask(
        id,
        { toStatusId: dto.statusId },
        userId.toString()
      );
      return this.getTask(id);
    }

    await this.taskRepository.save(task);
    this.taskGateway.emitTaskUpdate(task);

    return this.getTask(id);
  }

  async getTaskHistory(id: string) {
    const history = await this.statusHistoryRepository.find({
      where: { task: { id: BigInt(id) } },
      relations: ['fromStatus', 'toStatus', 'changedBy'],
      order: { createdAt: 'DESC' },
      select: {
        id: true,
        comment: true,
        createdAt: true,
        fromStatus: {
          id: true,
          name: true,
          color: true,
        },
        toStatus: {
          id: true,
          name: true,
          color: true,
        },
        changedBy: {
          id: true,
          username: true,
          fullName: true,
          avatarUrl: true,
        },
      },
    });

    return history;
  }

  async getAvailableTransitions(taskId: string, userId: string) {
    const task = await this.taskRepository.findOne({
      where: { id: BigInt(taskId) },
      relations: ['status', 'workflow', 'createdBy', 'assignedTo'],
    });

    if (!task || !task.workflow) {
      return [];
    }

    const user = await this.userRepository.findOneOrFail({
      where: { id: BigInt(userId) },
    });

    const transitions = await this.transitionRepository.find({
      where: {
        workflow: { id: task.workflow.id },
        fromStatus: { id: task.status.id },
        isActive: true,
      },
      relations: ['toStatus'],
    });

    const availableTransitions = [];
    for (const transition of transitions) {
      const hasPermission = await this.checkTransitionPermission(
        transition,
        task,
        user
      );
      if (hasPermission) {
        availableTransitions.push({
          id: transition.id,
          name: transition.name,
          toStatus: {
            id: transition.toStatus.id,
            name: transition.toStatus.name,
            color: transition.toStatus.color,
            type: transition.toStatus.type,
          },
        });
      }
    }

    return availableTransitions;
  }

  async deleteTask(id: string) {
    const task = await this.getTask(id);
    await this.taskRepository.remove(task);
    this.taskGateway.emitTaskDelete(BigInt(id));
    return { success: true };
  }

  async closeTask(id: string, userId: string) {
    const task = await this.taskRepository.findOne({
      where: { id: BigInt(id) },
      relations: ['createdBy', 'assignedTo', 'group'],
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // Check if user has permission to close this task
    const user = await this.userRepository.findOne({
      where: { id: BigInt(userId) },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Allow any authenticated user to close tasks (simplified permission)
    // In production, you might want to add more specific permission checks
    const isCreator = task.createdBy.id === BigInt(userId);
    const isAssignee = task.assignedTo && task.assignedTo.id === BigInt(userId);

    // For now, allow any authenticated user to close tasks
    // You can add more specific permission logic here later
    if (!isCreator && !isAssignee) {
      // Allow project members to close tasks (simplified)
      // In a real app, you'd check project membership here
    }

    // Update task status to closed
    const closedStatus = await this.statusRepository.findOne({
      where: { name: 'closed' },
    });
    if (closedStatus) {
      task.status = closedStatus;
    }

    // Set closedAt timestamp if not already set
    if (!task.completedAt) {
      task.completedAt = new Date();
    }

    await this.taskRepository.save(task);
    this.taskGateway.emitTaskUpdate(task);

    return this.getTask(id);
  }

  async reopenTask(id: string, userId: string) {
    const task = await this.taskRepository.findOne({
      where: { id: BigInt(id) },
      relations: ['createdBy', 'assignedTo', 'group'],
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // Check if user has permission to reopen this task
    const user = await this.userRepository.findOne({
      where: { id: BigInt(userId) },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Allow any authenticated user to reopen tasks (simplified permission)
    // In production, you might want to add more specific permission checks
    const isCreator = task.createdBy.id === BigInt(userId);
    const isAssignee = task.assignedTo && task.assignedTo.id === BigInt(userId);

    // For now, allow any authenticated user to reopen tasks
    // You can add more specific permission logic here later
    if (!isCreator && !isAssignee) {
      // Allow project members to reopen tasks (simplified)
      // In a real app, you'd check project membership here
    }

    // Check if task is actually closed
    if (task.status.name !== 'closed') {
      throw new BadRequestException('Task is not closed');
    }

    // Update task status back to pending (To do)
    const pendingStatus = await this.statusRepository.findOne({
      where: { name: 'pending' },
    });
    if (pendingStatus) {
      task.status = pendingStatus;
    }

    // Clear completedAt timestamp since task is reopened
    task.completedAt = undefined;

    await this.taskRepository.save(task);
    this.taskGateway.emitTaskUpdate(task);

    return this.getTask(id);
  }

  async getTasksByUser(userId: string) {
    const tasks = await this.taskRepository.find({
      where: [
        { assignedTo: { id: BigInt(userId) } },
        { createdBy: { id: BigInt(userId) } },
      ],
      relations: ['createdBy', 'assignedTo', 'group'],
      order: { createdAt: 'DESC' },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        projectId: true,
        branchId: true,
        fileId: true,
        filePart: true,
        language: true,
        dueDate: true,
        createdAt: true,
        createdBy: {
          id: true,
          username: true,
          fullName: true,
          avatarUrl: true,
        },
        assignedTo: {
          id: true,
          username: true,
          fullName: true,
          avatarUrl: true,
        },
        group: true,
      },
    });
    return tasks;
  }

  async createFromPart(params: {
    projectId: string;
    branchId: string;
    fileId: string;
    filePart: number;
    createdById: string;
    assignedToId?: string;
    groupId?: string;
    dueDate?: Date;
    language: string;
  }) {
    const strings = await this.translationService.getAllString(
      params.projectId,
      params.branchId,
      params.language,
      params.fileId,
      params.filePart
    );
    if (strings.length === 0)
      throw new NotFoundException('No strings in that part');

    const example = strings
      .slice(0, 3)
      .map((s: Record<string, unknown>) => `- ${s.originalText}`)
      .join('\n');
    const description = `Contains ${strings.length} strings:\n${example}`;
    const title = `Translate part ${params.filePart}`;

    return this.createTask({
      ...params,
      title,
      description,
    });
  }

  async getTaskProgress(taskId: bigint) {
    const task = await this.taskRepository.findOneOrFail({
      where: { id: taskId },
    });
    if (
      !task.projectId ||
      task.filePart === null ||
      !task.branchId ||
      !task.fileId ||
      !task.language
    ) {
      return null;
    }

    const strings = await this.translationService.getAllString(
      task.projectId,
      task.branchId,
      task.language,
      task.fileId,
      task.filePart ?? undefined
    );
    const total = strings.length;
    const translated = strings.filter((s: Record<string, unknown>) => {
      const translatedText = s.translatedText as string;
      return translatedText && translatedText.trim() !== '';
    }).length;
    const percent = total === 0 ? 0 : Math.round((translated / total) * 100);

    return { total, translated, percent };
  }

  async listTasks(page = 1, pageSize = 20) {
    const [tasks, count] = await this.taskRepository.findAndCount({
      skip: (page - 1) * pageSize,
      take: pageSize,
      order: { createdAt: 'DESC' },
      relations: ['assignedTo', 'group', 'createdBy'],
    });

    return {
      items: tasks,
      total: count,
      page,
      pageSize,
      totalPages: Math.ceil(count / pageSize),
    };
  }

  // New methods for pagination & scoring
  async createTaskWithPagination(params: {
    title: string;
    description?: string;
    createdById: string;
    assignedToId?: string;
    groupId?: string;
    dueDate?: Date;
    projectId?: string;
    branchId?: string;
    fileId?: string;
    language?: string;
    workflowId?: string;
    statusId?: string;
    priority?: string;
    storyPoints?: number;
    customFields?: Record<string, unknown>;
    selectedPages?: number[];
    pageDifficulties?: PageDifficultyDto[];
    assignments?: AssignTaskDto[];
  }) {
    // Create the basic task first
    const task = await this.createTask(params);

    // Handle page difficulties if provided
    if (params.pageDifficulties && params.fileId && params.projectId && params.branchId) {
      for (const pageDifficulty of params.pageDifficulties) {
        await this.pageDifficultyService.assignPageDifficulty(
          params.projectId,
          params.branchId,
          params.fileId,
          pageDifficulty,
          params.createdById
        );
      }

      // Calculate and update task score
      const scoreData = await this.pageDifficultyService.calculateTaskScore(
        params.fileId,
        params.selectedPages
      );

      task.selectedPages = params.selectedPages;
      task.totalScore = scoreData.totalScore;
      task.totalAmount = scoreData.totalScore; // Can be adjusted with additional pricing logic
      task.totalPages = scoreData.totalPages;

      await this.taskRepository.save(task);
    }

    // Handle assignments if provided
    if (params.assignments) {
      for (const assignment of params.assignments) {
        await this.taskAssignmentService.assignTask(
          {
            ...assignment,
            taskId: task.id.toString(),
          },
          params.createdById
        );
      }
    }

    return this.getTaskWithDetails(task.id.toString());
  }

  async getTaskWithDetails(id: string) {
    const task = await this.getTask(id);

    // Get assignments
    const assignments = await this.taskAssignmentService.getTaskAssignments(id);

    // Get page difficulties if task has fileId
    let pageDifficulties: PageDifficultyEntity[] = [];
    if (task.fileId) {
      pageDifficulties = await this.pageDifficultyService.getPageDifficulties(task.fileId);
    }

    return {
      ...task,
      assignments,
      pageDifficulties,
    };
  }

  async updateTaskPagination(
    taskId: string,
    selectedPages: number[]
  ) {
    const task = await this.taskRepository.findOneOrFail({
      where: { id: BigInt(taskId) },
    });

    if (!task.fileId) {
      throw new BadRequestException('Task must have a file to update pagination');
    }

    // Validate no duplicate pages
    await this.pageDifficultyService.validateNoDuplicatePages(
      task.fileId,
      selectedPages
    );

    // Calculate new score
    const scoreData = await this.pageDifficultyService.calculateTaskScore(
      task.fileId,
      selectedPages
    );

    task.selectedPages = selectedPages;
    task.totalScore = scoreData.totalScore;
    task.totalAmount = scoreData.totalScore;
    task.totalPages = scoreData.totalPages;

    await this.taskRepository.save(task);
    this.taskGateway.emitTaskUpdate(task);

    return this.getTaskWithDetails(taskId);
  }

  async getPagePreview(fileId: string, pageNumber: number, language: string) {
    return await this.pageDifficultyService.getPagePreview({
      fileId,
      pageNumber,
      language,
    });
  }

  async assignTaskRole(dto: AssignTaskDto, assignedById: string) {
    return await this.taskAssignmentService.assignTask(dto, assignedById);
  }

  async reassignTaskRole(dto: ReassignTaskDto, reassignedById: string) {
    return await this.taskAssignmentService.reassignTask(dto, reassignedById);
  }

  async getTaskAssignments(taskId: string) {
    return await this.taskAssignmentService.getTaskAssignments(taskId);
  }

  async getAssignmentHistory(taskId: string) {
    return await this.taskAssignmentService.getAssignmentHistory(taskId);
  }

  async acceptAssignment(assignmentId: string, userId: string) {
    return await this.taskAssignmentService.acceptAssignment(assignmentId, userId);
  }

  async declineAssignment(assignmentId: string, userId: string, reason?: string) {
    return await this.taskAssignmentService.declineAssignment(assignmentId, userId, reason);
  }

  async completeAssignment(assignmentId: string, userId: string) {
    return await this.taskAssignmentService.completeAssignment(assignmentId, userId);
  }

  async getDifficultyConfigs(projectId: string) {
    return await this.pageDifficultyService.getDifficultyConfigs(projectId);
  }

  async updateDifficultyConfig(configId: string, dto: Partial<DifficultyConfigDto>, userId: string) {
    return await this.pageDifficultyService.updateDifficultyConfig(configId, dto, userId);
  }

  async createDefaultDifficultyConfigs(projectId: string, userId: string) {
    return await this.pageDifficultyService.createDefaultDifficultyConfigs(projectId, userId);
  }
}
