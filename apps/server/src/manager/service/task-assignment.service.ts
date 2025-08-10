import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AssignmentHistoryEntity,
  AssignmentRole,
  AssignmentStatus,
  HistoryAction,
  // ProjectRoleEntity,
  TaskAssignmentEntity,
  TaskEntity,
  UserEntity,
} from '#LocalProject/Entities';
import { ProjectManagerService } from './project-manager.service';
import { PermissionFlags } from '@here-to-translate/common';
import { AssignTaskDto, ReassignTaskDto } from '#LocalProject/Dtos';
import { NotificationManagerService } from './notification-manager.service';
import { MailService } from '../../mailer/mailer.service';

@Injectable()
export class TaskAssignmentService {
  constructor(
    @InjectRepository(TaskAssignmentEntity)
    private readonly assignmentRepository: Repository<TaskAssignmentEntity>,
    @InjectRepository(AssignmentHistoryEntity)
    private readonly historyRepository: Repository<AssignmentHistoryEntity>,
    @InjectRepository(TaskEntity)
    private readonly taskRepository: Repository<TaskEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    // @InjectRepository(ProjectRoleEntity)
    // private readonly projectRoleRepository: Repository<ProjectRoleEntity>,
    private readonly projectService: ProjectManagerService,
    private readonly notificationService: NotificationManagerService,
    private readonly mailService: MailService
  ) {}

  async assignTask(dto: AssignTaskDto, assignedById: string) {
    const { taskId, assignedToId, role, notes, dueDate, pagesAssigned } = dto;

    // Validate task exists
    const task = await this.taskRepository.findOneOrFail({
      where: { id: BigInt(taskId) },
      relations: ['assignments'],
    });

    // Validate users exist
    const assignedBy = await this.userRepository.findOneOrFail({
      where: { id: BigInt(assignedById) },
    });

    const assignedTo = await this.userRepository.findOneOrFail({
      where: { id: BigInt(assignedToId) },
    });

    // Check permissions
    await this.validateAssignmentPermissions(task, assignedBy);

    // Check if assignment already exists for this role
    const existingAssignment = task.assignments?.find(
      (a) => a.role === role && a.status === AssignmentStatus.ASSIGNED
    );

    if (existingAssignment) {
      throw new BadRequestException(
        `Task already has an active ${role} assignment`
      );
    }

    // Create assignment
    const assignment = this.assignmentRepository.create({
      task,
      assignedTo,
      role,
      status: AssignmentStatus.ASSIGNED,
      notes,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      workData: pagesAssigned
        ? {
            pagesAssigned,
            estimatedHours: this.estimateWorkHours(role, pagesAssigned.length),
          }
        : undefined,
      assignedBy,
    });

    const savedAssignment = await this.assignmentRepository.save(assignment);

    // Create history record
    await this.createHistoryRecord({
      task,
      assignment: savedAssignment,
      role,
      action: HistoryAction.ASSIGNED,
      toUser: assignedTo,
      actionBy: assignedBy,
      notes,
    });

    // Send notification to assigned user
    try {
      await this.notificationService.createNotification({
        userId: assignedTo.id,
        type: 'task_assigned',
        message: `You have been assigned to ${role} role for task: ${task.title}`,
        createdBy: assignedBy.id,
      });

      // Send email notification
      if (assignedTo.email) {
        await this.mailService.sendTaskAssignmentNotification(
          assignedTo.email,
          {
            taskTitle: task.title,
            role: role,
            assignedBy: assignedBy.fullName || assignedBy.username,
            dueDate: dueDate ? new Date(dueDate) : undefined,
            notes: notes,
          }
        );
      }
    } catch (error) {
      console.error('Failed to send notification for task assignment:', error);
      // Don't fail the assignment if notification fails
    }

    return savedAssignment;
  }

  async reassignTask(dto: ReassignTaskDto, reassignedById: string) {
    const { assignmentId, newAssigneeId, reason, notes } = dto;

    return await this.assignmentRepository.manager.transaction(
      async (manager) => {
        const assignment = await manager.findOneOrFail(TaskAssignmentEntity, {
          where: { id: BigInt(assignmentId) },
          relations: ['task', 'assignedTo', 'assignedBy'],
        });

        const [reassignedBy, newAssignee] = await Promise.all([
          manager.findOneOrFail(UserEntity, {
            where: { id: BigInt(reassignedById) },
          }),
          manager.findOneOrFail(UserEntity, {
            where: { id: BigInt(newAssigneeId) },
          }),
        ]);

        await this.validateReassignmentPermissions(assignment, reassignedBy);

        const previousAssignee = assignment.assignedTo;

        // Mark old assignment as reassigned
        Object.assign(assignment, {
          assignedTo: newAssignee,
          status: AssignmentStatus.REASSIGNED,
          reassignedBy,
          reassignedAt: new Date(),
          reassignmentReason: reason,
        });
        await manager.save(assignment);

        // Create the new assignment
        const newAssignment = manager.create(TaskAssignmentEntity, {
          task: assignment.task,
          assignedTo: newAssignee,
          role: assignment.role,
          status: AssignmentStatus.ASSIGNED,
          notes: notes || assignment.notes,
          dueDate: assignment.dueDate instanceof Date ? assignment.dueDate : undefined,
          workData: assignment.workData,
          assignedBy: reassignedBy,
        });
        const savedNewAssignment = await manager.save(newAssignment);

        await this.createHistoryRecord({
          task: assignment.task,
          assignment: savedNewAssignment,
          role: assignment.role,
          action: HistoryAction.REASSIGNED,
          fromUser: previousAssignee,
          toUser: newAssignee,
          actionBy: reassignedBy,
          reason,
          notes,
        });

        // Send notification to new assignee
        try {
          await this.notificationService.createNotification({
            userId: newAssignee.id,
            type: 'task_reassigned',
            message: `Task "${assignment.task.title}" has been reassigned to you as ${assignment.role}`,
            createdBy: reassignedBy.id,
          });

          // Send email notification
          if (newAssignee.email) {
            await this.mailService.sendTaskAssignmentNotification(
              newAssignee.email,
              {
                taskTitle: assignment.task.title,
                role: assignment.role,
                assignedBy: reassignedBy.fullName || reassignedBy.username,
                dueDate: assignment.dueDate,
                notes: notes || assignment.notes,
                reason: reason,
              }
            );
          }
        } catch (error) {
          console.error('Failed to send notification for task reassignment:', error);
          // Don't fail the reassignment if notification fails
        }

        return savedNewAssignment;
      }
    );
  }

  async reassignTaskByTask(dto: { taskId: string; role: string; newAssigneeId: string; reason?: string; notes?: string }, reassignedById: string) {
    const { taskId, role, newAssigneeId, reason, notes } = dto;

    return await this.assignmentRepository.manager.transaction(
      async (manager) => {
        // Find the current assignment for this task and role
        const assignment = await manager.findOneOrFail(TaskAssignmentEntity, {
          where: { 
            task: { id: BigInt(taskId) },
            role: role as AssignmentRole,
            status: AssignmentStatus.ASSIGNED
          },
          relations: ['task', 'assignedTo', 'assignedBy'],
        });

        const [reassignedBy, newAssignee] = await Promise.all([
          manager.findOneOrFail(UserEntity, {
            where: { id: BigInt(reassignedById) },
          }),
          manager.findOneOrFail(UserEntity, {
            where: { id: BigInt(newAssigneeId) },
          }),
        ]);

        await this.validateReassignmentPermissions(assignment, reassignedBy);

        const previousAssignee = assignment.assignedTo;

        // Mark old assignment as reassigned
        Object.assign(assignment, {
          assignedTo: newAssignee,
          status: AssignmentStatus.REASSIGNED,
          reassignedBy,
          reassignedAt: new Date(),
          reassignmentReason: reason,
        });
        await manager.save(assignment);

        // Create the new assignment
        const newAssignment = manager.create(TaskAssignmentEntity, {
          task: assignment.task,
          assignedTo: newAssignee,
          role: assignment.role,
          status: AssignmentStatus.ASSIGNED,
          notes: notes || assignment.notes,
          dueDate: assignment.dueDate instanceof Date ? assignment.dueDate : undefined,
          workData: assignment.workData,
          assignedBy: reassignedBy,
        });
        const savedNewAssignment = await manager.save(newAssignment);

        await this.createHistoryRecord({
          task: assignment.task,
          assignment: savedNewAssignment,
          role: assignment.role,
          action: HistoryAction.REASSIGNED,
          fromUser: previousAssignee,
          toUser: newAssignee,
          actionBy: reassignedBy,
          reason,
          notes,
        });

        // Send notification to new assignee
        try {
          await this.notificationService.createNotification({
            userId: newAssignee.id,
            type: 'task_reassigned',
            message: `Task "${assignment.task.title}" has been reassigned to you as ${assignment.role}`,
            createdBy: reassignedBy.id,
          });

          // Send email notification
          if (newAssignee.email) {
            await this.mailService.sendTaskAssignmentNotification(
              newAssignee.email,
              {
                taskTitle: assignment.task.title,
                role: assignment.role,
                assignedBy: reassignedBy.fullName || reassignedBy.username,
                dueDate: assignment.dueDate,
                notes: notes || assignment.notes,
                reason: reason,
              }
            );
          }
        } catch (error) {
          console.error('Failed to send notification for task reassignment:', error);
          // Don't fail the reassignment if notification fails
        }

        return savedNewAssignment;
      }
    );
  }

  async getTaskAssignments(taskId: string) {
    return await this.assignmentRepository.find({
      where: { task: { id: BigInt(taskId) } },
      relations: ['assignedTo', 'assignedBy', 'reassignedBy'],
      order: { createdAt: 'DESC' },
    });
  }

  async getAssignmentHistory(taskId: string) {
    return await this.historyRepository.find({
      where: { task: { id: BigInt(taskId) } },
      relations: ['fromUser', 'toUser', 'actionBy'],
      order: { createdAt: 'DESC' },
    });
  }

  private async validateAssignmentPermissions(
    task: TaskEntity,
    assignedBy: UserEntity,
  ) {
    if (!task.projectId) {
      throw new BadRequestException('Task must be associated with a project');
    }

    // Check if user has permission to assign tasks
    const hasPermission = await this.projectService.testPermissions(
      BigInt(task.projectId),
      assignedBy.id,
      PermissionFlags.ManageTask
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        'You do not have permission to assign tasks'
      );
    }


  }

  private async validateReassignmentPermissions(
    assignment: TaskAssignmentEntity,
    reassignedBy: UserEntity
  ) {
    const isOriginalAssigner = assignment.assignedBy.id === reassignedBy.id;
    const isAssignee = assignment.assignedTo.id === reassignedBy.id;

    if (!isOriginalAssigner && !isAssignee) {
      const hasManagePermission = await this.projectService.testPermissions(
        BigInt(assignment.task.projectId!),
        reassignedBy.id,
        PermissionFlags.ManageTask
      );

      if (!hasManagePermission) {
        throw new ForbiddenException(
          'You do not have permission to reassign this task'
        );
      }
    }
  }

  private estimateWorkHours(role: AssignmentRole, pageCount: number): number {
    const baseHoursPerPage = {
      [AssignmentRole.TRANSLATOR]: 2,
      [AssignmentRole.REVIEWER]: 1,
      [AssignmentRole.APPROVER]: 0.5,
    };

    return pageCount * baseHoursPerPage[role];
  }

  private async createHistoryRecord(params: {
    task: TaskEntity;
    assignment?: TaskAssignmentEntity;
    role: AssignmentRole;
    action: HistoryAction;
    fromUser?: UserEntity;
    toUser?: UserEntity;
    actionBy: UserEntity;
    reason?: string;
    notes?: string;
  }) {
    const history = this.historyRepository.create({
      task: params.task,
      assignment: params.assignment,
      role: params.role,
      action: params.action,
      fromUser: params.fromUser,
      toUser: params.toUser,
      actionBy: params.actionBy,
      reason: params.reason,
      notes: params.notes,
      metadata: {
        previousStatus: params.fromUser ? 'assigned' : undefined,
        newStatus: 'assigned',
      },
    });

    return await this.historyRepository.save(history);
  }
}
