import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Req, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt.guard';
import { PageDifficultyService } from '../service/page-difficulty.service';

@Controller('page-difficulty')
@UseGuards(JwtAuthGuard)
export class PageDifficultyController {
  constructor(private readonly pageDifficultyService: PageDifficultyService) {}

  @Get(':fileId/pages')
  async getPages(@Param('fileId') fileId: string) {
    return this.pageDifficultyService.getPages(fileId);
  }

  @Post(':fileId/:pageNumber/assign')
  async assignDifficulty(
    @Param('fileId') fileId: string,
    @Param('pageNumber') pageNumber: number,
    @Body() body: { difficultyLevel: string; notes?: string }
  ) {
    return this.pageDifficultyService.assignDifficulty(fileId, pageNumber, body.difficultyLevel, body.notes);
  }

  @Get(':fileId/random')
  async getRandomPages(
    @Param('fileId') fileId: string,
    @Query('n') n: number
  ) {
    return this.pageDifficultyService.getRandomPages(fileId, n);
  }

  @Post(':fileId/:pageNumber/check-duplicate')
  async checkDuplicate(
    @Param('fileId') fileId: string,
    @Param('pageNumber') pageNumber: number
  ) {
    return this.pageDifficultyService.checkDuplicate(fileId, pageNumber);
  }

  @Get('config/:projectId')
  async getDifficultyConfig(@Param('projectId') projectId: string) {
    return this.pageDifficultyService.getDifficultyConfig(projectId);
  }

  @Post('config/:projectId')
  async updateDifficultyConfig(
    @Param('projectId') projectId: string,
    @Body() body: any
  ) {
    return this.pageDifficultyService.updateDifficultyConfig(projectId, body);
  }
}
