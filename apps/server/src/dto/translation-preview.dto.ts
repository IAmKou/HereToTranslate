import { IsNotEmpty, IsNumber, IsArray, IsOptional, IsString, ArrayMaxSize, IsBoolean } from 'class-validator';

export class CreateTranslationPreviewDto {
  @IsNotEmpty()
  @IsNumber()
  requestId: number;

  @IsNotEmpty()
  @IsArray()
  @ArrayMaxSize(5) 
  previewPages: number[];

  @IsOptional()
  @IsString()
  feedback?: string;
}

export class ApproveTranslationDto {
  @IsNotEmpty()
  @IsNumber()
  requestId: number;

  @IsNotEmpty()
  @IsBoolean()
  approved: boolean;

  @IsOptional()
  @IsString()
  feedback?: string;

  @IsOptional()
  @IsNumber()
  @ArrayMaxSize(7) 
  extensionDays?: number;

  @IsOptional()
  @IsString()
  rejectionReason?: string;
}

export class TranslationPreviewResponseDto {
  id: number;
  requestId: number;
  userId: number;
  previewPages: number[];
  feedback?: string;
  isApproved: boolean;
  createdAt: Date;
}

export class PreviewDataDto {
  id: string;
  originalText: string;
  translatedText: string;
  filePart: number;
  position?: any;
  style?: any;
  font?: string;
}