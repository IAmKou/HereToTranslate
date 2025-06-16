import { ProjectEntity, RequestEntity, RequestStatus, UserEntity } from "#LocalProject/Entities";
import { Repository } from "typeorm";
import { CreateRequestDto, UpdateRequestDto } from "#LocalProject/Dtos";
import { BadGatewayException, BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";

@Injectable()
export class RequestManagerService {
  constructor(
    @InjectRepository(RequestEntity)
    private readonly requestRepository: Repository<RequestEntity>,
    @InjectRepository(ProjectEntity)
    private readonly projectRepository: Repository<ProjectEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) { }

  async createRequest(data: CreateRequestDto) {
    const {
      requesterId,
      projectId,
      title,
      description,
      dealAmount,
      deadline,
    } = data;

    const requester = await this.userRepository.exists({
      where: { id: BigInt(requesterId) }
    });
    if (!requester) {
      throw new BadRequestException(`User does not exist`);
    }

    const project = await this.projectRepository.exists({
      where: { id: BigInt(projectId) }
    });
    if (!project) {
      throw new BadGatewayException(`Project does not exist`);
    }

    if (deadline < new Date()) {
      throw new BadRequestException(`Deadline cannot be in the past`);
    }

    // TODO? fileUrl creation (if local) or validation

    const request = this.requestRepository.create({
      requester: { id: BigInt(requesterId) },
      project: { id: BigInt(projectId) },
      title,
      description,
      dealAmount,
      deadline,
      fileUrl: '',
      createdAt: new Date(),
      status: RequestStatus.Pending,
    });

    return this.requestRepository.save(request);
  }
  fetchRequest(requestId: bigint, userId: bigint) {
    const request = this.requestRepository.findOne({
      where: { id: BigInt(requestId) },
      relations: ['requester', 'project']
    });
    if (!request) {
      throw new BadRequestException(`Request with ID ${requestId} not found`);
    }

    // TODO: Permission check
  }
  updateRequest(requestId: bigint, data: Partial<UpdateRequestDto>) {

  }
  cancelRequest(requestId: bigint) {

  }
  reviewRequest(requestId: bigint, status: RequestStatus) {

  }
  updateStatus(requestId: bigint, status: RequestStatus) {

  }
}
