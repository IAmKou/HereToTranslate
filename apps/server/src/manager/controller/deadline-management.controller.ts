import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  UseGuards,
  Request,
  BadRequestException,
  NotFoundException,
  Response,
} from '@nestjs/common';
import { JwtAuthGuard } from '#LocalProject/Auth/guards/jwt.guard';
import { DeadlineCheckerService } from '../service/deadlinechecker.service';
import { TranslationService } from '../service/translation-manager.service';
import { PaypalService } from '../service/payment-manager.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  RequestEntity,
  RequestStatus,
  DeadlineExtensionEntity,
  ExtensionStatus,
  TranslationPreviewEntity,
} from '#LocalProject/Entities';
import {
  CreateDeadlineExtensionDto,
  RespondToExtensionDto,
  CreateTranslationPreviewDto,
  ApproveTranslationDto,
} from '#LocalProject/Dtos';
import { addDays } from 'date-fns';

@Controller('deadline-management')
@UseGuards(JwtAuthGuard)
export class DeadlineManagementController {
  constructor(
    private readonly deadlineService: DeadlineCheckerService,
    private readonly translationService: TranslationService,
    private readonly paymentService: PaypalService,
    @InjectRepository(RequestEntity)
    private readonly requestRepo: Repository<RequestEntity>,
    @InjectRepository(DeadlineExtensionEntity)
    private readonly extensionRepo: Repository<DeadlineExtensionEntity>,
    @InjectRepository(TranslationPreviewEntity)
    private readonly previewRepo: Repository<TranslationPreviewEntity>
  ) {}

  @Post('extension/request')
  async requestExtension(
    @Body() dto: CreateDeadlineExtensionDto,
    @Request() req: any
  ) {
    const userId = BigInt(req.user.id);
    
    try {
      const extension = await this.deadlineService.requestDeadlineExtension(
        BigInt(dto.requestId),
        userId,
        dto.requestedDays,
        dto.reason
      );

      return {
        success: true,
        message: 'Extension request submitted successfully',
        extension: {
          id: extension.id.toString(),
          requestId: extension.request.id.toString(),
          requestedDays: extension.requestedDays,
          reason: extension.reason,
          status: extension.status,
          createdAt: extension.createdAt,
        },
      };
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : 'Unknown error occurred');
    }
  }

  @Put('extension/respond')
  async respondToExtension(
    @Body() dto: RespondToExtensionDto,
    @Request() req: any
  ) {
    const userId = BigInt(req.user.id);

    try {
      await this.deadlineService.respondToExtensionRequest(
        BigInt(dto.extensionId),
        userId,
        dto.approved,
        dto.rejectionReason
      );

      return {
        success: true,
        message: `Extension request ${dto.approved ? 'approved' : 'rejected'} successfully`,
      };
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : 'Unknown error occurred');
    }
  }

  @Get('extension/request/:requestId')
  async getExtensionRequests(@Param('requestId') requestId: string) {
    const extensions = await this.extensionRepo.find({
      where: { request: { id: BigInt(requestId) } },
      relations: ['translator', 'requester'],
      order: { createdAt: 'DESC' },
    });

    return extensions.map((ext) => ({
      id: ext.id.toString(),
      requestId: ext.request.id.toString(),
      translatorId: ext.translator.id.toString(),
      requesterId: ext.requester.id.toString(),
      requestedDays: ext.requestedDays,
      reason: ext.reason,
      status: ext.status,
      rejectionReason: ext.rejectionReason,
      createdAt: ext.createdAt,
      respondedAt: ext.respondedAt,
    }));
  }

  @Post('preview/create')
  async createTranslationPreview(
    @Body() dto: CreateTranslationPreviewDto,
    @Request() req: any
  ) {
    const userId = BigInt(req.user.id);

    // Verify the request exists and user is the requester
    const request = await this.requestRepo.findOne({
      where: { id: BigInt(dto.requestId) },
      relations: ['requester', 'project'],
    });

    if (!request) {
      throw new NotFoundException('Request not found');
    }

    if (request.requester.id !== userId) {
      throw new BadRequestException('Only the requester can create preview requests');
    }

    if (request.status !== RequestStatus.WaitingApproval) {
      throw new BadRequestException('Request is not in waiting approval status');
    }

    // Create preview record
    const preview = this.previewRepo.create({
      request,
      user: { id: userId },
      previewPages: dto.previewPages,
      feedback: dto.feedback,
    });

    const savedPreview = await this.previewRepo.save(preview);

    // Get preview data
    const previewData = await this.translationService.getTranslationPreview(
      request.project.id.toString(),
      request.project.defaultBranch?.id.toString() || '1',
      request.project.id.toString(), // Assuming fileId is project id for now
      request.targetLanguages?.[0] || 'en', // Use first target language
      dto.previewPages
    );

    return {
      success: true,
      preview: {
        id: savedPreview.id.toString(),
        requestId: savedPreview.request.id.toString(),
        previewPages: savedPreview.previewPages,
        feedback: savedPreview.feedback,
        createdAt: savedPreview.createdAt,
      },
      previewData,
    };
  }

  @Get('preview/:requestId')
  async getTranslationPreview(
    @Param('requestId') requestId: string,
    @Request() req: any
  ) {
    const userId = BigInt(req.user.id);

    const request = await this.requestRepo.findOne({
      where: { id: BigInt(requestId) },
      relations: ['requester', 'project'],
    });

    if (!request) {
      throw new NotFoundException('Request not found');
    }

    if (request.requester.id !== userId) {
      throw new BadRequestException('Only the requester can view preview');
    }

    const previews = await this.previewRepo.find({
      where: { request: { id: BigInt(requestId) } },
      order: { createdAt: 'DESC' },
    });

    return previews.map((preview) => ({
      id: preview.id.toString(),
      requestId: preview.request.id.toString(),
      previewPages: preview.previewPages,
      feedback: preview.feedback,
      isApproved: preview.isApproved,
      createdAt: preview.createdAt,
    }));
  }

  @Put('approve')
  async approveTranslation(
    @Body() dto: ApproveTranslationDto,
    @Request() req: any
  ) {
    const userId = BigInt(req.user.id);

    const request = await this.requestRepo.findOne({
      where: { id: BigInt(dto.requestId) },
      relations: ['requester', 'project', 'assignee'],
    });

    if (!request) {
      throw new NotFoundException('Request not found');
    }

    if (request.requester.id !== userId) {
      throw new BadRequestException('Only the requester can approve translations');
    }

    if (request.status !== RequestStatus.WaitingApproval) {
      throw new BadRequestException('Request is not in waiting approval status');
    }

    if (dto.approved) {
      // Approve the translation
      request.status = RequestStatus.Completed;
      await this.requestRepo.save(request);

      // Process final payment
      await this.paymentService.payFinal50Percent(request.id);

      // Archive project
      await this.paymentService['projectService'].archive(request.project);

      return {
        success: true,
        message: 'Translation approved and payment processed',
        paymentUrl: null, // Payment already processed
      };
    } else {
      // Reject the translation - extend deadline
      if (!dto.extensionDays || dto.extensionDays < 7) {
        throw new BadRequestException('Extension must be at least 7 days');
      }

      const newDeadline = addDays(new Date(), dto.extensionDays);
      request.deadline = newDeadline;
      request.status = RequestStatus.Approved; // Back to approved status
      await this.requestRepo.save(request);

      // Send notification to translator about rejection and new deadline
      // This would be handled by the notification service

      return {
        success: true,
        message: 'Translation rejected and deadline extended',
        newDeadline,
      };
    }
  }

  @Get('export/:requestId')
  async exportTranslatedFiles(
    @Param('requestId') requestId: string,
    @Request() req: any,
    @Response() res: any
  ) {
    const userId = BigInt(req.user.id);

    const request = await this.requestRepo.findOne({
      where: { id: BigInt(requestId) },
      relations: ['requester', 'project'],
    });

    if (!request) {
      throw new NotFoundException('Request not found');
    }

    if (request.requester.id !== userId) {
      throw new BadRequestException('Only the requester can export files');
    }

    if (request.status !== RequestStatus.Completed) {
      throw new BadRequestException('Request must be completed to export files');
    }

    try {
      // Export the translated file
      const exportResult = await this.translationService.exportTranslatedFile(
        request.project.id.toString(),
        request.project.defaultBranch?.id.toString() || '1',
        request.project.id.toString(), // Assuming fileId is project id for now
        request.targetLanguages?.[0] || 'en'
      );

      res.setHeader('Content-Type', exportResult.mimeType);
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${exportResult.fileName}"`
      );

      return res.send(exportResult.buffer);
    } catch (error) {
      throw new BadRequestException(`Failed to export file: ${error instanceof Error ? error.message : 'Unknown error occurred' }`);
    }
  }

  @Get('status/:requestId')
  async getRequestStatus(@Param('requestId') requestId: string) {
    const request = await this.requestRepo.findOne({
      where: { id: BigInt(requestId) },
      relations: ['project'],
    });

    if (!request) {
      throw new NotFoundException('Request not found');
    }

    // Get translation progress
    const progress = await this.translationService.getTranslationProgress(
      request.project.id.toString(),
      request.project.defaultBranch?.id.toString() || '1'
    );

    // Get any pending extensions
    const pendingExtensions = await this.extensionRepo.find({
      where: {
        request: { id: BigInt(requestId) },
        status: ExtensionStatus.PENDING,
      },
    });

    return {
      requestId: request.id.toString(),
      status: request.status,
      deadline: request.deadline,
      progress,
      hasPendingExtensions: pendingExtensions.length > 0,
      pendingExtensions: pendingExtensions.map((ext) => ({
        id: ext.id.toString(),
        requestedDays: ext.requestedDays,
        reason: ext.reason,
        createdAt: ext.createdAt,
      })),
    };
  }
}
