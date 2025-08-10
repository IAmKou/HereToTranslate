import { 
  Body, 
  Controller, 
  Post, 
  Get, 
  Put, 
  Param, 
  Req, 
  UseGuards,
  HttpCode,
  HttpStatus
} from '@nestjs/common';
import type { AuthenticatedRequest } from '#LocalProject/Auth/types';
import { PageDifficultyService } from '../service/page-difficulty.service';
import { JwtAuthGuard } from '#LocalProject/Auth/guards/jwt.guard';
import { BigIntTransformPipe } from '#LocalProject/Utils/pipes/bigint-transform.pipe';
import {
  PageDifficultyDto,
  UpdatePageDifficultyDto,
  PagePreviewDto,
  DifficultyConfigDto,
} from '#LocalProject/Dtos';

@Controller('page-difficulty')
@UseGuards(JwtAuthGuard)
export class PageDifficultyController {
  constructor(private readonly pageDifficultyService: PageDifficultyService) {}

  /**
   * Get page preview with complexity analysis
   */
  @Post('preview')
  @HttpCode(HttpStatus.OK)
  async getPagePreview(@Body() dto: PagePreviewDto) {
    return this.pageDifficultyService.getPagePreview(dto);
  }

  /**
   * Assign difficulty level to a page
   */
  @Post('assign')
  async assignPageDifficulty(
    @Body() body: {
      projectId: string;
      branchId: string;
      fileId: string;
      pageNumber: number;
      filePart: number;
      difficultyLevel: string;
      baseScore?: number;
      notes?: string;
      previewData?: {
        textCount: number;
        complexity: string;
        estimatedTime: number;
      };
    },
    @Req() req: AuthenticatedRequest
  ) {
    const dto: PageDifficultyDto = {
      pageNumber: body.pageNumber,
      filePart: body.filePart,
      difficultyLevel: body.difficultyLevel as any,
      baseScore: body.baseScore,
      notes: body.notes,
      previewData: body.previewData,
    };

    return this.pageDifficultyService.assignPageDifficulty(
      body.projectId,
      body.branchId,
      body.fileId,
      dto,
      req.user.id.toString()
    );
  }

  /**
   * Update page difficulty
   */
  @Put('update')
  async updatePageDifficulty(
    @Body() dto: UpdatePageDifficultyDto,
    @Req() req: AuthenticatedRequest
  ) {
    return this.pageDifficultyService.updatePageDifficulty(dto, req.user.id.toString());
  }

  /**
   * Get page difficulties for a file
   */
  @Get('file/:fileId')
  async getPageDifficulties(@Param('fileId') fileId: string) {
    return this.pageDifficultyService.getPageDifficulties(fileId);
  }

  /**
   * Get available pages for a file
   */
  @Get('file/:fileId/available')
  async getAvailablePages(@Param('fileId') fileId: string) {
    return this.pageDifficultyService.getAvailablePages(fileId);
  }

  /**
   * Calculate task score for selected pages
   */
  @Post('file/:fileId/calculate-score')
  async calculateTaskScore(
    @Param('fileId') fileId: string,
    @Body() body: { selectedPages?: number[] }
  ) {
    return this.pageDifficultyService.calculateTaskScore(fileId, body.selectedPages);
  }

  /**
   * Validate no duplicate pages
   */
  @Post('file/:fileId/validate-pages')
  async validateNoDuplicatePages(
    @Param('fileId') fileId: string,
    @Body() body: { pageNumbers: number[] }
  ) {
    return this.pageDifficultyService.validateNoDuplicatePages(fileId, body.pageNumbers);
  }

  /**
   * Get difficulty configurations for a project
   */
  @Get('configs/:projectId')
  async getDifficultyConfigs(@Param('projectId') projectId: string) {
    return this.pageDifficultyService.getDifficultyConfigs(projectId);
  }

  /**
   * Create default difficulty configurations for a project
   */
  @Post('configs/:projectId/create-defaults')
  async createDefaultDifficultyConfigs(
    @Param('projectId') projectId: string,
    @Req() req: AuthenticatedRequest
  ) {
    return this.pageDifficultyService.createDefaultDifficultyConfigs(
      projectId,
      req.user.id.toString()
    );
  }

  /**
   * Update difficulty configuration
   */
  @Put('configs/:configId')
  async updateDifficultyConfig(
    @Param('configId') configId: string,
    @Body() dto: Partial<DifficultyConfigDto>,
    @Req() req: AuthenticatedRequest
  ) {
    return this.pageDifficultyService.updateDifficultyConfig(
      configId,
      dto,
      req.user.id.toString()
    );
  }
}
