import { RequestStatus } from "#LocalProject/Entities";
import { IsDateString, IsEnum, IsNumber, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class CreateRequestDto {
  @IsString()
  @MinLength(3)
  title: string;
  @IsString()
  description: string;
  @IsNumber()
  @Min(0)
  dealAmount: number;
  @MaxLength(10)
  @IsDateString({ strict: true })
  deadline: string;
}

export class UpdateRequestDto {
  @IsString()
  title?: string;
  @IsString()
  description?: string;
  @IsNumber()
  dealAmount?: number;
  @MaxLength(10)
  @IsDateString({ strict: true })
  deadline?: string;
}

export class ReviewRequestDto {
  @IsString()
  @IsEnum(RequestStatus)
  status: RequestStatus;
}
