import { Body, Controller, Get, Param, Post, Query, Res, UseGuards } from '@nestjs/common';
import { TranslationService } from '#LocalProject/Managers/service/translation-manager.service';
import { JwtAuthGuard } from '#LocalProject/Auth/guards/jwt.guard';
import type { Response } from 'express';

@Controller('translation')
export class TranslationController {
  constructor(private readonly translationService: TranslationService) {
  }
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
        // Trả về lỗi 400 với message rõ ràng cho FE
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
    return this.translationService.exportTranslation(fileId, language);
  }

  @UseGuards(JwtAuthGuard)
  @Get('export/download/:fileId')
  async downloadExport(
    @Param('fileId') fileId: string,
    @Query('language') language: string,
    @Query('format') format: 'original' | 'xliff' = 'original',
    @Res() res: Response
  ) {
    const { buffer, fileName, fileType } = await this.translationService.buildExportBuffer(fileId, language, format);
    res.setHeader('Content-Type', fileType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
    return res.send(buffer);
  }

  @UseGuards(JwtAuthGuard)
  @Post('export/download/bulk')
  async downloadBulkExport(
    @Body() body: {
      fileIds: string[];
      language?: string;
      languages?: string[]; // Thêm support cho nhiều ngôn ngữ
      format: 'original' | 'xliff';
      projectId?: string;
      branchId?: string;
      exportAllLanguages?: boolean; // Flag để export tất cả ngôn ngữ
    },
    @Res() res: Response
  ) {
    const { fileIds, language, languages, format, projectId, branchId, exportAllLanguages } = body;

    console.log('=== BACKEND: downloadBulkExport called ===');
    console.log('Received body:', JSON.stringify(body, null, 2));
    console.log('fileIds:', fileIds);
    console.log('fileIds type:', typeof fileIds);
    console.log('fileIds is array:', Array.isArray(fileIds));
    console.log('fileIds length:', fileIds?.length);

    if (fileIds && Array.isArray(fileIds)) {
      fileIds.forEach((id, index) => {
        console.log(`fileIds[${index}]:`, id, 'type:', typeof id, 'isNull:', id === null, 'isUndefined:', id === undefined);
      });
    }

    try {
      // Validate input
      if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
        console.log('Validation failed: fileIds is invalid');
        return res.status(400).json({
          message: 'Invalid fileIds: must be a non-empty array'
        });
      }

      if (!format) {
        console.log('Validation failed: format is missing');
        return res.status(400).json({
          message: 'Format is required'
        });
      }

      // Xác định ngôn ngữ cần export
      let targetLanguages: string[] = [];
      if (exportAllLanguages) {
        // Export tất cả ngôn ngữ có sẵn (cần truy vấn từ database)
        // Thay vì hardcode, lấy từ project thực tế
        try {
          // Lấy ngôn ngữ thực tế từ project
          const projectLanguages = await this.translationService.getProjectLanguages(projectId);
          if (projectLanguages && projectLanguages.length > 0) {
            targetLanguages = projectLanguages.map(lang => lang.code);
            console.log(`Using project languages: ${targetLanguages.join(', ')}`);
          } else {
            // Fallback nếu không lấy được
            targetLanguages = ['en', 'vi'];
            console.log(`No project languages found, using fallback: ${targetLanguages.join(', ')}`);
          }
        } catch (error) {
          console.error('Failed to get project languages:', error);
          // Fallback nếu có lỗi
          targetLanguages = ['en', 'vi'];
          console.log(`Error getting languages, using fallback: ${targetLanguages.join(', ')}`);
        }
      } else if (languages && Array.isArray(languages) && languages.length > 0) {
        targetLanguages = languages;
      } else if (language) {
        targetLanguages = [language];
      } else {
        console.log('Validation failed: no language specified');
        return res.status(400).json({
          message: 'Either language, languages array, or exportAllLanguages flag is required'
        });
      }

      console.log(`Starting bulk export: ${fileIds.length} files, ${targetLanguages.length} languages, format: ${format}`);

      // Tạo ZIP file chứa tất cả các file đã export theo ngôn ngữ
      const JSZip = require('jszip');
      const zip = new JSZip();

      let successCount = 0;
      let errorCount = 0;

      // Tạo cấu trúc thư mục theo ngôn ngữ
      for (const targetLanguage of targetLanguages) {
        const languageFolder = zip.folder(targetLanguage);

        for (const fileId of fileIds) {
          try {
            // Validate fileId
            if (!fileId || fileId.toString().trim() === '') {
              console.warn(`Skipping invalid fileId: ${fileId}`);
              continue;
            }

            console.log(`Exporting file ${fileId} in language ${targetLanguage}`);
            const { buffer, fileName } = await this.translationService.buildExportBuffer(fileId.toString(), targetLanguage, format);

            // Validate buffer
            if (!buffer || !Buffer.isBuffer(buffer)) {
              console.error(`Invalid buffer for file ${fileId} in language ${targetLanguage}`);
              const errorFileName = `ERROR_${fileId || 'unknown'}_${targetLanguage}.txt`;
              const errorContent = `Failed to export file ${fileId} in language ${targetLanguage}:\nError: Invalid buffer generated`;
              languageFolder.file(errorFileName, errorContent);
              errorCount++;
              continue;
            }

            // Thêm file vào thư mục ngôn ngữ
            languageFolder.file(fileName, buffer);
            successCount++;
            console.log(`Successfully added file ${fileName} to ZIP`);

          } catch (error: any) {
            console.error(`Failed to export file ${fileId} in language ${targetLanguage}:`, error);
            // Thêm file lỗi vào ZIP với nội dung thông báo lỗi
            const errorFileName = `ERROR_${fileId || 'unknown'}_${targetLanguage}.txt`;
            const errorContent = `Failed to export file ${fileId} in language ${targetLanguage}:\nError: ${error?.message || 'Unknown error'}`;
            languageFolder.file(errorFileName, errorContent);
            errorCount++;
          }
        }
      }

      if (successCount === 0) {
        console.log('No files were successfully exported');
        return res.status(500).json({
          message: 'No files were successfully exported',
          successCount,
          errorCount
        });
      }

      console.log(`Generating ZIP with ${successCount} successful files and ${errorCount} errors`);

      try {
        const zipBuffer = await zip.generateAsync({
          type: 'nodebuffer',
          compression: 'DEFLATE',
          compressionOptions: {
            level: 6
          }
        });

        console.log(`ZIP generated successfully, size: ${zipBuffer.length} bytes`);

        const zipFileName = `project-export-${projectId || 'project'}-${targetLanguages.join('-')}-${Date.now()}.zip`;

        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(zipFileName)}"`);
        res.setHeader('Content-Length', zipBuffer.length);
        res.send(zipBuffer);

        console.log(`Bulk export completed: ${successCount} successful, ${errorCount} failed`);
      } catch (zipError: any) {
        console.error('Failed to generate ZIP:', zipError);
        res.status(500).json({
          message: 'Failed to generate ZIP file',
          error: zipError?.message || 'Unknown ZIP generation error'
        });
      }
    } catch (error: any) {
      console.error('Bulk export error:', error);
      res.status(500).json({
        message: 'Failed to create bulk export',
        error: error?.message || 'Unknown error'
      });
    }
  }

}
