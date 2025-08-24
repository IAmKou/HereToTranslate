import {
  CategoryEntity, FileEntity,
  ProjectEntity,
  ProjectTagEntity,
  RequestEntity,
  RequestStatus,
  TransactionEntity,
  TransactionStatus,
  TransactionType,
  UserEntity,
  WalletEntity
} from '#LocalProject/Entities';
import { In, Repository } from 'typeorm';
import { CreateRequestDto, UpdateRequestDto } from '#LocalProject/Dtos';
import {
  BadRequestException,
  Injectable, InternalServerErrorException,
  NotFoundException
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MailService } from '../../mailer/mailer.service';
import { ChatService } from '../../chat/chat.service';
import { PaypalService } from './payment-manager.service';
import { WalletManagerService } from './wallet-manager.service';
import { FileService } from './file-manager.service';
import { logger } from 'nx/src/utils/logger';
import { ProjectManagerService } from './project-manager.service';
import { NotificationManagerService } from './notification-manager.service';
import { TranslationService } from './translation-manager.service';

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
    @InjectRepository(FileEntity)
    private readonly fileRepository: Repository<FileEntity>,
    @InjectRepository(ProjectEntity)
    private readonly projectRepository: Repository<ProjectEntity>,
    private readonly walletService: WalletManagerService,
    private readonly mailService: MailService,
    private readonly chatService: ChatService,
    private readonly paymentService: PaypalService,
    private readonly fileService: FileService,
    private readonly projectService: ProjectManagerService,
    private readonly notificationService: NotificationManagerService,
    private readonly translationService: TranslationService,
  ) { }

  async createRequest(
    dto: CreateRequestDto,
    uid: bigint,
    uploadedFiles: Express.Multer.File[] = [],
  ): Promise<RequestEntity> {
    const DAY = 24 * 60 * 60 * 1000;
    const { title, description, dealAmount, deadline: deadlineRaw } = dto;
    const deadline = new Date(deadlineRaw);

    if (deadline.getTime() - Date.now() < 7 * DAY) {
      throw new BadRequestException('Deadline must be at least 7 days from now');
    }

    const fileEntities: FileEntity[] = [];
    for (const file of uploadedFiles) {
      const { fileId } = await this.fileService.handleLocalUpload(file, uid, dto.projectId ? BigInt(dto.projectId) : undefined);
      const entity = await this.fileRepository.findOneOrFail({
        where: { id: BigInt(fileId) },
      });
      fileEntities.push(entity);
    }

    const request = this.requestRepository.create({
      requester: { id: uid } as any,
      project: dto.projectId ? ({ id: BigInt(dto.projectId) } as any) : undefined,
      registrants: dto.assigneeId ? ([{ id: BigInt(dto.assigneeId) }] as any) : [],
      assignee: dto.assigneeId ? ({ id: BigInt(dto.assigneeId) } as any) : undefined,
      title,
      description,
      dealAmount,
      deadline,
      createdAt: new Date(),
      status: RequestStatus.Pending,
      isPublic: true,
      category: dto.categoryId ? ({ id: BigInt(dto.categoryId) } as any) : undefined,
      targetLanguages: dto.targetLanguages || [],
      files: fileEntities,
      tags: [],
    });



    // Handle tags if provided
    if (dto.tags && dto.tags.length > 0) {
      const requestTags: ProjectTagEntity[] = [];

      for (const tag of dto.tags) {
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

    const savedRequest = await this.requestRepository.save(request);

    // Send global notification for public requests
    if (savedRequest.isPublic) {
      await this.notificationService.createGlobalNotification({
        type: 'PUBLIC_REQUEST_CREATED',
        message: `New public request available: "${savedRequest.title}" - $${savedRequest.dealAmount}`,
        createdBy: uid,
      });
    }

    return savedRequest;
  }

  async createPrivateRequest(
    dto: CreateRequestDto,
    uid: bigint,
    uploadedFiles: Express.Multer.File[] = [],
  ): Promise<{ request: RequestEntity; approvalUrl?: string }> {
    const DAY = 24 * 60 * 60 * 1000;
    const { title, description, dealAmount, deadline: deadlineRaw, isPublic } = dto;
    const deadline = new Date(deadlineRaw);

    if (deadline.getTime() - Date.now() < 7 * DAY) {
      throw new BadRequestException('Deadline must be at least 7 days from now');
    }

    const fileEntities: FileEntity[] = [];
    for (const file of uploadedFiles) {
      const { fileId } = await this.fileService.handleLocalUpload(file, uid, dto.projectId ? BigInt(dto.projectId) : undefined);
      const entity = await this.fileRepository.findOneOrFail({
        where: { id: BigInt(fileId) },
      });
      fileEntities.push(entity);
    }

    const request = this.requestRepository.create({
      requester: { id: uid } as any,
      project: dto.projectId ? ({ id: BigInt(dto.projectId) } as any) : undefined,
      registrants: dto.assigneeId ? ([{ id: BigInt(dto.assigneeId) }] as any) : undefined,
      assignee: dto.assigneeId ? ({ id: BigInt(dto.assigneeId) } as any) : undefined,
      title,
      description,
      dealAmount,
      deadline,
      createdAt: new Date(),
      status: RequestStatus.Pending,
      isPublic,
      category: dto.categoryId ? ({ id: BigInt(dto.categoryId) } as any) : undefined,
      targetLanguages: dto.targetLanguages || [],
      files: fileEntities,
    });



    const requesterUser = await this.userRepository.findOneOrFail({
      where: { id: BigInt(uid) },
    });

    if (!dto.assigneeId) {
      throw new BadRequestException('Assignee ID is required');
    }

    const assigneeUser = await this.userRepository.findOneOrFail({
      where: { id: BigInt(dto.assigneeId) },
    });

    // Create notification for assignee about new private request
    await this.notificationService.createNotification({
      userId: BigInt(dto.assigneeId),
      type: 'PRIVATE_REQUEST_CREATED',
      message: `You have received a new private request: "${title}" from ${requesterUser.fullName || requesterUser.username}`,
      createdBy: uid,
    });

    if (assigneeUser?.email) {
      await this.mailService.sendPrivateRequestConfirmation(assigneeUser.email, {
        title,
        deadline,
        username: requesterUser.username,
      });
    }

    // Handle tags if provided
    if (dto.tags && dto.tags.length > 0) {
      const requestTags: ProjectTagEntity[] = [];

      for (const tag of dto.tags) {
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

    const savedRequest = await this.requestRepository.save(request);

    const approvalUrl = await this.paymentService.createPrivateDeposit(
      dealAmount,
      requesterUser,
      savedRequest
    );

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
        'requests.targetLanguages',
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

    const requests = await queryBuilder.getMany();

    // Count actual pending extension requests for each request
    const requestsWithExtensions = await Promise.all(
      requests.map(async (request) => {
        // Get all extension notifications for this request
        const allExtensionNotifications = await this.notificationService.getNotificationsByType(
          uid,
          'EXTENSION_REQUESTED',
          request.id
        );

        // For now, we'll count all EXTENSION_REQUESTED notifications
        // In a more sophisticated implementation, we would track which extensions
        // have been responded to and only count pending ones
        // This requires either:
        // 1. Adding a status field to extension requests, or
        // 2. Creating a separate extension_requests table
        const extensionRequestCount = allExtensionNotifications.length;

        return {
          ...request,
          extensionRequestCount
        };
      })
    );

    return requestsWithExtensions;
  }

  async fetchRequests(userId: bigint) {
    const currentDate = new Date();

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
        'requests.targetLanguages',
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
      .andWhere('requests.deadline > :currentDate', { currentDate })
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
        'requests.targetLanguages',
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
    // Return empty array instead of throwing exception when no requests found
    return result || [];
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
        'requests.targetLanguages',

        'requester.id',
        'requester.username',
        'requester.fullName',
        'requester.email',
        'requester.phone',
        'requester.avatarUrl',

        'assignee.id',
        'assignee.username',
        'assignee.fullName',
        'assignee.email',
        'assignee.phone',
        'assignee.avatarUrl',

        'category.name',

        'tags.id',
        'tags.name',

        'files.id',
        'files.fileName',
        'files.fileType',
        'files.createdAt',
        'files.fileContent',
      ])
      .where('requests.id = :requestId', { requestId })
      .leftJoin('requests.requester', 'requester')
      .leftJoin('requests.assignee', 'assignee')
      .leftJoin('requests.category', 'category')
      .leftJoinAndSelect('requests.tags', 'tags')
      .leftJoinAndSelect('requests.registrants', 'registrants')
      .leftJoinAndSelect('requests.files', 'files');

    const request = await query.getOne();

    let isRegistered = false;
    if (request?.registrants) {
      isRegistered = request.registrants.some(
        (u: UserEntity) => u.id.toString() === userId.toString()
      );
    }

    return { ...request, isRegistered };
  }

  async updateRequest(
    uid: bigint,
    requestId: bigint,
    data: Partial<UpdateRequestDto> & { files?: Express.Multer.File[] }
  ) {
    const {
      title,
      description,
      dealAmount,
      deadline,
      categoryId,
      tags,
      targetLanguages,
      files,
      status,
    } = data;
    const DAY = 24 * 60 * 60 * 1000;

    if (
      !title &&
      !description &&
      !dealAmount &&
      !deadline &&
      !categoryId &&
      !tags &&
      targetLanguages === undefined &&
      status === undefined &&
      (!files || files.length === 0)
    ) {
      throw new BadRequestException(`No fields to update`);
    }

    const request = await this.requestRepository.findOne({
      where: { id: BigInt(requestId) },
      relations: ['requester', 'category', 'tags'],
    });

    if (!request) throw new NotFoundException(`Unknown request`);
    if (request.requester.id !== uid)
      throw new BadRequestException(`You are not the creator of this request`);
    if (request.status !== RequestStatus.Pending)
      throw new BadRequestException(`Request is not in pending status`);

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
    if (targetLanguages !== undefined) request.targetLanguages = targetLanguages;

    if (categoryId) {
      const category = await this.categoryRepository.findOne({
        where: { id: BigInt(categoryId) },
      });
      if (!category) throw new BadRequestException(`Category not found`);
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

    if (files && files.length > 0) {
      for (const file of files) {
        await this.fileService.saveFile({
          uid,
          fileName: Buffer.from(file.originalname, 'latin1').toString('utf8'),
          fileType: file.mimetype,
          fileContent: file.buffer,
          requestId,
        });
      }
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
      if (request.status === RequestStatus.Approved) {
        // Check for remaining deadline
        const now = new Date();
        const remainingTime = request.deadline.getTime() - now.getTime();
        const totalTime = request.deadline.getTime() - request.createdAt.getTime();
        if (remainingTime <= 0 || remainingTime / totalTime < 0.5) {
          throw new BadRequestException(
            `Cannot cancel request within 50% of the deadline`
          );
        }
      }
      else {
        throw new BadRequestException(`Request is not in pending status`);
      }
    }

    // If it's a private request, refund the deposit
    else if (!request.isPublic) {
      // Find requester's deposit transaction for this request (có thể là Pending hoặc On_Hold)
      const requesterTransaction = await this.transactionRepository.findOne({
        where: {
          request: { id: BigInt(requestId) },
          user: { id: request.requester.id },
          status: In([TransactionStatus.Pending, TransactionStatus.On_Hold]),
        },
      });

      logger.log(`[DEBUG] Cancel Request - Found transaction:`, {
        requestId: requestId,
        requesterId: request.requester.id,
        transactionFound: !!requesterTransaction,
        transactionId: requesterTransaction?.id,
        transactionStatus: requesterTransaction?.status,
        transactionType: requesterTransaction?.type,
        transactionAmount: requesterTransaction?.amount,
      });

      if (requesterTransaction) {
        try {
          // Mark requester's transaction as cancelled
          const oldStatus = requesterTransaction.status;
          requesterTransaction.status = TransactionStatus.Failed;

          logger.log(`[DEBUG] Cancel Request - About to save transaction:`, {
            transactionId: requesterTransaction.id,
            oldStatus: oldStatus,
            newStatus: requesterTransaction.status,
          });

          const savedTransaction = await this.transactionRepository.save(requesterTransaction);

          logger.log(`[DEBUG] Cancel Request - Transaction saved successfully:`, {
            transactionId: savedTransaction.id,
            savedStatus: savedTransaction.status,
            savedType: savedTransaction.type,
          });

          const adminWallet = await this.walletService.getOrCreateWallet(BigInt(1)); // Admin user ID
          const adminOldBalance = adminWallet.balance;
          adminWallet.balance = Number(adminWallet.balance) - Math.abs(Number(requesterTransaction.amount));
          const savedAdminWallet = await this.walletRepository.save(adminWallet);

          // REFUND: Add money to requester wallet
          const requesterWallet = await this.walletService.getOrCreateWallet(request.requester.id);
          const requesterOldBalance = requesterWallet.balance;
          requesterWallet.balance = Number(requesterWallet.balance) + Math.abs(Number(requesterTransaction.amount));
          const savedRequesterWallet = await this.walletRepository.save(requesterWallet);

          // Verify the wallet updates were successful
          if (savedAdminWallet.balance !== adminWallet.balance || savedRequesterWallet.balance !== requesterWallet.balance) {
            throw new Error('Wallet balance update failed');
          }

          logger.log(`[DEBUG] Cancel Request - Wallet balances updated:`, {
            adminOldBalance: adminOldBalance,
            adminNewBalance: adminWallet.balance,
            requesterOldBalance: requesterOldBalance,
            requesterNewBalance: requesterWallet.balance,
            refundAmount: Math.abs(Number(requesterTransaction.amount)),
          });

          // Tạo transaction REFUND để ghi nhận việc hoàn tiền
          const refundTransaction = this.transactionRepository.create({
            user: { id: request.requester.id },
            request: { id: BigInt(requestId) },
            amount: Math.abs(Number(requesterTransaction.amount)),
            status: TransactionStatus.Completed,
            type: TransactionType.REFUND,
          });
          await this.transactionRepository.save(refundTransaction);

          logger.log(`[DEBUG] Cancel Request - Refund transaction created:`, {
            refundTransactionId: refundTransaction.id,
            refundAmount: refundTransaction.amount,
            refundStatus: refundTransaction.status,
            refundType: refundTransaction.type,
          });

          logger.log(
            `Cancelled requester transaction ID ${requesterTransaction.id} for canceled private request ID ${request.id}. Money $${Math.abs(Number(requesterTransaction.amount))} was deducted from admin wallet (released from hold), refunded to requester wallet, and REFUND transaction created.`
          );
        } catch (e) {
          logger.error('Refund during private cancel failed:' + e);
        }
      } else {
        logger.warn(
          `No deposit transaction found for requester in private request ID ${request.id}`
        );
      }
    }

    request.status = RequestStatus.Cancelled;
    await this.requestRepository.save(request);

    logger.log(`[DEBUG] Cancel Request - Request status updated:`, {
      requestId: request.id,
      newStatus: request.status,
    });

    logger.log(`Request ID ${request.id} cancelled by user ID ${uid}`);

    return request;
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

    // Create notification for requester about new registration
    await this.notificationService.createNotification({
      userId: request.requester.id,
      type: 'PUBLIC_REQUEST_REGISTERED',
      message: `${register.fullName || register.username} has registered for your public request: "${request.title}"`,
      createdBy: BigInt(uid),
    });

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

  async getRequestRegistrants(requestId: bigint): Promise<any[]> {
    const request = await this.requestRepository.findOneOrFail({
      where: { id: requestId },
      relations: ['registrants'],
    });

    const registrantIds = request.registrants.map((r) => r.id);

    if (registrantIds.length === 0) return [];

    const users = await this.userRepository
      .createQueryBuilder('user')
      .select([
        'user.id',
        'user.fullName',
        'user.email',
        'user.phone',
        'user.createdAt',
        'user.username',
        'user.avatarUrl',
        'user.isActive',
      ])
      .whereInIds(registrantIds)
      .getMany();

    // Get all requests where registrants are assignees (not requesters)
    const allRequests = await this.requestRepository
      .createQueryBuilder('request')
      .leftJoinAndSelect('request.assignee', 'assignee')
      .where('assignee.id IN (:...userIds)', {
        userIds: registrantIds
      })
      .getMany();

    // Calculate stats for each user (only as assignee)
    const userStatsMap = new Map();

    registrantIds.forEach(userId => {
      const userRequests = allRequests.filter(req =>
        req.assignee?.id === userId
      );

      const stats = {
        total: userRequests.length,
        completed: 0,
        failed: 0,
        pending: 0,
      };

      userRequests.forEach(req => {
        switch (req.status) {
          case RequestStatus.Completed:
            stats.completed++;
            break;
          case RequestStatus.Failed:
          case RequestStatus.Cancelled:
          case RequestStatus.Rejected:
            stats.failed++;
            break;
          case RequestStatus.Pending:
          case RequestStatus.Approved:
          case RequestStatus.WaitingApproval:
          case RequestStatus.ExtensionRequested:
          case RequestStatus.ExtensionApproved:
            stats.pending++;
            break;
        }
      });

      userStatsMap.set(userId, stats);
    });

    // Return users with real stats and average rating
    return users.map((user) => {
      const userRequests = allRequests.filter(req => req.assignee?.id === user.id);
      const completedRequests = userRequests.filter(req => req.status === RequestStatus.Completed);
      const ratings = completedRequests.map(req => req.rating).filter(rating => rating !== null && rating > 0);
      const averageRating = ratings.length > 0 ? (ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length).toFixed(1) : '0.0';

      return {
        ...user,
        requestStats: userStatsMap.get(user.id) || {
          total: 0,
          completed: 0,
          failed: 0,
          pending: 0,
        },
        joined: user.createdAt,
        lastSeen: 'Online',
        averageRating: parseFloat(averageRating),
        totalRatings: ratings.length,
      };
    });
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

    // Create notification for approved registrant
    await this.notificationService.createNotification({
      userId: BigInt(selectedUserId),
      type: 'REGISTRANT_APPROVED',
      message: `Your registration for request "${request.title}" has been approved! Please complete the payment to proceed.`,
      createdBy: request.requester.id,
    });

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
      throw new BadRequestException(
        'Only private and pending requests can be declined'
      );
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

    const wallet = await this.walletService.getOrCreateWallet(
      request.requester.id
    );
    wallet.balance = Number(wallet.balance) + Number(transaction.amount);

    transaction.status = TransactionStatus.Failed;
    request.status = RequestStatus.Rejected;

    await this.transactionRepository.save(transaction);
    await this.walletRepository.save(wallet);
    await this.requestRepository.save(request);

    // Create notification for requester about declined private request
    await this.notificationService.createNotification({
      userId: request.requester.id,
      type: 'PRIVATE_REQUEST_DECLINED',
      message: `Your private request "${request.title}" has been declined by the assigned translator.`,
      createdBy: request.assignee?.id || BigInt(0),
    });

    return true;
  }

  async acceptPrivateRequest(
    requestId: bigint,
    assigneeId: bigint
  ): Promise<any> {
    const request = await this.requestRepository.findOneOrFail({
      where: { id: requestId },
      relations: ['assignee', 'requester', 'category', 'files'],
    });

    if (!request || request.isPublic || request.status !== RequestStatus.Pending) {
      throw new BadRequestException('Invalid request for acceptance');
    }

    if (Number(request.assignee?.id) !== Number(assigneeId)) {
      throw new BadRequestException('You are not the assigned translator for this request');
    }

    const queryRunner = this.projectService['dataSource'].createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const { projectId } = await this.projectService.createProjectFromRequest(
        request,
        assigneeId
      );

      const newProject = await this.projectRepository.findOneOrFail({
        where: { id: projectId },
      });

      request.project = newProject;
      request.status = RequestStatus.Approved;

      await queryRunner.manager.save(request);
      await queryRunner.commitTransaction();

      // Create notification for requester about accepted private request
      await this.notificationService.createNotification({
        userId: request.requester.id,
        type: 'PRIVATE_REQUEST_ACCEPTED',
        message: `Your private request "${request.title}" has been accepted and a project has been created!`,
        createdBy: assigneeId,
      });

      return {
        success: true,
        message: 'Private request accepted and project created.',
        projectId,
        requestId: request.id,
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      logger.error('Accept private request failed:' + err);
      throw new InternalServerErrorException('Failed to accept private request');
    } finally {
      await queryRunner.release();
    }
  }

  async getMyRegisteredRequests(uid: bigint) {
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
        'requests.targetLanguages',
        'requester.id',
        'requester.username',
        'requester.fullName',
        'project.id',
        'project.name',
        'category.name',
        'tags.id',
        'tags.name',
      ])
      .leftJoin('requests.registrants', 'registrants')
      .leftJoin('requests.requester', 'requester')
      .leftJoin('requests.project', 'project')
      .leftJoin('requests.category', 'category')
      .leftJoinAndSelect('requests.tags', 'tags')
      .where('registrants.id = :uid', { uid: BigInt(uid) });

    return await queryBuilder.getMany();
  }

  async getOngoingRequests(uid: bigint) {
    const qb = this.requestRepository
      .createQueryBuilder('requests')
      .select([
        'requests.id',
        'requests.title',
        'requests.dealAmount',
        'requests.deadline',
        'requests.status',
        'requester.id',
        'requester.fullName',
        'requester.email',
      ])
      .leftJoin('requests.requester', 'requester')
      .where('requests.assigneeId = :uid', { uid: BigInt(uid) })
      .andWhere('requests.status = :st', { st: RequestStatus.Approved })
      .orderBy('requests.deadline', 'ASC');

    const result = await qb.getMany();
    return result || [];
  }

  async getRequestExtensions(requestId: bigint, userId: bigint) {
    // First verify the user is the requester of this request
    const request = await this.requestRepository.findOne({
      where: { id: requestId },
      relations: ['requester'],
    });

    if (!request) {
      throw new NotFoundException('Request not found');
    }

    if (request.requester.id !== userId) {
      throw new BadRequestException('You are not the requester of this request');
    }

    // Get extension notifications for this request
    const extensionNotifications = await this.notificationService.getNotificationsByType(
      userId,
      'EXTENSION_REQUESTED',
      requestId
    );

    // Convert notifications to extension request format
    const extensions = await Promise.all(extensionNotifications.map(async notification => {
      // Extract information from notification message
      const message = notification.message;
      console.log('🔍 [SERVICE] Parsing notification message:', message);

      const translatorMatch = message.match(/^([^(]+) has requested/);
      const translatorName = translatorMatch ? translatorMatch[1].trim() : 'Unknown Translator';

      // Extract new deadline and reason from message
      const extensionDataMatch = message.match(/\[EXTENSION_DATA:(\{.*?\})\]/);
      let newDeadline, reason;

      if (extensionDataMatch) {
        try {
          const extensionData = JSON.parse(extensionDataMatch[1]);
          newDeadline = new Date(extensionData.newDeadline);
          reason = extensionData.reason;
        } catch (error) {
          console.error('🔍 [SERVICE] Failed to parse extension data:', error);
          // Fallback to default values
          const currentDeadline = new Date(request.deadline);
          newDeadline = new Date(currentDeadline.getTime() + 7 * 24 * 60 * 60 * 1000);
          reason = 'Deadline extension requested';
        }
      } else {
        // Fallback to default values if no extension data found
        const currentDeadline = new Date(request.deadline);
        newDeadline = new Date(currentDeadline.getTime() + 7 * 24 * 60 * 60 * 1000);
        reason = 'Deadline extension requested';
      }

      console.log('🔍 [SERVICE] Parsed values:', {
        translatorName,
        newDeadline: newDeadline.toISOString(),
        reason: reason,
        fullMessage: message
      });

      // Get translator's real email from user table
      const translator = await this.userRepository.findOne({
        where: { id: notification.createdBy },
        select: ['email']
      });

      return {
        id: notification.id,
        requestId: requestId,
        translatorId: notification.createdBy,
        translatorName: translatorName,
        translatorEmail: translator?.email || 'No email available',
        currentDeadline: currentDeadline,
        newDeadline: newDeadline,
        reason: reason,
        status: 'PENDING',
        createdAt: notification.createdAt,
      };
    }));

    return extensions;
  }

  async approveExtension(requestId: bigint, extensionId: bigint, userId: bigint) {
    console.log('🔍 [SERVICE] approveExtension called:', { requestId, extensionId, userId })

    // Verify user is requester
    const request = await this.requestRepository.findOne({
      where: { id: requestId },
      relations: ['requester', 'assignee'],
    });

    console.log('🔍 [SERVICE] Found request:', {
      requestFound: !!request,
      requestId: request?.id,
      requesterId: request?.requester?.id,
      assigneeId: request?.assignee?.id
    })

    if (!request) {
      console.error('💥 [SERVICE] Request not found')
      throw new NotFoundException('Request not found');
    }

    if (request.requester.id !== userId) {
      console.error('💥 [SERVICE] User not authorized:', {
        requesterId: request.requester.id,
        userId
      })
      throw new BadRequestException('You are not the requester of this request');
    }

    // Get the extension notification to extract new deadline
    const extensionNotifications = await this.notificationService.getNotificationsByType(
      userId,
      'EXTENSION_REQUESTED',
      requestId
    );

    console.log('🔍 [SERVICE] Found extension notifications:', {
      count: extensionNotifications.length,
      notificationIds: extensionNotifications.map(n => n.id)
    })

    const extensionNotification = extensionNotifications.find(n => n.id.toString() === extensionId.toString());
    if (!extensionNotification) {
      console.error('💥 [SERVICE] Extension notification not found:', {
        extensionId: extensionId.toString(),
        availableIds: extensionNotifications.map(n => n.id.toString())
      })
      throw new NotFoundException('Extension request not found');
    }

    console.log('🔍 [SERVICE] Found extension notification:', {
      notificationId: extensionNotification.id,
      message: extensionNotification.message
    })

    // Extract new deadline from notification message
    const message = extensionNotification.message;
    const extensionDataMatch = message.match(/\[EXTENSION_DATA:(\{.*?\})\]/);

    if (!extensionDataMatch) {
      console.error('💥 [SERVICE] Invalid extension request format:', { message })
      throw new BadRequestException('Invalid extension request format');
    }

    let newDeadline;
    try {
      const extensionData = JSON.parse(extensionDataMatch[1]);
      newDeadline = new Date(extensionData.newDeadline);
    } catch (error) {
      console.error('💥 [SERVICE] Failed to parse extension data:', error);
      throw new BadRequestException('Invalid extension request format');
    }

    console.log('🔍 [SERVICE] Extracted new deadline:', {
      newDeadline: newDeadline.toISOString(),
      extensionData: extensionDataMatch[1]
    })

    // Store the old deadline before updating
    const oldDeadline = request.deadline;

    // Update request deadline
    request.deadline = newDeadline;
    await this.requestRepository.save(request);
    console.log('✅ [SERVICE] Request deadline updated successfully')

    // Send notification to translator
    await this.notificationService.createNotification({
      userId: request.assignee.id,
      type: 'EXTENSION_APPROVED',
      message: `Your deadline extension request for "${request.title}" has been approved. New deadline: ${newDeadline.toLocaleDateString()}`,
      createdBy: userId,
    });

    console.log('✅ [SERVICE] Notification sent to translator')

    // Send email to translator
    if (request.assignee.email) {
      await this.mailService.sendExtensionApprovalNotification(
        request.assignee.email,
        {
          translatorName: request.assignee.fullName || request.assignee.username,
          requestTitle: request.title,
          currentDeadline: new Date(oldDeadline), // Convert to Date object
          newDeadline: new Date(newDeadline),     // Convert to Date object
        }
      );
      console.log('✅ [SERVICE] Email sent to translator')
    }

    // Delete the original extension request notification so it won't be counted anymore
    await this.notificationService.deleteNotification(extensionNotification.id);
    console.log('✅ [SERVICE] Original extension notification deleted')

    return {
      success: true,
      message: 'Extension approved successfully. Request deadline has been updated.',
      newDeadline: newDeadline
    };
  }

  async rejectExtension(requestId: bigint, extensionId: bigint, userId: bigint) {
    // Verify user is requester
    const request = await this.requestRepository.findOne({
      where: { id: requestId },
      relations: ['requester', 'assignee'],
    });

    if (!request) {
      throw new NotFoundException('Request not found');
    }

    if (request.requester.id !== userId) {
      throw new BadRequestException('You are not the requester of this request');
    }

    // Get the extension notification to extract reason
    const extensionNotifications = await this.notificationService.getNotificationsByType(
      userId,
      'EXTENSION_REQUESTED',
      requestId
    );

    const extensionNotification = extensionNotifications.find(n => n.id.toString() === extensionId.toString());
    if (!extensionNotification) {
      throw new NotFoundException('Extension request not found');
    }

    // Extract reason from notification message
    const message = extensionNotification.message;
    const extensionDataMatch = message.match(/\[EXTENSION_DATA:(\{.*?\})\]/);
    let reason = 'No reason provided';

    if (extensionDataMatch) {
      try {
        const extensionData = JSON.parse(extensionDataMatch[1]);
        reason = extensionData.reason;
      } catch (error) {
        console.error('🔍 [SERVICE] Failed to parse extension data in rejectExtension:', error);
        reason = 'Deadline extension requested'; // Fallback to default
      }
    }

    // Send notification to translator
    await this.notificationService.createNotification({
      userId: request.assignee.id,
      type: 'EXTENSION_REJECTED',
      message: `Your deadline extension request for "${request.title}" has been rejected. Original deadline remains unchanged.`,
      createdBy: userId,
    });

    // Send email to translator
    if (request.assignee.email) {
      await this.mailService.sendExtensionRejectionNotification(
        request.assignee.email,
        {
          translatorName: request.assignee.fullName || request.assignee.username,
          requestTitle: request.title,
          currentDeadline: new Date(request.deadline), // Convert to Date object
          reason: reason,
        }
      );
      console.log('✅ [SERVICE] Email sent to translator for rejection')
    }

    // Delete the original extension request notification so it won't be counted anymore
    await this.notificationService.deleteNotification(extensionNotification.id);
    console.log('✅ [SERVICE] Original extension notification deleted')

    return {
      success: true,
      message: 'Extension rejected successfully. Request deadline remains unchanged.'
    };
  }

  async submitExtensionRequest(requestId: bigint, translatorId: bigint, newDeadline: Date, reason: string) {
    console.log('🔍 [SERVICE] submitExtensionRequest called:', {
      requestId: requestId.toString(),
      translatorId: translatorId.toString(),
      newDeadline: newDeadline.toISOString(),
      reason: reason,
      reasonLength: reason.length
    });

    // Verify the request exists and translator is assigned
    const request = await this.requestRepository.findOne({
      where: { id: requestId },
      relations: ['requester', 'assignee'],
    });

    if (!request) {
      throw new NotFoundException('Request not found');
    }

    if (request.assignee?.id !== translatorId) {
      throw new BadRequestException('You are not the assigned translator for this request');
    }

    if (request.status !== RequestStatus.Approved) {
      throw new BadRequestException('Request is not in approved status');
    }

    // Check if there are any pending extension requests that haven't been responded to
    const pendingExtensions = await this.notificationService.getNotificationsByType(
      request.requester.id,
      'EXTENSION_REQUESTED',
      requestId
    );

    if (pendingExtensions.length > 0) {
      throw new BadRequestException('You already have a pending extension request. Please wait for the requester to respond before submitting a new one.');
    }

    // LOGIC: Check extension request rules
    // 1. First extension request: Always allowed
    // 2. Subsequent extension requests: Only allowed if previous one was APPROVED
    // 3. If previous extension was REJECTED: No new extensions allowed
    // 4. If previous extension is still PENDING: Wait for response

    const approvedExtensions = await this.notificationService.getNotificationsByType(
      request.requester.id,
      'EXTENSION_APPROVED',
      requestId
    );

    const rejectedExtensions = await this.notificationService.getNotificationsByType(
      request.requester.id,
      'EXTENSION_REJECTED',
      requestId
    );

    // Apply extension request rules
    if (approvedExtensions.length === 0 && rejectedExtensions.length === 0) {
      // This is the first extension request - allow it
      console.log('🔍 [SERVICE] First extension request - allowing submission');
    } else if (rejectedExtensions.length > 0 && approvedExtensions.length === 0) {
      // Previous extension was rejected - don't allow new extension
      throw new BadRequestException('Your previous extension request was rejected. You cannot submit a new extension request for this project.');
    } else if (approvedExtensions.length > 0) {
      // Previous extension was approved - allow new extension
      console.log('🔍 [SERVICE] Previous extension was approved - allowing new extension request');
    }

    // Create notification for requester
    // Store extension details in a structured way for internal use
    const extensionData = {
      requestId: requestId,
      newDeadline: newDeadline.getTime(),
      reason: reason
    };

    // Create a clean notification message for display
    const notificationMessage = `${request.assignee.fullName || request.assignee.username} has requested a deadline extension for "${request.title}"`;

    // Store extension data in notification metadata or create a separate extension record
    // For now, we'll append the data to the message but in a cleaner format
    const fullMessage = `${notificationMessage} [EXTENSION_DATA:${JSON.stringify(extensionData)}]`;

    console.log('🔍 [SERVICE] Creating notification with message:', notificationMessage);
    console.log('🔍 [SERVICE] Full message with extension data:', fullMessage);

    await this.notificationService.createNotification({
      userId: request.requester.id,
      type: 'EXTENSION_REQUESTED',
      message: fullMessage, // Use full message with extension data
      createdBy: translatorId,
    });

    // Send email notification to requester
    if (request.requester.email) {
      await this.mailService.sendExtensionRequestNotification(
        request.requester.email,
        {
          requesterName: request.requester.fullName || request.requester.username,
          translatorName: request.assignee.fullName || request.assignee.username,
          translatorEmail: request.assignee.email,
          requestTitle: request.title,
          currentDeadline: request.deadline,
          newDeadline: newDeadline,
          reason: reason,
          requestId: requestId,
        }
      );
    }

    // Return success response instead of mock data
    return {
      success: true,
      message: 'Extension request submitted successfully',
      requestId: requestId
    };
  }

  async getPendingRequestsCount(): Promise<number> {
    const count = await this.requestRepository
      .createQueryBuilder('requests')
      .where('requests.status = :status', { status: RequestStatus.Pending })
      .getCount();

    return count;
  }



}
