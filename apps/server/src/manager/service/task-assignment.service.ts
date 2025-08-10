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
    private readonly projectService: ProjectManagerService
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
          dueDate: assignment.dueDate,
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

        return savedNewAssignment;
      }
    );
  }

  async acceptAssignment(assignmentId: string, userId: string) {
    const assignment = await this.assignmentRepository.findOneOrFail({
      where: { id: BigInt(assignmentId) },
      relations: ['task', 'assignedTo'],
    });

    if (assignment.assignedTo.id !== BigInt(userId)) {
      throw new ForbiddenException('You can only accept your own assignments');
    }

    if (assignment.status !== AssignmentStatus.ASSIGNED) {
      throw new BadRequestException('Assignment is not in assignable state');
    }

    assignment.status = AssignmentStatus.ACCEPTED;
    assignment.acceptedAt = new Date();

    const updatedAssignment = await this.assignmentRepository.save(assignment);

    // Create history record
    await this.createHistoryRecord({
      task: assignment.task,
      assignment: updatedAssignment,
      role: assignment.role,
      action: HistoryAction.ACCEPTED,
      toUser: assignment.assignedTo,
      actionBy: assignment.assignedTo,
    });

    return updatedAssignment;
  }

  async declineAssignment(
    assignmentId: string,
    userId: string,
    reason?: string
  ) {
    const assignment = await this.assignmentRepository.findOneOrFail({
      where: { id: BigInt(assignmentId) },
      relations: ['task', 'assignedTo'],
    });

    // Verify user is the assignee
    if (assignment.assignedTo.id !== BigInt(userId)) {
      throw new ForbiddenException('You can only decline your own assignments');
    }

    if (assignment.status !== AssignmentStatus.ASSIGNED) {
      throw new BadRequestException('Assignment is not in assignable state');
    }

    assignment.status = AssignmentStatus.DECLINED;

    const updatedAssignment = await this.assignmentRepository.save(assignment);

    // Create history record
    await this.createHistoryRecord({
      task: assignment.task,
      assignment: updatedAssignment,
      role: assignment.role,
      action: HistoryAction.DECLINED,
      toUser: assignment.assignedTo,
      actionBy: assignment.assignedTo,
      reason,
    });

    return updatedAssignment;
  }

  async completeAssignment(assignmentId: string, userId: string) {
    const assignment = await this.assignmentRepository.findOneOrFail({
      where: { id: BigInt(assignmentId) },
      relations: ['task', 'assignedTo'],
    });

    // Verify user is the assignee
    if (assignment.assignedTo.id !== BigInt(userId)) {
      throw new ForbiddenException(
        'You can only complete your own assignments'
      );
    }

    if (assignment.status !== AssignmentStatus.ACCEPTED) {
      throw new BadRequestException(
        'Assignment must be accepted before completion'
      );
    }

    assignment.status = AssignmentStatus.COMPLETED;
    assignment.completedAt = new Date();

    const updatedAssignment = await this.assignmentRepository.save(assignment);

    // Create history record
    await this.createHistoryRecord({
      task: assignment.task,
      assignment: updatedAssignment,
      role: assignment.role,
      action: HistoryAction.COMPLETED,
      toUser: assignment.assignedTo,
      actionBy: assignment.assignedTo,
    });

    return updatedAssignment;
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
