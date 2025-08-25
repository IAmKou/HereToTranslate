import { Body, Controller, Post, Req, UploadedFile, UseGuards, UseInterceptors, Get, Param, Res, Delete, Patch } from '@nestjs/common';
import type { AuthenticatedRequest } from '#LocalProject/Auth/types';
import { FileService } from '../service/file-manager.service';
import { AsposeService } from '../service/aspose.service';
import { JwtAuthGuard } from '#LocalProject/Auth/guards/jwt.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { BigIntTransformPipe } from '#LocalProject/Utils/pipes/bigint-transform.pipe';
import type { Response } from 'express';
import { NotFoundException } from '@nestjs/common';

@Controller('files')
export class FileController {
  constructor(
    private readonly fileService: FileService,
    private readonly asposeService: AsposeService
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get('project/:projectId')
  async getProjectFiles(
    @Param('projectId', BigIntTransformPipe) projectId: bigint,
    @Req() req: AuthenticatedRequest
  ) {
    return this.fileService.getProjectFiles(projectId, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('storage/status')
  async getStorageStatus() {
    return this.fileService.getAsposeStorageStatus();
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

  @UseGuards(JwtAuthGuard)
  @Post('pdf/upload-and-extract')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 50 * 1024 * 1024 } }))
  async uploadPdfAndExtractToXml(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: AuthenticatedRequest
  ) {
    if (!file) {
      throw new NotFoundException('No file uploaded');
    }

    if (file.mimetype !== 'application/pdf') {
      throw new NotFoundException('Only PDF files are supported');
    }

    try {
      // Upload PDF to Aspose Cloud
      const uploadedPath = await this.asposeService.uploadFile(file.originalname, file.buffer);
      
      // No XML extraction available in current AsposeService; return basic info instead
      const info = await this.asposeService.getPdfInfo(file.originalname);
      
      return {
        success: true,
        message: 'PDF uploaded successfully',
        originalFileName: file.originalname,
        uploadedPath,
        documentInfo: info
      };
    } catch (error) {
      console.error('PDF processing failed:', error);
      throw new Error(`PDF processing failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('pdf/process-with-replacements')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 50 * 1024 * 1024 } }))
  async processPdfWithReplacements(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: {
      replacements: Array<{ oldText: string; newText: string }>;
      outputFileName?: string;
    },
    @Req() req: AuthenticatedRequest
  ) {
    if (!file) {
      throw new NotFoundException('No file uploaded');
    }

    if (file.mimetype !== 'application/pdf') {
      throw new NotFoundException('Only PDF files are supported');
    }

    if (!body.replacements || !Array.isArray(body.replacements) || body.replacements.length === 0) {
      throw new NotFoundException('Replacements array is required and must not be empty');
    }

    try {
      const uploadedPath = await this.asposeService.uploadFile(file.originalname, file.buffer);
      // Basic implementation: replace on first page; extend to multi-page if needed
      await this.asposeService.replaceTextInPdf(file.originalname, 1, body.replacements);
      const finalPdfBuffer = await this.asposeService.downloadFile(`pdf/${file.originalname}`);

      return {
        success: true,
        message: 'PDF processed with replacements successfully',
        originalFileName: file.originalname,
        outputFileName: body.outputFileName || file.originalname,
        replacementsCount: body.replacements.length,
        finalPdfSize: finalPdfBuffer.length,
        uploadedPath
      };
    } catch (error) {
      console.error('PDF processing with replacements failed:', error);
      throw new Error(`PDF processing with replacements failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('pdf/replace-text')
  async replaceTextInPdf(
    @Body() body: {
      fileName: string;
      oldText: string;
      newText: string;
      folder?: string;
      page?: number;
    }
  ) {
    if (!body.fileName || !body.oldText || !body.newText) {
      throw new NotFoundException('fileName, oldText, and newText are required');
    }

    try {
      const page = body.page && body.page > 0 ? body.page : 1;
      await this.asposeService.replaceTextInPdf(body.fileName, page, [{ oldText: body.oldText, newText: body.newText }]);

      return {
        success: true,
        message: 'Text replaced successfully in PDF',
        fileName: body.fileName,
        oldText: body.oldText,
        newText: body.newText
      };
    } catch (error) {
      console.error('Text replacement failed:', error);
      throw new Error(`Text replacement failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('pdf/xml/:fileName')
  async getPdfAsXml(
    @Param('fileName') fileName: string,
    @Body() body: { folder?: string; storageName?: string }
  ) {
    try {
      return {
        success: true,
        message: 'XML extraction is not available in current service. Use other endpoints.',
        fileName: fileName
      };
    } catch (error) {
      console.error('PDF to XML extraction failed:', error);
      throw new Error(`PDF to XML extraction failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

}
