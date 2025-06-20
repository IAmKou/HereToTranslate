import { RequestStatus } from "#LocalProject/Entities";
import { IsBigInt } from "#LocalProject/Utils/extensions/class-validator.extensions";
import { IsDateString, IsEnum, IsNotEmpty, IsNumber, IsString, MaxLength, Min } from "class-validator";

export class CreateRequestDto {
  @IsBigInt()
  projectId: string;
  @IsNotEmpty()
  @IsString()
  title: string;
  @IsNotEmpty()
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
