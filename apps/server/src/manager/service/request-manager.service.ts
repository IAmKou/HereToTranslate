import { RequestEntity, RequestStatus, UserEntity } from '#LocalProject/Entities';
import { Repository } from 'typeorm';
import { CreateRequestDto, UpdateRequestDto } from '#LocalProject/Dtos';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PermissionFlags } from '@here-to-translate/common';
import { DAY } from '#LocalProject/Utils/common';
import { ProjectManagerService } from '#LocalProject/Managers/service/project-manager.service';
import { MailService } from '../../mailer/mailer.service';

@Injectable()
export class RequestManagerService {

  constructor(
    @InjectRepository(RequestEntity)
    private readonly requestRepository: Repository<RequestEntity>,
    private readonly projectManager: ProjectManagerService,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly mailService: MailService,

  ) { }

  async createRequest(
    dto: CreateRequestDto,
    uid: bigint
  ): Promise<RequestEntity> {
    const DAY = 24 * 60 * 60 * 1000;
    const {
      title,
      description,
      dealAmount,
      deadline: deadlineRaw,
      isPublic,
    } = dto;

    const deadline = new Date(deadlineRaw);

    if (deadline.getTime() - Date.now() < 7 * DAY) {
      throw new BadRequestException(`Deadline has to be at least 7 days from the current date`);
    }

    const request = this.requestRepository.create({
      requester:  { id: BigInt(uid) },
      project: dto.projectId ? { id: BigInt(dto.projectId) } : undefined,
      assignee: dto.assigneeId ? { id: BigInt(dto.assigneeId) } : undefined,
      title,
      description,
      dealAmount,
      deadline,
      createdAt: new Date(),
      status: RequestStatus.Pending,
      isPublic,
    });

    if (!isPublic) {
      const requesterUser = await this.userRepository.findOneOrFail({where : {id : BigInt(uid)}});
      const assigneeUser = await this.userRepository.findOne({ where: { id: BigInt(dto.assigneeId) } });

      const username = requesterUser.username;
      if (assigneeUser?.email) {
        await this.mailService.sendPrivateRequestConfirmation(assigneeUser.email,{
          title,
          deadline,
          username,
        });
      }
    }

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

  async fetchRequests() {
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
      ])
      .leftJoin('requests.requester', 'requester')
      .leftJoin('requests.project', 'project');

    const result = await query.getMany();

    if (!result || result.length === 0) {
      throw new NotFoundException('No requests found');
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

  async registerForPublicRequest(requestId: bigint, uid : number) {
    const request = await this.requestRepository.findOneOrFail({ where: { id: requestId } });
    const requesterEmail = request.requester.email;
    const register = await this.userRepository.findOneOrFail({ where: {id : BigInt(uid)}});


    if (request.status !== RequestStatus.Pending) {
      throw new BadRequestException('Request is not open for registration.');
    }

    await this.mailService.notifyRequesterOfRegistration(requesterEmail, register.username);
    // if (request.requester) {
    //   await this.chatService.openChatBetween(user, request.requester);
    // }
  }


  // async approveRegistrant(
  //   requestId: number,
  //   selectedUserId: number
  // ): Promise<ProjectEntity> {
  //   const request = await this.requestRepo.findOneOrFail({
  //     where: { id: requestId },
  //     relations: ['requester', 'assignee'],
  //   });
  //
  //   if (request.assignee) {
  //     throw new BadRequestException('Request has already been assigned.');
  //   }
  //
  //   const selectedUser = await this.userRepo.findOneOrFail({
  //     where: { id: selectedUserId },
  //   });
  //
  //   await this.mailService.notifyAllOthersRequestTaken(requestId, selectedUser.id);
  //   await this.notificationService.notifyAllOthers(requestId, selectedUser.id);
  //
  //   const depositSuccess = await this.paypalService.createDeposit(request.dealAmount, selectedUser);
  //   if (!depositSuccess) {
  //     throw new Error('Deposit failed.');
  //   }
  //
  //   const newProject = this.projectRepo.create({
  //     name: request.title,
  //     description: request.description,
  //     isPrivate: true,
  //     createdBy: selectedUser,
  //   });
  //   const savedProject = await this.projectRepo.save(newProject);
  //
  //   request.assignee = selectedUser;
  //   request.project = savedProject;
  //   request.status = RequestStatus.Approved;
  //   await this.requestRepo.save(request);
  //
  //   return savedProject;
  // }
}
