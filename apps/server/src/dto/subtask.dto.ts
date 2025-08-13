import { IsString, IsOptional, IsDateString, IsEnum, IsNumber, IsBoolean } from 'class-validator';
import { SubtaskKind } from '../db/mysql/entity/subtask.entity';

export class CreateSubtaskDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  parentTaskId: string;

  @IsOptional()
  @IsString()
  assignedToId?: string;

  @IsOptional()
  @IsString()
  reviewerId?: string;

  @IsOptional()
  @IsString()
  approverId?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsNumber()
  estimatedBusinessHours?: number;

  @IsOptional()
  @IsEnum(['low', 'medium', 'high'])
  priority?: string;

  @IsOptional()
  @IsEnum(SubtaskKind)
  kind?: SubtaskKind;

  @IsOptional()
  @IsNumber()
  workCount?: number;
}

export class UpdateSubtaskDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  assignedToId?: string;

  @IsOptional()
  @IsString()
  reviewerId?: string;

  @IsOptional()
  @IsString()
  approverId?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsNumber()
  estimatedBusinessHours?: number;

  @IsOptional()
  @IsEnum(['low', 'medium', 'high'])
  priority?: string;

  @IsOptional()
  @IsNumber()
  workCount?: number;

  @IsOptional()
  @IsString()
  statusId?: string;

  @IsOptional()
  @IsString()
  comment?: string;
}

export class TransitionSubtaskDto {
  @IsString()
  toStatusId: string;

  @IsOptional()
  @IsString()
  comment?: string;
}
