import { Injectable } from '@nestjs/common';
import { Cron, CronExpression, SchedulerRegistry } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, Between } from 'typeorm';
import {
  RequestEntity,
  RequestStatus,
  DeadlineExtensionEntity,
  ExtensionStatus,
} from '#LocalProject/Entities';

import { MailerService } from '@nestjs-modules/mailer';
import { addDays, subDays } from 'date-fns';
import { PaypalService } from '../service/payment-manager.service';
import { ProjectManagerService } from '../service/project-manager.service';
import { TranslationService } from '../service/translation-manager.service';
import { Logger } from '@nestjs/common';
import { CronJob } from 'cron';

@Injectable()
export class DeadlineCheckerService {
  private readonly logger = new Logger(DeadlineCheckerService.name);

  private cronJob: CronJob;
  private isRunning = false;

  // Track sent emails to prevent duplicates
  private sentEmailTracker = new Map<string, Date>();
  private readonly EMAIL_COOLDOWN_HOURS = 24; // Don't send same email type to same user within 24 hours

  // Helper function to safely calculate days between dates
  private calculateDaysBetween(date1: Date, date2: Date): number {
    try {
      const timeDiff = date1.getTime() - date2.getTime();
      const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
      return isNaN(daysDiff) ? 0 : daysDiff;
    } catch (error) {
      this.logger.error('Error calculating days between dates:', error);
      return 0;
    }
  }

  // Helper function to safely calculate hours between dates
  private calculateHoursBetween(date1: Date, date2: Date): number {
    try {
      const timeDiff = date1.getTime() - date2.getTime();
      const hoursDiff = Math.ceil(timeDiff / (1000 * 60 * 60));
      return isNaN(hoursDiff) ? 0 : hoursDiff;
    } catch (error) {
      this.logger.error('Error calculating hours between dates:', error);
      return 0;
    }
  }

  constructor(
    @InjectRepository(RequestEntity)
    private readonly requestRepo: Repository<RequestEntity>,

    @InjectRepository(DeadlineExtensionEntity)
    private readonly extensionRepo: Repository<DeadlineExtensionEntity>,


    private readonly mailerService: MailerService,
    private readonly paymentService: PaypalService,
    private readonly projectService: ProjectManagerService,
    private readonly translationService: TranslationService,
    private readonly schedulerRegistry: SchedulerRegistry,

  ) {
    this.initializeCronJob();
  }

  private initializeCronJob() {
    this.cronJob = new CronJob('0 * * * * *', () => {
      this.handleMinuteScan();
    });

    this.schedulerRegistry.addCronJob('deadline-checker-cron', this.cronJob);

    this.cronJob.start();
    this.logger.log('Deadline checker cron job started - scanning every minute with 10-second rest');
  }

  @Cron(CronExpression.EVERY_10_SECONDS)
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

  private async handleMinuteScan() {
    if (this.isRunning) {
      this.logger.warn('Previous minute scan still running, skipping this iteration');
      return;
    }

    this.isRunning = true;
    this.logger.log('Starting minute deadline scan...');

    try {
      const today = new Date();

      await this.performQuickDeadlineChecks(today);

      this.logger.log('Minute scan completed, resting for 10 seconds...');
      await this.sleep(10000);

      this.logger.log('Rest period completed, ready for next scan');
    } catch (error) {
      this.logger.error('Error during minute deadline scan:', error);
    } finally {
      this.isRunning = false;
    }
  }

  private async performQuickDeadlineChecks(today: Date) {
    this.logger.log('Performing quick deadline checks...');

    await this.checkUrgentDeadlines(today);

    await this.checkOverdueRequests(today);

    await this.checkUrgentExtensions(today);

    this.logger.log('Quick deadline checks completed');
  }

  private async checkUrgentDeadlines(today: Date) {
    const urgentDeadlines = await this.requestRepo.find({
      where: {
        status: RequestStatus.Approved,
        deadline: Between(today, addDays(today, 1)),
      },
      relations: ['project', 'project.createdBy', 'assignee'],
    });

    if (urgentDeadlines.length > 0) {
      this.logger.log(`Found ${urgentDeadlines.length} requests with urgent deadlines`);

      for (const req of urgentDeadlines) {
        // Ensure deadline is a valid Date object
        let deadlineDate: Date;
        if (req.deadline instanceof Date) {
          deadlineDate = req.deadline;
        } else if (typeof req.deadline === 'string') {
          deadlineDate = new Date(req.deadline);
        } else {
          this.logger.error(`Invalid deadline format for request ${req.id}: ${req.deadline}`);
          continue;
        }

        // Check if the parsed date is valid
        if (isNaN(deadlineDate.getTime())) {
          this.logger.error(`Invalid deadline date for request ${req.id}: ${req.deadline}`);
          continue;
        }

        const hoursLeft = this.calculateHoursBetween(deadlineDate, today);

        if (hoursLeft <= 1) {
          this.logger.warn(`CRITICAL: Request ${req.id} due in ${hoursLeft} hour(s)`);

          if (req.assignee && req.assignee.email && this.canSendEmail('deadline-critical', req.assignee.id.toString())) {
            try {
              await this.mailerService.sendMail({
                to: req.assignee.email,
                subject: '[URGENT] Translation Deadline Critical',
                template: 'deadline-critical',
                context: {
                  request: req,
                  hoursLeft,
                },
              });
              this.markEmailSent('deadline-critical', req.assignee.id.toString());
            } catch (emailError) {
              this.logger.error(`Failed to send critical deadline email to translator for request ${req.id}:`, emailError);
              // Don't throw error to prevent crashing the deadline checker
            }
          }
        }
      }
    }
  }

  private async checkOverdueRequests(today: Date) {
    const overdueRequests = await this.requestRepo.find({
      where: {
        status: RequestStatus.Approved,
        deadline: LessThanOrEqual(today),
      },
      relations: ['project', 'requester', 'assignee'],
    });

    if (overdueRequests.length > 0) {
      this.logger.log(`Found ${overdueRequests.length} overdue requests`);

      for (const req of overdueRequests) {
        // Skip requests that are already in final states
        if (
          req.status === RequestStatus.Failed
          || req.status === RequestStatus.Completed
          || req.status === RequestStatus.WaitingApproval
          || req.status === RequestStatus.Cancelled
          || req.status === RequestStatus.Incompleted
        ) {
          this.logger.log(`Skipping request ${req.id} - already in final state: ${req.status}`);
          continue;
        }

        // Check if project exists and has a valid ID
        if (!req.project || !req.project.id) {
          this.logger.warn(`Request ${req.id} has no valid project, marking as failed`);
          req.status = RequestStatus.Failed;
          await this.requestRepo.save(req);
          continue;
        }

                 try {
           // Calculate progress for the specific target languages of this request
           let totalProgress = 0;
           let languageCount = 0;
           
           // Get target languages for this request
           const targetLanguages = Array.isArray(req.targetLanguages) && req.targetLanguages.length > 0
             ? req.targetLanguages
             : ['en']; // Default to English if no target languages specified
           
           this.logger.log(`Request ${req.id} target languages: ${JSON.stringify(targetLanguages)}`);
           
           // First, check if the project has any translation records
           const projectStatus = await this.translationService.getProjectTranslationStatus(
             req.project.id.toString(),
             req.project.defaultBranch?.id.toString() || '1'
           );
           
           this.logger.log(`Request ${req.id} project status:`, projectStatus);
           
           if (!projectStatus.hasRecords) {
             this.logger.warn(`Request ${req.id} has no translation records. Project may not have files processed yet.`);
             // Don't mark as failed - just log and continue
             continue;
           }
           
           if (!projectStatus.hasEnglishStrings) {
             this.logger.warn(`Request ${req.id} has no English base strings. Cannot calculate progress.`);
             // Don't mark as failed - just log and continue
             continue;
           }
           
           // Calculate progress for each target language
           for (const language of targetLanguages) {
             try {
               // Ensure translation records exist for this target language
               await this.translationService.ensureTranslationRecordsExist(
                 req.project.id.toString(),
                 req.project.defaultBranch?.id.toString() || '1',
                 language
               );
               
               const progress = await this.translationService.getTranslationProgress(
                 req.project.id.toString(),
                 req.project.defaultBranch?.id.toString() || '1',
                 language
               );
               
               this.logger.log(`Request ${req.id} progress for language ${language}: ${progress.percentage}% (${progress.completed}/${progress.total})`);
               
               totalProgress += progress.percentage;
               languageCount++;
             } catch (error) {
               this.logger.error(`Error calculating progress for language ${language} in request ${req.id}:`, error);
             }
           }
           
           // Calculate average progress across all target languages
           const averageProgress = languageCount > 0 ? totalProgress / languageCount : 0;
           
           this.logger.log(`Request ${req.id} average translation progress: ${averageProgress.toFixed(2)}%`);
           
           if (averageProgress >= 100) {
             // Translation is complete - move to waiting approval
             this.logger.log(`Request ${req.id} is 100% complete, moving to waiting approval`);
             await this.handleCompleteTranslation(req, today);
             continue;
           }

          // Mark as failed if translation is incomplete and deadline has passed
          if (req.status === RequestStatus.Approved) {
            req.status = RequestStatus.Failed;
            await this.requestRepo.save(req);

                         this.logger.warn(`Request ${req.id} marked as failed due to overdue deadline (progress: ${averageProgress.toFixed(2)}%)`);

            // Send overdue notification
            if (req.assignee && req.assignee.email && this.canSendEmail('deadline-overdue', req.assignee.id.toString())) {
              try {
                await this.mailerService.sendMail({
                  to: req.assignee.email,
                  subject: '[OVERDUE] Translation Request Overdue',
                  template: 'deadline-overdue',
                  context: {
                    request: req,
                  },
                });
                this.markEmailSent('deadline-overdue', req.assignee.id.toString());
              } catch (emailError) {
                this.logger.error(`Failed to send overdue notification email to translator for request ${req.id}:`, emailError);
                // Don't throw error to prevent crashing the deadline checker
              }
            }
          }
        } catch (error) {
          this.logger.error(`Error checking translation progress for request ${req.id}:`, error);
          // If we can't check progress, don't mark as failed - just log the error
        }
      }
    }
  }

  private async checkUrgentExtensions(today: Date) {
    const urgentExtensions = await this.extensionRepo.find({
      where: {
        status: ExtensionStatus.PENDING,
        createdAt: LessThanOrEqual(subDays(today, 2)),
      },
      relations: ['request', 'translator', 'requester'],
    });

    if (urgentExtensions.length > 0) {
      this.logger.log(`Found ${urgentExtensions.length} urgent extension requests`);

      for (const extension of urgentExtensions) {
        // Ensure createdAt is a valid Date object
        let createdAtDate: Date;
        if (extension.createdAt instanceof Date) {
          createdAtDate = extension.createdAt;
        } else if (typeof extension.createdAt === 'string') {
          createdAtDate = new Date(extension.createdAt);
        } else {
          this.logger.error(`Invalid createdAt format for extension ${extension.id}: ${extension.createdAt}`);
          continue;
        }

        // Check if the parsed date is valid
        if (isNaN(createdAtDate.getTime())) {
          this.logger.error(`Invalid createdAt date for extension ${extension.id}: ${extension.createdAt}`);
          continue;
        }

        const daysPending = this.calculateDaysBetween(today, createdAtDate);

        // Send reminder to requester about pending extension
        if (this.canSendEmail('extension-reminder', extension.requester.id.toString())) {
          try {
            await this.mailerService.sendMail({
              to: extension.requester.email,
              subject: '[Reminder] Pending Extension Request',
              template: 'extension-reminder',
              context: {
                request: extension.request,
                extension,
                daysPending,
              },
            });
            this.markEmailSent('extension-reminder', extension.requester.id.toString());
          } catch (emailError) {
            this.logger.error(`Failed to send extension reminder email to requester for extension ${extension.id}:`, emailError);
            // Don't throw error to prevent crashing the deadline checker
          }
        }
      }
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private canSendEmail(emailType: string, userId: string): boolean {
    const key = `${emailType}_${userId}`;
    const lastSent = this.sentEmailTracker.get(key);

    if (!lastSent) {
      return true;
    }

    const hoursSinceLastSent = (Date.now() - lastSent.getTime()) / (1000 * 60 * 60);
    return hoursSinceLastSent >= this.EMAIL_COOLDOWN_HOURS;
  }

  private markEmailSent(emailType: string, userId: string): void {
    const key = `${emailType}_${userId}`;
    this.sentEmailTracker.set(key, new Date());

    // Clean up old entries to prevent memory leaks
    if (this.sentEmailTracker.size > 1000) {
      const cutoff = new Date(Date.now() - (this.EMAIL_COOLDOWN_HOURS * 60 * 60 * 1000));
      for (const [key, date] of this.sentEmailTracker.entries()) {
        if (date < cutoff) {
          this.sentEmailTracker.delete(key);
        }
      }
    }
  }

  // Control methods for the cron job
  stopCronJob() {
    if (this.cronJob) {
      this.cronJob.stop();
      this.logger.log('Deadline checker cron job stopped');
      return { success: true, message: 'Cron job stopped successfully' };
    }
    return { success: false, message: 'Cron job not found' };
  }

  startCronJob() {
    if (this.cronJob) {
      this.cronJob.start();
      this.logger.log('Deadline checker cron job started');
      return { success: true, message: 'Cron job started successfully' };
    }
    return { success: false, message: 'Cron job not found' };
  }

  getCronStatus() {
    return {
      isRunning: this.isRunning,
      cronJobActive: this.cronJob ? (this.cronJob as any).running : false,
      lastScanTime: new Date().toISOString(),
      serviceName: 'DeadlineCheckerService',
      scanInterval: 'Every minute with 10-second rest',
      nextScanTime: this.cronJob ? this.cronJob.nextDate().toString() : 'N/A',
      emailTracking: {
        totalTrackedEmails: this.sentEmailTracker.size,
        cooldownHours: this.EMAIL_COOLDOWN_HOURS
      }
    };
  }

  // Method to get email tracking details for debugging
  getEmailTrackingDetails() {
    const now = new Date();
    const trackingDetails = [];

    for (const [key, date] of this.sentEmailTracker.entries()) {
      const hoursSinceSent = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
      trackingDetails.push({
        emailKey: key,
        lastSent: date.toISOString(),
        hoursSinceSent: Math.round(hoursSinceSent * 100) / 100,
        canSendAgain: hoursSinceSent >= this.EMAIL_COOLDOWN_HOURS
      });
    }

    return {
      totalTracked: this.sentEmailTracker.size,
      cooldownHours: this.EMAIL_COOLDOWN_HOURS,
      details: trackingDetails
    };
  }

  // Manual trigger for testing
  async triggerManualMinuteScan() {
    if (this.isRunning) {
      throw new Error('Minute scan is already running');
    }

    this.logger.log('Manual minute scan triggered');
    await this.handleMinuteScan();
  }

  private async handleDeadlineWarnings(today: Date) {
    this.logger.log('Checking for deadline warnings...');

    const soonDueRequests = await this.requestRepo.find({
      where: {
        status: RequestStatus.Approved,
        deadline: Between(today, addDays(today, 7)),
      },
      relations: ['project', 'project.createdBy', 'requester', 'assignee'],
    });

    for (const req of soonDueRequests) {
      // Debug logging to check deadline value and type
      this.logger.log(`Request ${req.id}: deadline = ${req.deadline}, type = ${typeof req.deadline}, isDate = ${req.deadline instanceof Date}`);

      // Ensure deadline is a valid Date object
      let deadlineDate: Date;
      if (req.deadline instanceof Date) {
        deadlineDate = req.deadline;
      } else if (typeof req.deadline === 'string') {
        deadlineDate = new Date(req.deadline);
      } else {
        this.logger.error(`Invalid deadline format for request ${req.id}: ${req.deadline}`);
        continue;
      }

      // Check if the parsed date is valid
      if (isNaN(deadlineDate.getTime())) {
        this.logger.error(`Invalid deadline date for request ${req.id}: ${req.deadline}`);
        continue;
      }

      const daysLeft = this.calculateDaysBetween(deadlineDate, today);

      this.logger.log(`Request ${req.id}: calculated daysLeft = ${daysLeft}`);

                if (req.assignee && req.assignee.email && this.canSendEmail('deadline-warning-translator', req.assignee.id.toString())) {
            try {
              await this.mailerService.sendMail({
                to: req.assignee.email,
                subject: '[Reminder] Translation Deadline Approaching',
                template: 'deadline-warning-translator',
                context: {
                  request: req,
                  daysLeft,
                },
              });
              this.markEmailSent('deadline-warning-translator', req.assignee.id.toString());
            } catch (emailError) {
              this.logger.error(`Failed to send deadline warning email to translator for request ${req.id}:`, emailError);
              // Don't throw error to prevent crashing the deadline checker
            }
          }

      // Send warning to requester
      if (req.requester && this.canSendEmail('deadline-warning-requester', req.requester.id.toString())) {
        try {
          await this.mailerService.sendMail({
            to: req.requester.email,
            subject: '[Reminder] Translation Deadline Approaching',
            template: 'deadline-warning-requester',
            context: {
              request: req,
              daysLeft,
            },
          });
          this.markEmailSent('deadline-warning-requester', req.requester.id.toString());
        } catch (emailError) {
          this.logger.error(`Failed to send deadline warning email to requester for request ${req.id}:`, emailError);
          // Don't throw error to prevent crashing the deadline checker
        }
      }
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
      // Calculate progress for the specific target languages of this request
      let totalProgress = 0;
      let languageCount = 0;
      
      // Get target languages for this request
      const targetLanguages = Array.isArray(req.targetLanguages) && req.targetLanguages.length > 0
        ? req.targetLanguages
        : ['en']; // Default to English if no target languages specified
      
      this.logger.log(`Request ${req.id} target languages: ${JSON.stringify(targetLanguages)}`);
      
      // First, check if the project has any translation records
      const projectStatus = await this.translationService.getProjectTranslationStatus(
        req.project.id.toString(),
        req.project.defaultBranch?.id.toString() || '1'
      );
      
      this.logger.log(`Request ${req.id} project status:`, projectStatus);
      
      if (!projectStatus.hasRecords) {
        this.logger.warn(`Request ${req.id} has no translation records. Project may not have files processed yet.`);
        // Don't mark as failed - just log and continue
        continue;
      }
      
      if (!projectStatus.hasEnglishStrings) {
        this.logger.warn(`Request ${req.id} has no English base strings. Cannot calculate progress.`);
        // Don't mark as failed - just log and continue
        continue;
      }
      
      // Calculate progress for each target language
      for (const language of targetLanguages) {
        try {
          // Ensure translation records exist for this target language
          await this.translationService.ensureTranslationRecordsExist(
            req.project.id.toString(),
            req.project.defaultBranch?.id.toString() || '1',
            language
          );
          
          const progress = await this.translationService.getTranslationProgress(
            req.project.id.toString(),
            req.project.defaultBranch?.id.toString() || '1',
            language
          );
          
          this.logger.log(`Request ${req.id} progress for language ${language}: ${progress.percentage}% (${progress.completed}/${progress.total})`);
          
          totalProgress += progress.percentage;
          languageCount++;
        } catch (error) {
          this.logger.error(`Error calculating progress for language ${language} in request ${req.id}:`, error);
        }
      }
      
      // Calculate average progress across all target languages
      const averageProgress = languageCount > 0 ? totalProgress / languageCount : 0;
      
      this.logger.log(`Request ${req.id} average progress across ${languageCount} languages: ${averageProgress.toFixed(2)}%`);

      if (averageProgress >= 100) {
        await this.handleCompleteTranslation(req, today);
      } else {
        await this.handleIncompleteTranslation(req, today, averageProgress);
      }
    }

    this.logger.log(`Processed ${dueTodayRequests.length} due requests`);
  }

  private async handleCompleteTranslation(req: RequestEntity, today: Date) {
    if (
      req.status === RequestStatus.Completed ||
      req.status === RequestStatus.WaitingApproval ||
      req.status === RequestStatus.Failed ||
      req.status === RequestStatus.Cancelled ||
      req.status === RequestStatus.Incompleted
    ) {
      this.logger.log(`Request ${req.id} is already in final state: ${req.status}, skipping completion processing`);
      return;
    }

    this.logger.log(`Translation complete for request ${req.id}, moving to approval phase`);

    await this.projectService.lockProjectEdits(req.project.id);

    req.status = RequestStatus.WaitingApproval;
    await this.requestRepo.save(req);

    try {

      this.logger.log(`Auto-exporting translated files for request ${req.id}`);
      // Export all files of the project (default to English). If request has targetLanguages, export all of them.
      const languages = Array.isArray(req.project?.targetLanguages) && req.project.targetLanguages.length > 0
        ? req.project.targetLanguages
        : ['en'];
      await this.translationService.exportProjectTranslations(req.project.id.toString(), languages as any);
    } catch (error) {
      this.logger.error(`Failed to export files for request ${req.id}:`, error);
    }

    if (req.requester && this.canSendEmail('translation-ready-for-approval', req.requester.id.toString())) {
      try {
        await this.mailerService.sendMail({
          to: req.requester.email,
          subject: '[Ready for Review] Your translation is complete',
          template: 'translation-ready-for-approval',
          context: {
            request: req,
            reviewDeadline: addDays(today, 3),
          },
        });
        this.markEmailSent('translation-ready-for-approval', req.requester.id.toString());
      } catch (emailError) {
        this.logger.error(`Failed to send translation ready for approval email to requester for request ${req.id}:`, emailError);
        // Don't throw error to prevent crashing the deadline checker
      }
    }
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
              if (req.assignee && req.assignee.email && this.canSendEmail('deadline-missed-extension-option', req.assignee.id.toString())) {
        try {
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
          this.markEmailSent('deadline-missed-extension-option', req.assignee.id.toString());
        } catch (emailError) {
          this.logger.error(`Failed to send deadline missed extension option email to translator for request ${req.id}:`, emailError);
          // Don't throw error to prevent crashing the deadline checker
        }
      }

      // Notify requester about delay
      if (req.requester && this.canSendEmail('translation-delayed', req.requester.id.toString())) {
        try {
          await this.mailerService.sendMail({
            to: req.requester.email,
            subject: '[Delay Notice] Translation deadline missed',
            template: 'translation-delayed',
            context: {
              request: req,
              percentage: percentage.toFixed(1),
            },
          });
          this.markEmailSent('translation-delayed', req.requester.id.toString());
        } catch (emailError) {
          this.logger.error(`Failed to send translation delayed email to requester for request ${req.id}:`, emailError);
          // Don't throw error to prevent crashing the deadline checker
        }
      }
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
      if (req.requester && this.canSendEmail('translation-failed-no-extension', req.requester.id.toString())) {
        try {
          await this.mailerService.sendMail({
            to: req.requester.email,
          subject: '[Failed] Translation request has failed',
          template: 'translation-failed-no-extension',
          context: {
            request: req,
          },
        });
                  this.markEmailSent('translation-failed-no-extension', req.requester.id.toString());
        } catch (emailError) {
          this.logger.error(`Failed to send translation failed email to requester for request ${req.id}:`, emailError);
          // Don't throw error to prevent crashing the deadline checker
        }
      }

      if (req.assignee && req.assignee.email && this.canSendEmail('translation-failed-timeout', req.assignee.id.toString())) {
        await this.mailerService.sendMail({
          to: req.assignee.email,
          subject: '[Failed] Translation request failed due to timeout',
          template: 'translation-failed-timeout',
          context: {
            request: req,
          },
        });
        this.markEmailSent('translation-failed-timeout', req.assignee.id.toString());
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
      // Double-check that the request is still in WaitingApproval status
      if (req.status !== RequestStatus.WaitingApproval) {
        this.logger.log(`Request ${req.id} is no longer in WaitingApproval status (current: ${req.status}), skipping`);
        continue;
      }

      // Auto-approve after 3 days of no response
      req.status = RequestStatus.Completed;
      await this.requestRepo.save(req);

      // Process final payment to translator
      await this.paymentService.payFinal50Percent(req.id);

      // Archive project
      await this.projectService.archive(req.project);

      // Send notifications
      if (req.requester && this.canSendEmail('translation-auto-approved', req.requester.id.toString())) {
        try {
          await this.mailerService.sendMail({
            to: req.requester.email,
            subject: '[Auto-Approved] Translation request completed',
            template: 'translation-auto-approved',
            context: {
              request: req,
            },
          });
          this.markEmailSent('translation-auto-approved', req.requester.id.toString());
        } catch (emailError) {
          this.logger.error(`Failed to send auto-approval email to requester for request ${req.id}:`, emailError);
          // Don't throw error to prevent crashing the deadline checker
        }
      }

      if (req.assignee && req.assignee.email && this.canSendEmail('translation-payment-processed', req.assignee.id.toString())) {
        try {
          await this.mailerService.sendMail({
            to: req.assignee.email,
            subject: '[Payment Processed] Translation completed',
            template: 'translation-payment-processed',
            context: {
              request: req,
            },
          });
          this.markEmailSent('translation-payment-processed', req.assignee.id.toString());
        } catch (emailError) {
          this.logger.error(`Failed to send payment processed email to translator for request ${req.id}:`, emailError);
          // Don't throw error to prevent crashing the deadline checker
        }
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

  // Utility method to check and fix request status
  async checkAndFixRequestStatus(requestId: bigint): Promise<{ success: boolean; message: string; currentStatus: string }> {
    try {
      const request = await this.requestRepo.findOne({
        where: { id: requestId },
        relations: ['project', 'requester', 'assignee'],
      });

      if (!request) {
        return { success: false, message: 'Request not found', currentStatus: 'NOT_FOUND' };
      }

      this.logger.log(`Checking request ${requestId} - current status: ${request.status}`);

      // If request is already in a final state, return current status
      if (
        request.status === RequestStatus.Completed ||
        request.status === RequestStatus.WaitingApproval ||
        request.status === RequestStatus.Cancelled ||
        request.status === RequestStatus.Incompleted
      ) {
        return { 
          success: true, 
          message: `Request is already in final state: ${request.status}`, 
          currentStatus: request.status 
        };
      }

             // If request is failed but should be completed, check translation progress
       if (request.status === RequestStatus.Failed && request.project) {
         try {
           // Calculate progress for the specific target languages of this request
           let totalProgress = 0;
           let languageCount = 0;
           
           // Get target languages for this request
           const targetLanguages = Array.isArray(request.targetLanguages) && request.targetLanguages.length > 0
             ? request.targetLanguages
             : ['en']; // Default to English if no target languages specified
           
           this.logger.log(`Request ${requestId} target languages: ${JSON.stringify(targetLanguages)}`);
           
           // First, check if the project has any translation records
           const projectStatus = await this.translationService.getProjectTranslationStatus(
             request.project.id.toString(),
             request.project.defaultBranch?.id.toString() || '1'
           );
           
           this.logger.log(`Request ${requestId} project status:`, projectStatus);
           
           if (!projectStatus.hasRecords) {
             this.logger.warn(`Request ${requestId} has no translation records. Project may not have files processed yet.`);
             return { 
               success: false, 
               message: `Request has no translation records. Project may not have files processed yet.`, 
               currentStatus: request.status 
             };
           }
           
           if (!projectStatus.hasEnglishStrings) {
             this.logger.warn(`Request ${requestId} has no English base strings. Cannot calculate progress.`);
             return { 
               success: false, 
               message: `Request has no English base strings. Cannot calculate progress.`, 
               currentStatus: request.status 
             };
           }
           
           // Calculate progress for each target language
           for (const language of targetLanguages) {
             try {
               // Ensure translation records exist for this target language
               await this.translationService.ensureTranslationRecordsExist(
                 request.project.id.toString(),
                 request.project.defaultBranch?.id.toString() || '1',
                 language
               );
               
               const progress = await this.translationService.getTranslationProgress(
                 request.project.id.toString(),
                 request.project.defaultBranch?.id.toString() || '1',
                 language
               );
               
               this.logger.log(`Request ${requestId} progress for language ${language}: ${progress.percentage}% (${progress.completed}/${progress.total})`);
               
               totalProgress += progress.percentage;
               languageCount++;
             } catch (error) {
               this.logger.error(`Error calculating progress for language ${language} in request ${requestId}:`, error);
             }
           }
           
           // Calculate average progress across all target languages
           const averageProgress = languageCount > 0 ? totalProgress / languageCount : 0;
           
           this.logger.log(`Request ${requestId} average translation progress: ${averageProgress.toFixed(2)}%`);

           if (averageProgress >= 100) {
             // Translation is complete, move to waiting approval
             request.status = RequestStatus.WaitingApproval;
             await this.requestRepo.save(request);
             
             this.logger.log(`Fixed request ${requestId}: moved from FAILED to WAITING_APPROVAL`);
             
             return { 
               success: true, 
               message: `Request moved from FAILED to WAITING_APPROVAL (progress: ${averageProgress.toFixed(2)}%)`, 
               currentStatus: RequestStatus.WaitingApproval 
             };
           } else {
             return { 
               success: false, 
               message: `Request is correctly FAILED (progress: ${averageProgress.toFixed(2)}%)`, 
               currentStatus: request.status 
             };
           }
        } catch (error) {
          this.logger.error(`Error checking translation progress for request ${requestId}:`, error);
          return { 
            success: false, 
            message: `Error checking translation progress: ${error instanceof Error ? error.message : 'Unknown error'}`, 
            currentStatus: request.status 
          };
        }
      }

      return { 
        success: true, 
        message: `Request status is appropriate: ${request.status}`, 
        currentStatus: request.status 
      };

    } catch (error) {
      this.logger.error(`Error checking request ${requestId}:`, error);
      return { 
        success: false, 
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`, 
        currentStatus: 'ERROR' 
      };
    }
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
    if (this.canSendEmail('extension-request-notification', request.requester.id.toString())) {
      try {
        await this.mailerService.sendMail({
          to: request.requester.email,
          subject: '[Extension Request] Translator requests deadline extension',
          template: 'extension-request-notification',
          context: {
            request,
            extension: savedExtension,
          },
        });
        this.markEmailSent('extension-request-notification', request.requester.id.toString());
      } catch (emailError) {
        this.logger.error(`Failed to send extension request notification email to requester for request ${request.id}:`, emailError);
        // Don't throw error to prevent crashing the deadline checker
      }
    }

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
      if (this.canSendEmail('extension-approved', extension.translator.id.toString())) {
        try {
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
          this.markEmailSent('extension-approved', extension.translator.id.toString());
        } catch (emailError) {
          this.logger.error(`Failed to send extension approval email to translator for extension ${extension.id}:`, emailError);
          // Don't throw error to prevent crashing the deadline checker
        }
      }
    } else {
      // Extension rejected - mark request as failed
      extension.request.status = RequestStatus.Failed;
      await this.requestRepo.save(extension.request);

      // Refund deposit
      await this.paymentService.refundDeposit(extension.request);

      // Archive project
      await this.projectService.archive(extension.request.project);

      // Send rejection notification
      if (this.canSendEmail('extension-rejected', extension.translator.id.toString())) {
        try {
          await this.mailerService.sendMail({
            to: extension.translator.email,
            subject: '[Rejected] Deadline extension rejected',
            template: 'extension-rejected',
            context: {
              request: extension.request,
              extension,
            },
          });
          this.markEmailSent('extension-rejected', extension.translator.id.toString());
        } catch (emailError) {
          this.logger.error(`Failed to send extension rejection email to translator for extension ${extension.id}:`, emailError);
          // Don't throw error to prevent crashing the deadline checker
        }
      }
    }
  }

  // Method to check progress for a specific request (for debugging)
  async checkRequestProgress(requestId: bigint): Promise<{ 
    requestId: string; 
    targetLanguages: string[]; 
    languageProgress: Array<{ language: string; progress: number; completed: number; total: number }>; 
    averageProgress: number; 
    status: string; 
    error?: string;
  }> {
    try {
      const request = await this.requestRepo.findOne({
        where: { id: requestId },
        relations: ['project', 'requester', 'assignee'],
      });

      if (!request) {
        throw new Error('Request not found');
      }

      // Get target languages for this request
      const targetLanguages = Array.isArray(request.targetLanguages) && request.targetLanguages.length > 0
        ? request.targetLanguages
        : ['en']; // Default to English if no target languages specified

      const languageProgress = [];
      let totalProgress = 0;
      let languageCount = 0;

      // First, check if the project has any translation records
      const projectStatus = await this.translationService.getProjectTranslationStatus(
        request.project.id.toString(),
        request.project.defaultBranch?.id.toString() || '1'
      );
      
      this.logger.log(`Request ${requestId} project status:`, projectStatus);
      
      if (!projectStatus.hasRecords) {
        this.logger.warn(`Request ${requestId} has no translation records. Project may not have files processed yet.`);
        return {
          requestId: requestId.toString(),
          targetLanguages,
          languageProgress: targetLanguages.map(lang => ({
            language: lang,
            progress: 0,
            completed: 0,
            total: 0,
          })),
          averageProgress: 0,
          status: request.status,
          error: 'No translation records found. Project may not have files processed yet.'
        };
      }
      
      if (!projectStatus.hasEnglishStrings) {
        this.logger.warn(`Request ${requestId} has no English base strings. Cannot calculate progress.`);
        return {
          requestId: requestId.toString(),
          targetLanguages,
          languageProgress: targetLanguages.map(lang => ({
            language: lang,
            progress: 0,
            completed: 0,
            total: 0,
          })),
          averageProgress: 0,
          status: request.status,
          error: 'No English base strings found. Cannot calculate progress.'
        };
      }

      // Calculate progress for each target language
      for (const language of targetLanguages) {
        try {
          // Ensure translation records exist for this target language
          await this.translationService.ensureTranslationRecordsExist(
            request.project.id.toString(),
            request.project.defaultBranch?.id.toString() || '1',
            language
          );
          
          const progress = await this.translationService.getTranslationProgress(
            request.project.id.toString(),
            request.project.defaultBranch?.id.toString() || '1',
            language
          );

          languageProgress.push({
            language,
            progress: progress.percentage,
            completed: progress.completed,
            total: progress.total,
          });

          totalProgress += progress.percentage;
          languageCount++;
        } catch (error) {
          this.logger.error(`Error calculating progress for language ${language} in request ${requestId}:`, error);
          languageProgress.push({
            language,
            progress: 0,
            completed: 0,
            total: 0,
          });
        }
      }

      // Calculate average progress across all target languages
      const averageProgress = languageCount > 0 ? totalProgress / languageCount : 0;

      return {
        requestId: requestId.toString(),
        targetLanguages,
        languageProgress,
        averageProgress: Math.round(averageProgress * 100) / 100,
        status: request.status,
      };

    } catch (error) {
      this.logger.error(`Error checking progress for request ${requestId}:`, error);
      throw error;
    }
  }
}
