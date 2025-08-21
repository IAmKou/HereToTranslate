import { Body, Controller, Post, Req, UploadedFile, UseGuards, UseInterceptors, Get, Param, Res, Delete, Patch } from '@nestjs/common';
import type { AuthenticatedRequest } from '#LocalProject/Auth/types';
import { FileService } from '../service/file-manager.service';
import { JwtAuthGuard } from '#LocalProject/Auth/guards/jwt.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { BigIntTransformPipe } from '#LocalProject/Utils/pipes/bigint-transform.pipe';
import type { Response } from 'express';
import { NotFoundException } from '@nestjs/common';

@Controller('files')
export class FileController {
  constructor(private readonly fileService: FileService) {
  }

  @UseGuards(JwtAuthGuard)
  @Get('project/:projectId')
  async getProjectFiles(
    @Param('projectId', BigIntTransformPipe) projectId: bigint,
    @Req() req: AuthenticatedRequest
  ) {
    return this.fileService.getProjectFiles(projectId, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  async uploadFile(@UploadedFile() file: Express.Multer.File, @Body() body: {
    projectId: bigint,
    branchId: bigint,
    title?: string
  }, @Req() req: AuthenticatedRequest) {
    return this.fileService.handleUpload(file, req.user.id, body.projectId, body.branchId, undefined, body.title);
  }

  @UseGuards(JwtAuthGuard)
  @Post('upload-temp')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  async uploadTempFile(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: AuthenticatedRequest
  ) {
    return this.fileService.saveTempFile(file, req.user.id);
  }



  @UseGuards(JwtAuthGuard)
  @Post(':requestId/upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  async uploadRequestFile(
    @Param('requestId', BigIntTransformPipe) requestId: bigint,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: AuthenticatedRequest
  ) {
    return this.fileService.uploadFileForRequest(file, req.user.id, requestId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':fileId')
  async deleteFile(
    @Param('fileId', BigIntTransformPipe) fileId: bigint,
    @Req() req: AuthenticatedRequest
  ) {
    return this.fileService.deleteFile(fileId, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':fileId/extract-strings')
  async extractStringsFromFile(
    @Param('fileId') fileId: string,
    @Req() req: AuthenticatedRequest
  ) {
    return this.fileService.extractStringsFromFile(fileId, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':fileId/log')
  async getFileExtractLog(@Param('fileId') fileId: string) {
    const file = await this.fileService.getFileById(fileId);
    return { extractLog: file?.extractLog || '' };
  }

  @UseGuards(JwtAuthGuard)
  @Get(':fileId')
  async getFileById(@Param('fileId') fileId: string) {
    return this.fileService.getFileById(fileId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':fileId')
  async updateFileMetadata(
    @Param('fileId', BigIntTransformPipe) fileId: bigint,
    @Body() body: { fileName?: string; title?: string },
    @Req() req: AuthenticatedRequest
  ) {
    return this.fileService.updateFileMetadata(fileId, body, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':fileId/preview')
  async getFilePreview(@Param('fileId') fileId: string) {
    return this.fileService.getFilePreview(fileId);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':fileId/highlight')
  async highlightTextInPdf(
    @Param('fileId') fileId: string,
    @Body() body: { text: string }
  ) {
    return this.fileService.highlightTextInPdf(fileId, body.text);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':fileId/download')
  async downloadFile(@Param('fileId') fileId: string, @Res() res: Response) {
    const file = await this.fileService.getFileById(fileId);
    if (!file) {
      throw new NotFoundException(`File with ID ${fileId} not found`);
    }

    // Encode filename để tránh lỗi với ký tự đặc biệt (tiếng Việt, dấu cách)
    const encodedFilename = encodeURIComponent(file.fileName).replace(/['()]/g, escape);
    const contentDisposition = `attachment; filename*=UTF-8''${encodedFilename}`;

    res.set({
      'Content-Type': file.fileType,
      'Content-Disposition': contentDisposition,
      'Access-Control-Allow-Origin': 'http://localhost:4200',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });

    res.send(file.fileContent);
  }

}
