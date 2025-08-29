import { BadRequestException, Body, Controller, Get, Param, Post, Query, Res, UseGuards, Req } from '@nestjs/common';
import { TranslationService } from '#LocalProject/Managers/service/translation-manager.service';
import { JwtAuthGuard } from '#LocalProject/Auth/guards/jwt.guard';
import type { Response } from 'express';
import { AsposeService } from '#LocalProject/Managers/service/aspose.service';
import { FileService } from '#LocalProject/Managers/service/file-manager.service';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import * as crypto from 'crypto';

@Controller('translation')
export class TranslationController {
  constructor(
    private readonly translationService: TranslationService,
    private readonly asposeService: AsposeService,
    private readonly fileService: FileService,
    private readonly configService: ConfigService
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
    @Body('language') language: string,
    @Body('page') page?: number
  ) {
    try {
      return await this.translationService.addTranslation(id, translatedText, language, page);
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
        const lang = (languages[0] || language || '').trim();
        if (!lang) {
          return res.status(400).json({ message: 'language is required for single-file export' });
        }
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
      return;
      console.log(`[downloadExport] ZIP sent successfully with ${successCount} files, ${errorCount} errors`);
    } catch (error) {
      console.error(`[downloadExport] Error:`, error);
      return res.status(500).json({
        message: 'Export failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('export/download-project/:projectId')
  async downloadProjectExport(
    @Param('projectId') projectId: string,
    @Res() res: Response,
    @Query('languages') languagesRaw: string, // comma-separated list
    @Query('format') format: 'original' | 'xliff' = 'original'
  ) {
    try {
      const languages = (languagesRaw || '')
        .split(',')
        .map(l => l.trim())
        .filter(Boolean);
      if (languages.length === 0) {
        return res.status(400).json({ message: 'languages is required (comma-separated)' });
      }

      const entries = await this.translationService.buildProjectExportBuffers(projectId, languages, format);
      const JSZip = require('jszip');
      const zip = new JSZip();

      for (const entry of entries) {
        // entry.fileName already includes (LANG) pattern from buildExportBuffer
        zip.file(entry.fileName, entry.buffer);
      }

      const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } });
      const zipFileName = `project-${projectId}-export-${languages.join('-')}-${Date.now()}.zip`;
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(zipFileName)}"`);
      res.setHeader('Content-Length', zipBuffer.length);
      res.send(zipBuffer);
      return;
    } catch (error) {
      console.error(`[downloadProjectExport] Error:`, error);
      return res.status(500).json({
        message: 'Project export failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // --- Temporary public preview link (no auth on the final file GET) ---
  private signPreviewToken(payload: any): string {
    const secret = this.configService.get<string>('JWT_SECRET') || 'preview-secret';
    const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const sig = crypto.createHmac('sha256', secret).update(data).digest('base64url');
    return `${data}.${sig}`;
  }
  private verifyPreviewToken(token: string): any | null {
    try {
      const secret = this.configService.get<string>('JWT_SECRET') || 'preview-secret';
      const [data, sig] = token.split('.');
      if (!data || !sig) return null;
      const expect = crypto.createHmac('sha256', secret).update(data).digest('base64url');
      if (expect !== sig) return null;
      const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
      if (payload.exp && Date.now() > payload.exp) return null;
      return payload;
    } catch {
      return null;
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('preview-link')
  async createPreviewLink(
    @Body('fileId') fileId: string,
    @Body('language') language: string,
    @Body('ttlSec') ttlSec = 600,
    @Req() req: Request
  ) {
    if (!fileId || !language) throw new BadRequestException('fileId and language are required');
    const exp = Date.now() + Math.max(60, Math.min(ttlSec, 3600)) * 1000;
    const token = this.signPreviewToken({ fileId, language, exp });
    const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'http';
    const host = req.get('host');
    const base = `${proto}://${host}`;
    const url = `${base}/translation/export/preview/${encodeURIComponent(fileId)}?language=${encodeURIComponent(language)}&token=${encodeURIComponent(token)}`;
    return { url, token, expiresAt: exp };
  }

  @Get('export/preview/:fileId')
  async streamPreviewFile(
    @Param('fileId') fileId: string,
    @Query('language') language: string,
    @Query('token') token: string,
    @Res() res: Response
  ) {
    const payload = this.verifyPreviewToken(token || '');
    if (!payload || payload.fileId !== fileId || payload.language !== language) {
      return res.status(401).send('Invalid or expired token');
    }
    try {
      const { buffer, fileName } = await this.translationService.buildExportBuffer(fileId, language, 'original');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(fileName)}"`);
      res.setHeader('Cache-Control', 'private, max-age=60');
      res.end(buffer);
    } catch (e) {
      return res.status(500).send('Failed to build preview');
    }
  }

  // Build PDF from DOCX export and stream (no auth to simplify preview embedding if needed)
  @UseGuards(JwtAuthGuard)
  @Get('export/pdf/:fileId')
  async streamPdf(
    @Param('fileId') fileId: string,
    @Query('language') language: string,
    @Query('watermark') watermark: string,
    @Res() res: Response
  ) {
    try {
      const { buffer, fileName } = await this.translationService.exportToPdf(fileId, language);
      if (watermark) {
        const watermarkedBuffer = await this.translationService.addPreviewWatermark(buffer, watermark);
        res.end(watermarkedBuffer);
        return;
      }
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(fileName)}"`);
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(fileName)}"`);
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.end(buffer);
    } catch (e) {
      return res.status(500).json({ message: 'Failed to build PDF', error: (e as any)?.message || 'unknown' });
    }
  }
}


