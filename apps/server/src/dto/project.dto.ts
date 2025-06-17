import { ICreateProjectDto, IUpdateProjectDto } from "@here-to-translate/common/interfaces";
import { IsArray, IsBoolean, IsNotEmpty, IsNumberString, IsString } from "class-validator";

export class CreateProjectDto implements ICreateProjectDto {
  @IsString()
  @IsNotEmpty()
  name: string;
  @IsString()
  description?: string;
  @IsArray()
  tags?: string[];
  @IsBoolean()
  isPublic?: boolean;
  @IsNotEmpty()
  @IsString()
  @IsNumberString()
  categoryId: string;
}

export class UpdateProjectDto implements IUpdateProjectDto {
  @IsString()
  @IsNotEmpty()
  name: string;
  @IsString()
  description?: string;
}
