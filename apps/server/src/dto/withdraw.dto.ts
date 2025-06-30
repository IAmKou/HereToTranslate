import { IsNumber, IsString, IsEmail, IsOptional, IsPositive } from 'class-validator';

export class WithdrawDto {
  @IsNumber()
  @IsPositive()
  amount: number;

  @IsString()
  @IsEmail()
  paypalEmail: string;

  @IsOptional()
  requestId?: string;
} 