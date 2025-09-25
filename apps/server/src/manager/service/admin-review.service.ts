import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RequestEntity, RequestStatus } from '#LocalProject/Entities';
import { RequestReviewEntity, ReviewStatus } from '../../db/mysql/entity/request-review.entity';
import { UserEntity } from '../../db/mysql/entity/user.entity';
import { FileEntity } from '../../db/mysql/entity/file.entity';

@Injectable()
export class AdminReviewService {
  private readonly logger = new Logger(AdminReviewService.name);

  constructor(
    @InjectRepository(RequestEntity)
    private readonly requestRepository: Repository<RequestEntity>,
    @InjectRepository(RequestReviewEntity)
    private readonly requestReviewRepository: Repository<RequestReviewEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(FileEntity)
    private readonly fileRepository: Repository<FileEntity>,
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
        reviewedAt: request.reviewedAt || latestReview?.createdAt || null,
        reviewDecision: request.reviewDecision || (latestReview ? (latestReview.status === ReviewStatus.Success ? 'APPROVED' : 'REJECTED') : null),
        reviewRating: request.reviewRating ?? latestReview?.starRating ?? null,
        reviewComment: request.reviewComment ?? latestReview?.comment ?? null,
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
      } catch {}
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
      reviewedAt: request.reviewedAt,
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
        reviewedAt: request.reviewedAt || review.createdAt,
      } : {
        decision: null,
        rating: null,
        comment: null,
        rejectionReason: parsedRejectionReason,
        reviewedAt: request.reviewedAt || null,
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
    adminNotes?: string
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
      }

      // Add admin notes to request (if field exists)
      if ('adminNotes' in request) {
        (request as any).adminNotes = adminNotes || '';
      }

      await manager.save(request);

      this.logger.log(`Admin decision submitted: ${decision} for request ${requestId}`);

      return {
        success: true,
        requestId: request.id.toString(),
        decision,
        reason,
        adminNotes,
        newStatus: request.status,
        message: decision === 'APPROVE_TRANSLATOR'
          ? 'Admin đã ủng hộ translator. Requester cần approve và thanh toán để hoàn thành.'
          : 'Admin đã ủng hộ requester. Translation bị từ chối và requester được refund.'
      };
    });
  }
}
