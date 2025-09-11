import { Process, Processor } from '@nestjs/bull';
import type { Job } from 'bull';
import { Injectable } from '@nestjs/common';
import { TranslationService } from './translation-manager.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FileEntity } from '#LocalProject/Entities';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export interface ExportJobData {
  type: 'single' | 'bulk';
  fileIds: string[];
  language: string;
  format: 'original' | 'xliff';
  userId: string;
  projectId?: string;
  branchId?: string;
}

export interface ExportJobResult {
  jobId: string;
  status: 'completed' | 'failed';
  files: Array<{
    fileId: string;
    fileName: string;
    downloadUrl?: string;
    error?: string;
  }>;
  zipUrl?: string;
  error?: string;
}

@Injectable()
@Processor('export')
export class ExportJobProcessor {
  constructor(
    private readonly translationService: TranslationService,
    @InjectRepository(FileEntity)
    private readonly fileRepository: Repository<FileEntity>,
  ) {}

  @Process('export-files')
  async handleExportFiles(job: Job<ExportJobData>): Promise<ExportJobResult> {
    const { type, fileIds, language, format, userId, projectId, branchId } = job.data;

    try {
      // Create export directory
      const exportDir = join(process.cwd(), 'uploads', 'exports', job.id.toString());
      if (!existsSync(exportDir)) {
        await mkdir(exportDir, { recursive: true });
      }

      const results: ExportJobResult['files'] = [];

      if (type === 'single') {
        // Single file export
        const fileId = fileIds[0];
        try {
          const { buffer, fileName, fileType } = await this.translationService.buildExportBuffer(
            fileId,
            language,
            format
          );

          const filePath = join(exportDir, fileName);
          await writeFile(filePath, buffer);

          results.push({
            fileId,
            fileName,
            downloadUrl: `/api/exports/download/${job.id}/${encodeURIComponent(fileName)}`
          });
        } catch (error) {
          results.push({
            fileId,
            fileName: 'unknown',
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      } else {
        // Bulk export
        const { default: JSZip } = await import('jszip');
        const zip = new JSZip();

        for (const fileId of fileIds) {
          try {
            const { buffer, fileName, fileType } = await this.translationService.buildExportBuffer(
              fileId,
              language,
              format
            );

            zip.file(fileName, buffer);

            results.push({
              fileId,
              fileName,
              downloadUrl: `/api/exports/download/${job.id}/${encodeURIComponent(fileName)}`
            });
          } catch (error) {
            results.push({
              fileId,
              fileName: 'unknown',
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }

        // Generate ZIP file for bulk export
        if (results.some(r => !r.error)) {
          const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
          const zipFileName = `bulk-export-${language}-${Date.now()}.zip`;
          const zipPath = join(exportDir, zipFileName);
          await writeFile(zipPath, zipBuffer);

          return {
            jobId: job.id.toString(),
            status: 'completed',
            files: results,
            zipUrl: `/api/exports/download/${job.id}/${encodeURIComponent(zipFileName)}`
          };
        }
      }

      return {
        jobId: job.id.toString(),
        status: 'completed',
        files: results
      };

    } catch (error) {
      return {
        jobId: job.id.toString(),
        status: 'failed',
        files: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}
