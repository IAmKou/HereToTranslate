import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { 
  TaskEntity, 
  AssignmentHistoryEntity,
  AssignmentRole,
  HistoryAction,
  UserEntity,
  ProjectEntity,
  TaskStatusEntity,
  StatusType,
} from '#LocalProject/Entities';
import { AssignTaskDto, ReassignTaskDto } from '#LocalProject/Dtos';
import { NotificationManagerService } from './notification-manager.service';
import { MailService } from '../../mailer/mailer.service';
import { ProjectManagerService } from './project-manager.service';
import { PermissionFlags } from '@here-to-translate/common';
import { addBusinessHours } from '../../utils/business-time.js';

@Injectable()
export class TaskAssignmentManagerService {
  constructor(
    @InjectRepository(TaskEntity)
    private readonly taskRepository: Repository<TaskEntity>,
    @InjectRepository(AssignmentHistoryEntity)
    private readonly assignmentHistoryRepository: Repository<AssignmentHistoryEntity>,
    @InjectRepository(ProjectEntity)
    private readonly projectRepository: Repository<ProjectEntity>,
    private readonly dataSource: DataSource,
    private readonly notificationService: NotificationManagerService,
    private readonly mailService: MailService,
    private readonly projectManagerService: ProjectManagerService,
  ) {}

  async assignTask(projectId: string, dto: AssignTaskDto, assignedByUserId: string) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const task = await queryRunner.manager.findOne(TaskEntity, {
        where: { id: BigInt(dto.taskId) },
        relations: ['assignedTo', 'reviewer', 'approver'],
      });

      if (!task) {
        throw new NotFoundException('Task not found');
      }

      await this.validateAssignmentPermissions(projectId, assignedByUserId);

      const changes: Array<{
        role: AssignmentRole;
        fromUser?: UserEntity;
        toUser?: UserEntity;
        reason: string;
      }> = [];

      // Handle single assignment based on role
      const newUser = await queryRunner.manager.findOne(UserEntity, {
        where: { id: BigInt(dto.assignedToId) },
      });
      if (!newUser) {
        throw new NotFoundException(`User not found for role ${dto.role}`);
      }

      let currentUser: UserEntity | undefined;
      switch (dto.role) {
        case AssignmentRole.TRANSLATOR:
          currentUser = task.assignedTo;
          if (dto.assignedToId !== task.assignedTo?.id?.toString()) {
            task.assignedTo = newUser;
          }
          break;
        case AssignmentRole.REVIEWER:
          currentUser = task.reviewer;
          if (dto.assignedToId !== task.reviewer?.id?.toString()) {
            task.reviewer = newUser;
          }
          break;
        case AssignmentRole.APPROVER:
          currentUser = task.approver;
          if (dto.assignedToId !== task.approver?.id?.toString()) {
            task.approver = newUser;
          }
          break;
      }

      if (dto.assignedToId !== currentUser?.id?.toString()) {
        changes.push({
          role: dto.role,
          fromUser: currentUser,
          toUser: newUser,
          reason: 'Task assignment',
        });
      }

      // Update due date if provided
      if (dto.dueDate) {
        task.dueDate = new Date(dto.dueDate);
      }

      // If the assignee is the same as the assigning user, set startedAt and compute dueDate if estimatedBusinessHours present
      const isSelfAssignment = dto.assignedToId === assignedByUserId;
      if (isSelfAssignment) {
        if (!task.startedAt) task.startedAt = new Date();
        if (!task.dueDate && task.estimatedBusinessHours && Number(task.estimatedBusinessHours) > 0) {
          task.dueDate = addBusinessHours(task.startedAt, Number(task.estimatedBusinessHours));
        }
        // Move status to IN_PROGRESS if available
        const inProgress = await queryRunner.manager.findOne(TaskStatusEntity, {
          where: { project: { id: BigInt(task.projectId || '0') }, type: StatusType.IN_PROGRESS, isActive: true },
        });
        if (inProgress) {
          task.status = inProgress;
        }
      }

      // Save task
      await queryRunner.manager.save(task);

      // Create assignment history records
      for (const change of changes) {
        const history = this.assignmentHistoryRepository.create({
          task,
          action: change.fromUser ? HistoryAction.REASSIGNED : HistoryAction.ASSIGNED,
          role: change.role,
          fromUser: change.fromUser,
          toUser: change.toUser,
          actionBy: { id: BigInt(assignedByUserId) } as UserEntity,
          reason: change.reason,
          notes: dto.notes,
        });

        await queryRunner.manager.save(history);
      }

      // Send notifications and emails
      await this.sendAssignmentNotifications(changes, task, 'Task assignment', dto.notes);

      await queryRunner.commitTransaction();

      return {
        message: 'Task assigned successfully',
        task: await this.getTaskWithAssignments(dto.taskId),
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async reassignTask(projectId: string, dto: ReassignTaskDto, reassignedByUserId: string) {
    await this.validateReassignmentPermissions(projectId, reassignedByUserId);
    
    // Convert ReassignTaskDto to AssignTaskDto format
    const assignDto: AssignTaskDto = {
      taskId: dto.assignmentId, // This needs to be the task ID, not assignment ID
      assignedToId: dto.newAssigneeId,
      role: AssignmentRole.TRANSLATOR, // Default role, should be determined from assignment
      notes: dto.notes,
    };
    
    return this.assignTask(projectId, assignDto, reassignedByUserId);
  }

  async getTaskAssignments(taskId: string) {
    const task = await this.taskRepository.findOne({
      where: { id: BigInt(taskId) },
      relations: ['assignedTo', 'reviewer', 'approver', 'assignments'],
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    return {
      task,
      assignments: task.assignments,
      currentAssignments: {
        translator: task.assignedTo,
        reviewer: task.reviewer,
        approver: task.approver,
      },
    };
  }

  async getAssignmentHistory(taskId: string) {
    return await this.assignmentHistoryRepository.find({
      where: { task: { id: BigInt(taskId) } },
      relations: ['fromUser', 'toUser', 'actionBy'],
      order: { createdAt: 'DESC' },
    });
  }

  async getProjectParticipants(projectId: string) {
    const project = await this.projectRepository.findOne({
      where: { id: BigInt(projectId) },
      relations: ['members', 'createdBy'],
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const participants = new Set<UserEntity>();

    // Add project creator
    if (project.createdBy) {
      participants.add(project.createdBy);
    }

    // Add project members
    project.members.forEach(member => participants.add(member));

    return Array.from(participants);
  }

  private async sendAssignmentNotifications(
    changes: Array<{
      role: AssignmentRole;
      fromUser?: UserEntity;
      toUser?: UserEntity;
      reason: string;
    }>,
    task: TaskEntity,
    reason: string,
    notes?: string,
  ) {
    // Resolve project name if available
    let projectName = 'Unknown Project';
    if (task.projectId) {
      const project = await this.projectRepository.findOne({
        where: { id: BigInt(task.projectId) },
        select: ['name'],
      });
      if (project?.name) projectName = project.name;
    }

    for (const change of changes) {
      if (change.toUser) {
        await this.notificationService.createNotification({
          userId: change.toUser.id,
          type: 'TASK_ASSIGNED',
          message: `Assigned as ${change.role} to task "${task.title}". Reason: ${reason}${notes ? ` | Notes: ${notes}` : ''}`,
          createdBy: task.createdBy.id,
        });

        try {
          await this.mailService.sendTaskAssignmentNotification(
            change.toUser.email,
            {
              taskTitle: task.title,
              role: change.role,
              reason,
              notes,
              projectName,
            }
          );
        } catch (error) {
          console.error('Failed to send email notification:', error);
        }
      }

      if (change.fromUser) {
        await this.notificationService.createNotification({
          userId: change.fromUser.id,
          type: 'TASK_REASSIGNED',
          message: `You have been unassigned as ${change.role} from task "${task.title}". Reason: ${reason}`,
          createdBy: task.createdBy.id,
        });
      }
    }
  }

  private async getTaskWithAssignments(taskId: string) {
    return await this.taskRepository.findOne({
      where: { id: BigInt(taskId) },
      relations: ['assignedTo', 'reviewer', 'approver', 'assignments', 'status'],
    });
  }

  private async validateAssignmentPermissions(projectId: string, byUserId: string) {
    await this.projectManagerService.testPermissions(
      BigInt(projectId),
      BigInt(byUserId),
      PermissionFlags.ManageTasks
    );
  }

  private async validateReassignmentPermissions(projectId: string, byUserId: string) {
    await this.projectManagerService.testPermissions(
      BigInt(projectId),
      BigInt(byUserId),
      PermissionFlags.ManageTasks
    );
  }
}
