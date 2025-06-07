import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreateGroupDto {
  @IsString()
  @IsNotEmpty({ message: 'Group name is required' })
  name: string;

  @IsNumber()
  @IsNotEmpty({ message: 'Project ID is required' })
  project_id: number;
}