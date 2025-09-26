import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RequestEntity, RequestStatus } from '#LocalProject/Entities';
import { RequestReviewEntity, ReviewStatus } from '../../db/mysql/entity/request-review.entity';
import { AdminReviewEntity, AdminReviewDecision } from '../../db/mysql/entity/admin-review.entity';
import { UserEntity } from '../../db/mysql/entity/user.entity';
import { FileEntity } from '../../db/mysql/entity/file.entity';
import { NotificationManagerService } from './notification-manager.service';
import { PaypalService } from './payment-manager.service';

@Injectable()
export class AdminReviewService {
  private readonly logger = new Logger(AdminReviewService.name);

  constructor(
    @InjectRepository(RequestEntity)
    private readonly requestRepository: Repository<RequestEntity>,
    @InjectRepository(RequestReviewEntity)
    private readonly requestReviewRepository: Repository<RequestReviewEntity>,
    @InjectRepository(UserEntity)
    private readonly _userRepository: Repository<UserEntity>,
    @InjectRepository(FileEntity)
    private readonly fileRepository: Repository<FileEntity>,
    @InjectRepository(AdminReviewEntity)
    private readonly adminReviewRepository: Repository<AdminReviewEntity>,
    private readonly notificationService: NotificationManagerService,
    private readonly paymentManagerService: PaypalService,
  ) {}

  async getPendingReviews() {
    this.logger.log('Getting pending admin reviews...');

    const pendingRequests = await this.requestRepository.find({
      where: { status: RequestStatus.PendingAdminReview },
      relations: ['requester', 'assignee', 'project'],
      order: { createdAt: 'DESC' }
    });

    const results = [] as any[];
    for (const request of pendingRequests) {
      // Get latest review for rating/comment/time
      const latestReview = await this.requestReviewRepository.findOne({
        where: { request: { id: request.id } as any },
        order: { createdAt: 'DESC' },
        relations: ['reviewer']
      });

      // Heuristic evidence count: files linked to this request and uploaded after review time
      // (không tạo entity mới, tạm thời phân biệt theo mốc thời gian)
      let evidenceFilesCount = 0;
      if (latestReview?.createdAt) {
        evidenceFilesCount = await this.fileRepository.count({
          where: {
            request: { id: request.id } as any,
          } as any,
        });
      } else {
        evidenceFilesCount = await this.fileRepository.count({
          where: { request: { id: request.id } as any } as any,
        });
      }

      results.push({
        id: request.id.toString(),
        title: request.title,
        description: request.description,
        requesterId: request.requester?.id?.toString(),
        requesterName: request.requester?.fullName || request.requester?.username || 'N/A',
        translatorId: request.assignee?.id?.toString(),
        translatorName: request.assignee?.fullName || request.assignee?.username || 'N/A',
        dealAmount: request.dealAmount,
        deadline: request.deadline,
        createdAt: request.createdAt,
        reviewedAt: latestReview?.createdAt || null,
        reviewDecision: latestReview ? (latestReview.status === ReviewStatus.Success ? 'APPROVED' : 'REJECTED') : null,
        reviewRating: latestReview?.starRating ?? null,
        reviewComment: latestReview?.comment ?? null,
        evidenceFilesCount,
        project: request.project ? {
          id: request.project.id.toString(),
          name: request.project.name,
        } : null,
      });
    }

    return results;
  }

  async getReviewDetails(requestId: bigint) {
    this.logger.log(`Getting review details for request ${requestId}...`);

    const request = await this.requestRepository.findOne({
      where: { id: requestId },
      relations: ['requester', 'assignee', 'project', 'files']
    });

    if (!request) {
      throw new NotFoundException('Request not found');
    }

    // Get the review record
    const review = await this.requestReviewRepository.findOne({
      where: { request: { id: requestId } },
      relations: ['reviewer']
    });

    // Extract comment and rejectionReason (fallback parse from comment if request field missing)
    let plainComment: string = review?.comment || '';
    let parsedRejectionReason: string | null = (request as any)?.rejectionReason || null;
    if (!parsedRejectionReason && plainComment) {
      try {
        const m = plainComment.match(/(?:^|\n)Reason:\s*(.+)$/i);
        if (m && m[1]) {
          parsedRejectionReason = m[1].trim();
          // Remove the Reason line from comment for cleaner display
          plainComment = plainComment.replace(/(?:^|\n)Reason:\s*.+$/i, '').trim();
        }
      } catch (e) {
        // ignore parse errors
      }
    }

    // Get evidence files (files uploaded with the review)
    const evidenceFiles = await this.fileRepository.find({
      where: {
        request: { id: requestId },
        // We can identify evidence files by checking if they were uploaded recently
        // or by adding a field to track evidence files
      },
      order: { createdAt: 'DESC' }
    });

    return {
      id: request.id.toString(),
      title: request.title,
      description: request.description,
      status: request.status,
      dealAmount: request.dealAmount,
      deadline: request.deadline,
      createdAt: request.createdAt,
      reviewedAt: review?.createdAt || null,
      requester: {
        id: request.requester?.id?.toString(),
        name: request.requester?.fullName || request.requester?.username || '',
        email: request.requester?.email || ''
      },
      translator: request.assignee ? {
        id: request.assignee?.id?.toString(),
        name: request.assignee?.fullName || request.assignee?.username || '',
        email: request.assignee?.email || '',
        rating: (request.assignee as any)?.rating ?? null,
        reviewCount: (request.assignee as any)?.reviewCount ?? null,
      } : null,
      reviewData: review ? {
        id: review.id.toString(),
        decision: review.status === ReviewStatus.Success ? 'APPROVED' : 'REJECTED',
        rating: review.starRating,
        comment: plainComment,
        rejectionReason: parsedRejectionReason,
        reviewedAt: review.createdAt,
      } : {
        decision: null,
        rating: null,
        comment: null,
        rejectionReason: parsedRejectionReason,
        reviewedAt: null,
      },
      evidenceFiles: evidenceFiles.map(file => ({
        id: file.id.toString(),
        fileName: file.fileName,
        fileType: file.fileType,
        fileSize: file.fileContent?.length || 0,
        createdAt: file.createdAt,
      })),
    };
  }

  async submitAdminDecision(
    requestId: bigint,
    adminId: bigint,
    decision: 'APPROVE_TRANSLATOR' | 'APPROVE_REQUESTER',
    reason: string,
    adminNotes?: string,
    requesterRating?: number,
    requesterComment?: string
  ) {
    this.logger.log(`Admin ${adminId} submitting decision for request ${requestId}: ${decision}`);

    const request = await this.requestRepository.findOne({
      where: { id: requestId },
      relations: ['requester', 'assignee']
    });

    if (!request) {
      throw new NotFoundException('Request not found');
    }

    if (request.status !== RequestStatus.PendingAdminReview) {
      throw new BadRequestException('Request is not pending admin review');
    }

    return await this.requestRepository.manager.transaction(async (manager) => {
      // Update request status based on admin decision
      if (decision === 'APPROVE_TRANSLATOR') {
        // Admin approves translator, reject requester's rejection
        // Set back to WAITING_APPROVAL so requester can approve and pay
        request.status = RequestStatus.WaitingApproval;

        // Update review status to Success
        const review = await manager.findOne(RequestReviewEntity, {
          where: { request: { id: requestId } }
        });

        if (review) {
          review.status = ReviewStatus.Success;
          await manager.save(review);
        }
      } else {
        // Admin approves requester's rejection
        request.status = RequestStatus.Incompleted;

        // Update review status to Failed
        const review = await manager.findOne(RequestReviewEntity, {
          where: { request: { id: requestId } }
        });

        if (review) {
          review.status = ReviewStatus.Failed;
          await manager.save(review);
        }

        // When admin approves requester, create a review record for the requester
        // This represents the requester's feedback about the translator's work
        try {
          // Check if requester review already exists
          const existingRequesterReview = await manager.findOne(RequestReviewEntity, {
            where: { 
              request: { id: requestId },
              reviewer: { id: request.requester.id }
            }
          });

          if (!existingRequesterReview) {
            // Create a new review record for the requester
            const requesterReview = manager.create(RequestReviewEntity, {
              request: { id: requestId } as any,
              reviewer: { id: request.requester.id } as any,
              starRating: requesterRating || 1, // Use requester's actual rating or default to 1
              comment: requesterComment || adminNotes || 'Translation rejected by requester and approved by admin',
              status: ReviewStatus.Failed,
            });
            await manager.save(requesterReview);
            this.logger.log(`Created requester review record for request ${requestId} with rating ${requesterRating || 1}`);
          } else {
            // Update existing requester review
            existingRequesterReview.status = ReviewStatus.Failed;
            existingRequesterReview.starRating = requesterRating || existingRequesterReview.starRating || 1;
            existingRequesterReview.comment = requesterComment || adminNotes || existingRequesterReview.comment || 'Translation rejected by requester and approved by admin';
            await manager.save(existingRequesterReview);
            this.logger.log(`Updated existing requester review record for request ${requestId} with rating ${requesterRating || existingRequesterReview.starRating}`);
          }
        } catch (reviewError) {
          this.logger.error(`Failed to create/update requester review for request ${requestId}: ${reviewError}`);
          // Don't throw error - continue with refund process
        }

        // Process refund for the requester since admin approved their rejection
        try {
          await this.paymentManagerService.refundDeposit(request);
          this.logger.log(`Refund processed for request ${requestId} after admin approved requester's rejection`);
        } catch (refundError) {
          this.logger.error(`Failed to process refund for request ${requestId}: ${refundError}`);
          // Don't throw error here - admin decision should still be recorded even if refund fails
          // The refund can be processed manually later
        }
      }

      // Add admin notes to request (if field exists)
      if ('adminNotes' in request) {
        (request as any).adminNotes = adminNotes || '';
      }

      // Find existing admin review record or create new one
      let adminReview = await manager.findOne(AdminReviewEntity, {
        where: { request: { id: requestId } }
      });

      if (adminReview) {
        // Update existing admin review record
        adminReview.decision = decision === 'APPROVE_TRANSLATOR'
          ? AdminReviewDecision.ApproveTranslator
          : AdminReviewDecision.ApproveRequester;
        adminReview.reason = reason;
        adminReview.admin = { id: adminId } as any;
        await manager.save(adminReview);
      } else {
        // Create new admin review record if none exists
        adminReview = manager.create(AdminReviewEntity, {
          request: { id: requestId } as any,
          admin: { id: adminId } as any,
          decision: decision === 'APPROVE_TRANSLATOR'
            ? AdminReviewDecision.ApproveTranslator
            : AdminReviewDecision.ApproveRequester,
          reason,
        });
        await manager.save(adminReview);
      }

      // Send notifications to requester and translator
      const requesterId = request.requester?.id;
      const translatorId = request.assignee?.id;
      const notifyMessage = decision === 'APPROVE_TRANSLATOR'
        ? 'Admin decided in favor of the translator. The request returns to Waiting Approval.'
        : 'Admin decided in favor of the requester. The translation is rejected and your deposit has been refunded.';

      if (requesterId) {
        await this.notificationService.createNotification({
          userId: requesterId,
          type: 'ADMIN_REVIEW_DECISION',
          message: `Request ${request.id.toString()}: ${notifyMessage}`,
          createdBy: adminId,
        });
      }

      if (translatorId) {
        await this.notificationService.createNotification({
          userId: translatorId,
          type: 'ADMIN_REVIEW_DECISION',
          message: `Request ${request.id.toString()}: ${notifyMessage}`,
          createdBy: adminId,
        });
      }

      await manager.save(request);

      this.logger.log(`Admin decision submitted: ${decision} for request ${requestId}`);

      return {
        success: true,
        requestId: request.id.toString(),
        decision,
        reason,
        adminNotes,
        requesterRating,
        requesterComment,
        newStatus: request.status,
        message: decision === 'APPROVE_TRANSLATOR'
          ? 'Admin đã ủng hộ translator. Requester cần approve và thanh toán để hoàn thành.'
          : `Admin đã ủng hộ requester. Translation bị từ chối và deposit đã được refund tự động. Requester rating: ${requesterRating || 1} stars.`
      };
    });
  }
}
