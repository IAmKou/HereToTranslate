import { IsNotEmpty, IsOptional, IsString, IsDateString, IsEnum, IsNumber, IsArray, ValidateNested, IsDecimal } from 'class-validator';
import { Type } from 'class-transformer';
import { DifficultyLevel } from '../db/mysql/entity/page-difficulty.entity';
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

  // New fields for pagination & scoring
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  selectedPages?: number[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PageDifficultyDto)
  pageDifficulties?: PageDifficultyDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaskAssignmentDto)
  assignments?: TaskAssignmentDto[];
}

// New DTOs for pagination & scoring
export class PageDifficultyDto {
  @IsNotEmpty()
  @IsNumber()
  pageNumber: number;

  @IsNotEmpty()
  @IsNumber()
  filePart: number;

  @IsNotEmpty()
  @IsEnum(DifficultyLevel)
  difficultyLevel: DifficultyLevel;

  @IsOptional()
  @IsDecimal()
  baseScore?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  previewData?: {
    textCount: number;
    complexity: string;
    estimatedTime: number;
  };
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

export class UpdatePageDifficultyDto {
  @IsNotEmpty()
  @IsString()
  pageId: string;

  @IsNotEmpty()
  @IsEnum(DifficultyLevel)
  difficultyLevel: DifficultyLevel;

  @IsOptional()
  @IsString()
  notes?: string;
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

export class PagePreviewDto {
  @IsNotEmpty()
  @IsString()
  fileId: string;

  @IsNotEmpty()
  @IsNumber()
  pageNumber: number;

  @IsNotEmpty()
  @IsString()
  language: string;
}

export class DifficultyConfigDto {
  @IsNotEmpty()
  @IsString()
  projectId: string;

  @IsNotEmpty()
  @IsEnum(DifficultyLevel)
  difficultyLevel: DifficultyLevel;

  @IsNotEmpty()
  @IsDecimal()
  multiplier: number;

  @IsNotEmpty()
  @IsDecimal()
  basePrice: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  criteria?: {
    textDensity: string;
    technicalTerms: boolean;
    formatting: string;
    specialCharacters: boolean;
    estimatedTimeRange: string;
  };
}