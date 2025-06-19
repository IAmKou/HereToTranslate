import { IsBigInt } from "#LocalProject/Utils/extensions/class-validator.extensions";
import { IsArray, IsBoolean, IsOptional, IsString, MinLength } from "class-validator";


export class CreateDiscussionDto {
  @IsString()
  @MinLength(3)
  title: string;
  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateDiscussionDto {
  @IsOptional()
  @IsString()
  title?: string;
  @IsOptional()
  @IsString()
  description?: string;
  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;
  @IsOptional()
  @IsBoolean()
  isArchived?: boolean;

  @IsOptional()
  @IsArray({ each: true })
  accessPolicyOverrides: DiscussionAccessPolicyDto[];
}

export class DiscussionAccessPolicyDto {
  @IsBigInt()
  roleId: bigint;
  @IsOptional()
  @IsBigInt()
  allowOverrides?: bigint;
  @IsOptional()
  @IsBigInt()
  denyOverrides?: bigint;
}

export class PostCommentDto {
  @IsString()
  @MinLength(1)
  content: string;
}
