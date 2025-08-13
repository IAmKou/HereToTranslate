import { IsString, IsOptional, IsEnum, IsBoolean, IsNumber, IsHexColor } from 'class-validator';
import { StatusType } from '../db/mysql/entity/task-status.entity';

export class CreateStatusDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsHexColor()
  color: string;

  @IsEnum(StatusType)
  type: StatusType;

  @IsOptional()
  @IsNumber()
  position?: number;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsBoolean()
  isStartStatus?: boolean;

  @IsOptional()
  @IsBoolean()
  isEndStatus?: boolean;

  @IsOptional()
  @IsBoolean()
  isResolved?: boolean;

  @IsOptional()
  @IsBoolean()
  isClosed?: boolean;
}

export class UpdateStatusDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsHexColor()
  color?: string;

  @IsOptional()
  @IsEnum(StatusType)
  type?: StatusType;

  @IsOptional()
  @IsNumber()
  position?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsBoolean()
  isStartStatus?: boolean;

  @IsOptional()
  @IsBoolean()
  isEndStatus?: boolean;

  @IsOptional()
  @IsBoolean()
  isResolved?: boolean;

  @IsOptional()
  @IsBoolean()
  isClosed?: boolean;
}
