import { IsString, IsOptional, IsEnum, IsDateString, IsNumberString, Min, Max } from 'class-validator';
import { InvitationStatus } from '../db/mysql/entity/project-invitation.entity';

export class CreateProjectInvitationDto {
  @IsString()
  invitedUserId: string;

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  expiresIn?: string; // Number of days until expiration (as string from form)
}

export class UpdateInvitationStatusDto {
  @IsEnum(InvitationStatus)
  status: InvitationStatus;
}

export class ProjectInvitationResponseDto {
  id: string;
  projectId: string;
  invitedUserId: string;
  invitedByUserId: string;
  status: InvitationStatus;
  message?: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  project?: {
    id: string;
    name: string;
    description?: string;
  };
  invitedUser?: {
    id: string;
    fullName: string;
    email: string;
    username?: string;
  };
  invitedByUser?: {
    id: string;
    fullName: string;
    email: string;
    username?: string;
  };
}
