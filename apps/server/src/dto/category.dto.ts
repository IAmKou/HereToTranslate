import { IsNotEmpty, IsString } from 'class-validator';

export class CreateCategoryDto {
  @IsNotEmpty()
  @IsString()
  name: string;
  @IsString()
  description?: string;
}

export class UpdateCategoryDto {
  @IsString()
  name?: string;
  @IsString()
  description?: string;
}
