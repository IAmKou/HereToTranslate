import {
  BadRequestException,
  Injectable,
  NotFoundException,
  forwardRef,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  ProjectGroupEntity,
  TaskEntity,
  UserEntity,
} from '#LocalProject/Entities';
import { TaskHistoryEntity } from '../../db/mysql/entity/task-history.entity';
import { DeepPartial, Repository } from 'typeorm';
import { ProjectManagerService } from './project-manager.service';
import { PermissionFlags } from '@here-to-translate/common';
import { TranslationService } from './translation-manager.service';
import { TaskGateway } from '../../util/gateway/task.gateway';
import { UpdateTaskDto } from '../../dto/task.dto';
import { ActivityManagerService } from './activity-manager.service';

// Interface for translation string
interface TranslationString {
  originalText: string;
  translatedText?: string;
  fileId: string;
  filePart: number;
}

// Interface for task history metadata
interface TaskHistoryMetadata {
  fromStatus?: string;
  toStatus?: string;
  fromAssignee?: string;
  toAssignee?: string;
  fromDueDate?: string;
  toDueDate?: string;
}

@Injectable()
export class TaskManagerService {
  constructor(
    @InjectRepository(TaskEntity)
    private readonly taskRepository: Repository<TaskEntity>,
    @InjectRepository(TaskHistoryEntity)
    private readonly taskHistoryRepository: Repository<TaskHistoryEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(ProjectGroupEntity)
    private readonly projectGroupRepository: Repository<ProjectGroupEntity>,
    private readonly projectService: ProjectManagerService,
    private readonly translationService: TranslationService,
    private readonly taskGateway: TaskGateway,
    @Inject(forwardRef(() => ActivityManagerService))
    private readonly activityManagerService: ActivityManagerService
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
    page?: number;
    pages?: number[];
    language?: string;
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
      page,
      pages,
      language,
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
      page,
      pages,
      language,
    } as DeepPartial<TaskEntity>);

    console.log('Creating task with data:', {
      title,
      projectId,
      fileId,
      page,
      pages,
      language
    });

    await this.taskRepository.save(task);

    // Create history entry for task creation
    await this.createTaskHistory({
      taskId: task.id,
      action: 'created',
      description: 'Task was created',
      performedBy: BigInt(createdById),
      metadata: {}
    });

    this.taskGateway.emitTaskUpdate(task);

    // Log activity
    try {
      await this.activityManagerService.logTaskCreate(
        Number(projectId),
        Number(createdById),
        title,
        branchId ? Number(branchId) : undefined
      );
    } catch (error) {
      console.error('Failed to log task creation activity:', error);
    }

    return task;
  }

  async getTasksByProject(projectId: string) {
    const tasks = await this.taskRepository.find({
      where: { projectId },
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
        page: true,
        pages: true,
        language: true,
        dueDate: true,
        createdAt: true,
        startedAt: true,
        completedAt: true,
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

  async getTask(id: string) {
    const task = await this.taskRepository.findOne({
      where: { id: BigInt(id) },
      relations: ['createdBy', 'assignedTo', 'group'],
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        projectId: true,
        branchId: true,
        fileId: true,
        page: true,
        pages: true,
        language: true,
        dueDate: true,
        createdAt: true,
        startedAt: true,
        completedAt: true,
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
    if (!task) {
      throw new NotFoundException('Task not found');
    }
    return task;
  }

  async updateTask(id: string, dto: UpdateTaskDto) {
    const task = await this.taskRepository.findOne({
      where: { id: BigInt(id) },
    });
    if (!task) {
      throw new NotFoundException('Task not found');
    }
    let statusChanged = false;
    let oldStatus = task.status;
    let newStatus = task.status;
    // Update fields if provided
    if (dto.title !== undefined) task.title = dto.title;
    if (dto.description !== undefined) task.description = dto.description;
    if (dto.status !== undefined) {
      oldStatus = task.status;
      newStatus = dto.status;
      statusChanged = oldStatus !== newStatus;
      // Handle timestamp updates based on status changes
      if (newStatus === 'pending') {
        // Moving back to todo - clear timestamps
        task.startedAt = null;
        task.completedAt = null;
      } else if (newStatus === 'in_progress') {
        // Moving to in progress
        if (!task.startedAt) {
          task.startedAt = new Date();
        }
        // Clear completedAt if moving from completed back to in progress
        if (oldStatus === 'completed') {
          task.completedAt = null;
        }
      } else if (newStatus === 'completed') {
        // Moving to completed
        if (!task.startedAt) {
          task.startedAt = new Date();
        }
        if (!task.completedAt) {
          task.completedAt = new Date();
        }
      }

      task.status = newStatus;
    }
    if (dto.dueDate !== undefined) task.dueDate = new Date(dto.dueDate);

    if (dto.assignedToId !== undefined) {
      task.assignedTo = dto.assignedToId
        ? await this.userRepository.findOne({
          where: { id: BigInt(dto.assignedToId) },
        })
        : null;
    }

    if (dto.groupId !== undefined) {
      task.group = dto.groupId
        ? await this.projectGroupRepository.findOne({
          where: { id: BigInt(dto.groupId) },
        })
        : null;
    }

    // Update page and pages fields
    if (dto.page !== undefined) task.page = dto.page;
    if (dto.pages !== undefined) task.pages = dto.pages;
    if (dto.language !== undefined) task.language = dto.language;

    await this.taskRepository.save(task);
    // Ghi history nếu đổi trạng thái
    if (statusChanged) {
      await this.createTaskHistory({
        taskId: task.id,
        action: 'status_change',
        description: `Task status was changed from ${oldStatus} to ${newStatus}`,
        performedBy: BigInt(1), // Default user ID
        metadata: {
          fromStatus: oldStatus,
          toStatus: newStatus,
        },
      });
    }
    this.taskGateway.emitTaskUpdate(task);

    return this.getTask(id);
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
    task.status = 'closed';

    // Set closedAt timestamp if not already set
    if (!task.completedAt) {
      task.completedAt = new Date();
    }

    await this.taskRepository.save(task);

    // Create history entry for task closure
    await this.createTaskHistory({
      taskId: task.id,
      action: 'closed',
      description: 'Task was closed',
      performedBy: BigInt(userId),
      metadata: {}
    });

    this.taskGateway.emitTaskUpdate(task);

    return this.getTask(id);
  }

  async reopenTask(id: string, userId: string, reason?: string) {
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
    if (task.status !== 'closed') {
      throw new BadRequestException('Task is not closed');
    }

    // Update task status back to pending (To do)
    task.status = 'pending';

    // Clear completedAt timestamp since task is reopened
    task.completedAt = null;

    await this.taskRepository.save(task);

    // Create history entry for task reopening
    await this.createTaskHistory({
      taskId: task.id,
      action: 'reopened',
      description: 'Task was reopened',
      performedBy: BigInt(userId),
      reason: reason,
      metadata: {
        fromStatus: 'closed',
        toStatus: 'pending'
      }
    });

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
        page: true,
        pages: true,
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
    page: number;
    createdById: string;
    assignedToId?: string;
    groupId?: string;
    dueDate?: Date;
  }) {
    const strings = await this.translationService.getAllString(
      params.projectId,
      params.branchId,
      'en',
      params.fileId,
      params.page
    );
    if (strings.length === 0)
      throw new NotFoundException('No strings in that page');

    const example = strings
      .slice(0, 3)
      .map((s: TranslationString) => `- ${s.originalText}`)
      .join('\n');
    const description = `Contains ${strings.length} strings:\n${example}`;
    const title = `Translate page ${params.page}`;

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
      (!task.page && (!task.pages || task.pages.length === 0)) ||
      !task.branchId ||
      !task.fileId
    ) {
      return null;
    }

    let allStrings: TranslationString[] = [];

    // Check for multiple pages first
    if (task.pages && Array.isArray(task.pages) && task.pages.length > 0) {
      // Get strings for all selected pages
      for (const page of task.pages) {
        const pageStrings = await this.translationService.getAllString(
          task.projectId,
          task.branchId,
          task.fileId,
          page
        );
        allStrings = allStrings.concat(pageStrings);
      }
    }
    // Check for single page
    else if (task.page !== null && task.page !== undefined) {
      allStrings = await this.translationService.getAllString(
        task.projectId,
        task.branchId,
        task.fileId,
        task.page
      );
    }

    const total = allStrings.length;
    const translated = allStrings.filter(
      (s: TranslationString) => s.translatedText && s.translatedText.trim() !== ''
    ).length;
    const percent = total === 0 ? 0 : Math.round((translated / total) * 100);

    return { total, translated, percent };
  }

  async getTaskHistory(taskId: string) {
    try {
      // Get real history from TaskHistoryEntity
      const history = await this.taskHistoryRepository.find({
        where: { taskId: BigInt(taskId) },
        relations: ['performer'],
        order: { performedAt: 'ASC' },
      });

      // Transform to match frontend interface
      return history.map(item => ({
        id: item.id.toString(),
        taskId: taskId,
        action: item.action,
        description: item.description,
        performedAt: item.performedAt.toISOString(),
        reason: item.reason,
        metadata: item.metadata || {},
        performer: item.performer ? {
          id: item.performer.id.toString(),
          username: item.performer.username,
          fullName: item.performer.fullName,
        } : null,
      }));
    } catch (error) {
      console.error('Error getting task history:', error);
      return [];
    }
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

  // Helper method to create task history entries
  private async createTaskHistory(params: {
    taskId: bigint;
    action: 'created' | 'status_change' | 'assignment_change' | 'due_date_change' | 'closed' | 'reopened';
    description: string;
    performedBy: bigint;
    reason?: string;
    metadata?: TaskHistoryMetadata;
  }) {
    const history = this.taskHistoryRepository.create({
      taskId: params.taskId,
      action: params.action,
      description: params.description,
      performedBy: params.performedBy,
      reason: params.reason,
      metadata: params.metadata,
    });

    await this.taskHistoryRepository.save(history);
  }
}
