import { Injectable, Logger, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ProjectEntity,
  RequestEntity,
  RequestStatus,
  ProjectCancellationEntity,
  CancellationType,
  CancellationStatus,
  UserEntity,
  TransactionEntity,
  TransactionStatus,
} from '#LocalProject/Entities';
import { PaypalService } from './payment-manager.service';
import { ProjectManagerService } from './project-manager.service';
import { MailerService } from '@nestjs-modules/mailer';
import { NotificationManagerService } from './notification-manager.service';
import { CancellationAction } from '#LocalProject/Dtos';

@Injectable()
export class ProjectCancellationService {
  private readonly logger = new Logger(ProjectCancellationService.name);

  constructor(
    @InjectRepository(ProjectCancellationEntity)
    private readonly cancellationRepo: Repository<ProjectCancellationEntity>,
    @InjectRepository(RequestEntity)
    private readonly requestRepo: Repository<RequestEntity>,
    @InjectRepository(ProjectEntity)
    private readonly projectRepo: Repository<ProjectEntity>,
    @InjectRepository(TransactionEntity)
    private readonly transactionRepo: Repository<TransactionEntity>,
    private readonly paymentService: PaypalService,
    private readonly projectService: ProjectManagerService,
    private readonly mailerService: MailerService,
    private readonly notificationService: NotificationManagerService,
  ) {}

  async requestCancellation(
    requestId: bigint,
    initiatorId: bigint,
    reason: string,
    action: CancellationAction
  ): Promise<ProjectCancellationEntity> {
    this.logger.log(`Processing cancellation request for request ${requestId} by user ${initiatorId}`);

    const request = await this.requestRepo.findOne({
      where: { id: requestId },
      relations: ['requester', 'assignee', 'project'],
    });

    if (!request) {
      throw new NotFoundException('Request not found');
    }

    // Validate that the initiator is either requester or translator (use separate id vars to avoid any name confusion)
    const requesterId = request.requester?.id;
    const translatorId = request.assignee?.id;
    this.logger.log(`Auth check -> requesterId=${requesterId?.toString?.() ?? requesterId}, assigneeId=${translatorId?.toString?.() ?? translatorId}, initiatorId=${initiatorId?.toString?.() ?? initiatorId}`);
    const isRequester = requesterId?.toString?.() === initiatorId?.toString?.();
    const isTranslator = translatorId?.toString?.() === initiatorId?.toString?.();

    if (!isRequester && !isTranslator) {
      throw new ForbiddenException('Only the requester or translator can cancel this request');
    }

    // Check if request can be cancelled
    const cancellableStatuses = [
      RequestStatus.Approved,
      RequestStatus.WaitingApproval,
      RequestStatus.ExtensionRequested,
      RequestStatus.ExtensionApproved,
    ];

    if (!cancellableStatuses.includes(request.status)) {
      throw new BadRequestException(`Request cannot be cancelled in status: ${request.status}`);
    }

    // Check for existing pending cancellation
    const existingCancellation = await this.cancellationRepo.findOne({
      where: {
        request: { id: requestId },
        status: CancellationStatus.PENDING,
      },
    });

    if (existingCancellation) {
      throw new BadRequestException('There is already a pending cancellation request');
    }

    const cancellationType = isRequester ? CancellationType.REQUESTER_INITIATED : CancellationType.TRANSLATOR_INITIATED;
    // Cập nhật: cả requester và translator hủy đều xử lý ngay, không cần xác nhận
    const requiresConfirmation = false;
    // Always archive instead of hard delete for cancellation safety
    const isArchiveOnly = true;

    // Create cancellation request
    const cancellation = this.cancellationRepo.create({
      project: request.project || null,
      request,
      initiator: { id: initiatorId },
      cancellationType,
      reason,
      requiresConfirmation,
      isArchiveOnly,
      status: requiresConfirmation ? CancellationStatus.PENDING : CancellationStatus.CONFIRMED,
    });

    const savedCancellation = await this.cancellationRepo.save(cancellation);

    // Xử lý huỷ ngay
    await this.processCancellation(savedCancellation);

    return savedCancellation;
  }

  async respondToCancellation(
    cancellationId: bigint,
    responderId: bigint,
    approved: boolean,
    responseReason?: string
  ): Promise<void> {
    const cancellation = await this.cancellationRepo.findOne({
      where: { id: cancellationId },
      relations: ['request', 'project', 'initiator'],
    });

    if (!cancellation) {
      throw new NotFoundException('Cancellation request not found');
    }

    if (cancellation.status !== CancellationStatus.PENDING) {
      throw new BadRequestException('Cancellation request has already been responded to');
    }

    // Validate responder
    const request = cancellation.request;
    const isValidResponder =
      (cancellation.cancellationType === CancellationType.REQUESTER_INITIATED && request.assignee?.id === responderId) ||
      (cancellation.cancellationType === CancellationType.TRANSLATOR_INITIATED && request.requester.id === responderId);

    if (!isValidResponder) {
      throw new ForbiddenException('You are not authorized to respond to this cancellation request');
    }

    // Update cancellation
    cancellation.responder = { id: responderId } as UserEntity;
    cancellation.status = approved ? CancellationStatus.CONFIRMED : CancellationStatus.REJECTED;
    cancellation.responseReason = responseReason;
    cancellation.respondedAt = new Date();

    await this.cancellationRepo.save(cancellation);

    if (approved) {
      // Process the cancellation
      await this.processCancellation(cancellation);
    } else {
      // Revert request status back to previous state
      request.status = RequestStatus.Approved; // or determine previous status
      await this.requestRepo.save(request);

      // Notify initiator of rejection
      await this.sendCancellationRejectedNotification(cancellation);
    }
  }

  private async processCancellation(cancellation: ProjectCancellationEntity): Promise<void> {
    this.logger.log(`Processing cancellation ${cancellation.id}`);

    const request = cancellation.request;
    const project = cancellation.project;

    try {
      // Handle refunds/penalties based on who initiated
      if (cancellation.cancellationType === CancellationType.TRANSLATOR_INITIATED) {
        await this.paymentService.refundDeposit(request);
        this.logger.log(`Full refund processed for translator-initiated cancellation`);
      } else {
        // Requester cancels: requester loses deposit -> pay deposit to translator
        await this.paymentService.payoutDepositToTranslator(request);
        this.logger.log(`Deposit paid to translator for requester-initiated cancellation`);
      }

      // Archive project and mark request as CANCELLED to reflect final state in UI
      request.status = RequestStatus.Cancelled;
      await this.requestRepo.save(request);
      if (project) {
        // Soft-archive project without deleting child rows to avoid FK issues
        project.isArchived = true as any;
        await this.projectRepo.save(project);
      }

      // Mark cancellation as completed
      cancellation.status = CancellationStatus.COMPLETED;
      cancellation.completedAt = new Date();
      await this.cancellationRepo.save(cancellation);

      // Send completion notifications
      await this.sendCancellationCompletedNotifications(cancellation);

      this.logger.log(`Cancellation ${cancellation.id} processed successfully`);
    } catch (error) {
      this.logger.error(`Failed to process cancellation ${cancellation.id}:`, error);
      throw error;
    }
  }

  private async markDepositAsLost(request: RequestEntity): Promise<void> {
    // Find the deposit transaction
    const depositTransaction = await this.transactionRepo.findOne({
      where: {
        request: { id: request.id },
        user: { id: request.requester.id },
        status: TransactionStatus.Pending,
      },
    });

    if (depositTransaction) {
      // Mark as completed (lost to platform)
      depositTransaction.status = TransactionStatus.Completed;
      await this.transactionRepo.save(depositTransaction);
    }
  }

  private async sendCancellationNotification(
    cancellation: ProjectCancellationEntity,
    recipientId: bigint
  ): Promise<void> {
    const isRequesterInitiated = cancellation.cancellationType === CancellationType.REQUESTER_INITIATED;

    await this.notificationService.createNotification({
      userId: recipientId,
      type: 'CANCELLATION_REQUEST',
      message: `${isRequesterInitiated ? 'Requester' : 'Translator'} has requested to ${cancellation.isArchiveOnly ? 'archive' : 'delete'} the project: "${cancellation.request.title}"`,
      createdBy: cancellation.initiator.id,
    });

    // Send email notification
  }

  private async sendCancellationRejectedNotification(
    cancellation: ProjectCancellationEntity
  ): Promise<void> {
    await this.notificationService.createNotification({
      userId: cancellation.initiator.id,
      type: 'CANCELLATION_REJECTED',
      message: `Your cancellation request for project "${cancellation.request.title}" has been rejected.`,
      createdBy: cancellation.responder?.id || BigInt(1),
    });
  }

  private async sendCancellationCompletedNotifications(
    cancellation: ProjectCancellationEntity
  ): Promise<void> {
    const request = cancellation.request;
    const action = cancellation.isArchiveOnly ? 'archived' : 'deleted';

    // Notify initiator
    await this.notificationService.createNotification({
      userId: cancellation.initiator.id,
      type: 'CANCELLATION_COMPLETED',
      message: `Project "${request.title}" has been ${action} successfully.`,
      createdBy: BigInt(1), // System
    });

    // Notify responder if exists
    if (cancellation.responder) {
      await this.notificationService.createNotification({
        userId: cancellation.responder.id,
        type: 'CANCELLATION_COMPLETED',
        message: `Project "${request.title}" has been ${action}.`,
        createdBy: BigInt(1), // System
      });
    }
  }

  async getCancellationSummary(requestId: bigint, userId: bigint): Promise<any> {
    const request = await this.requestRepo.findOne({
      where: { id: requestId },
      relations: ['requester', 'assignee', 'project'],
    });

    if (!request) {
      throw new NotFoundException('Request not found');
    }

    const isRequester = request.requester.id?.toString?.() === userId?.toString?.();
    const isTranslator = request.assignee?.id?.toString?.() === userId?.toString?.();
    this.logger.log(
      `Summary auth check -> requesterId=${request.requester.id?.toString?.() ?? request.requester.id}, assigneeId=${request.assignee?.id?.toString?.() ?? request.assignee?.id}, userId=${userId?.toString?.() ?? userId}`
    );

    if (!isRequester && !isTranslator) {
      const res = {
        canCancel: false,
        message: 'You are not authorized to cancel this request',
      };
      this.logger.log(`Summary result:`, res);
      return res;
    }

    // Check if request can be cancelled
    const cancellableStatuses = [
      RequestStatus.Approved,
      RequestStatus.WaitingApproval,
      RequestStatus.ExtensionRequested,
      RequestStatus.ExtensionApproved,
    ];

    if (!cancellableStatuses.includes(request.status)) {
      const res = {
        canCancel: false,
        message: `Request cannot be cancelled in status: ${request.status}`,
      };
      this.logger.log(`Summary result:`, res);
      return res;
    }

    const cancellationType = isRequester ? 'REQUESTER_INITIATED' : 'TRANSLATOR_INITIATED';
    let refundAmount = 0;
    let penaltyAmount = 0;

    if (isTranslator) {
      // Translator cancels - requester gets full refund
      refundAmount = request.dealAmount;
    } else {
      // Requester cancels - loses deposit
      penaltyAmount = request.dealAmount;
    }

    // Translator-initiated cancellations do not require confirmation (both ARCHIVE and DELETE)
    const requiresConfirmation = isRequester; // requester requires confirmation for DELETE

    const res = {
      canCancel: true,
      cancellationType,
      refundAmount,
      penaltyAmount,
      requiresConfirmation,
      message: isTranslator
        ? 'If you cancel, the requester will receive a full refund.'
        : 'If you cancel, you will lose your deposit.',
    };
    this.logger.log(`Summary result:`, res);
    return res;
  }

  async getPendingCancellations(userId: bigint): Promise<ProjectCancellationEntity[]> {
    return this.cancellationRepo.find({
      where: [
        { initiator: { id: userId }, status: CancellationStatus.PENDING },
        { responder: { id: userId }, status: CancellationStatus.PENDING },
      ],
      relations: ['request', 'project', 'initiator', 'responder'],
      order: { createdAt: 'DESC' },
    });
  }
}
