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
import { TaskHistoryEntity } from '../../db/mysql/entity/task-history.entity';
import { ProjectManagerService } from '#LocalProject/Managers/service/project-manager.service';
import { PermissionFlags } from '@here-to-translate/common';
import { TranslationService } from '#LocalProject/Managers/service/translation-manager.service';
import { TaskGateway } from '#LocalProject/Utils/gateway/task.gateway';
import { UpdateTaskDto, TransitionTaskDto } from '#LocalProject/Dtos';
import { TransitionConditionType, StatusType } from '#LocalProject/Entities';
import { StatusManagerService } from './task-status-manager.service';
import { TaskAssignmentManagerService } from './task-assignment-manager.service';
import { AssignTaskDto, ReassignTaskDto } from '#LocalProject/Dtos';

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
    @InjectRepository(TaskHistoryEntity)
    private readonly taskHistoryRepository: Repository<TaskHistoryEntity>,
    private readonly projectService: ProjectManagerService,
    private readonly translationService: TranslationService,
    private readonly taskGateway: TaskGateway,
    private readonly statusManagerService: StatusManagerService,
    private readonly taskAssignmentService: TaskAssignmentManagerService
  ) {}

  async createTask(params: {
    title: string;
    description?: string;
    createdById: string;
    assignedToId?: string;
    reviewerId?: string;
    groupId?: string;
    dueDate?: Date;
    estimatedBusinessHours?: number;
    projectId?: string;
    fileId?: string;
    originalText?: string;
    translatedText?: string;
    pages?: number[];
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
      reviewerId,
      groupId,
      dueDate,
      estimatedBusinessHours,
      projectId,
      fileId,
      originalText,
      translatedText,
      pages,
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

    const reviewer = reviewerId
      ? await this.userRepository.findOne({
        where: { id: BigInt(reviewerId) },
      })
      : undefined;

    // Validate that reviewer and assignee are not the same person
    if (assignedTo && reviewer && assignedTo.id === reviewer.id) {
      throw new BadRequestException('Reviewer and assignee cannot be the same person');
    }

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
      reviewer,
      group,
      dueDate,
      projectId,
      fileId,
      originalText,
      translatedText,
      selectedPages: Array.isArray(pages) && pages.length > 0 ? pages : undefined,
      language,
      workflow,
      status,
      priority,
      storyPoints,
      customFields,
      estimatedBusinessHours,
    } as DeepPartial<TaskEntity>);

    // If no assignee, force OPEN status and clear start/due
    if (!assignedTo) {
      const openStatus = await this.statusRepository.findOne({
        where: {
          project: { id: BigInt(projectId) },
          type: StatusType.OPEN,
          isActive: true,
        },
      });
      if (openStatus) {
        task.status = openStatus;
      }
      task.startedAt = undefined;
      task.dueDate = undefined;
    }

    // If creator assigns to self at creation, set start/due
    if (assignedTo && createdBy && assignedTo.id?.toString() === createdBy.id?.toString()) {
      if (!task.startedAt) task.startedAt = new Date();
      if (!task.dueDate && estimatedBusinessHours && estimatedBusinessHours > 0) {
        const { addBusinessHours } = await import('../../utils/business-time.js');
        task.dueDate = addBusinessHours(task.startedAt, Number(estimatedBusinessHours));
      }
    }

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
    if (toStatus.type === StatusType.OPEN) {
      task.startedAt = undefined;
      task.dueDate = undefined;
    } else if (toStatus.type === StatusType.IN_PROGRESS && !task.startedAt) {
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
    // Get the default workflow for the project
    const defaultWorkflow = await this.workflowRepository.findOne({
      where: {
        project: { id: BigInt(task.projectId || '0') },
        isDefault: true,
        isActive: true,
      },
    });

    if (!defaultWorkflow) {
      throw new BadRequestException('No default workflow found for this project');
    }

    // Find valid transition from the default workflow only
    const transition = await this.transitionRepository.findOne({
      where: {
        workflow: { id: defaultWorkflow.id },
        fromStatus: { id: task.status.id },
        toStatus: { id: toStatus.id },
        isActive: true,
      },
      relations: ['workflow', 'fromStatus', 'toStatus'],
    });

    if (!transition) {
      throw new BadRequestException(
        `Transition from "${task.status.name}" to "${toStatus.name}" is not allowed in the default workflow`
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

  private async updateTaskStatusWithoutValidation(
    taskId: string,
    statusId: string,
    userId: string
  ) {
    const task = await this.taskRepository.findOne({
      where: { id: BigInt(taskId) },
      relations: ['status'],
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    const toStatus = await this.statusRepository.findOneOrFail({
      where: { id: BigInt(statusId) },
    });

    const user = await this.userRepository.findOneOrFail({
      where: { id: BigInt(userId) },
    });

    const fromStatus = task.status;

    // Update task status without workflow validation
    task.status = toStatus;

    // Update timestamps based on status type
    if (toStatus.type === StatusType.OPEN) {
      task.startedAt = undefined;
      task.dueDate = undefined;
    } else if (toStatus.type === StatusType.IN_PROGRESS && !task.startedAt) {
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
      'Status updated after reopen (workflow validation skipped)'
    );

    this.taskGateway.emitTaskUpdate(task);

    return this.getTask(taskId);
  }

  async getTasksByProject(projectId: string) {
    const tasks = await this.taskRepository.find({
      where: { projectId },
      relations: ['createdBy', 'assignedTo', 'reviewer', 'group', 'status', 'workflow'],
      order: { createdAt: 'DESC' },
      select: {
        id: true,
        title: true,
        description: true,
        projectId: true,
        fileId: true,
        originalText: true,
        translatedText: true,
        selectedStrings: true,
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
        reviewer: {
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
      relations: ['createdBy', 'assignedTo', 'reviewer', 'group', 'status', 'workflow'],
      select: {
        id: true,
        title: true,
        description: true,
        projectId: true,
        fileId: true,
        originalText: true,
        translatedText: true,
        selectedPages: true,
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
        reviewer: {
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
      select: {
        id: true,
        title: true,
        description: true,
        projectId: true,
        fileId: true,
        originalText: true,
        translatedText: true,
        language: true,
        dueDate: true,
        createdAt: true,
        startedAt: true,
        completedAt: true, // Important: Load completedAt field
        priority: true,
        storyPoints: true,
        estimatedBusinessHours: true,
        customFields: true,
        createdBy: {
          id: true,
          username: true,
          fullName: true,
        },
        assignedTo: {
          id: true,
          username: true,
          fullName: true,
        },
        status: {
          id: true,
          name: true,
          type: true,
          isClosed: true,
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

    // Update basic fields
    if (dto.title !== undefined) task.title = dto.title;
    if (dto.description !== undefined) task.description = dto.description;
    if (dto.dueDate !== undefined) task.dueDate = new Date(dto.dueDate);
    if (dto.priority !== undefined) task.priority = dto.priority;
    if (dto.storyPoints !== undefined) task.storyPoints = dto.storyPoints;
    if (dto.customFields !== undefined) task.customFields = dto.customFields;
    if (dto.estimatedBusinessHours !== undefined) task.estimatedBusinessHours = dto.estimatedBusinessHours;

    if (dto.assignedToId !== undefined) {
      task.assignedTo = dto.assignedToId
        ? (await this.userRepository.findOne({
        where: { id: BigInt(dto.assignedToId) },
      })) || undefined
        : undefined;

      // If assignee cleared -> move to OPEN and clear times
      if (!task.assignedTo) {
        const openStatus = await this.statusRepository.findOne({
          where: { project: { id: BigInt(task.projectId || '0') }, type: StatusType.OPEN, isActive: true },
        });
        if (openStatus) {
          task.status = openStatus;
        }
        task.startedAt = undefined;
        task.dueDate = undefined;
      } else {
        // If assignee equals current user -> self-assign
        if (dto.assignedToId === userId.toString()) {
          if (!task.startedAt) task.startedAt = new Date();
          if (!task.dueDate && task.estimatedBusinessHours && Number(task.estimatedBusinessHours) > 0) {
            const { addBusinessHours } = await import('../../utils/business-time.js');
            task.dueDate = addBusinessHours(task.startedAt, Number(task.estimatedBusinessHours));
          }
          // Move to IN_PROGRESS if status exists
          const inProgress = await this.statusRepository.findOne({
            where: { project: { id: BigInt(task.projectId || '0') }, type: StatusType.IN_PROGRESS, isActive: true },
          });
          if (inProgress) {
            task.status = inProgress;
          }
        }
      }
    }

    if (dto.reviewerId !== undefined) {
      task.reviewer = dto.reviewerId
        ? (await this.userRepository.findOne({
        where: { id: BigInt(dto.reviewerId) },
      })) || undefined
        : undefined;
    }

    // Validate that reviewer and assignee are not the same person
    if (task.assignedTo && task.reviewer && task.assignedTo.id === task.reviewer.id) {
      throw new BadRequestException('Reviewer and assignee cannot be the same person');
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
      // Decide whether to enforce workflow transitions or skip validation
      const shouldSkipValidation = (dto as any).skipWorkflowValidation === true;

      if (shouldSkipValidation) {
        console.log(`✅ [BACKEND] Task ${id} updating status WITHOUT workflow validation (explicit)`);
        await this.updateTaskStatusWithoutValidation(id, dto.statusId, userId.toString());
        return this.getTask(id);
      }

      console.log(`🔐 [BACKEND] Task ${id} updating status WITH workflow validation`);
      const toStatusId = dto.statusId as string;
      await this.transitionTask(id, { toStatusId, comment: undefined } as any, userId.toString());
      return this.getTask(id);
    }

    await this.taskRepository.save(task);
    this.taskGateway.emitTaskUpdate(task);

    return this.getTask(id);
  }

  async getTaskHistory(id: string) {
    // Compose unified history timeline from different sources: status changes and task history
    const statusHistory = await this.statusHistoryRepository.find({
      where: { task: { id: BigInt(id) } },
      relations: ['fromStatus', 'toStatus', 'changedBy'],
      order: { createdAt: 'DESC' },
    });

    const taskHistory = await this.taskHistoryRepository.find({
      where: { task: { id: BigInt(id) } },
      order: { performedAt: 'DESC' },
      relations: ['performer'],
    });

    const normalize = [
      ...statusHistory.map((h) => ({
        id: Number(h.id),
        action: 'status_change' as const,
        description: h.comment || '',
        performedAt: h.createdAt,
        metadata: {
          fromStatus: h.fromStatus?.name,
          toStatus: h.toStatus?.name,
        },
      })),
      ...taskHistory.map((h) => ({
        id: Number(h.id) + 1000000,
        action: h.action,
        description: h.description,
        performedAt: h.performedAt,
        reason: h.reason,
        metadata: h.metadata,
      })),
    ].sort((a, b) => +new Date(b.performedAt) - +new Date(a.performedAt));

    return normalize;
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

    // Add close history entry
    await this.taskHistoryRepository.save(
      this.taskHistoryRepository.create({
        task,
        action: 'closed',
        description: 'Task closed',
        performedBy: BigInt(userId),
        metadata: { status: 'closed' },
      })
    );
    this.taskGateway.emitTaskUpdate(task);

    return this.getTask(id);
  }

  async reopenTask(id: string, userId: string, _reason?: string) {
    const task = await this.taskRepository.findOne({
      where: { id: BigInt(id) },
      relations: ['createdBy', 'assignedTo', 'group', 'status'],
      select: {
        id: true,
        title: true,
        description: true,
        projectId: true,
        fileId: true,
        originalText: true,
        translatedText: true,
        language: true,
        dueDate: true,
        createdAt: true,
        startedAt: true,
        completedAt: true, // Important: Load completedAt field
        priority: true,
        storyPoints: true,
        estimatedBusinessHours: true,
        customFields: true,
        createdBy: {
          id: true,
          username: true,
          fullName: true,
        },
        assignedTo: {
          id: true,
          username: true,
          fullName: true,
        },
        group: {
          id: true,
          name: true,
        },
        status: {
          id: true,
          name: true,
          type: true,
          isClosed: true,
        },
      },
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

    // Check if task is actually closed (by type or flag)
    if (!task.status || (task.status.type !== StatusType.CLOSED && !task.status.isClosed)) {
      throw new BadRequestException('Task is not closed');
    }

    // Do not force a particular target status here.
    // Frontend may immediately transition to a chosen status after reopen.

    await this.taskRepository.save(task);
    console.log(`🔍 [BACKEND] reopenTask - Task saved successfully`);

    // Add reopen history entry
    await this.taskHistoryRepository.save(
      this.taskHistoryRepository.create({
        task,
        action: 'reopened',
        description: 'Task reopened',
        performedBy: BigInt(userId),
        reason: _reason,
        metadata: { status: 'reopened' },
      })
    );
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
        fileId: true,
        originalText: true,
        translatedText: true,
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

  async getTaskProgress(taskId: bigint) {
    const task = await this.taskRepository.findOneOrFail({
      where: { id: taskId },
    });

    if (!task.originalText) {
      return { total: 0, translated: 0, percent: 0 };
    }

    const total = 1;
    const translated = (task.translatedText && task.translatedText.trim() !== '') ? 1 : 0;
    const percent = translated * 100;

    return { total, translated, percent };
  }

  async getTaskAssignments(taskId: string) {
    return await this.taskAssignmentService.getTaskAssignments(taskId);
  }

  async getAssignmentHistory(taskId: string) {
    return await this.taskAssignmentService.getAssignmentHistory(taskId);
  }

  async checkAndUpdateOverdueStatus() {
    const now = new Date();

    const overdueTasks = await this.taskRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.status', 'status')
      .where('task.dueDate < :now', { now })
      .andWhere('task.isOverdue = :isOverdue', { isOverdue: false })
      .andWhere('status.type != :doneType', { doneType: StatusType.DONE })
      .getMany();

    for (const task of overdueTasks) {
      task.isOverdue = true;
      await this.taskRepository.save(task);
    }

    return {
      tasksUpdated: overdueTasks.length,
      subtasksUpdated: 0,
    };
  }

}
