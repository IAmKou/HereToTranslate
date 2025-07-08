import { IsEmail, IsNumber, IsOptional, IsPositive } from 'class-validator';

export class WithdrawDto {
  @IsNumber()
  @IsPositive()
  amount: number;

  @IsEmail()
  paypalEmail: string;

  @IsOptional()
  requestId?: bigint;

  @IsOptional()
  paypalOrderId?: string;
}
