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
    @Query('branchId') branchId: string
  ) {
    return this.translationService.getAllString(projectId, branchId);
  }

  @Post('translate/:id')
  async translateString(
    @Param('id') id: string,
    @Body('translatedText') translatedText: string
  ) {
    return this.translationService.addTranslatedString(id, translatedText);
  }

  @Post('commit-translations')
  async commitAllToGitHub(
    @Query('projectId') projectId: string,
    @Query('branchId') branchId: string,
    @Query('repo') repo: string
  ) {
    return this.translationService.commitTranslatedFileToGitHub(projectId, branchId, repo);
  }

}
