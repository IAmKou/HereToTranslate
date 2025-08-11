import { IsNotEmpty, IsOptional, IsString, IsDateString, IsEnum, IsNumber, IsArray } from 'class-validator';
import { StatusType } from '#LocalProject/Entities';

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
  @IsString()
  reviewerId?: string;

  @IsOptional()
  @IsString()
  approverId?: string;

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
  page?: number;

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  pages?: number[];

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
  @IsEnum(StatusType)
  status?: StatusType;

  @IsOptional()
  assignedToId?: string;

  @IsOptional()
  @IsString()
  reviewerId?: string;

  @IsOptional()
  @IsString()
  approverId?: string;

  @IsOptional()
  groupId?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsNumber()
  page?: number;

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  pages?: number[];

  @IsOptional()
  @IsString()
  language?: string;
}

export class AssignTaskDto {
  @IsNotEmpty()
  @IsString()
  taskId: string;

  @IsOptional()
  @IsString()
  assignedToId?: string;

  @IsOptional()
  @IsString()
  reviewerId?: string;

  @IsOptional()
  @IsString()
  approverId?: string;

  @IsNotEmpty()
  @IsString()
  reason: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;
}

export class ReassignTaskDto {
  @IsNotEmpty()
  @IsString()
  taskId: string;

  @IsOptional()
  @IsString()
  assignedToId?: string;

  @IsOptional()
  @IsString()
  reviewerId?: string;

  @IsOptional()
  @IsString()
  approverId?: string;

  @IsNotEmpty()
  @IsString()
  reason: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;
}
