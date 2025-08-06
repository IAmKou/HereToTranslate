import { IsString, IsOptional, IsArray, ValidateNested, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCommentDto {
  @IsString()
  @IsNotEmpty()
  content: string;

  @IsOptional()
  @IsString()
  parentCommentId?: string;

  @IsOptional()
  @IsArray()
  attachments?: Array<{
    fileName: string;
    fileUrl: string;
    fileSize: number;
    mimeType: string;
  }>;

  @IsOptional()
  @IsArray()
  mentions?: Array<{
    userId: string;
    username: string;
    startIndex: number;
    endIndex: number;
  }>;
}

export class UpdateCommentDto {
  @IsString()
  @IsNotEmpty()
  content: string;

  @IsOptional()
  @IsArray()
  attachments?: Array<{
    fileName: string;
    fileUrl: string;
    fileSize: number;
    mimeType: string;
  }>;

  @IsOptional()
  @IsArray()
  mentions?: Array<{
    userId: string;
    username: string;
    startIndex: number;
    endIndex: number;
  }>;
}
