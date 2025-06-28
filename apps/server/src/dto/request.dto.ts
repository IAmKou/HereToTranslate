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
  MinLength
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
}

export class UpdateRequestDto {
  @IsString()
  title?: string;
  @IsString()
  description?: string;
  @IsNumber()
  dealAmount?: number;
  @MaxLength(10)
  @IsDateString({ strict: true })
  deadline?: string;
}

export class ReviewRequestDto {
  @IsString()
  @IsEnum(RequestStatus)
  status: RequestStatus;
}
