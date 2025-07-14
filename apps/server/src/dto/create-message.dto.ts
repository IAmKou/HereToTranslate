import { IsNotEmpty, IsString } from 'class-validator';

export class CreateMessageDto {
  @IsString()
  @IsNotEmpty()
  roomId: string;
  senderId: number;

  @IsString()
  @IsNotEmpty()
  message: string;
}
