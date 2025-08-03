import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { TranslationService } from '#LocalProject/Managers/service/translation-manager.service';
import { JwtAuthGuard } from '#LocalProject/Auth/guards/jwt.guard';

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
    @Query('filePart') filePart?: number
  ) {
    return this.translationService.getAllString(projectId, branchId, language, fileId, filePart);
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

}
