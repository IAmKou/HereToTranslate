import { RequestStatus } from "#LocalProject/Entities";
import { IsDate, IsEnum, IsNotEmpty, IsNumber, IsNumberString, IsString, Min } from "class-validator";

export class CreateRequestDto {
  @IsNotEmpty()
  @IsNumberString()
  projectId: string;
  @IsNotEmpty()
  @IsString()
  title: string;
  @IsNotEmpty()
  @IsString()
  description: string;
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  dealAmount: number;
  @IsNotEmpty()
  @IsDate()
  deadline: Date;
}

export class UpdateRequestDto {
  @IsString()
  title?: string;
  @IsString()
  description?: string;
  @IsNumber()
  dealAmount?: number;
  @IsDate()
  deadline?: Date;
}

export class ReviewRequestDto {
  @IsString()
  @IsEnum(RequestStatus)
  status: RequestStatus;
}
