import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ProjectInvitationEntity, InvitationStatus } from '../../db/mysql/entity/project-invitation.entity';
import { ProjectEntity } from '../../db/mysql/entity/project.entity';
import { UserEntity } from '../../db/mysql/entity/user.entity';
import { CreateProjectInvitationDto, UpdateInvitationStatusDto, ProjectInvitationResponseDto } from '../../dto/project-invitation.dto';
import { ProjectManagerService } from './project-manager.service';
import { NotificationGateway } from '../../util/gateway/notification.gateway';
import { MailService } from '../../mailer/mailer.service';

@Injectable()
export class ProjectInvitationService {
  constructor(
    @InjectRepository(ProjectInvitationEntity)
    private readonly invitationRepository: Repository<ProjectInvitationEntity>,
    @InjectRepository(ProjectEntity)
    private readonly projectRepository: Repository<ProjectEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly dataSource: DataSource,
    private readonly projectManagerService: ProjectManagerService,
    private readonly notificationGateway: NotificationGateway,
    private readonly mailService: MailService
  ) {}

  async createInvitation(
    projectId: bigint,
    invitedUserId: bigint,
    invitedByUserId: bigint,
    message?: string
  ): Promise<ProjectInvitationResponseDto> {
    try {
      console.log('Starting createInvitation with params:', {
        projectId: projectId.toString(),
        invitedUserId: invitedUserId.toString(),
        invitedByUserId: invitedByUserId.toString(),
        message
      });

      // Check if project exists
      const project = await this.projectRepository.findOne({
        where: { id: projectId }
      });
      if (!project) {
        throw new NotFoundException('Project not found');
      }

      // Check if invited user exists
      const invitedUser = await this.userRepository.findOne({
        where: { id: invitedUserId }
      });
      if (!invitedUser) {
        throw new NotFoundException('Invited user not found');
      }

      // Check if user is already a member
      const isAlreadyMember = await this.projectManagerService.isUserProjectMember(projectId, invitedUserId);
      if (isAlreadyMember) {
        throw new BadRequestException('User is already a member of this project');
      }

      // Check if there's already any invitation (pending or not)
      const existingInvitation = await this.invitationRepository.findOne({
        where: {
          projectId,
          invitedUserId
        }
      });

      if (existingInvitation) {
        if (existingInvitation.status === InvitationStatus.PENDING) {
          throw new BadRequestException('User already has a pending invitation to this project');
        } else {
          // Update existing invitation to PENDING status
          console.log('Updating existing invitation from status:', existingInvitation.status);
          existingInvitation.status = InvitationStatus.PENDING;
          existingInvitation.message = message;
          existingInvitation.expiresAt = new Date();
          existingInvitation.expiresAt.setDate(existingInvitation.expiresAt.getDate() + 7);
          existingInvitation.invitedByUserId = invitedByUserId;

          const updatedInvitation = await this.invitationRepository.save(existingInvitation);
          console.log('Updated invitation:', updatedInvitation);

          // Emit socket event for updated invitation
          const invitationResponse = this.mapToResponseDto(updatedInvitation);
          console.log(`📧 Emitting updated_project_invitation to user ${invitedUserId.toString()}:`, invitationResponse);

          try {
            this.notificationGateway.server.to(`user_${invitedUserId.toString()}`).emit('new_project_invitation', invitationResponse);
          } catch (socketError) {
            console.error('Socket emit error:', socketError);
          }

          return invitationResponse;
        }
      }

      // Create invitation with 7 days expiration
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      console.log('Creating invitation with data:', {
        projectId: projectId.toString(),
        invitedUserId: invitedUserId.toString(),
        invitedByUserId: invitedByUserId.toString(),
        message,
        expiresAt,
        status: InvitationStatus.PENDING
      });

      const invitation = this.invitationRepository.create({
        projectId,
        invitedUserId,
        invitedByUserId,
        message,
        expiresAt,
        status: InvitationStatus.PENDING
      });

      console.log('Created invitation entity:', invitation);

      const savedInvitation = await this.invitationRepository.save(invitation);
      console.log('Saved invitation:', savedInvitation);

      // Emit socket event for new invitation
      const invitationResponse = this.mapToResponseDto(savedInvitation);
      console.log(`📧 Emitting new_project_invitation to user ${invitedUserId.toString()}:`, invitationResponse);

      try {
        this.notificationGateway.server.to(`user_${invitedUserId.toString()}`).emit('new_project_invitation', invitationResponse);
      } catch (socketError) {
        console.error('Socket emit error:', socketError);
        // Don't fail the invitation creation if socket fails
      }

      // Send email notification
      try {
        // Get inviter's username
        const inviter = await this.userRepository.findOne({
          where: { id: invitedByUserId }
        });

        await this.mailService.sendProjectInvitation(
          invitedUser.email,
          {
            projectName: project.name,
            invitedByUsername: inviter?.username || 'Unknown User',
            message: message,
            projectId: projectId.toString()
          }
        );
        console.log(`📧 Email sent to ${invitedUser.email} for project invitation`);
      } catch (emailError) {
        console.error('Email send error:', emailError);
        // Don't fail the invitation creation if email fails
      }

      return invitationResponse;
    } catch (error) {
      console.error('Error in createInvitation:', error);
      console.error('Error stack:', error.stack);
      throw error;
    }
  }

  async getUserInvitations(userId: bigint, status?: InvitationStatus): Promise<ProjectInvitationResponseDto[]> {
    const whereCondition: any = { invitedUserId: userId };
    if (status) {
      whereCondition.status = status;
    }

    const invitations = await this.invitationRepository.find({
      where: whereCondition,
      relations: ['project', 'invitedUser', 'invitedByUser'],
      order: { createdAt: 'DESC' }
    });

    return invitations.map(invitation => this.mapToResponseDto(invitation));
  }

  async getProjectInvitations(projectId: bigint): Promise<ProjectInvitationResponseDto[]> {
    const invitations = await this.invitationRepository.find({
      where: { projectId },
      relations: ['project', 'invitedUser', 'invitedByUser'],
      order: { createdAt: 'DESC' }
    });

    return invitations.map(invitation => this.mapToResponseDto(invitation));
  }

  async respondToInvitation(
    invitationId: bigint,
    userId: bigint,
    status: InvitationStatus
  ): Promise<ProjectInvitationResponseDto> {
    const invitation = await this.invitationRepository.findOne({
      where: { id: invitationId },
      relations: ['project', 'invitedUser', 'invitedByUser']
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.invitedUserId !== userId) {
      throw new ForbiddenException('You can only respond to invitations sent to you');
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException('Invitation has already been responded to');
    }

    if (invitation.expiresAt < new Date()) {
      throw new BadRequestException('Invitation has expired');
    }

    // Update invitation status
    invitation.status = status;
    const updatedInvitation = await this.invitationRepository.save(invitation);

    // Emit socket event for invitation response
    this.notificationGateway.server.to(`user_${invitation.invitedUserId.toString()}`).emit('invitation_responded', {
      invitationId: invitation.id.toString(),
      status: status
    });

    // If accepted, add user to project
    if (status === InvitationStatus.ACCEPTED) {
      try {
        await this.projectManagerService.addUserToProject(
          invitation.projectId,
          invitation.invitedUserId,
          invitation.invitedByUserId // Using the person who sent the invitation as the one performing the action
        );
      } catch (error) {
        // If adding to project fails, revert invitation status
        invitation.status = InvitationStatus.PENDING;
        await this.invitationRepository.save(invitation);
        throw error;
      }
    }

    return this.mapToResponseDto(updatedInvitation);
  }

  async cancelInvitation(invitationId: bigint, userId: bigint): Promise<void> {
    const invitation = await this.invitationRepository.findOne({
      where: { id: invitationId },
      relations: ['project']
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    // Only the person who sent the invitation or project owner can cancel it
    const project = await this.projectRepository.findOne({
      where: { id: invitation.projectId },
      relations: ['createdBy']
    });

    if (invitation.invitedByUserId !== userId &&
      project?.createdBy?.id !== userId) {
      throw new ForbiddenException('You can only cancel invitations you sent');
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException('Can only cancel pending invitations');
    }

    invitation.status = InvitationStatus.DECLINED;
    await this.invitationRepository.save(invitation);
  }

  async cleanupExpiredInvitations(): Promise<void> {
    const expiredInvitations = await this.invitationRepository
      .createQueryBuilder('invitation')
      .where('invitation.status = :status', { status: InvitationStatus.PENDING })
      .andWhere('invitation.expiresAt < :now', { now: new Date() })
      .getMany();

    for (const invitation of expiredInvitations) {
      invitation.status = InvitationStatus.EXPIRED;
      await this.invitationRepository.save(invitation);
    }
  }

  private mapToResponseDto(invitation: ProjectInvitationEntity): ProjectInvitationResponseDto {
    return {
      id: invitation.id.toString(),
      projectId: invitation.projectId.toString(),
      invitedUserId: invitation.invitedUserId.toString(),
      invitedByUserId: invitation.invitedByUserId.toString(),
      status: invitation.status,
      message: invitation.message,
      expiresAt: invitation.expiresAt.toISOString(),
      createdAt: invitation.createdAt.toISOString(),
      updatedAt: invitation.updatedAt.toISOString(),
      project: invitation.project ? {
        id: invitation.project.id.toString(),
        name: invitation.project.name,
        description: invitation.project.description
      } : undefined,
      invitedUser: invitation.invitedUser ? {
        id: invitation.invitedUser.id.toString(),
        fullName: invitation.invitedUser.fullName,
        email: invitation.invitedUser.email,
        username: invitation.invitedUser.username
      } : undefined,
      invitedByUser: invitation.invitedByUser ? {
        id: invitation.invitedByUser.id.toString(),
        fullName: invitation.invitedByUser.fullName,
        email: invitation.invitedByUser.email,
        username: invitation.invitedByUser.username
      } : undefined
    };
  }
}
