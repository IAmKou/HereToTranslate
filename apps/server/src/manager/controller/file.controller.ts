import { Body, Controller, Post, Req, UploadedFile, UseGuards, UseInterceptors, Get, Param, Res, Delete } from '@nestjs/common';
import type { AuthenticatedRequest } from '#LocalProject/Auth/types';
import { FileService } from '../service/file-manager.service';
import { ManifestService } from '../service/manifest.service';
import { JwtAuthGuard } from '#LocalProject/Auth/guards/jwt.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { BigIntTransformPipe } from '#LocalProject/Utils/pipes/bigint-transform.pipe';
import type { Response } from 'express';
import { NotFoundException } from '@nestjs/common';
import { FileEntity } from '#LocalProject/Entities';

@Controller('files')
export class FileController {
  constructor(
    private readonly fileService: FileService,
    private readonly manifestService: ManifestService
  ) {
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
    branchId: bigint
  }, @Req() req: AuthenticatedRequest) {
    return this.fileService.handleUpload(file, req.user.id, body.projectId, body.branchId);
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
  @Get(':fileId/download')
  async downloadFile(@Param('fileId') fileId: string, @Res() res: Response) {
    const file = await this.fileService.getFileById(fileId);
    if (!file) {
      throw new NotFoundException(`File with ID ${fileId} not found`);
    }

    res.set({
      'Content-Type': file.fileType,
      'Content-Disposition': `attachment; filename="${file.fileName}"`,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Content-Type'
    });

    res.send(file.fileContent);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':fileId/details')
  async getFileDetails(@Param('fileId') fileId: string) {
    return this.fileService.getFileDetails(fileId);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':fileId/retry-extraction')
  async retryExtraction(
    @Param('fileId') fileId: string,
    @Req() req: AuthenticatedRequest
  ) {
    return this.fileService.retryExtraction(fileId, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':fileId/test-extraction')
  async testExtraction(@Param('fileId') fileId: string) {
    const file = await this.fileService.getFileById(fileId);
    if (!file) {
      throw new NotFoundException(`File with ID ${fileId} not found`);
    }

    // We need to get the full file entity with relations for testing
    const fileEntity = await this.fileService.getFileMetadata(fileId);
    if (!fileEntity.project || !fileEntity.branch) {
      return {
        success: false,
        error: 'File must be associated with a project and branch for testing'
      };
    }

    // Create a mock file entity for testing
    const mockFileEntity = {
      id: BigInt(fileId),
      fileName: file.fileName,
      fileType: file.fileType,
      fileContent: file.fileContent,
      project: { id: BigInt(fileEntity.project.id) },
      branch: { id: BigInt(fileEntity.branch.id) }
    };

    return this.manifestService.testManifestGeneration(mockFileEntity as FileEntity);
  }

}
