import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskStatusEntity, StatusType, ProjectEntity } from '#LocalProject/Entities';
import { CreateStatusDto, UpdateStatusDto } from '#LocalProject/Dtos';

@Injectable()
export class StatusManagerService {
  constructor(
    @InjectRepository(TaskStatusEntity)
    private readonly statusRepository: Repository<TaskStatusEntity>,
    @InjectRepository(ProjectEntity)
    private readonly projectRepository: Repository<ProjectEntity>,
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
      const status = statuses.find(s => s.id.toString() === statusIds[i]);
      if (status) {
        status.position = i;
        await this.statusRepository.save(status);
      }
    }

    return await this.getProjectStatuses(projectId);
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
        position: 0,
        isDefault: true,
      },
      {
        name: 'In Progress',
        description: 'Task is being worked on',
        color: '#0052CC',
        type: StatusType.IN_PROGRESS,
        position: 1,
        isDefault: false,
      },
      {
        name: 'In Review',
        description: 'Task is being reviewed',
        color: '#FF8B00',
        type: StatusType.IN_PROGRESS,
        position: 2,
        isDefault: false,
      },
      {
        name: 'Done',
        description: 'Task is completed',
        color: '#00875A',
        type: StatusType.DONE,
        position: 3,
        isDefault: false,
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
