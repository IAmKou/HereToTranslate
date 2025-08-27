import { IsString, IsNumber, IsEnum, IsOptional, Min, Max, IsNotEmpty, IsBoolean } from 'class-validator';

export class SubmitReviewDto {
  @IsString()
  @IsNotEmpty()
  requestId: string;

  @IsEnum(['APPROVED', 'REJECTED'])
  decision: 'APPROVED' | 'REJECTED';

  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @IsString()
  @IsOptional()
  comment?: string;

  @IsString()
  @IsNotEmpty()
  translatorId: string;

  @IsBoolean()
  @IsOptional()
  isFullyCompleted?: boolean;
}
