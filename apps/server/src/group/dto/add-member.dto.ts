import { IsNotEmpty, IsNumber } from 'class-validator';

export class AddMemberDto {
  @IsNumber()
  @IsNotEmpty({ message: 'User ID is required' })
  userId: number;
}