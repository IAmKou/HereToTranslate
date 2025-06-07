import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateGroupDto {
  @IsString()
  @IsNotEmpty({ message: 'Group name is required' })
  name: string;
}