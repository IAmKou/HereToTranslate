import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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

    // If this is set as default, unset other defaults
    if (dto.isDefault) {
      await this.statusRepository.update(
        { project: { id: BigInt(projectId) } },
        { isDefault: false }
      );
    }

    // If this is set as start status, unset other start statuses
    if (dto.isStartStatus) {
      await this.statusRepository.update(
        { project: { id: BigInt(projectId) } },
        { isStartStatus: false }
      );
    }

    // If this is set as end status, unset other end statuses
    if (dto.isEndStatus) {
      await this.statusRepository.update(
        { project: { id: BigInt(projectId) } },
        { isEndStatus: false }
      );
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

    // If setting as default, unset other defaults in the same project
    if (dto.isDefault) {
      await this.statusRepository.update(
        { project: { id: status.project.id } },
        { isDefault: false }
      );
    }

    // If setting as start status, unset other start statuses
    if (dto.isStartStatus) {
      await this.statusRepository.update(
        { project: { id: status.project.id } },
        { isStartStatus: false }
      );
    }

    // If setting as end status, unset other end statuses
    if (dto.isEndStatus) {
      await this.statusRepository.update(
        { project: { id: status.project.id } },
        { isEndStatus: false }
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

    // Check if status is being used by tasks. We must count tasks referencing this status
    // using the Task repository; a left join on status will always return at least 1 row
    // for the status itself, even when there are no tasks.
    const taskCount = await this.taskRepository.count({
      where: { status: { id: BigInt(id) } },
    });

    if (taskCount > 0) {
      throw new BadRequestException('Cannot delete status that is being used by tasks');
    }

    await this.statusRepository.remove(status);
    return { success: true };
  }

  async getProjectStatuses(projectId: string) {
    return await this.statusRepository.find({
      where: { project: { id: BigInt(projectId) }, isActive: true },
    });
  }



  async createDefaultStatuses(projectId: string) {
    const project = await this.projectRepository.findOneOrFail({
      where: { id: BigInt(projectId) },
    });

    const defaultStatuses = [
      {
        name: 'To Do',
        description: 'Task is ready to be worked on',
        color: '#42526E',
        type: StatusType.TODO,


        isDefault: true,
        isStartStatus: true,
        isEndStatus: false,
        isResolved: false,
        isClosed: false,
      },
      {
        name: 'In Progress',
        description: 'Task is being worked on',
        color: '#0052CC',
        type: StatusType.IN_PROGRESS,


        isDefault: false,
        isStartStatus: false,
        isEndStatus: false,
        isResolved: false,
        isClosed: false,
      },
      {
        name: 'Done',
        description: 'Task is completed',
        color: '#00875A',
        type: StatusType.DONE,


        isDefault: false,
        isStartStatus: false,
        isEndStatus: true,
        isResolved: true,
        isClosed: true,
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
