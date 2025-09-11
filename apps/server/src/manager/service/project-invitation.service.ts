import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  forwardRef,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import {
  ProjectEntity,
  InvitationStatus,
  ProjectInvitationEntity,
  UserEntity,
} from '#LocalProject/Entities';
import { ProjectInvitationResponseDto } from '../../dto/project-invitation.dto';
import { ProjectManagerService } from './project-manager.service';
import { NotificationGateway } from '../../util/gateway/notification.gateway';
import { MailService } from '../../mailer/mailer.service';
import { NotificationManagerService } from './notification-manager.service';
import { ActivityManagerService } from './activity-manager.service';

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
    private readonly mailService: MailService,
    private readonly notificationManagerService: NotificationManagerService,
    @Inject(forwardRef(() => ActivityManagerService))
    private readonly activityManagerService: ActivityManagerService
  ) {}

  async createInvitation(
    projectId: bigint,
    invitedUserId: bigint,
    invitedByUserId: bigint,
    message?: string,
    expiresIn?: string
  ): Promise<ProjectInvitationResponseDto> {
    try {
      const expiresInDays = expiresIn ? parseInt(expiresIn) : 7;
      console.log('Starting createInvitation with params:', {
        projectId: projectId.toString(),
        invitedUserId: invitedUserId.toString(),
        invitedByUserId: invitedByUserId.toString(),
        message,
        expiresIn: expiresInDays,
      });

      // Check if project exists
      const project = await this.projectRepository.findOne({
        where: { id: projectId },
      });
      if (!project) {
        throw new NotFoundException('Project not found');
      }

      // Check if invited user exists
      const invitedUser = await this.userRepository.findOne({
        where: { id: invitedUserId },
      });
      if (!invitedUser) {
        throw new NotFoundException('Invited user not found');
      }

      // Check if user is already a member
      const isAlreadyMember =
        await this.projectManagerService.isUserProjectMember(
          projectId,
          invitedUserId
        );
      if (isAlreadyMember) {
        throw new BadRequestException(
          'User is already a member of this project'
        );
      }

      // Check if there's already any invitation (pending or not)
      const existingInvitation = await this.invitationRepository.findOne({
        where: {
          projectId,
          invitedUserId,
        },
      });

      if (existingInvitation) {
        if (existingInvitation.status === InvitationStatus.PENDING) {
          throw new BadRequestException(
            'User already has a pending invitation to this project'
          );
        } else {
          // Update existing invitation to PENDING status
          console.log(
            'Updating existing invitation from status:',
            existingInvitation.status
          );
          existingInvitation.status = InvitationStatus.PENDING;
          existingInvitation.message = message;
          existingInvitation.expiresAt = new Date();
          existingInvitation.expiresAt.setDate(
            existingInvitation.expiresAt.getDate() + expiresInDays
          );
          existingInvitation.invitedByUserId = invitedByUserId;

          const updatedInvitation = await this.invitationRepository.save(
            existingInvitation
          );
          console.log('Updated invitation:', updatedInvitation);

          // Note: Removed socket emit to avoid popup notification
          // Project invitation will only appear in My Notifications page
          const invitationResponse = this.mapToResponseDto(updatedInvitation);

          // Send email notification for updated invitation
          try {
            // Get inviter's username
            const inviter = await this.userRepository.findOne({
              where: { id: invitedByUserId },
            });

            console.log(
              '📧 Preparing to send email for updated invitation with data:',
              {
                to: invitedUser.email,
                projectName: project.name,
                invitedByUsername: inviter?.username || 'Unknown User',
                message: message,
                projectId: projectId.toString(),
                expiresIn: expiresInDays,
              }
            );

            await this.mailService.sendProjectInvitation(invitedUser.email, {
              projectName: project.name,
              invitedByUsername: inviter?.username || 'Unknown User',
              message: message,
              projectId: projectId.toString(),
              expiresIn: expiresInDays,
            });
            console.log(
              `📧 Email sent successfully to ${invitedUser.email} for updated project invitation`
            );
          } catch (emailError) {
            console.error(
              '📧 Email send error for updated invitation:',
              emailError
            );
            console.error('📧 Email error stack:', emailError);
            // Don't fail the invitation update if email fails
          }

          // Create notification for updated invitation (for My Notifications page)
          try {
            await this.notificationManagerService.notifyUserProjectInvite(
              invitedUserId,
              project.name
            );
            console.log(
              `📧 Notification created for updated project invitation to user ${invitedUserId.toString()}`
            );
          } catch (notificationError) {
            console.error(
              '📧 Notification creation error for updated invitation:',
              notificationError
            );
            // Don't fail the invitation update if notification fails
          }

          return invitationResponse;
        }
      }

      // Create invitation with custom expiration
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);

      console.log('Creating invitation with data:', {
        projectId: projectId.toString(),
        invitedUserId: invitedUserId.toString(),
        invitedByUserId: invitedByUserId.toString(),
        message,
        expiresIn: expiresInDays,
        expiresAt,
        status: InvitationStatus.PENDING,
      });

      const invitation = this.invitationRepository.create({
        projectId,
        invitedUserId,
        invitedByUserId,
        message,
        expiresAt,
        status: InvitationStatus.PENDING,
      });

      console.log('Created invitation entity:', invitation);

      const savedInvitation = await this.invitationRepository.save(invitation);
      console.log('Saved invitation:', savedInvitation);

      // Note: Removed socket emit to avoid popup notification
      // Project invitation will only appear in My Notifications page
      const invitationResponse = this.mapToResponseDto(savedInvitation);

      // Send email notification
      try {
        // Get inviter's username
        const inviter = await this.userRepository.findOne({
          where: { id: invitedByUserId },
        });

        console.log('📧 Preparing to send email with data:', {
          to: invitedUser.email,
          projectName: project.name,
          invitedByUsername: inviter?.username || 'Unknown User',
          message: message,
          projectId: projectId.toString(),
          expiresIn: expiresInDays,
        });

        await this.mailService.sendProjectInvitation(invitedUser.email, {
          projectName: project.name,
          invitedByUsername: inviter?.username || 'Unknown User',
          message: message,
          projectId: projectId.toString(),
          expiresIn: expiresInDays,
        });
        console.log(
          `📧 Email sent successfully to ${invitedUser.email} for project invitation`
        );
      } catch (emailError) {
        console.error('📧 Email send error:', emailError);
        console.error('📧 Email error stack:', emailError);
        // Don't fail the invitation creation if email fails
      }

      // Create notification for new invitation (for My Notifications page)
      try {
        await this.notificationManagerService.notifyUserProjectInvite(
          invitedUserId,
          project.name
        );
        console.log(
          `📧 Notification created for new project invitation to user ${invitedUserId.toString()}`
        );
      } catch (notificationError) {
        console.error(
          '📧 Notification creation error for new invitation:',
          notificationError
        );
        // Don't fail the invitation creation if notification fails
      }

      return invitationResponse;
    } catch (error) {
      console.error('Error in createInvitation:', error);
      console.error('Error stack:', error);
      throw error;
    }
  }

  async getUserInvitations(
    userId: bigint,
    status?: InvitationStatus
  ): Promise<ProjectInvitationResponseDto[]> {
    const whereCondition: any = { invitedUserId: userId };
    if (status) {
      whereCondition.status = status;
    }

    const invitations = await this.invitationRepository.find({
      where: whereCondition,
      relations: ['project', 'invitedUser', 'invitedByUser'],
      order: { createdAt: 'DESC' },
    });

    return invitations.map((invitation) => this.mapToResponseDto(invitation));
  }

  async getProjectInvitations(
    projectId: bigint
  ): Promise<ProjectInvitationResponseDto[]> {
    const invitations = await this.invitationRepository.find({
      where: { projectId },
      relations: ['project', 'invitedUser', 'invitedByUser'],
      order: { createdAt: 'DESC' },
    });

    return invitations.map((invitation) => this.mapToResponseDto(invitation));
  }

  async respondToInvitation(
    invitationId: bigint,
    userId: bigint,
    status: InvitationStatus
  ): Promise<ProjectInvitationResponseDto> {
    const invitation = await this.invitationRepository.findOne({
      where: { id: invitationId },
      relations: ['project', 'invitedUser', 'invitedByUser'],
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.invitedUserId !== userId) {
      throw new ForbiddenException(
        'You can only respond to invitations sent to you'
      );
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
    this.notificationGateway.server
      .to(`user_${invitation.invitedUserId.toString()}`)
      .emit('invitation_responded', {
        invitationId: invitation.id.toString(),
        status: status,
      });

    // If accepted, add user to project
    if (status === InvitationStatus.ACCEPTED) {
      try {
        await this.projectManagerService.addUserToProject(
          invitation.projectId,
          invitation.invitedUserId,
          invitation.invitedByUserId // Using the person who sent the invitation as the one performing the action
        );

        // Log activity when user joins project
        const invitedUser = await this.userRepository.findOne({
          where: { id: invitation.invitedUserId },
        });

        if (invitedUser) {
          await this.activityManagerService.logMemberJoin(
            Number(invitation.projectId),
            Number(invitation.invitedUserId),
            invitedUser.fullName || invitedUser.username
          );
        }
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
      relations: ['project'],
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    // Only the person who sent the invitation or project owner can cancel it
    const project = await this.projectRepository.findOne({
      where: { id: invitation.projectId },
      relations: ['createdBy'],
    });

    if (
      invitation.invitedByUserId !== userId &&
      project?.createdBy?.id !== userId
    ) {
      throw new ForbiddenException('You can only cancel invitations you sent');
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException('Can only cancel pending invitations');
    }

    invitation.status = InvitationStatus.DECLINED;
    await this.invitationRepository.save(invitation);
  }

  private mapToResponseDto(
    invitation: ProjectInvitationEntity
  ): ProjectInvitationResponseDto {
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
      project: invitation.project
        ? {
            id: invitation.project.id.toString(),
            name: invitation.project.name,
            description: invitation.project.description,
          }
        : undefined,
      invitedUser: invitation.invitedUser
        ? {
            id: invitation.invitedUser.id.toString(),
            fullName: invitation.invitedUser.fullName,
            email: invitation.invitedUser.email,
            username: invitation.invitedUser.username,
          }
        : undefined,
      invitedByUser: invitation.invitedByUser
        ? {
            id: invitation.invitedByUser.id.toString(),
            fullName: invitation.invitedByUser.fullName,
            email: invitation.invitedByUser.email,
            username: invitation.invitedByUser.username,
          }
        : undefined,
    };
  }
}
