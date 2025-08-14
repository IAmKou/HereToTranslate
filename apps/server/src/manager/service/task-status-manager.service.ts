import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { TaskStatusEntity, StatusType, ProjectEntity, TaskEntity } from '#LocalProject/Entities';
import { CreateStatusDto, UpdateStatusDto } from '#LocalProject/Dtos';

@Injectable()
export class StatusManagerService {
  constructor(
    @InjectRepository(TaskStatusEntity)
    private readonly statusRepository: Repository<TaskStatusEntity>,
    @InjectRepository(ProjectEntity)
    private readonly projectRepository: Repository<ProjectEntity>,
    @InjectRepository(TaskEntity)
    private readonly taskRepository: Repository<TaskEntity>,
  ) {}

  async createStatus(projectId: string, dto: CreateStatusDto) {
    const project = await this.projectRepository.findOneOrFail({
      where: { id: BigInt(projectId) },
    });

    // Validate: Cannot be both start and end status
    if (dto.isStartStatus && dto.isEndStatus) {
      throw new BadRequestException('A status cannot be both start and end status');
    }

    // Validate: Only one start status per project
    if (dto.isStartStatus) {
      const existingStart = await this.statusRepository.findOne({
        where: { project: { id: BigInt(projectId) }, isStartStatus: true },
      });
      if (existingStart) {
        throw new BadRequestException('There is already a start status for this project');
      }
    }

    // Validate: Closed/Resolved implies End
    if (dto.isClosed && !dto.isEndStatus) {
      throw new BadRequestException('A closed status must also be an end status');
    }
    if (dto.isResolved && !dto.isEndStatus) {
      throw new BadRequestException('A resolved status must also be an end status');
    }

    // If this is set as default, unset other defaults
    if (dto.isDefault) {
      await this.statusRepository.update(
        { project: { id: BigInt(projectId) } },
        { isDefault: false }
      );
    }

    // Set position if not provided
    if (dto.position === undefined) {
      const maxPosition = await this.statusRepository
        .createQueryBuilder('status')
        .select('MAX(status.position)', 'max')
        .where('status.projectId = :projectId', { projectId })
        .getRawOne();
      dto.position = (maxPosition?.max || 0) + 1;
    }

    const status = this.statusRepository.create({
      ...dto,
      project,
    });

    return await this.statusRepository.save(status);
  }

  async updateStatus(id: string, dto: UpdateStatusDto) {
    const status = await this.statusRepository.findOneOrFail({
      where: { id: BigInt(id) },
      relations: ['project'],
    });

    // Effective flags after update
    const nextIsStart = dto.isStartStatus ?? status.isStartStatus;
    const nextIsEnd = dto.isEndStatus ?? status.isEndStatus;
    const nextIsClosed = dto.isClosed ?? status.isClosed;
    const nextIsResolved = dto.isResolved ?? status.isResolved;

    // Validate: Cannot be both start and end status
    if (nextIsStart && nextIsEnd) {
      throw new BadRequestException('A status cannot be both start and end status');
    }

    // Validate: Only one start status per project (exclude current)
    if (nextIsStart) {
      const existingStart = await this.statusRepository.findOne({
        where: {
          project: { id: status.project.id },
          isStartStatus: true,
          id: Not(BigInt(id)),
        },
      });
      if (existingStart) {
        throw new BadRequestException('There is already a start status for this project');
      }
    }

    // Validate: Closed/Resolved implies End
    if (nextIsClosed && !nextIsEnd) {
      throw new BadRequestException('A closed status must also be an end status');
    }
    if (nextIsResolved && !nextIsEnd) {
      throw new BadRequestException('A resolved status must also be an end status');
    }

    // If setting as default, unset other defaults in the same project
    if (dto.isDefault) {
      await this.statusRepository.update(
        { project: { id: status.project.id } },
        { isDefault: false }
      );
    }

    Object.assign(status, dto);
    return await this.statusRepository.save(status);
  }

  async deleteStatus(id: string) {
    const status = await this.statusRepository.findOne({
      where: { id: BigInt(id) },
      relations: ['project'],
    });

    if (!status) {
      throw new NotFoundException('Status not found');
    }

    // Check if status is being used by tasks
    const taskCount = await this.statusRepository
      .createQueryBuilder('status')
      .leftJoin('task', 'task', 'task.statusId = status.id')
      .where('status.id = :id', { id })
      .getCount();

    if (taskCount > 0) {
      throw new BadRequestException('Cannot delete status that is being used by tasks');
    }

    await this.statusRepository.remove(status);
    return { success: true };
  }

  async moveTasksAndDeleteStatus(statusId: string, newStatusId: string) {
    const status = await this.statusRepository.findOne({
      where: { id: BigInt(statusId) },
      relations: ['project'],
    });

    if (!status) {
      throw new NotFoundException('Status not found');
    }

    const newStatus = await this.statusRepository.findOne({
      where: { id: BigInt(newStatusId) },
    });

    if (!newStatus) {
      throw new NotFoundException('Target status not found');
    }

    // Find all tasks that are using the old status
    const tasksToMove = await this.taskRepository.find({
      where: { status: { id: BigInt(statusId) } },
      relations: ['status'],
    });

    // Move all tasks from the old status to the new status
    for (const task of tasksToMove) {
      task.status = newStatus;
      await this.taskRepository.save(task);
    }

    // Delete the old status
    await this.statusRepository.remove(status);
    return { success: true, movedTasks: true, movedTaskCount: tasksToMove.length };
  }

  async getProjectStatuses(projectId: string) {
    return await this.statusRepository.find({
      where: { project: { id: BigInt(projectId) }, isActive: true },
      order: { position: 'ASC' },
    });
  }

  async reorderStatuses(projectId: string, statusIds: string[]) {
    const statuses = await this.statusRepository.find({
      where: { project: { id: BigInt(projectId) } },
    });

    for (let i = 0; i < statusIds.length; i++) {
      const status = statuses.find((s: TaskStatusEntity) => s.id.toString() === statusIds[i]);
      if (status) {
        status.position = i;
        await this.statusRepository.save(status);
      }
    }

    return await this.getProjectStatuses(projectId);
  }

  async getOrCreateOpenStatus(projectId: string) {
    const existing = await this.statusRepository.findOne({
      where: { project: { id: BigInt(projectId) }, type: StatusType.OPEN },
    });
    if (existing) return existing;

    const project = await this.projectRepository.findOneOrFail({ where: { id: BigInt(projectId) } });
    const maxPosition = await this.statusRepository
      .createQueryBuilder('status')
      .select('MAX(status.position)', 'max')
      .where('status.projectId = :projectId', { projectId })
      .getRawOne();

    const status = this.statusRepository.create({
      name: 'Open',
      description: 'Task is created without assignee',
      color: '#6B778C',
      type: StatusType.OPEN,
      position: (maxPosition?.max || 0) + 1,
      isActive: true,
      isDefault: false,
      project,
    });

    return await this.statusRepository.save(status);
  }

  async createDefaultStatuses(projectId: string) {
    const project = await this.projectRepository.findOneOrFail({
      where: { id: BigInt(projectId) },
    });

    const defaultStatuses = [
      {
        name: 'To Do',
        description: 'Task is pending and not yet started',
        color: '#ef4444',
        type: StatusType.TODO,
        position: 0,
        isDefault: true,
        isStartStatus: true,
        isEndStatus: false,
        isResolved: false,
        isClosed: false,
        isActive: true,
      },
      {
        name: 'In Progress',
        description: 'Task is currently being worked on',
        color: '#f59e0b',
        type: StatusType.IN_PROGRESS,
        position: 1,
        isDefault: false,
        isStartStatus: false,
        isEndStatus: false,
        isResolved: false,
        isClosed: false,
        isActive: true,
      },
      {
        name: 'Review',
        description: 'Task is completed and waiting for review',
        color: '#3b82f6',
        type: StatusType.IN_PROGRESS,
        position: 2,
        isDefault: false,
        isStartStatus: false,
        isEndStatus: false,
        isResolved: false,
        isClosed: false,
        isActive: true,
      },
      {
        name: 'Done',
        description: 'Task is completed and approved',
        color: '#10b981',
        type: StatusType.DONE,
        position: 3,
        isDefault: false,
        isStartStatus: false,
        isEndStatus: true,
        isResolved: true,
        isClosed: false,
        isActive: true,
      },
      {
        name: 'Closed',
        description: 'Task is closed and archived',
        color: '#6b7280',
        type: StatusType.DONE,
        position: 4,
        isDefault: false,
        isStartStatus: false,
        isEndStatus: true,
        isResolved: false,
        isClosed: true,
        isActive: true,
      },
    ];

    const createdStatuses = [];
    for (const statusData of defaultStatuses) {
      const status = this.statusRepository.create({
        ...statusData,
        project,
      });
      createdStatuses.push(await this.statusRepository.save(status));
    }

    return createdStatuses;
  }
}
