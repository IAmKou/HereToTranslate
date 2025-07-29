import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  ProjectGroupEntity,
  TaskEntity,
  UserEntity,
} from '../../db/mysql/entity/index';
import { DeepPartial, Repository } from 'typeorm';
import { ProjectManagerService } from './project-manager.service';
import { PermissionFlags } from '@here-to-translate/common';
import { TranslationService } from './translation-manager.service';
import { TaskGateway } from '../../util/gateway/task.gateway';
import { UpdateTaskDto } from '../../dto/task.dto';

@Injectable()
export class TaskManagerService {
  constructor(
    @InjectRepository(TaskEntity)
    private readonly taskRepository: Repository<TaskEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(ProjectGroupEntity)
    private readonly projectGroupRepository: Repository<ProjectGroupEntity>,
    private readonly projectService: ProjectManagerService,
    private readonly translationService: TranslationService,
    private readonly taskGateway: TaskGateway
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
      filePart,
      language,
    } as DeepPartial<TaskEntity>);

    await this.taskRepository.save(task);
    this.taskGateway.emitTaskUpdate(task);
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
        filePart: true,
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
        filePart: true,
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

    // Update fields if provided
    if (dto.title !== undefined) task.title = dto.title;
    if (dto.description !== undefined) task.description = dto.description;
    if (dto.status !== undefined) {
      // Nếu chuyển sang in_progress và chưa có startedAt thì set startedAt
      if (dto.status === 'in_progress' && !task.startedAt) {
        task.startedAt = new Date();
      }
      // Nếu chuyển sang completed thì set completedAt
      if (dto.status === 'completed' && !task.completedAt) {
        task.completedAt = new Date();
      }
      task.status = dto.status;
    }
    if (dto.dueDate !== undefined) task.dueDate = new Date(dto.dueDate);

    if (dto.assignedToId !== undefined) {
      task.assignedTo = dto.assignedToId
        ? await this.userRepository.findOne({ where: { id: BigInt(dto.assignedToId) } })
        : null;
    }

    if (dto.groupId !== undefined) {
      task.group = dto.groupId
        ? await this.projectGroupRepository.findOne({ where: { id: BigInt(dto.groupId) } })
        : null;
    }

    await this.taskRepository.save(task);
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
    if (task.status !== 'closed') {
      throw new BadRequestException('Task is not closed');
    }

    // Update task status back to pending (To do)
    task.status = 'pending';

    // Clear completedAt timestamp since task is reopened
    task.completedAt = null;

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
  }) {
    const strings = await this.translationService.getAllString(
      params.projectId,
      params.branchId,
      'en',
      params.fileId,
      params.filePart
    );
    if (strings.length === 0)
      throw new NotFoundException('No strings in that part');

    const example = strings
      .slice(0, 3)
      .map((s: any) => `- ${s.originalText}`)
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
      !task.fileId
    ) {
      return null;
    }

    const strings = await this.translationService.getAllString(
      task.projectId,
      task.branchId,
      task.fileId,
      task.filePart ?? undefined
    );
    const total = strings.length;
    const translated = strings.filter(
      (s: any) => s.translatedText && s.translatedText.trim() !== ''
    ).length;
    const percent = total === 0 ? 0 : Math.round((translated / total) * 100);

    return { total, translated, percent };
  }

  async getTaskHistory(taskId: string) {
    // For now, return only the creation history since we don't have a real history table yet
    // In a real implementation, you would:
    // 1. Create a TaskHistory entity/table
    // 2. Log all task changes to that table
    // 3. Query the history from the database

    try {
      // Get the actual task to show creation history
      const task = await this.taskRepository.findOne({
        where: { id: BigInt(taskId) },
        relations: ['createdBy']
      });

      if (!task) {
        return [];
      }

      const history = [];

      // Always show creation history
      history.push({
        id: '1',
        taskId: taskId,
        action: 'created' as const,
        description: 'Task was created',
        performedAt: task.createdAt.toISOString(),
        metadata: {}
      });

      // Show status changes based on current task state
      if (task.startedAt && task.status !== 'pending') {
        history.push({
          id: '2',
          taskId: taskId,
          action: 'status_change' as const,
          description: 'Task status was changed from To do to In progress',
          performedAt: task.startedAt.toISOString(),
          metadata: {
            fromStatus: 'pending',
            toStatus: 'in_progress'
          }
        });
      }

      if (task.completedAt && task.status === 'completed') {
        history.push({
          id: '3',
          taskId: taskId,
          action: 'status_change' as const,
          description: 'Task status was changed from In progress to Done',
          performedAt: task.completedAt.toISOString(),
          metadata: {
            fromStatus: 'in_progress',
            toStatus: 'completed'
          }
        });
      }

      if (task.status === 'closed') {
        history.push({
          id: '4',
          taskId: taskId,
          action: 'closed' as const,
          description: 'Task was closed',
          performedAt: task.completedAt?.toISOString() || new Date().toISOString(),
          metadata: {}
        });
      }

      return history;
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
}
