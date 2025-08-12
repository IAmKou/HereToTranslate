import { IsString, IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { TransitionConditionType } from '#LocalProject/Entities';

export class CreateTransitionDto {
  @IsString()
  name: string;

  @IsString()
  fromStatusId: string;

  @IsString()
  toStatusId: string;

  @IsOptional()
  @IsEnum(TransitionConditionType)
  conditionType?: TransitionConditionType;

  @IsOptional()
  conditionData?: any;
}

export class UpdateTransitionDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  fromStatusId?: string;

  @IsOptional()
  @IsString()
  toStatusId?: string;

  @IsOptional()
  @IsEnum(TransitionConditionType)
  conditionType?: TransitionConditionType;

  @IsOptional()
  conditionData?: any;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class TransitionTaskDto {
  @IsString()
  toStatusId: string;

  @IsOptional()
  @IsString()
  comment?: string;
}