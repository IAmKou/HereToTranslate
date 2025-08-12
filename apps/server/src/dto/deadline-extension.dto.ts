import { IsNotEmpty, IsString, IsNumber, Min, Max, IsOptional } from 'class-validator';

export class CreateDeadlineExtensionDto {
  @IsNotEmpty()
  @IsNumber()
  requestId: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  @Max(30) 
  requestedDays: number;

  @IsNotEmpty()
  @IsString()
  reason: string;
}

export class RespondToExtensionDto {
  @IsNotEmpty()
  @IsNumber()
  extensionId: number;

  @IsNotEmpty()
  approved: boolean;

  @IsOptional()
  @IsString()
  rejectionReason?: string;
}

export class ExtensionResponseDto {
  id: number;
  requestId: number;
  translatorId: number;
  requesterId: number;
  requestedDays: number;
  reason: string;
  status: string;
  rejectionReason?: string;
  createdAt: Date;
  respondedAt?: Date;
}