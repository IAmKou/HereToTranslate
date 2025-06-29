import { CategoryEntity, ProjectEntity, RequestEntity, RequestStatus, UserEntity } from '#LocalProject/Entities';
import { Repository } from 'typeorm';
import { CreateRequestDto, UpdateRequestDto } from '#LocalProject/Dtos';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DAY } from '#LocalProject/Utils/common';
import { MailService } from '../../mailer/mailer.service';
import { ProjectManagerService } from './project-manager.service';
import { ChatService } from '../../chat/chat.service';
import { PaypalService } from '#LocalProject/Managers/service/payment-manager.service';
import { logger } from 'nx/src/utils/logger';

@Injectable()
export class RequestManagerService {

  constructor(
    @InjectRepository(RequestEntity)
    private readonly requestRepository: Repository<RequestEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(ProjectEntity)
    private readonly projectRepository: Repository<ProjectEntity>,
    @InjectRepository(CategoryEntity)
    private readonly categoryRepository: Repository<CategoryEntity>,
    private readonly mailService: MailService,
    private readonly projectService: ProjectManagerService,
    private readonly chatService: ChatService,
    private readonly paymentService: PaypalService,

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
      registrants: dto.assigneeId ? [{ id: BigInt(dto.assigneeId) }] : [],
      title,
      description,
      dealAmount,
      deadline,
      createdAt: new Date(),
      status: RequestStatus.Pending,
      isPublic,
      category: dto.categoryId ? { id: BigInt(dto.categoryId) } : undefined,
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
        'project.name',
        'category.name',
      ])
      .where('requester.id = :uid', { uid: BigInt(uid) })
      .leftJoin('requests.requester', 'requester')
      .leftJoin('requests.project', 'project')
      .leftJoin('requests.category', 'category');

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
        'category.name',
      ])
      .where('requests.isPublic = true')
      .leftJoin('requests.requester', 'requester')
      .leftJoin('requests.category','category');

    const result = await query.getMany();

    if (!result || result.length === 0) {
      throw new NotFoundException('No requests found');
    }

    return result;
  }

  async fetchPrivateRequests(uid: bigint) {
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
      'category.name',
    ])
      .where('requests.isPublic = false')
      .andWhere('assigneeId = :uid', { uid: BigInt(uid) })
      .leftJoin('requests.requester', 'requester')
      .leftJoin('requests.category', 'category');
    const result = await query.getMany();
    if (!result || result.length === 0) {
      throw new NotFoundException('You have no request');
    }
    return result;
  }

  async updateRequest(uid: bigint, requestId: bigint, data: Partial<UpdateRequestDto>) {
    const {
      title,
      description,
      dealAmount,
      deadline,
      categoryId,
    } = data;

    if (!title && !description && !dealAmount && !deadline && !categoryId) {
      throw new BadRequestException(`No fields to update`);
    }

    const request = await this.requestRepository.findOne({
      where: { id: BigInt(requestId) },
      relations: ['requester', 'category'],
    });

    if (!request) {
      throw new NotFoundException(`Unknown request`);
    }

    if (request.requester.id !== uid) {
      throw new BadRequestException(`You are not the creator of this request`);
    }

    if (request.status !== RequestStatus.Pending) {
      throw new BadRequestException(`Request is not in pending status`);
    }

    if (deadline) {
      const datelineValue = new Date(deadline);
      if (datelineValue.getTime() - Date.now() < 7 * DAY) {
        throw new BadRequestException(`Deadline has to be at least 7 days from the current date`);
      }
      request.deadline = datelineValue;
    }

    if (title) request.title = title;
    if (description) request.description = description;
    if (dealAmount) request.dealAmount = dealAmount;

    if (categoryId) {
      const category = await this.categoryRepository.findOne({ where: { id: BigInt(categoryId) } });
      if (!category) {
        throw new BadRequestException(`Category not found`);
      }
      request.category = category;
    }

    return this.requestRepository.save(request);
  }



  async cancelRequest(uid: bigint, requestId: bigint) {
    const request = await this.requestRepository.findOne({
      where: { id: BigInt(requestId) },
      relations: ['requester']
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

  // async reviewRequest(uid: bigint, projectId: bigint, requestId: bigint, status: RequestStatus) {
  //   await this.projectManager.testPermissions(projectId, uid, PermissionFlags.ReviewRequests);
  //   const request = await this.requestRepository.findOne({
  //     where: {
  //       id: BigInt(requestId),
  //       project: { id: BigInt(projectId) }
  //     },
  //     relations: ['requester', 'project']
  //   });
  //   if (!request) {
  //     throw new NotFoundException(`Unknown request`);
  //   }
  //   await this.projectManager.testPermissions(projectId, uid, PermissionFlags.ReviewRequests);
  //   if (status === RequestStatus.Completed && request.status !== RequestStatus.Approved) {
  //     throw new BadRequestException(`Request is not approved (currently ${request.status})`);
  //   }
  //   else if (request.status !== RequestStatus.Pending) {
  //     throw new BadRequestException(`Request is not in pending status (currently ${request.status})`);
  //   }
  //   request.status = status;
  //   return this.requestRepository.save(request);
  // }

  async registerForPublicRequest(requestId: bigint, uid: number) {
    const request = await this.requestRepository.findOneOrFail({
      where: { id: requestId },
      relations: ['requester'],
    });

    const register = await this.userRepository.findOneOrFail({
      where: { id: BigInt(uid) },
    });

    if (request.requester && request.requester.id === BigInt(uid)) {
      throw new BadRequestException('You cannot register for your own request.');
    }

    if (request.status !== RequestStatus.Pending) {
      throw new BadRequestException('Request is not open for registration.');
    }

    const requesterEmail = request.requester.email;

    await this.mailService.notifyRequesterOfRegistration(requesterEmail, register.username);

    if (request.requester) {
      await this.chatService.openChatBetween(
        { id: uid, username: register.username },
        { id: Number(request.requester.id), username: request.requester.username },
      );
    }
  }

  async getRequestRegistrants(requestId: bigint): Promise<UserEntity[]> {
    const request = await this.requestRepository.findOneOrFail({
      where: { id: requestId },
      relations: ['registrants'],
    });

    const registrantIds = request.registrants.map(r => r.id);

    if (registrantIds.length === 0) return [];

    return this.userRepository
      .createQueryBuilder('user')
      .select(['user.id', 'user.fullName', 'user.email'])
      .whereInIds(registrantIds)
      .getMany();
  }

  private readonly notificationService = {
    async notifyAllOthers(requestId: number, userIds: number[]) {
      logger.log('Hehe.Implant later on');
      return 'hehe';
    }
  };

  async approveRegistrant(
    requestId: number,
    selectedUserId: number
  ): Promise<ProjectEntity> {
    const request = await this.requestRepository.findOneOrFail({
      where: { id: BigInt(requestId) },
      relations: ['requester', 'assignee', 'registrants', 'category'],
    });

    if (request.assignee) {
      throw new BadRequestException('Request has already been assigned.');
    }

    const selectedUser = await this.userRepository.findOneOrFail({
      where: { id: BigInt(selectedUserId) },
    });

    const otherUserIds = request.registrants
      .map(user => Number(user.id))
      .filter(uid => uid !== Number(selectedUser.id));

    const depositSuccess = await this.paymentService.createDeposit(
      request.dealAmount,
      selectedUser
    );

    if (!depositSuccess) {
      throw new Error('Deposit failed.');
    }

    const queryRunner = this.projectService['dataSource'].createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const createResult = await this.projectService.createProject(
        selectedUser.id,
        {
          name: request.title,
          description: request.description,
          isPrivate: true,
          tags: [],
          categoryId: request.category?.id?.toString() ?? '',
        }
      );
      const newProject = await this.projectRepository.findOneOrFail({
        where: { id: createResult.projectId },
      });

      request.assignee = selectedUser;
      request.registrants = [];
      request.project = newProject;
      request.status = RequestStatus.Approved;
      await queryRunner.manager.save(request);

      if (otherUserIds.length > 0) {
        await this.mailService.notifyAllOthersRequestTaken(requestId, otherUserIds);
        await this.notificationService.notifyAllOthers(requestId, otherUserIds);
      }

      await queryRunner.commitTransaction();
      return newProject;
    } catch (e) {
      await queryRunner.rollbackTransaction();
      throw new (await import('@nestjs/common')).InternalServerErrorException('Failed to approve and create project');
    } finally {
      await queryRunner.release();
    }
  }
}
