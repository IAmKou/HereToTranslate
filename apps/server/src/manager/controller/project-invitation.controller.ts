import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Req,
  Query,
  ValidationPipe
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt.guard';
import type { AuthenticatedRequest } from '#LocalProject/Auth/types';
import { ProjectInvitationService } from '../service/project-invitation.service';
import { CreateProjectInvitationDto, UpdateInvitationStatusDto } from '../../dto/project-invitation.dto';
import { BigIntTransformPipe } from '../../util/pipes/bigint-transform.pipe';
import { InvitationStatus } from '../../db/mysql/entity/project-invitation.entity';

@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectInvitationController {
  constructor(
    private readonly invitationService: ProjectInvitationService
  ) {}

  @Post(':projectId/invitations')
  async createInvitation(
    @Param('projectId', BigIntTransformPipe) projectId: bigint,
    @Body() createInvitationDto: CreateProjectInvitationDto,
    @Req() req: AuthenticatedRequest
  ) {
    const invitation = await this.invitationService.createInvitation(
      projectId,
      BigInt(createInvitationDto.invitedUserId),
      req.user.id,
      createInvitationDto.message,
      createInvitationDto.expiresIn
    );

    return {
      message: 'Invitation sent successfully',
      invitation
    };
  }

  @Get(':projectId/invitations')
  async getProjectInvitations(
    @Param('projectId', BigIntTransformPipe) projectId: bigint,
    @Req() req: AuthenticatedRequest
  ) {
    const invitations = await this.invitationService.getProjectInvitations(projectId);
    return { invitations };
  }

  @Get('invitations/my')
  async getMyInvitations(
    @Req() req: AuthenticatedRequest,
    @Query('status') status?: InvitationStatus
  ) {
    const invitations = await this.invitationService.getUserInvitations(
      req.user.id,
      status
    );
    return { invitations };
  }

  @Patch('invitations/:invitationId/respond')
  async respondToInvitation(
    @Param('invitationId', BigIntTransformPipe) invitationId: bigint,
    @Body(ValidationPipe) updateStatusDto: UpdateInvitationStatusDto,
    @Req() req: AuthenticatedRequest
  ) {
    const invitation = await this.invitationService.respondToInvitation(
      invitationId,
      req.user.id,
      updateStatusDto.status
    );

    const message = updateStatusDto.status === InvitationStatus.ACCEPTED
      ? 'Invitation accepted successfully'
      : 'Invitation declined successfully';

    return {
      message,
      invitation
    };
  }

  @Delete('invitations/:invitationId')
  async cancelInvitation(
    @Param('invitationId', BigIntTransformPipe) invitationId: bigint,
    @Req() req: AuthenticatedRequest
  ) {
    await this.invitationService.cancelInvitation(invitationId, req.user.id);
    return { message: 'Invitation cancelled successfully' };
  }
}
