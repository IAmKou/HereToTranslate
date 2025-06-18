import { ProjectEntity, ProjectRoleEntity, RequestEntity, RequestStatus, UserEntity } from "#LocalProject/Entities";
import { Repository } from "typeorm";
import { CreateRequestDto, UpdateRequestDto } from "#LocalProject/Dtos";
import { BadGatewayException, BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { PermissionFlags } from "@here-to-translate/common";
import { DAY } from "#LocalProject/Utils/common";

@Injectable()
export class RequestManagerService {

  constructor(
    @InjectRepository(RequestEntity)
    private readonly requestRepository: Repository<RequestEntity>,
    @InjectRepository(ProjectEntity)
    private readonly projectRepository: Repository<ProjectEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(ProjectRoleEntity)
    private readonly projectRoleRepository: Repository<ProjectRoleEntity>
  ) { }

  async createRequest(uid: bigint, data: CreateRequestDto) {
    const {
      projectId,
      title,
      description,
      dealAmount,
      deadline,
    } = data;

    const requester = await this.userRepository.exists({
      where: { id: BigInt(uid) }
    });
    if (!requester) {
      throw new BadRequestException(`User does not exist`);
    }

    const userRolesInProject = await this.projectRoleRepository.find({
      where: { user: { id: BigInt(uid) }, project: { id: BigInt(projectId) } },
      relations: ['permissions']
    });

    if (!userRolesInProject.length
      && !userRolesInProject.some(role =>
        role.permissionFlags.has(PermissionFlags.ViewProject)
      )) {
      throw new BadRequestException(`You cannot create a request in this project`);
    }

    const project = await this.projectRepository.exists({
      where: { id: BigInt(projectId) }
    });
    if (!project) {
      throw new BadGatewayException(`Project does not exist`);
    }

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
    const user = await this.userRepository.findOne({
      where: { id: BigInt(uid) },
      relations: ['projectRoles']
    });
    if (!user) {
      throw new BadRequestException(`User with ID ${uid} not found`);
    }

    const requests = await this.requestRepository.find({
      where: { requester: { id: BigInt(uid) } },
      relations: ['requester', 'project']
    });

    return requests;
  }

  async fetchRequest(uid: bigint, requestId: bigint) {
    const request = await this.requestRepository.findOne({
      where: { id: BigInt(requestId) },
      relations: ['requester', 'project']
    });
    if (!request) {
      throw new BadRequestException(`Request with ID ${requestId} not found`);
    }
    const user = await this.userRepository.exists({
      where: { id: BigInt(uid) }
    });
    if (!user) {
      throw new BadRequestException(`User with ID ${uid} not found`);
    }
    const userRolesInProject = await this.projectRoleRepository.find({
      where: { user: { id: BigInt(uid) }, project: { id: request.project.id } },
      relations: ['permissions']
    });

    if (request.requester.id !== uid
      && !userRolesInProject.length
      && !userRolesInProject.some(role =>
        role.permissionFlags.hasAny(
          PermissionFlags.ReviewRequests,
          PermissionFlags.ViewRequest
        )
      )
    ) {
      throw new BadRequestException(`You do not have permission to view this request`);
    }
  }

  async updateRequest(uid: bigint, requestId: bigint, data: Partial<UpdateRequestDto>) {
    const {
      title,
      description,
      dealAmount,
      deadline,
    } = data;
    if (!title && !description && !dealAmount && !deadline) {
      throw new BadRequestException(`No fields to update`);
    }
    const request = await this.requestRepository.findOne({
      where: { id: BigInt(requestId) },
      relations: ['requester', 'project']
    });
    if (!request) {
      throw new NotFoundException(`Request with ID ${requestId} not found`);
    }
    if (request.requester.id !== uid) {
      throw new BadRequestException(`You are not the creator of this request`);
    }
    if (deadline && (deadline.getTime() - Date.now() < 7 * DAY)) {
      throw new BadRequestException(`Deadline has to be at least 7 days from the current date`);
    }
    if (title) request.title = title;
    if (description) request.description = description;
    if (dealAmount) request.dealAmount = dealAmount;
    if (deadline) request.deadline = deadline;
    return this.requestRepository.save(request);
  }

  async cancelRequest(uid: bigint, requestId: bigint) {
    const request = await this.requestRepository.findOne({
      where: { id: BigInt(requestId) },
      relations: ['requester', 'project']
    });
    if (!request) {
      throw new NotFoundException(`Request with ID ${requestId} not found`);
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

  async reviewRequest(uid: bigint, requestId: bigint, status: RequestStatus) {
    const request = await this.requestRepository.findOne({
      where: { id: BigInt(requestId) },
      relations: ['requester', 'project']
    });
    if (!request) {
      throw new NotFoundException(`Request with ID ${requestId} not found`);
    }
    const user = await this.userRepository.findOne({
      where: { id: BigInt(uid) }
    });
    if (!user) {
      throw new BadRequestException(`User with ID ${uid} not found`);
    }
    if (!user.projectRoles.every(role => role.permissionFlags.has(PermissionFlags.ReviewRequests))) {
      throw new BadRequestException(`You do not have permission to review requests`);
    }
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
