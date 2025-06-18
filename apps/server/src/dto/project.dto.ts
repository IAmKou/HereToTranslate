import { IsBigInt } from "#LocalProject/Utils/bigint-utils";
import { ICreateProjectDto, IUpdateProjectDto } from "@here-to-translate/common/interfaces";
import { IsArray, IsBoolean, IsNotEmpty, IsNumberString, IsOptional, IsString, MinLength } from "class-validator";

export class CreateProjectDto implements ICreateProjectDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  name: string;
  @IsString()
  description?: string;
  @IsArray()
  tags?: string[];
  @IsBoolean()
  isPublic?: boolean;
  @IsNumberString()
  categoryId: string;
}

export class UpdateProjectMetadataDto implements IUpdateProjectDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  name?: string;
  @IsOptional()
  @IsString()
  description?: string;
  @IsOptional()
  @IsArray()
  addTags?: string[];
  @IsOptional()
  @IsArray()
  removeTags?: string[];
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
  @IsOptional()
  @IsNumberString()
  categoryId?: string;
}

export class CreateProjectRoleDto {
  @IsString()
  @MinLength(3)
  name: string;
  @IsBigInt()
  permissions: bigint;
}

export class UpdateProjectRoleDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  name?: string;
  @IsOptional()
  @IsBigInt()
  permissions?: bigint;
}

export class UserIdsArray {
  @IsArray()
  @IsBigInt({ each: true })
  userIds: bigint[];
}

export class CreateProjectGroupDto {
  @IsString()
  @MinLength(3)
  name: string;
  @IsBigInt()
  permissionFlags: bigint;
}


export class UpdateProjectGroupDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  name?: string;
  @IsOptional()
  @IsBigInt()
  permissionFlags?: bigint;
}
