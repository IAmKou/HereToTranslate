import {
  CategoryEntity, FileEntity,
  ProjectEntity,
  ProjectTagEntity,
  RequestEntity,
  RequestStatus,
  TransactionEntity,
  TransactionStatus,
  UserEntity,
  WalletEntity
} from '#LocalProject/Entities';
import { Repository } from 'typeorm';
import { CreateRequestDto, UpdateRequestDto } from '#LocalProject/Dtos';
import {
  BadRequestException,
  Injectable, InternalServerErrorException,
  NotFoundException
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MailService } from '../../mailer/mailer.service';
import { ChatService } from '../../chat/chat.service';
import { PaypalService } from '#LocalProject/Managers/service/payment-manager.service';
import { WalletManagerService } from '#LocalProject/Managers/service/wallet-manager.service';
import { FileService } from '#LocalProject/Managers/service/file-manager.service';
import { logger } from 'nx/src/utils/logger';
import { ProjectManagerService } from '#LocalProject/Managers/service/project-manager.service';

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
  ) {}

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
      isPublic : true,
      category: dto.categoryId ? ({ id: BigInt(dto.categoryId) } as any) : undefined,
      files: fileEntities,
    });

    return await this.requestRepository.save(request);
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
      registrants: dto.assigneeId ? ([{ id: BigInt(dto.assigneeId) }] as any) : [],
      assignee: dto.assigneeId ? ({ id: BigInt(dto.assigneeId) } as any) : undefined,
      title,
      description,
      dealAmount,
      deadline,
      createdAt: new Date(),
      status: RequestStatus.Pending,
      isPublic,
      category: dto.categoryId ? ({ id: BigInt(dto.categoryId) } as any) : undefined,
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

    if (assigneeUser?.email) {
      await this.mailService.sendPrivateRequestConfirmation(assigneeUser.email, {
        title,
        deadline,
        username: requesterUser.username,
      });
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
      throw new BadRequestException(`Request is not in pending status`);
    }

    // If it's a private request, refund the deposit
    if (!request.isPublic) {
      const transaction = await this.transactionRepository.findOne({
        where: {
          request: { id: requestId },
          user: { id: request.requester.id },
          status: TransactionStatus.Pending,
        },
      });

      if (transaction) {
        const wallet = await this.walletService.getOrCreateWallet(
          request.requester.id
        );
        wallet.balance = Number(wallet.balance) + Number(transaction.amount);
        transaction.status = TransactionStatus.Failed;

        await this.transactionRepository.save(transaction);
        await this.walletRepository.save(wallet);

        logger.log(
          `Refunded $${transaction.amount} to user ID ${request.requester.id} for canceled private request ID ${request.id}`
        );
      } else {
        logger.warn(
          `No pending deposit transaction found for private request ID ${request.id} and user ID ${request.requester.id}`
        );
      }
    }

    request.status = RequestStatus.Cancelled;
    await this.requestRepository.save(request);

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
      .select([
        'user.id',
        'user.fullName',
        'user.email',
        'user.phone',
        'user.createdAt',
      ])
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
      const createProjectDto: any = {
        name: request.title,
        description: request.description,
        isPrivate: true,
        tags: [],
      };

      if (request.category?.id) {
        createProjectDto.categoryId = request.category.id.toString();
      }

      const files = request.files || [];

      const { projectId } = await this.projectService.createProject(
        assigneeId,
        createProjectDto,
        files
      );

      const newProject = await this.projectRepository.findOneOrFail({
        where: { id: projectId },
      });

      request.project = newProject;
      request.status = RequestStatus.Approved;

      await queryRunner.manager.save(request);
      await queryRunner.commitTransaction();

      return {
        success: true,
        message: 'Private request accepted and project created.',
        projectId,
        requestId: request.id,
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      console.error('Accept private request failed:', err);
      throw new InternalServerErrorException('Failed to accept private request');
    } finally {
      await queryRunner.release();
    }
  }

}
