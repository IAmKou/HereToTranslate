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
    @Query('fileId') fileId?: string
  ) {
    return this.translationService.getAllString(projectId, branchId, fileId);
  }

  @Post('translate/:id')
  async translateString(
    @Param('id') id: string,
    @Body('translatedText') translatedText: string
  ) {
    try {
      return await this.translationService.addTranslation(id, translatedText);
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


}
