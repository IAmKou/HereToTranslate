import { Body, Controller, Delete, Get, Param, Post, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '#LocalProject/Auth/guards/jwt.guard';
import { ExportManagerService } from '#LocalProject/Managers/service/export-manager.service';
import { readFile, stat } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

@Controller('exports')
export class ExportController {
  constructor(private readonly exportManagerService: ExportManagerService) {}

  @UseGuards(JwtAuthGuard)
  @Post('single')
  async createSingleExport(
    @Body('fileId') fileId: string,
    @Body('language') language: string,
    @Body('format') format: 'original' | 'xliff' = 'original',
    @Body('projectId') projectId?: string,
    @Body('branchId') branchId?: string,
    @Body('userId') userId?: string,
  ) {
    const jobId = await this.exportManagerService.createSingleExportJob(
      fileId,
      language,
      format,
      userId || 'anonymous',
      projectId,
      branchId
    );

    return {
      jobId,
      message: 'Export job created successfully',
      status: 'waiting'
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('bulk')
  async createBulkExport(
    @Body('fileIds') fileIds: string[],
    @Body('language') language: string,
    @Body('format') format: 'original' | 'xliff' = 'original',
    @Body('projectId') projectId?: string,
    @Body('branchId') branchId?: string,
    @Body('userId') userId?: string,
  ) {
    const jobId = await this.exportManagerService.createBulkExportJob(
      fileIds,
      language,
      format,
      userId || 'anonymous',
      projectId,
      branchId
    );

    return {
      jobId,
      message: 'Bulk export job created successfully',
      status: 'waiting'
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('job/:jobId')
  async getJobStatus(@Param('jobId') jobId: string) {
    const status = await this.exportManagerService.getJobStatus(jobId);
    if (!status) {
      return { error: 'Job not found' };
    }
    return status;
  }

  @UseGuards(JwtAuthGuard)
  @Get('jobs')
  async getUserJobs(
    @Query('userId') userId: string,
    @Query('limit') limit?: number
  ) {
    const jobs = await this.exportManagerService.getUserJobs(userId, limit);
    return jobs;
  }

  @UseGuards(JwtAuthGuard)
  @Delete('job/:jobId')
  async cancelJob(
    @Param('jobId') jobId: string,
    @Body('userId') userId: string
  ) {
    const success = await this.exportManagerService.cancelJob(jobId, userId);
    return { success };
  }

  @UseGuards(JwtAuthGuard)
  @Get('project/:projectId/files')
  async getProjectFiles(
    @Param('projectId') projectId: string,
    @Query('branchId') branchId?: string
  ) {
    const files = await this.exportManagerService.getProjectFiles(projectId, branchId);
    return files;
  }

  @UseGuards(JwtAuthGuard)
  @Get('stats')
  async getQueueStats() {
    const stats = await this.exportManagerService.getQueueStats();
    return stats;
  }

  @UseGuards(JwtAuthGuard)
  @Get('download/:jobId/:fileName')
  async downloadExport(
    @Param('jobId') jobId: string,
    @Param('fileName') fileName: string,
    @Res() res: Response
  ) {
    try {
      const filePath = join(process.cwd(), 'uploads', 'exports', jobId, decodeURIComponent(fileName));

      if (!existsSync(filePath)) {
        return res.status(404).json({ error: 'File not found' });
      }

      const fileStats = await stat(filePath);
      const fileBuffer = await readFile(filePath);

      // Set appropriate headers
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
      res.setHeader('Content-Length', fileStats.size);

      return res.send(fileBuffer);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to download file' });
    }
  }
}
