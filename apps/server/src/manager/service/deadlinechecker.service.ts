import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, Between } from 'typeorm';
import { RequestEntity, RequestStatus } from '#LocalProject/Entities';
import {
  TranslationString,
  TranslationStringDocument,
} from '../../db/mongo/schema/translation.schema';
import { Model } from 'mongoose';
import { MailerService } from '@nestjs-modules/mailer';
import { addDays, subDays } from 'date-fns';
import { PaymentService } from '../service/payment-manager.service';
import { ProjectService } from '../service/project-manager.service';
import { InjectModel } from '@nestjs/mongoose';

@Injectable()
export class DeadlineCheckerService {
  constructor(
    @InjectRepository(RequestEntity)
    private readonly requestRepo: Repository<RequestEntity>,

    private readonly mailerService: MailerService,
    private readonly paymentService: PaymentService,
    private readonly projectService: ProjectService,

    @InjectModel(TranslationString.name)
    private readonly translationModel: Model<TranslationStringDocument>
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleDeadlines() {
    const today = new Date();

    const soonDueRequests = await this.requestRepo.find({
      where: {
        status: RequestStatus.Approved,
        deadline: Between(today, addDays(today, 7)),
      },
      relations: ['project', 'project.createdBy'],
    });

    for (const req of soonDueRequests) {
      await this.mailerService.sendMail({
        to: req.project.createdBy.email,
        subject: '[Reminder] Translation Deadline Approaching',
        template: 'deadline-warning',
        context: {
          request: req,
          daysLeft: Math.ceil((+req.deadline - +today) / (1000 * 60 * 60 * 24)),
        },
      });
    }

    const dueTodayRequests = await this.requestRepo.find({
      where: {
        status: RequestStatus.Approved,
        deadline: today,
      },
      relations: ['project', 'project.createdBy', 'requester'],
    });

    for (const req of dueTodayRequests) {
      const total = await this.translationModel.countDocuments({
        projectId: req.project.id.toString(),
      });
      const done = await this.translationModel.countDocuments({
        projectId: req.project.id.toString(),
        translatedText: { $nin: [null, ''] },
      });
      const percent = (done / Math.max(total, 1)) * 100;

      req.status = RequestStatus.DeliveryPending;
      await this.requestRepo.save(req);

      await this.projectService.lockProjectEdits(req.project.id);

      await this.mailerService.sendMail({
        to: req.requester.email,
        subject: '[Delivery] Your translation request is ready for review',
        template: 'translation-delivered',
        context: {
          request: req,
          percentDone: percent.toFixed(1),
          reviewDeadline: addDays(today, 3),
        },
      });
    }

    const deliveryExpired = await this.requestRepo.find({
      where: {
        status: RequestStatus.DeliveryPending,
        deadline: LessThanOrEqual(subDays(today, 3)),
      },
      relations: ['project', 'requester'],
    });

    for (const req of deliveryExpired) {
      const total = await this.translationModel.countDocuments({
        projectId: req.project.id.toString(),
      });
      const done = await this.translationModel.countDocuments({
        projectId: req.project.id.toString(),
        translatedText: { $nin: [null, ''] },
      });
      const percent = (done / Math.max(total, 1)) * 100;

      if (percent >= 90) {
        req.status = RequestStatus.Completed;
      } else {
        req.status = RequestStatus.Failed;
        await this.paymentService.refundDeposit(req);
        await this.mailerService.sendMail({
          to: req.requester.email,
          subject: '[Failed] Translation request has failed',
          template: 'deadline-failed',
          context: {
            request: req,
            percentDone: percent.toFixed(1),
          },
        });
      }

      await this.requestRepo.save(req);
      await this.projectService.archive(req.project);
    }
  }
}
