import { IsNotEmpty, IsOptional, IsString, IsDateString, IsEnum, IsNumber } from 'class-validator';
import { TaskStatus } from '../db/mysql/entity/task.entity';

export class CreateTaskDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  assignedToId?: string;

  @IsOptional()
  groupId?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsNotEmpty()
  projectId: string;

  @IsOptional()
  branchId?: string;

  @IsOptional()
  fileId?: string;

  @IsOptional()
  @IsNumber()
  filePart?: number;

  @IsOptional()
  @IsString()
  language?: string;
}

export class UpdateTaskDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  assignedToId?: string;

  @IsOptional()
  groupId?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;
}
