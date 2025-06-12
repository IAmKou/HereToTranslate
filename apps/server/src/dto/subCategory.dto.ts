import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreateSubCategoryDto {
  @IsNotEmpty()
  @IsString()
  name: string;
  @IsNotEmpty()
  @IsNumber()
  categoryId: number;
}

export class UpdateSubCategoryDto {
  @IsString()
  name?: string;
  @IsNumber()
  categoryId?: number;
}
