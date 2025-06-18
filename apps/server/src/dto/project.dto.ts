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

export class UpdateProjectDto implements IUpdateProjectDto {
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
