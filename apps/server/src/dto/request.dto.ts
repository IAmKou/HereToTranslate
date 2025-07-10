import { RequestStatus } from "#LocalProject/Entities";
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
import { Optional } from '@nestjs/common';

export class CreateRequestDto {
  @IsString()
  @MinLength(3)
  title: string;
  @IsString()
  description: string;
  @IsNumber()
  @Min(0)
  dealAmount: number;
  @MaxLength(10)
  @IsDateString({ strict: true })
  deadline: string;
  isPublic: boolean;
  @Optional()
  assigneeId: number;
  @Optional()
  projectId: number;
  @IsNotEmpty()
  @IsNumberString()
  categoryId: string;
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MinLength(1, { each: true })
  tags?: string[];
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
  @MaxLength(10)
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
  @IsEnum(RequestStatus)
  status?: RequestStatus;
}


export class ReviewRequestDto {
  @IsEnum(RequestStatus, {
    message: 'Invalid status. Must be APPROVED or REJECTED.',
  })
  status: RequestStatus;
}

