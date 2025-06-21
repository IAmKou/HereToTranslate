import { RequestEntity, RequestStatus } from '#LocalProject/Entities';
import { Repository } from 'typeorm';
import { CreateRequestDto, UpdateRequestDto } from '#LocalProject/Dtos';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PermissionFlags } from '@here-to-translate/common';
import { DAY } from '#LocalProject/Utils/common';
import { ProjectManagerService } from '#LocalProject/Managers/service/project-manager.service';

@Injectable()
export class RequestManagerService {

  constructor(
    @InjectRepository(RequestEntity)
    private readonly requestRepository: Repository<RequestEntity>,
    private readonly projectManager: ProjectManagerService
  ) { }

  async createRequest(uid: bigint, projectId: bigint, data: CreateRequestDto) {
    await this.projectManager.testPermissions(projectId, uid, PermissionFlags.ViewProject);

    const {
      title,
      description,
      dealAmount,
      deadline: deadlineRaw,
    } = data;

    const deadline = new Date(deadlineRaw);

    if (deadline.getTime() - Date.now() < 7 * DAY) {
      throw new BadRequestException(`Deadline has to be at least 7 days from the current date`);
    }

    const request = this.requestRepository.create({
      requester: { id: BigInt(uid) },
      project: { id: BigInt(projectId) },
      title,
      description,
      dealAmount,
      deadline,
      createdAt: new Date(),
      status: RequestStatus.Pending,
    });

    return this.requestRepository.save(request);
  }

  async getMyRequests(uid: bigint) {
    const queryBuilder = this.requestRepository.createQueryBuilder('requests')
      .select([
        'requests.id',
        'requests.title',
        'requests.description',
        'requests.dealAmount',
        'requests.deadline',
        'requests.status',
        'requests.createdAt',
        'requester.id',
        'requester.username',
        'project.id',
        'project.name'
      ])
      .where('requester.id = :uid', { uid: BigInt(uid) })
      .leftJoin('requests.requester', 'requester')
      .leftJoin('requests.project', 'project');

    return await queryBuilder.getMany();
  }

  async fetchRequest(uid: bigint, projectId: bigint, requestId: bigint) {
    await this.projectManager.testPermissions(projectId, uid, PermissionFlags.ViewProject);
    const query = this.requestRepository.createQueryBuilder('requests')
      .select([
        'requests.id',
        'requests.title',
        'requests.description',
        'requests.dealAmount',
        'requests.deadline',
        'requests.status',
        'requests.createdAt',
        'requester.id',
        'requester.username',
        'project.id',
        'project.name'
      ])
      .where('requests.id = :requestId', { requestId: BigInt(requestId) })
      .andWhere('project.id = :projectId', { projectId: BigInt(projectId) })
      .leftJoin('requests.requester', 'requester')
      .leftJoin('requests.project', 'project');

    const result = await query.getOne();
    if (!result) {
      throw new NotFoundException("Unknown request");
    }
    return result;
  }

  async updateRequest(uid: bigint, requestId: bigint, data: Partial<UpdateRequestDto>) {
    const {
      title,
      description,
      dealAmount,
      deadline
    } = data;
    if (!title && !description && !dealAmount && !deadline) {
      throw new BadRequestException(`No fields to update`);
    }
    const request = await this.requestRepository.findOne({
      where: { id: BigInt(requestId) },
      relations: ['requester', 'project']
    });
    if (!request) {
      throw new NotFoundException(`Unknown request`);
    }
    if (request.requester.id !== uid) {
      throw new BadRequestException(`You are not the creator of this request`);
    }
    if (deadline) {
      const datelineValue = new Date(deadline);
      if (datelineValue.getTime() - Date.now() < 7 * DAY)
        throw new BadRequestException(`Deadline has to be at least 7 days from the current date`);
      request.deadline = datelineValue;
    }
    if (title) request.title = title;
    if (description) request.description = description;
    if (dealAmount) request.dealAmount = dealAmount;
    return this.requestRepository.save(request);
  }

  async cancelRequest(uid: bigint, requestId: bigint) {
    const request = await this.requestRepository.findOne({
      where: { id: BigInt(requestId) },
      relations: ['requester', 'project']
    });
    if (!request) {
      throw new NotFoundException(`Unknown request`);
    }
    if (request.requester.id !== uid) {
      throw new BadRequestException(`You are not the requester of this request`);
    }
    if (request.status !== RequestStatus.Pending) {
      throw new BadRequestException(`Request is not in pending status`);
    }
    request.status = RequestStatus.Cancelled;
    return this.requestRepository.save(request);
  }

  async reviewRequest(uid: bigint, projectId: bigint, requestId: bigint, status: RequestStatus) {
    await this.projectManager.testPermissions(projectId, uid, PermissionFlags.ReviewRequests);
    const request = await this.requestRepository.findOne({
      where: {
        id: BigInt(requestId),
        project: { id: BigInt(projectId) }
      },
      relations: ['requester', 'project']
    });
    if (!request) {
      throw new NotFoundException(`Unknown request`);
    }
    await this.projectManager.testPermissions(projectId, uid, PermissionFlags.ReviewRequests);
    if (status === RequestStatus.Completed && request.status !== RequestStatus.Approved) {
      throw new BadRequestException(`Request is not approved (currently ${request.status})`);
    }
    else if (request.status !== RequestStatus.Pending) {
      throw new BadRequestException(`Request is not in pending status (currently ${request.status})`);
    }
    request.status = status;
    return this.requestRepository.save(request);
  }
}
