import { FileEntity, RequestStatus } from '#LocalProject/Entities';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsNumberString,
  IsString,
  MaxLength,
  Min,
  MinLength,
  IsArray,
  IsOptional
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateRequestDto {
  @IsString()
  @MinLength(3)
  title: string;

  @IsString()
  description: string;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  dealAmount: number;

  @IsDateString({ strict: true })
  deadline: string;

  isPublic: boolean;

  @IsOptional()
  @IsNumberString()
  assigneeId?: string;

  @IsOptional()
  @IsNumberString()
  projectId?: string;

  @IsNotEmpty()
  @IsNumberString()
  categoryId: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MinLength(1, { each: true })
  tags?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MinLength(1, { each: true })
  targetLanguages?: string[];

  @IsOptional()
  @IsString()
  @MinLength(1)
  sourceLanguage?: string;

  @IsOptional()
  @IsArray()
  files?: FileEntity[];
}



export class UpdateRequestDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  dealAmount?: number;

  @IsOptional()
  @IsDateString({ strict: true })
  deadline?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MinLength(1, { each: true })
  tags?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MinLength(1, { each: true })
  targetLanguages?: string[];

  @IsOptional()
  @IsString()
  @MinLength(1)
  sourceLanguage?: string;

  @IsOptional()
  @IsEnum(RequestStatus)
  status?: RequestStatus;
}


export class ReviewRequestDto {
  @IsEnum(RequestStatus, {
    message: 'Invalid status. Must be APPROVED or REJECTED.',
  })
  status: RequestStatus;
}

export class SubmitReviewDto {
  @IsNotEmpty()
  @IsNumberString()
  requestId: string;

  @IsString()
  @IsNotEmpty()
  decision: string; // 'APPROVED' or 'REJECTED'

  @IsNumber()
  @Min(1)
  @Type(() => Number)
  rating: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;

  @IsOptional()
  @IsString()
  translatorId?: string;

  @IsOptional()
  @IsString()
  isFullyCompleted?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  rejectionReason?: string;
}

