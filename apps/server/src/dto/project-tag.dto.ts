import { IsNotEmpty, IsString } from 'class-validator';

export class CreateProjectTagDto {
  @IsNotEmpty()
  @IsString()
  name: string;
}

export class UpdateProjectTagDto {
  @IsNotEmpty()
  @IsString()
  name: string;
} 