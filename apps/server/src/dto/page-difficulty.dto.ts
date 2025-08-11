import { IsEnum, IsInt, IsNotEmpty, IsNumber, IsObject, IsOptional, IsPositive, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { DifficultyLevel } from '#LocalProject/Entities';

export class PagePreviewDto {
  @IsNotEmpty()
  @IsString()
  fileId!: string;

  @IsNotEmpty()
  @IsInt()
  @Min(1)
  pageNumber!: number;

  @IsNotEmpty()
  @IsString()
  language!: string;
}

export class PageDifficultyDto {
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  pageNumber!: number;

  @IsNotEmpty()
  @IsInt()
  @Min(0)
  filePart!: number;

  @IsNotEmpty()
  @IsEnum(DifficultyLevel)
  difficultyLevel!: DifficultyLevel;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  baseScore?: number; 

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsObject()
  previewData?: {
    textCount: number;
    complexity: string;
    estimatedTime: number;
  };
}

export class UpdatePageDifficultyDto {
  @IsNotEmpty()
  @IsString()
  pageId!: string;

  @IsNotEmpty()
  @IsEnum(DifficultyLevel)
  difficultyLevel!: DifficultyLevel;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class DifficultyCriteriaDto {
  @IsOptional()
  @IsString()
  textDensity?: string;

  @IsOptional()
  @IsString()
  formatting?: string;

  @IsOptional()
  @IsString()
  estimatedTimeRange?: string;

  @IsOptional()
  @Type(() => Boolean)
  technicalTerms?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  specialCharacters?: boolean;
}

export class DifficultyConfigDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsEnum(DifficultyLevel)
  difficultyLevel?: DifficultyLevel;

  @IsOptional()
  @IsNumber()
  @Min(0)
  multiplier?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => DifficultyCriteriaDto)
  criteria?: DifficultyCriteriaDto;

  @IsOptional()
  @Type(() => Boolean)
  isActive?: boolean;
}


