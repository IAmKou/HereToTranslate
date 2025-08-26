import { BadRequestException, Body, Controller, Get, Param, Post, Query, Res, UseGuards } from '@nestjs/common';
import { TranslationService } from '#LocalProject/Managers/service/translation-manager.service';
import { JwtAuthGuard } from '#LocalProject/Auth/guards/jwt.guard';
import type { Response } from 'express';
import { AsposeService } from '#LocalProject/Managers/service/aspose.service';
import { FileService } from '#LocalProject/Managers/service/file-manager.service';

@Controller('translation')
export class TranslationController {
  constructor(
    private readonly translationService: TranslationService,
    private readonly asposeService: AsposeService,
    private readonly fileService: FileService
  ) {}
  @UseGuards(JwtAuthGuard)
  @Get('strings')
  async getAllTranslationStrings(
    @Query('projectId') projectId: string,
    @Query('branchId') branchId: string,
    @Query('language') language: string ,
    @Query('fileId') fileId?: string,
    @Query('page') page?: number,
    @Query('fileType') fileType?: string
  ) {
    return this.translationService.getAllString(projectId, branchId, language, fileId, page, fileType);
  }
  @Get('progress')
  async getProgress(
    @Query('projectId') projectId: string,
    @Query('branchId') branchId: string,
    @Query('language') language?: string,
  ) {
    if (!projectId || !branchId) {
      throw new BadRequestException('projectId and branchId are required');
    }

    return this.translationService.getTranslationProgress(
      projectId,
      branchId,
      language,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('file-pages/:fileId')
  async getFilePages(
    @Param('fileId') fileId: string,
    @Query('projectId') projectId: string,
    @Query('branchId') branchId: string
  ) {
    return this.translationService.getFilePages(fileId, projectId, branchId);
  }

  @Post('translate/:id')
  async translateString(
    @Param('id') id: string,
    @Body('translatedText') translatedText: string,
    @Body('language') language: string
  ) {
    try {
      return await this.translationService.addTranslation(id, translatedText, language);
    } catch (err: any) {
      if (err?.message && err.message.includes('DOCX body not found')) {
        return {
          statusCode: 400,
          message: 'DOCX file does not contain editable text. Please check your file content.'
        };
      }
      throw err;
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('preview/:fileId')
  async previewTranslation(
    @Param('fileId') fileId: string,
    @Query('language') language: string
  ) {
    return this.translationService.previewTranslation(fileId, language);
  }

  @UseGuards(JwtAuthGuard)
  @Post('export/:fileId')
  async exportTranslation(
    @Param('fileId') fileId: string,
    @Body('language') language: string
  ) {
    const file = await this.fileService.getFileById(fileId);
    if (!file) {
      throw new Error('File not found');
    }

    return this.translationService.exportTranslation(fileId, language);
  }

  @UseGuards(JwtAuthGuard)
  @Get('export/download/:fileId')
  async downloadExport(
    @Param('fileId') fileId: string,
    @Res() res: Response,
    @Query('language') language?: string,
    @Query('languages') languagesRaw?: string, // comma-separated list
    @Query('format') format: 'original' | 'xliff' = 'original'
  ) {
    try {
      // Normalize languages input
      let languages: string[] = [];
      if (languagesRaw && typeof languagesRaw === 'string') {
        languages = languagesRaw
          .split(',')
          .map((l) => l.trim())
          .filter((l) => l.length > 0);
      } else if (language && typeof language === 'string' && language.trim()) {
        languages = [language.trim()];
      }

      if (languages.length <= 1) {
        const lang = languages[0] || language || '';
        console.log(`[downloadExport] Single-language export for fileId: ${fileId}, language: ${lang}, format: ${format}`);
        const { buffer, fileName, fileType } = await this.translationService.buildExportBuffer(fileId, lang, format);

        res.setHeader('Content-Type', fileType || 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
        res.setHeader('Content-Length', buffer.length);
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Pragma', 'no-cache');
        res.end(buffer);
        console.log(`[downloadExport] Single file sent successfully`);
        return;
      }

      console.log(`[downloadExport] Multi-language export (ZIP) for fileId: ${fileId}, languages: ${languages.join(', ')}, format: ${format}`);

      const JSZip = require('jszip');
      const zip = new JSZip();

      let successCount = 0;
      let errorCount = 0;

      for (const lang of languages) {
        try {
          const { buffer, fileName } = await this.translationService.buildExportBuffer(fileId, lang, format);
          if (!buffer || !Buffer.isBuffer(buffer)) {
            throw new Error('Invalid buffer generated');
          }
          zip.file(fileName, buffer);
          successCount++;
        } catch (err: any) {
          const errorFileName = `ERROR_${fileId}_${lang}.txt`;
          const errorContent = `Failed to export language ${lang} for file ${fileId}:\nError: ${err?.message || 'Unknown error'}`;
          zip.file(errorFileName, errorContent);
          errorCount++;
        }
      }

      if (successCount === 0) {
        return res.status(500).json({
          message: 'No language exports were successful',
          successCount,
          errorCount
        });
      }

      const zipBuffer = await zip.generateAsync({
        type: 'nodebuffer',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      });

      const zipFileName = `file-${fileId}-export-${languages.join('-')}-${Date.now()}.zip`;
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(zipFileName)}"`);
      res.setHeader('Content-Length', zipBuffer.length);
      res.send(zipBuffer);
      console.log(`[downloadExport] ZIP sent successfully with ${successCount} files, ${errorCount} errors`);
    } catch (error) {
      console.error(`[downloadExport] Error:`, error);
      return res.status(500).json({
        message: 'Export failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

  