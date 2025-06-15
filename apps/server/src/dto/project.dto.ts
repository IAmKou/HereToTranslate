import { IsNotEmpty, IsNumberString, IsString } from "class-validator";

export class CreateProjectDto {
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
