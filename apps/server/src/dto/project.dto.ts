import { ICreateProjectDto, IUpdateProjectDto } from "@here-to-translate/common/interfaces";
import { IsNotEmpty, IsNumberString, IsString } from "class-validator";

export class CreateProjectDto implements ICreateProjectDto {
  @IsString()
  @IsNotEmpty()
  name: string;
  @IsString()
  description?: string;
  @IsString()
  @IsNotEmpty()
  @IsNumberString()
  createdBy: string;
}

export class UpdateProjectDto implements IUpdateProjectDto {
  @IsString()
  @IsNotEmpty()
  name: string;
  @IsString()
  description?: string;
}
