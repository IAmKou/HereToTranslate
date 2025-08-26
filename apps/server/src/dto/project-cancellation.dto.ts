import { IsNotEmpty, IsString, IsNumber, IsBoolean, IsOptional, IsEnum } from 'class-validator';

export enum CancellationAction {
  ARCHIVE = 'ARCHIVE',
  DELETE = 'DELETE',
}

export class CreateCancellationRequestDto {
  @IsNotEmpty()
  @IsNumber()
  requestId: number;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsNotEmpty()
  @IsEnum(CancellationAction)
  action: CancellationAction;
}

export class RespondToCancellationDto {
  @IsNotEmpty()
  @IsNumber()
  cancellationId: number;

  @IsNotEmpty()
  @IsBoolean()
  approved: boolean;

  @IsOptional()
  @IsString()
  responseReason?: string;
}

export class CancellationResponseDto {
  id: number;
  projectId: number;
  requestId: number;
  initiatorId: number;
  responderId?: number;
  cancellationType: string;
  status: string;
  reason: string;
  responseReason?: string;
  requiresConfirmation: boolean;
  isArchiveOnly: boolean;
  createdAt: Date;
  respondedAt?: Date;
  completedAt?: Date;
}

export class CancellationSummaryDto {
  canCancel: boolean;
  cancellationType?: string;
  refundAmount?: number;
  penaltyAmount?: number;
  requiresConfirmation: boolean;
  message: string;
}
