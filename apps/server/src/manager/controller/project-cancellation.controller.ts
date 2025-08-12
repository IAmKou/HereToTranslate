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
} from '@nestjs/common';
import { JwtAuthGuard } from '#LocalProject/Auth/guards/jwt.guard';
import { ProjectCancellationService } from '../service/project-cancellation.service';
import {
  CreateCancellationRequestDto,
  RespondToCancellationDto,
  CancellationResponseDto,
  CancellationSummaryDto,
} from '#LocalProject/Dtos';

@Controller('project-cancellation')
@UseGuards(JwtAuthGuard)
export class ProjectCancellationController {
  constructor(
    private readonly cancellationService: ProjectCancellationService
  ) {}

  @Get('summary/:requestId')
  async getCancellationSummary(
    @Param('requestId') requestId: string,
    @Request() req: any
  ): Promise<CancellationSummaryDto> {
    const userId = BigInt(req.user.id);

    try {
      return await this.cancellationService.getCancellationSummary(
        BigInt(requestId),
        userId
      );
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : 'Unknown error occurred');
    }
  }

  @Post('request')
  async requestCancellation(
    @Body() dto: CreateCancellationRequestDto,
    @Request() req: any
  ) {
    const userId = BigInt(req.user.id);

    try {
      const cancellation = await this.cancellationService.requestCancellation(
        BigInt(dto.requestId),
        userId,
        dto.reason,
        dto.action
      );

      return {
        success: true,
        message: cancellation.requiresConfirmation
          ? 'Cancellation request sent for confirmation'
          : 'Project has been archived successfully',
        cancellation: {
          id: cancellation.id.toString(),
          requestId: cancellation.request.id.toString(),
          projectId: cancellation.project.id.toString(),
          cancellationType: cancellation.cancellationType,
          status: cancellation.status,
          reason: cancellation.reason,
          requiresConfirmation: cancellation.requiresConfirmation,
          isArchiveOnly: cancellation.isArchiveOnly,
          createdAt: cancellation.createdAt,
        },
      };
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : 'Unknown error occurred');
    }
  }

  @Put('respond')
  async respondToCancellation(
    @Body() dto: RespondToCancellationDto,
    @Request() req: any
  ) {
    const userId = BigInt(req.user.id);

    try {
      await this.cancellationService.respondToCancellation(
        BigInt(dto.cancellationId),
        userId,
        dto.approved,
        dto.responseReason
      );

      return {
        success: true,
        message: `Cancellation request ${dto.approved ? 'approved' : 'rejected'} successfully`,
      };
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : 'Unknown error occurred');
    }
  }

  @Get('pending')
  async getPendingCancellations(@Request() req: any) {
    const userId = BigInt(req.user.id);

    try {
      const cancellations = await this.cancellationService.getPendingCancellations(userId);

      return cancellations.map((cancellation): CancellationResponseDto => ({
        id: Number(cancellation.id),
        projectId: Number(cancellation.project.id),
        requestId: Number(cancellation.request.id),
        initiatorId: Number(cancellation.initiator.id),
        responderId: cancellation.responder ? Number(cancellation.responder.id) : undefined,
        cancellationType: cancellation.cancellationType,
        status: cancellation.status,
        reason: cancellation.reason,
        responseReason: cancellation.responseReason,
        requiresConfirmation: cancellation.requiresConfirmation,
        isArchiveOnly: cancellation.isArchiveOnly,
        createdAt: cancellation.createdAt,
        respondedAt: cancellation.respondedAt,
        completedAt: cancellation.completedAt,
      }));
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : 'Unknown error occurred');
    }
  }

  @Get('history/:requestId')
  async getCancellationHistory(
    @Param('requestId') requestId: string,
    @Request() req: any
  ) {
    const userId = BigInt(req.user.id);

    try {
      // First verify user has access to this request
      const summary = await this.cancellationService.getCancellationSummary(
        BigInt(requestId),
        userId
      );

      if (!summary.canCancel && !summary.message.includes('status')) {
        throw new BadRequestException('You are not authorized to view this request');
      }

      // Get all cancellations for this request
      const cancellations = await this.cancellationService['cancellationRepo'].find({
        where: { request: { id: BigInt(requestId) } },
        relations: ['initiator', 'responder'],
        order: { createdAt: 'DESC' },
      });

      return cancellations.map((cancellation): CancellationResponseDto => ({
        id: Number(cancellation.id),
        projectId: Number(cancellation.project.id),
        requestId: Number(cancellation.request.id),
        initiatorId: Number(cancellation.initiator.id),
        responderId: cancellation.responder ? Number(cancellation.responder.id) : undefined,
        cancellationType: cancellation.cancellationType,
        status: cancellation.status,
        reason: cancellation.reason,
        responseReason: cancellation.responseReason,
        requiresConfirmation: cancellation.requiresConfirmation,
        isArchiveOnly: cancellation.isArchiveOnly,
        createdAt: cancellation.createdAt,
        respondedAt: cancellation.respondedAt,
        completedAt: cancellation.completedAt,
      }));
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : 'Unknown error occurred');
    }
  }

  @Get('details/:cancellationId')
  async getCancellationDetails(
    @Param('cancellationId') cancellationId: string,
    @Request() req: any
  ) {
    const userId = BigInt(req.user.id);

    try {
      const cancellation = await this.cancellationService['cancellationRepo'].findOne({
        where: { id: BigInt(cancellationId) },
        relations: ['request', 'project', 'initiator', 'responder'],
      });

      if (!cancellation) {
        throw new NotFoundException('Cancellation request not found');
      }

      // Verify user has access
      const hasAccess =
        cancellation.initiator.id === userId ||
        cancellation.responder?.id === userId ||
        cancellation.request.requester.id === userId ||
        cancellation.request.assignee?.id === userId;

      if (!hasAccess) {
        throw new BadRequestException('You are not authorized to view this cancellation');
      }

      return {
        id: Number(cancellation.id),
        projectId: Number(cancellation.project.id),
        requestId: Number(cancellation.request.id),
        initiatorId: Number(cancellation.initiator.id),
        responderId: cancellation.responder ? Number(cancellation.responder.id) : undefined,
        cancellationType: cancellation.cancellationType,
        status: cancellation.status,
        reason: cancellation.reason,
        responseReason: cancellation.responseReason,
        requiresConfirmation: cancellation.requiresConfirmation,
        isArchiveOnly: cancellation.isArchiveOnly,
        createdAt: cancellation.createdAt,
        respondedAt: cancellation.respondedAt,
        completedAt: cancellation.completedAt,
        request: {
          id: Number(cancellation.request.id),
          title: cancellation.request.title,
          status: cancellation.request.status,
          dealAmount: cancellation.request.dealAmount,
        },
        project: {
          id: Number(cancellation.project.id),
          name: cancellation.project.name,
          isArchived: cancellation.project.isArchived,
        },
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(error instanceof Error ? error.message : 'Unknown error occurred');
    }
  }
}
