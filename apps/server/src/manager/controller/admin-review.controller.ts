import { JwtAuthGuard } from '#LocalProject/Auth/guards/jwt.guard';
import type { AuthenticatedRequest } from '#LocalProject/Auth/types';
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
  UseInterceptors,
  ValidationPipe
} from '@nestjs/common';
import { AdminReviewService } from '../service/admin-review.service';
import { BigIntTransformPipe } from '#LocalProject/Utils/pipes/bigint-transform.pipe';
import { JsonSerializerInterceptor } from '#LocalProject/Utils/json-serializer.interceptor';
import { ForRoles } from '../../auth/decorators/for-role.decorator';
import { UserRole } from '../../db/mysql/entity/user.entity';

@Controller('admin/review')
@UseInterceptors(JsonSerializerInterceptor)
export class AdminReviewController {
  constructor(
    private readonly adminReviewService: AdminReviewService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @ForRoles(UserRole.Admin)
  @Get('pending')
  async getPendingReviews(@Req() req: AuthenticatedRequest) {
    return this.adminReviewService.getPendingReviews();
  }

  @UseGuards(JwtAuthGuard)
  @ForRoles(UserRole.Admin)
  @Get(':requestId')
  async getReviewDetails(
    @Param('requestId', BigIntTransformPipe) requestId: bigint,
    @Req() req: AuthenticatedRequest
  ) {
    return this.adminReviewService.getReviewDetails(requestId);
  }

  @UseGuards(JwtAuthGuard)
  @ForRoles(UserRole.Admin)
  @Post(':requestId/decision')
  async submitAdminDecision(
    @Param('requestId', BigIntTransformPipe) requestId: bigint,
    @Body(ValidationPipe) body: {
      decision: 'APPROVE_TRANSLATOR' | 'APPROVE_REQUESTER';
      reason: string;
      adminNotes?: string;
    },
    @Req() req: AuthenticatedRequest
  ) {
    return this.adminReviewService.submitAdminDecision(
      requestId,
      req.user.id,
      body.decision,
      body.reason,
      body.adminNotes
    );
  }
}
