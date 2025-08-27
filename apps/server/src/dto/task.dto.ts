import { IsNotEmpty, IsOptional, IsString, IsDateString, IsEnum, IsNumber, IsArray, ValidateNested, IsDecimal } from 'class-validator';
import { Type } from 'class-transformer';
import { AssignmentRole } from '../db/mysql/entity/task-assignment.entity';

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
  reviewerId?: string;

  @IsOptional()
  groupId?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsNumber()
  estimatedBusinessHours?: number;

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
  @IsString()
  statusId?: string;

  // Optional flag to explicitly bypass workflow validation when updating status
  // Use-case: immediately setting a target status right after a reopen operation
  @IsOptional()
  skipWorkflowValidation?: boolean;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsNumber()
  estimatedBusinessHours?: number;

  @IsOptional()
  @IsString()
  assignedToId?: string;

  @IsOptional()
  @IsString()
  reviewerId?: string;

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

  // New fields for pagination & scoring
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  selectedPages?: number[];



  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaskAssignmentDto)
  assignments?: TaskAssignmentDto[];
}



export class TaskAssignmentDto {
  @IsNotEmpty()
  @IsString()
  assignedToId: string;

  @IsNotEmpty()
  @IsEnum(AssignmentRole)
  role: AssignmentRole;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  workData?: {
    pagesAssigned: number[];
    estimatedHours: number;
  };
}



export class AssignTaskDto {
  @IsNotEmpty()
  @IsString()
  taskId: string;

  @IsNotEmpty()
  @IsString()
  assignedToId: string;

  @IsNotEmpty()
  @IsEnum(AssignmentRole)
  role: AssignmentRole;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  pagesAssigned?: number[];
}

export class ReassignTaskDto {
  @IsNotEmpty()
  @IsString()
  assignmentId: string;

  @IsNotEmpty()
  @IsString()
  newAssigneeId: string;

  @IsNotEmpty()
  @IsString()
  reason: string;

  @IsOptional()
  @IsString()
  notes?: string;
}




