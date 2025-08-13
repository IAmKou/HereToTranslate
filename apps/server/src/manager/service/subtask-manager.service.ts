import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import {
  SubtaskEntity,
  TaskEntity,
  UserEntity,
  TaskStatusEntity,
  SubtaskStatusHistoryEntity,
} from '#LocalProject/Entities';
import { ProjectManagerService } from '#LocalProject/Managers/service/project-manager.service';
import { PermissionFlags } from '@here-to-translate/common';
import { TaskGateway } from '#LocalProject/Utils/gateway/task.gateway';
import { StatusType } from '#LocalProject/Entities';
import { StatusManagerService } from './task-status-manager.service';

@Injectable()
export class SubtaskManagerService {
  constructor(
    @InjectRepository(SubtaskEntity)
    private readonly subtaskRepository: Repository<SubtaskEntity>,
    @InjectRepository(TaskEntity)
    private readonly taskRepository: Repository<TaskEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(TaskStatusEntity)
    private readonly statusRepository: Repository<TaskStatusEntity>,
    @InjectRepository(SubtaskStatusHistoryEntity)
    private readonly statusHistoryRepository: Repository<SubtaskStatusHistoryEntity>,
    private readonly projectService: ProjectManagerService,
    private readonly taskGateway: TaskGateway,
    private readonly statusManagerService: StatusManagerService,
  ) {}

  async createSubtask(params: {
    title: string;
    description?: string;
    createdById: string;
    parentTaskId: string;
    assignedToId?: string;
    reviewerId?: string;
    approverId?: string;
    dueDate?: Date;
    estimatedBusinessHours?: number;
    priority?: string;
    kind?: 'discreet' | 'range';
    workCount?: number;
  }) {
    const {
      title,
      description,
      createdById,
      parentTaskId,
      assignedToId,
      reviewerId,
      approverId,
      dueDate,
      estimatedBusinessHours,
      priority = 'medium',
      kind = 'discreet',
      workCount = 0,
    } = params;

    if (!createdById) {
      throw new BadRequestException('createdById is required');
    }
    if (!parentTaskId) {
      throw new BadRequestException('parentTaskId is required');
    }

    const parentTask = await this.taskRepository.findOneOrFail({
      where: { id: BigInt(parentTaskId) },
      relations: ['project'],
    });

    // Check permissions on parent task's project
    if (parentTask.projectId) {
      await this.projectService.testPermissions(
        BigInt(parentTask.projectId),
        BigInt(createdById),
        PermissionFlags.ViewProject
      );
    }

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

    const approver = approverId
      ? await this.userRepository.findOne({
          where: { id: BigInt(approverId) },
        })
      : undefined;

    // Get default status for the project
    let status: TaskStatusEntity;
    if (parentTask.projectId) {
      const defaultStatus = await this.statusRepository.findOne({
        where: {
          project: { id: BigInt(parentTask.projectId) },
          isDefault: true,
          isActive: true,
        },
      });

      if (!defaultStatus) {
        // Fallback to first TODO status
        const fallbackStatus = await this.statusRepository.findOne({
          where: {
            project: { id: BigInt(parentTask.projectId) },
            type: StatusType.TODO,
            isActive: true,
          },
          order: { position: 'ASC' },
        });

        if (!fallbackStatus) {
          // Create default statuses for the project
          await this.statusManagerService.createDefaultStatuses(parentTask.projectId);

          // Get the newly created default status
          status = await this.statusRepository.findOneOrFail({
            where: {
              project: { id: BigInt(parentTask.projectId) },
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
    } else {
      throw new BadRequestException('Parent task must belong to a project');
    }

    const subtask = this.subtaskRepository.create({
      title,
      description,
      parentTask,
      createdBy,
      assignedTo,
      reviewer,
      approver,
      dueDate,
      estimatedBusinessHours,
      priority,
      kind,
      workCount,
      status,
    } as DeepPartial<SubtaskEntity>);

    await this.subtaskRepository.save(subtask);

    await this.createStatusHistory(subtask.id, undefined, status, createdBy);

    this.taskGateway.emitTaskUpdate(parentTask);
    return subtask;
  }

  private async createStatusHistory(
    subtaskId: bigint,
    fromStatus: TaskStatusEntity | undefined,
    toStatus: TaskStatusEntity,
    changedBy: UserEntity,
    comment?: string
  ) {
    const subtask = await this.subtaskRepository.findOneOrFail({
      where: { id: subtaskId },
    });

    const history = this.statusHistoryRepository.create({
      subtask,
      fromStatus,
      toStatus,
      changedBy,
      comment,
    });

    await this.statusHistoryRepository.save(history);
  }

  async updateSubtask(id: string, dto: any, userId: string) {
    const subtask = await this.subtaskRepository.findOne({
      where: { id: BigInt(id) },
      relations: ['parentTask', 'status', 'createdBy', 'assignedTo', 'reviewer', 'approver'],
    });

    if (!subtask) {
      throw new NotFoundException('Subtask not found');
    }

    // Update basic fields
    if (dto.title !== undefined) subtask.title = dto.title;
    if (dto.description !== undefined) subtask.description = dto.description;
    if (dto.dueDate !== undefined) subtask.dueDate = new Date(dto.dueDate);
    if (dto.priority !== undefined) subtask.priority = dto.priority;
    if (dto.workCount !== undefined) subtask.workCount = dto.workCount;
    if (dto.estimatedBusinessHours !== undefined) subtask.estimatedBusinessHours = dto.estimatedBusinessHours;

    if (dto.assignedToId !== undefined) {
      subtask.assignedTo = dto.assignedToId
        ? (await this.userRepository.findOne({
            where: { id: BigInt(dto.assignedToId) },
          })) || undefined
        : undefined;
    }

    if (dto.reviewerId !== undefined) {
      subtask.reviewer = dto.reviewerId
        ? (await this.userRepository.findOne({
            where: { id: BigInt(dto.reviewerId) },
          })) || undefined
        : undefined;
    }

    if (dto.approverId !== undefined) {
      subtask.approver = dto.approverId
        ? (await this.userRepository.findOne({
            where: { id: BigInt(dto.approverId) },
          })) || undefined
        : undefined;
    }

    // Handle status transition
    if (dto.statusId !== undefined) {
      const user = await this.userRepository.findOneOrFail({
        where: { id: BigInt(userId) },
      });

      const toStatus = await this.statusRepository.findOneOrFail({
        where: { id: BigInt(dto.statusId) },
      });

      const fromStatus = subtask.status;

      // Update task status
      subtask.status = toStatus;

      // Update timestamps based on status type
      if (toStatus.type === StatusType.OPEN) {
        subtask.startedAt = undefined;
        subtask.dueDate = undefined;
      } else if (toStatus.type === StatusType.IN_PROGRESS && !subtask.startedAt) {
        subtask.startedAt = new Date();
      } else if (toStatus.type === StatusType.DONE && !subtask.completedAt) {
        subtask.completedAt = new Date();
      } else if (toStatus.type === StatusType.TODO && subtask.completedAt) {
        subtask.completedAt = undefined;
      }

      await this.subtaskRepository.save(subtask);

      // Create status history
      await this.createStatusHistory(
        subtask.id,
        fromStatus,
        toStatus,
        user,
        dto.comment
      );
    }

    await this.subtaskRepository.save(subtask);
    this.taskGateway.emitTaskUpdate(subtask.parentTask);

    return this.getSubtask(id);
  }

  async getSubtask(id: string) {
    const subtask = await this.subtaskRepository.findOne({
      where: { id: BigInt(id) },
      relations: ['parentTask', 'createdBy', 'assignedTo', 'reviewer', 'approver', 'status'],
    });

    if (!subtask) {
      throw new NotFoundException('Subtask not found');
    }
    return subtask;
  }

  async getSubtasksByTask(taskId: string) {
    const subtasks = await this.subtaskRepository.find({
      where: { parentTask: { id: BigInt(taskId) } },
      relations: ['createdBy', 'assignedTo', 'reviewer', 'approver', 'status'],
      order: { createdAt: 'ASC' },
    });

    return subtasks;
  }

  async deleteSubtask(id: string) {
    const subtask = await this.getSubtask(id);
    await this.subtaskRepository.remove(subtask);
    this.taskGateway.emitTaskUpdate(subtask.parentTask);
    return { success: true };
  }

  async checkAndUpdateOverdueStatus() {
    const now = new Date();
    
    // Check tasks
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

    const overdueSubtasks = await this.subtaskRepository
      .createQueryBuilder('subtask')
      .leftJoinAndSelect('subtask.status', 'status')
      .leftJoinAndSelect('subtask.parentTask', 'parentTask')
      .where('subtask.dueDate < :now', { now })
      .andWhere('subtask.isOverdue = :isOverdue', { isOverdue: false })
      .andWhere('status.type != :doneType', { doneType: StatusType.DONE })
      .getMany();

    for (const subtask of overdueSubtasks) {
      // Mark subtask as overdue without changing its status
      subtask.isOverdue = true;
      await this.subtaskRepository.save(subtask);
    }

    return {
      tasksUpdated: overdueTasks.length,
      subtasksUpdated: overdueSubtasks.length,
    };
  }
}
