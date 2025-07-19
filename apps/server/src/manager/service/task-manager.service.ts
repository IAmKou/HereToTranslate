import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  ProjectGroupEntity,
  TaskEntity,
  UserEntity,
} from '#LocalProject/Entities';
import { DeepPartial, Repository } from 'typeorm';
import { ProjectManagerService } from '#LocalProject/Managers/service/project-manager.service';
import { PermissionFlags } from '@here-to-translate/common';
import { TranslationService } from '#LocalProject/Managers/service/translation-manager.service';
import { TaskGateway } from '#LocalProject/Utils/gateway/task.gateway';

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
    } as DeepPartial<TaskEntity>);

    await this.taskRepository.save(task);
    this.taskGateway.emitTaskUpdate(task);
    return task;
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
      params.fileId,
      params.filePart
    );
    if (strings.length === 0)
      throw new NotFoundException('No strings in that part');

    const example = strings
      .slice(0, 3)
      .map((s) => `- ${s.originalText}`)
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
      (s) => s.translatedText && s.translatedText.trim() !== ''
    ).length;
    const percent = total === 0 ? 0 : Math.round((translated / total) * 100);

    return { total, translated, percent };
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
