import {
  CategoryEntity,
  ProjectEntity,
  RequestEntity,
  RequestStatus,
  UserEntity,
  ProjectTagEntity, TransactionStatus, TransactionEntity, WalletEntity
} from '#LocalProject/Entities';
import { Repository } from 'typeorm';
import { CreateRequestDto, UpdateRequestDto } from '#LocalProject/Dtos';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DAY } from '#LocalProject/Utils/common';
import { MailService } from '../../mailer/mailer.service';
import { ChatService } from '../../chat/chat.service';
import { PaypalService } from '#LocalProject/Managers/service/payment-manager.service';
import { WalletManagerService } from '#LocalProject/Managers/service/wallet-manager.service';

@Injectable()
export class RequestManagerService {
  constructor(
    @InjectRepository(RequestEntity)
    private readonly requestRepository: Repository<RequestEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(ProjectEntity)
    @InjectRepository(CategoryEntity)
    private readonly categoryRepository: Repository<CategoryEntity>,
    @InjectRepository(ProjectTagEntity)
    private readonly projectTagRepository: Repository<ProjectTagEntity>,
    @InjectRepository(TransactionEntity)
    private readonly transactionRepository: Repository<TransactionEntity>,
    @InjectRepository(WalletEntity)
    private readonly walletRepository: Repository<WalletEntity>,
    private readonly walletService: WalletManagerService,
    private readonly mailService: MailService,
    private readonly chatService: ChatService,
    private readonly paymentService: PaypalService
  ) {}

  async createRequest(dto: CreateRequestDto, uid: bigint): Promise<{ request: RequestEntity; approvalUrl?: string }> {
    const DAY = 24 * 60 * 60 * 1000;
    const { title, description, dealAmount, deadline: deadlineRaw, isPublic } = dto;
    const deadline = new Date(deadlineRaw);

    if (deadline.getTime() - Date.now() < 7 * DAY) {
      throw new BadRequestException(`Deadline must be at least 7 days from now`);
    }

    const request = this.requestRepository.create({
      requester: { id: uid } as any,
      project: dto.projectId ? { id: BigInt(dto.projectId) } as any : undefined,
      registrants: dto.assigneeId ? [{ id: BigInt(dto.assigneeId) }] as any : [],
      assignee: dto.assigneeId ? { id: BigInt(dto.assigneeId) } as any : undefined,
      title,
      description,
      dealAmount,
      deadline,
      createdAt: new Date(),
      status: RequestStatus.Pending,
      isPublic,
      category: dto.categoryId ? { id: BigInt(dto.categoryId) } as any : undefined,
    });

    const savedRequest = await this.requestRepository.save(request);

    let approvalUrl: string | undefined;

    if (!isPublic) {
      const requesterUser = await this.userRepository.findOneOrFail({ where: { id: uid } });
      const assigneeUser = await this.userRepository.findOne({ where: { id: BigInt(dto.assigneeId) } });

      if (assigneeUser?.email) {
        await this.mailService.sendPrivateRequestConfirmation(assigneeUser.email, {
          title,
          deadline,
          username: requesterUser.username,
        });
      }

      approvalUrl = await this.paymentService.createDeposit(dealAmount, requesterUser, savedRequest);
    }

    return { request: savedRequest, approvalUrl };
  }


  async searchUsers(
    keyword: string,
    currentUserId: bigint
  ): Promise<UserEntity[]> {
    return this.userRepository
      .createQueryBuilder('user')
      .leftJoin('user.role', 'role')
      .where('user.isActive = :active', { active: true })
      .andWhere('user.id != :currentUserId', {
        currentUserId: currentUserId.toString(),
      })
      .andWhere(
        `(user.username LIKE :keyword OR user.email LIKE :keyword OR user.fullName LIKE :keyword)`,
        { keyword: `%${keyword}%` }
      )
      .andWhere('role.id NOT IN (:...excludedRoles)', {
        excludedRoles: [1, 2],
      })
      .getMany();
  }

  async getMyRequests(uid: bigint) {
    const queryBuilder = this.requestRepository
      .createQueryBuilder('requests')
      .select([
        'requests.id',
        'requests.title',
        'requests.description',
        'requests.dealAmount',
        'requests.deadline',
        'requests.status',
        'requests.isPublic',
        'requests.createdAt',
        'requester.id',
        'requester.username',
        'project.id',
        'project.name',
        'category.name',
        'tags.id',
        'tags.name',
      ])
      .where('requester.id = :uid', { uid: BigInt(uid) })
      .leftJoin('requests.requester', 'requester')
      .leftJoin('requests.project', 'project')
      .leftJoin('requests.category', 'category')
      .leftJoinAndSelect('requests.tags', 'tags');

    return await queryBuilder.getMany();
  }

  async fetchRequests(userId: bigint) {
    const query = this.requestRepository
      .createQueryBuilder('requests')
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
        'requester.fullName',
        'requester.email',
        'requester.phone',
        'category.name',
        'tags.id',
        'tags.name',
      ])
      .where('requests.isPublic = true')
      .leftJoin('requests.requester', 'requester')
      .leftJoin('requests.category', 'category')
      .leftJoinAndSelect('requests.tags', 'tags')
      .leftJoinAndSelect('requests.registrants', 'registrants');

    const result = await query.getMany();

    if (!result || result.length === 0) {
      throw new NotFoundException('No requests found');
    }

    return result.map((r: RequestEntity) => ({
      ...r,
      isRegistered: r.registrants
        ? r.registrants.some(
          (u: UserEntity) => u.id.toString() === userId.toString()
        )
        : false,
    }));
  }

  async fetchPrivateRequests(uid: bigint) {
    const query = this.requestRepository
      .createQueryBuilder('requests')
      .select([
        'requests.id',
        'requests.title',
        'requests.description',
        'requests.dealAmount',
        'requests.deadline',
        'requests.status',
        'requests.isPublic',
        'requests.createdAt',
        'requester.id',
        'requester.fullName',
        'requester.email',
        'requester.phone',
        'category.name',
        'tags.id',
        'tags.name',
      ])
      .where('requests.isPublic = false')
      .andWhere('assigneeId = :uid', { uid: BigInt(uid) })
      .leftJoin('requests.requester', 'requester')
      .leftJoin('requests.category', 'category')
      .leftJoinAndSelect('requests.tags', 'tags');
    const result = await query.getMany();
    if (!result || result.length === 0) {
      throw new NotFoundException('You have no request');
    }
    return result;
  }

  async fetchRequestDetails(requestId: bigint, userId: bigint) {
    const query = this.requestRepository
      .createQueryBuilder('requests')
      .select([
        'requests.id',
        'requests.title',
        'requests.description',
        'requests.dealAmount',
        'requests.deadline',
        'requests.status',
        'requests.createdAt',
        'requests.isPublic',
        'requester.id',
        'requester.username',
        'requester.fullName',
        'requester.email',
        'requester.phone',
        'assignee.id',
        'assignee.fullName',
        'assignee.email',
        'assignee.phone',
        'category.name',
        'tags.id',
        'tags.name',
      ])
      .where('requests.id = :requestId', { requestId: requestId })
      .leftJoin('requests.requester', 'requester')
      .leftJoin('requests.assignee', 'assignee')
      .leftJoin('requests.category', 'category')
      .leftJoinAndSelect('requests.tags', 'tags')
      .leftJoinAndSelect('requests.registrants', 'registrants');

    const request = await query.getOne();
    let isRegistered = false;
    if (request && request.registrants) {
      isRegistered = request.registrants.some(
        (u: UserEntity) => u.id.toString() === userId.toString()
      );
    }
    return { ...request, isRegistered };
  }

  async updateRequest(
    uid: bigint,
    requestId: bigint,
    data: Partial<UpdateRequestDto>
  ) {
    const { title, description, dealAmount, deadline, categoryId, tags } = data;

    if (
      !title &&
      !description &&
      !dealAmount &&
      !deadline &&
      !categoryId &&
      !tags
    ) {
      throw new BadRequestException(`No fields to update`);
    }

    const request = await this.requestRepository.findOne({
      where: { id: BigInt(requestId) },
      relations: ['requester', 'category', 'tags'],
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
        throw new BadRequestException(
          `Deadline has to be at least 7 days from the current date`
        );
      }
      request.deadline = datelineValue;
    }

    if (title) request.title = title;
    if (description) request.description = description;
    if (dealAmount) request.dealAmount = dealAmount;

    if (categoryId) {
      const category = await this.categoryRepository.findOne({
        where: { id: BigInt(categoryId) },
      });
      if (!category) {
        throw new BadRequestException(`Category not found`);
      }
      request.category = category;
    }

    if (tags !== undefined) {
      const requestTags: ProjectTagEntity[] = [];

      for (const tag of tags) {
        let tagEntity = await this.projectTagRepository.findOne({
          where: { name: tag },
        });

        if (!tagEntity) {
          const newTag = this.projectTagRepository.create({ name: tag });
          tagEntity = await this.projectTagRepository.save(newTag);
        }

        requestTags.push(tagEntity);
      }

      request.tags = requestTags;
    }
    return this.requestRepository.save(request);
  }

  async cancelRequest(uid: bigint, requestId: bigint) {
    const request = await this.requestRepository.findOne({
      where: { id: BigInt(requestId) },
      relations: ['requester'],
    });
    if (!request) {
      throw new NotFoundException(`Unknown request`);
    }
    if (request.requester.id !== uid) {
      throw new BadRequestException(
        `You are not the requester of this request`
      );
    }
    if (request.status !== RequestStatus.Pending) {
      throw new BadRequestException(`Request is not in pending status`);
    }
    request.status = RequestStatus.Cancelled;
    return this.requestRepository.save(request);
  }

  async registerForPublicRequest(requestId: bigint, uid: number) {
    const request = await this.requestRepository.findOneOrFail({
      where: { id: requestId },
      relations: ['requester'],
    });

    const register = await this.userRepository.findOneOrFail({
      where: { id: BigInt(uid) },
    });

    if (request.requester && request.requester.id === BigInt(uid)) {
      throw new BadRequestException(
        'You cannot register for your own request.'
      );
    }

    if (request.status !== RequestStatus.Pending) {
      throw new BadRequestException('Request is not open for registration.');
    }

    if (!request.registrants) request.registrants = [];

    if (!request.registrants.some((u) => u.id === register.id)) {
      request.registrants.push(register);
      await this.requestRepository.save(request);
    }

    const requesterEmail = request.requester.email;

    await this.mailService.notifyRequesterOfRegistration(
      requesterEmail,
      register.username
    );

    if (request.requester) {
      await this.chatService.openChatBetween(
        { id: uid, username: register.username },
        {
          id: Number(request.requester.id),
          username: request.requester.username,
        }
      );
    }
  }

  async getRequestRegistrants(requestId: bigint): Promise<UserEntity[]> {
    const request = await this.requestRepository.findOneOrFail({
      where: { id: requestId },
      relations: ['registrants'],
    });

    const registrantIds = request.registrants.map((r) => r.id);

    if (registrantIds.length === 0) return [];

    return this.userRepository
      .createQueryBuilder('user')
      .select(['user.id', 'user.fullName', 'user.email', 'user.phone', 'user.createdAt'])
      .whereInIds(registrantIds)
      .getMany();
  }

  async approveRegistrant(
    requestId: number,
    selectedUserId: number
  ): Promise<{ approvalUrl: string }> {
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

    const approvalUrl = await this.paymentService.createDeposit(
      request.dealAmount,
      selectedUser,
      request
    );

    if (!approvalUrl) {
      throw new Error('Failed to generate PayPal approval URL.');
    }
    return { approvalUrl };
  }

  async declinePrivateRequest(requestId: bigint): Promise<boolean> {
    const request = await this.requestRepository.findOneOrFail({
      where: { id: requestId },
      relations: ['requester'],
    });

    if (request.status !== RequestStatus.Pending || request.isPublic) {
      throw new BadRequestException('Only private and pending requests can be declined');
    }

    const transaction = await this.transactionRepository.findOne({
      where: {
        request: { id: requestId },
        user: { id: request.requester.id },
        status: TransactionStatus.Pending,
      },
    });

    if (!transaction) {
      throw new NotFoundException('No matching deposit transaction found');
    }

    const wallet = await this.walletService.getOrCreateWallet(request.requester.id);
    wallet.balance = Number(wallet.balance) + Number(transaction.amount);

    transaction.status = TransactionStatus.Failed;
    request.status = RequestStatus.Rejected;

    await this.transactionRepository.save(transaction);
    await this.walletRepository.save(wallet);
    await this.requestRepository.save(request);

    return true;
  }

}
