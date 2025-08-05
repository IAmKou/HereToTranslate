import { IsNotEmpty, IsOptional, IsString, IsDateString, IsEnum, IsNumber, IsArray } from 'class-validator';

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
  @IsString()
  statusId?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  assignedToId?: string;

  @IsOptional()
  @IsString()
  groupId?: string;

  @IsOptional()
  @IsString()
  workflowId?: string;

  @IsOptional()
  @IsEnum(['lowest', 'low', 'medium', 'high', 'highest'])
  priority?: string;

  @IsOptional()
  @IsNumber()
  storyPoints?: number;

  @IsOptional()
  customFields?: Record<string, any>;
}
