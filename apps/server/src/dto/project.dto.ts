import { IsBigInt } from "#LocalProject/Utils/extensions/class-validator.extensions";
import { ICreateProjectDto, IUpdateProjectDto } from "@here-to-translate/common/interfaces";
import { IsArray, IsBoolean, IsNotEmpty, IsNumberString, IsOptional, IsString, MinLength } from "class-validator";

export class CreateProjectDto implements ICreateProjectDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  name: string;
  @IsOptional()
  @IsString()
  description?: string;
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MinLength(1, { each: true })
  tags?: string[];
  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean;
  @IsNotEmpty()
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
  @IsString({ each: true })
  @MinLength(1, { each: true })
  addTags?: string[];
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MinLength(1, { each: true })
  removeTags?: string[];
  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean;
  @IsOptional()
  @IsNumberString()
  categoryId?: string;
}

export class CreateProjectRoleDto {
  @IsString()
  @MinLength(3)
  name: string;
  @IsOptional()
  @IsBigInt()
  permissionFlags?: bigint;
}

export class UpdateProjectRoleDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  name?: string;
  @IsOptional()
  @IsBigInt()
  permissionFlags?: bigint;
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
}


export class UpdateProjectGroupDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  name?: string;
}
