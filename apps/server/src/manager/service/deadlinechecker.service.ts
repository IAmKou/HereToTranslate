import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, Between } from 'typeorm';
import {
  RequestEntity,
  RequestStatus,
  DeadlineExtensionEntity,
  ExtensionStatus,
  // TranslationPreviewEntity
} from '#LocalProject/Entities';
// import {
//   TranslationString,
//   TranslationStringDocument,
// } from '../../db/mongo/schema/translation.schema';
// import { Model } from 'mongoose';
import { MailerService } from '@nestjs-modules/mailer';
import { addDays, subDays } from 'date-fns';
import { PaypalService } from '../service/payment-manager.service';
import { ProjectManagerService } from '../service/project-manager.service';
import { TranslationService } from '../service/translation-manager.service';
// import { InjectModel } from '@nestjs/mongoose';
import { Logger } from '@nestjs/common';

@Injectable()
export class DeadlineCheckerService {
  private readonly logger = new Logger(DeadlineCheckerService.name);

  constructor(
    @InjectRepository(RequestEntity)
    private readonly requestRepo: Repository<RequestEntity>,

    @InjectRepository(DeadlineExtensionEntity)
    private readonly extensionRepo: Repository<DeadlineExtensionEntity>,

    // @InjectRepository(TranslationPreviewEntity)
    // private readonly previewRepo: Repository<TranslationPreviewEntity>,

    private readonly mailerService: MailerService,
    private readonly paymentService: PaypalService,
    private readonly projectService: ProjectManagerService,
    private readonly translationService: TranslationService,

    // @InjectModel(TranslationString.name)
    // private readonly translationModel: Model<TranslationStringDocument>
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleDeadlines() {
    this.logger.log('Starting comprehensive deadline check...');
    const today = new Date();

    try {
      await this.handleDeadlineWarnings(today);

      await this.handleDueTodayRequests(today);

      await this.handleExtensionTimeouts(today);

      await this.handleApprovalTimeouts(today);

      await this.cleanupExpiredExtensions(today);

      this.logger.log('Comprehensive deadline check completed successfully');
    } catch (error) {
      this.logger.error('Error during deadline check:', error);
    }
  }

  private async handleDeadlineWarnings(today: Date) {
    this.logger.log('Checking for deadline warnings...');

    const soonDueRequests = await this.requestRepo.find({
      where: {
        status: RequestStatus.Approved,
        deadline: Between(today, addDays(today, 7)),
      },
      relations: ['project', 'project.createdBy', 'assignee'],
    });

    for (const req of soonDueRequests) {
      const daysLeft = Math.ceil((+req.deadline - +today) / (1000 * 60 * 60 * 24));

      if (req.assignee?.email) {
        await this.mailerService.sendMail({
          to: req.assignee.email,
          subject: '[Reminder] Translation Deadline Approaching',
          template: 'deadline-warning-translator',
          context: {
            request: req,
            daysLeft,
          },
        });
      }

      // Send warning to requester
      await this.mailerService.sendMail({
        to: req.requester.email,
        subject: '[Reminder] Translation Deadline Approaching',
        template: 'deadline-warning-requester',
        context: {
          request: req,
          daysLeft,
        },
      });
    }

    this.logger.log(`Sent deadline warnings for ${soonDueRequests.length} requests`);
  }

  private async handleDueTodayRequests(today: Date) {
    this.logger.log('Checking for requests due today...');

    const dueTodayRequests = await this.requestRepo.find({
      where: {
        status: RequestStatus.Approved,
        deadline: LessThanOrEqual(today),
      },
      relations: ['project', 'project.createdBy', 'requester', 'assignee'],
    });

    for (const req of dueTodayRequests) {
      const progress = await this.translationService.getTranslationProgress(
        req.project.id.toString(),
        req.project.defaultBranch?.id.toString() || '1'
      );

      if (progress.percentage === 100) {
        // Translation is complete - move to waiting approval
        await this.handleCompleteTranslation(req, today);
      } else {
        // Translation is incomplete - handle based on extension status
        await this.handleIncompleteTranslation(req, today, progress.percentage);
      }
    }

    this.logger.log(`Processed ${dueTodayRequests.length} due requests`);
  }

  private async handleCompleteTranslation(req: RequestEntity, today: Date) {
    this.logger.log(`Translation complete for request ${req.id}, moving to approval phase`);

    // Lock project edits
    await this.projectService.lockProjectEdits(req.project.id);

    // Update status to waiting approval
    req.status = RequestStatus.WaitingApproval;
    await this.requestRepo.save(req);

    // Export translated files (auto-export)
    try {
      // This would typically export all files in the project
      // For now, we'll just log the action
      this.logger.log(`Auto-exporting translated files for request ${req.id}`);
      // TODO: Implement actual file export and storage
    } catch (error) {
      this.logger.error(`Failed to export files for request ${req.id}:`, error);
    }

    // Send notification to requester for approval
    await this.mailerService.sendMail({
      to: req.requester.email,
      subject: '[Ready for Review] Your translation is complete',
      template: 'translation-ready-for-approval',
      context: {
        request: req,
        reviewDeadline: addDays(today, 3),
      },
    });
  }

  private async handleIncompleteTranslation(req: RequestEntity, today: Date, percentage: number) {
    this.logger.log(`Translation incomplete (${percentage}%) for request ${req.id}`);

    // Check if there's already a pending extension request
    const existingExtension = await this.extensionRepo.findOne({
      where: {
        request: { id: req.id },
        status: ExtensionStatus.PENDING,
      },
    });

    if (!existingExtension) {
      // No extension request exists - translator has 3 days to request extension
      req.status = RequestStatus.ExtensionRequested;
      await this.requestRepo.save(req);

      // Send notification to translator about deadline miss and extension option
      if (req.assignee?.email) {
        await this.mailerService.sendMail({
          to: req.assignee.email,
          subject: '[Action Required] Translation Deadline Missed',
          template: 'deadline-missed-extension-option',
          context: {
            request: req,
            percentage: percentage.toFixed(1),
            extensionDeadline: addDays(today, 3),
          },
        });
      }

      // Notify requester about delay
      await this.mailerService.sendMail({
        to: req.requester.email,
        subject: '[Delay Notice] Translation deadline missed',
        template: 'translation-delayed',
        context: {
          request: req,
          percentage: percentage.toFixed(1),
        },
      });
    }
  }

  private async handleExtensionTimeouts(today: Date) {
    this.logger.log('Checking for extension request timeouts...');

    const timeoutRequests = await this.requestRepo.find({
      where: {
        status: RequestStatus.ExtensionRequested,
        deadline: LessThanOrEqual(subDays(today, 3)),
      },
      relations: ['project', 'requester', 'assignee'],
    });

    for (const req of timeoutRequests) {
      // Translator didn't request extension within 3 days - mark as failed
      req.status = RequestStatus.Failed;
      await this.requestRepo.save(req);

      // Refund deposit to requester
      await this.paymentService.refundDeposit(req);

      // Archive project
      await this.projectService.archive(req.project);

      // Send notifications
      await this.mailerService.sendMail({
        to: req.requester.email,
        subject: '[Failed] Translation request has failed',
        template: 'translation-failed-no-extension',
        context: {
          request: req,
        },
      });

      if (req.assignee?.email) {
        await this.mailerService.sendMail({
          to: req.assignee.email,
          subject: '[Failed] Translation request failed due to timeout',
          template: 'translation-failed-timeout',
          context: {
            request: req,
          },
        });
      }
    }

    this.logger.log(`Processed ${timeoutRequests.length} extension timeouts`);
  }

  private async handleApprovalTimeouts(today: Date) {
    this.logger.log('Checking for approval timeouts...');

    const approvalTimeouts = await this.requestRepo.find({
      where: {
        status: RequestStatus.WaitingApproval,
        deadline: LessThanOrEqual(subDays(today, 3)),
      },
      relations: ['project', 'requester', 'assignee'],
    });

    for (const req of approvalTimeouts) {
      // Auto-approve after 3 days of no response
      req.status = RequestStatus.Completed;
      await this.requestRepo.save(req);

      // Process final payment to translator
      await this.paymentService.payFinal50Percent(req.id);

      // Archive project
      await this.projectService.archive(req.project);

      // Send notifications
      await this.mailerService.sendMail({
        to: req.requester.email,
        subject: '[Auto-Approved] Translation request completed',
        template: 'translation-auto-approved',
        context: {
          request: req,
        },
      });

      if (req.assignee?.email) {
        await this.mailerService.sendMail({
          to: req.assignee.email,
          subject: '[Payment Processed] Translation completed',
          template: 'translation-payment-processed',
          context: {
            request: req,
          },
        });
      }
    }

    this.logger.log(`Auto-approved ${approvalTimeouts.length} requests`);
  }

  private async cleanupExpiredExtensions(today: Date) {
    this.logger.log('Cleaning up expired extension requests...');

    // Mark extension requests as expired if they're older than 7 days and still pending
    const expiredExtensions = await this.extensionRepo.find({
      where: {
        status: ExtensionStatus.PENDING,
        createdAt: LessThanOrEqual(subDays(today, 7)),
      },
      relations: ['request'],
    });

    for (const extension of expiredExtensions) {
      extension.status = ExtensionStatus.REJECTED;
      extension.rejectionReason = 'Extension request expired due to no response';
      extension.respondedAt = today;
      await this.extensionRepo.save(extension);

      // Mark the associated request as failed
      if (extension.request.status === RequestStatus.ExtensionRequested) {
        extension.request.status = RequestStatus.Failed;
        await this.requestRepo.save(extension.request);

        // Refund and archive
        await this.paymentService.refundDeposit(extension.request);
        await this.projectService.archive(extension.request.project);
      }
    }

    this.logger.log(`Cleaned up ${expiredExtensions.length} expired extensions`);
  }

  // Additional methods for extension and approval management
  async requestDeadlineExtension(
    requestId: bigint,
    translatorId: bigint,
    requestedDays: number,
    reason: string
  ): Promise<DeadlineExtensionEntity> {
    const request = await this.requestRepo.findOne({
      where: { id: requestId },
      relations: ['requester', 'assignee'],
    });

    if (!request) {
      throw new Error('Request not found');
    }

    if (request.assignee.id !== translatorId) {
      throw new Error('Only the assigned translator can request an extension');
    }

    if (request.status !== RequestStatus.ExtensionRequested) {
      throw new Error('Request is not in a state that allows extension requests');
    }

    const extension = this.extensionRepo.create({
      request,
      translator: { id: translatorId },
      requester: { id: request.requester.id },
      requestedDays,
      reason,
      status: ExtensionStatus.PENDING,
    });

    const savedExtension = await this.extensionRepo.save(extension);

    // Send notification to requester
    await this.mailerService.sendMail({
      to: request.requester.email,
      subject: '[Extension Request] Translator requests deadline extension',
      template: 'extension-request-notification',
      context: {
        request,
        extension: savedExtension,
      },
    });

    return savedExtension;
  }

  async respondToExtensionRequest(
    extensionId: bigint,
    requesterId: bigint,
    approved: boolean,
    rejectionReason?: string
  ): Promise<void> {
    const extension = await this.extensionRepo.findOne({
      where: { id: extensionId },
      relations: ['request', 'translator', 'requester'],
    });

    if (!extension) {
      throw new Error('Extension request not found');
    }

    if (extension.requester.id !== requesterId) {
      throw new Error('Only the requester can respond to extension requests');
    }

    if (extension.status !== ExtensionStatus.PENDING) {
      throw new Error('Extension request has already been responded to');
    }

    extension.status = approved ? ExtensionStatus.APPROVED : ExtensionStatus.REJECTED;
    extension.respondedAt = new Date();
    if (rejectionReason) {
      extension.rejectionReason = rejectionReason;
    }

    await this.extensionRepo.save(extension);

    if (approved) {
      // Extend the deadline
      const newDeadline = addDays(extension.request.deadline, extension.requestedDays);
      extension.request.deadline = newDeadline;
      extension.request.status = RequestStatus.ExtensionApproved;
      await this.requestRepo.save(extension.request);

      // Send approval notification
      await this.mailerService.sendMail({
        to: extension.translator.email,
        subject: '[Approved] Deadline extension approved',
        template: 'extension-approved',
        context: {
          request: extension.request,
          extension,
          newDeadline,
        },
      });
    } else {
      // Extension rejected - mark request as failed
      extension.request.status = RequestStatus.Failed;
      await this.requestRepo.save(extension.request);

      // Refund deposit
      await this.paymentService.refundDeposit(extension.request);

      // Archive project
      await this.projectService.archive(extension.request.project);

      // Send rejection notification
      await this.mailerService.sendMail({
        to: extension.translator.email,
        subject: '[Rejected] Deadline extension rejected',
        template: 'extension-rejected',
        context: {
          request: extension.request,
          extension,
        },
      });
    }
  }
}
