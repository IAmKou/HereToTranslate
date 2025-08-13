import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { ExportJobData, ExportJobResult } from './export-job.processor';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FileEntity } from '#LocalProject/Entities';

export interface ExportJobStatus {
  jobId: string;
  status: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed';
  progress?: number;
  result?: ExportJobResult;
  error?: string;
  createdAt: Date;
  processedAt?: Date;
  finishedAt?: Date;
}

@Injectable()
export class ExportManagerService {
  constructor(
    @InjectQueue('export') private readonly exportQueue: Queue,
    @InjectRepository(FileEntity)
    private readonly fileRepository: Repository<FileEntity>,
  ) {}

  async createSingleExportJob(
    fileId: string,
    language: string,
    format: 'original' | 'xliff',
    userId: string,
    projectId?: string,
    branchId?: string
  ): Promise<string> {
    const jobData: ExportJobData = {
      type: 'single',
      fileIds: [fileId],
      language,
      format,
      userId,
      projectId,
      branchId,
    };

    const job = await this.exportQueue.add('export-files', jobData, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    });

    return job.id.toString();
  }

  async createBulkExportJob(
    fileIds: string[],
    language: string,
    format: 'original' | 'xliff',
    userId: string,
    projectId?: string,
    branchId?: string
  ): Promise<string> {
    const jobData: ExportJobData = {
      type: 'bulk',
      fileIds,
      language,
      format,
      userId,
      projectId,
      branchId,
    };

    const job = await this.exportQueue.add('export-files', jobData, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    });

    return job.id.toString();
  }

  async getJobStatus(jobId: string): Promise<ExportJobStatus | null> {
    const job = await this.exportQueue.getJob(jobId);
    if (!job) {
      return null;
    }

    const status: ExportJobStatus = {
      jobId: job.id.toString(),
      status: await job.getState(),
      createdAt: new Date(job.timestamp),
      processedAt: job.processedOn ? new Date(job.processedOn) : undefined,
      finishedAt: job.finishedOn ? new Date(job.finishedOn) : undefined,
    };

    // Get progress if available
    const progress = await job.progress();
    if (progress !== 0) {
      status.progress = progress;
    }

    // Get result if completed
    if (status.status === 'completed') {
      status.result = job.returnvalue;
    }

    // Get error if failed
    if (status.status === 'failed') {
      status.error = job.failedReason;
    }

    return status;
  }

  async getUserJobs(userId: string, limit: number = 10): Promise<ExportJobStatus[]> {
    const jobs = await this.exportQueue.getJobs(['waiting', 'active', 'completed', 'failed', 'delayed'], 0, limit);

    const userJobs = jobs.filter(job => job.data.userId === userId);

    const jobStatuses: ExportJobStatus[] = [];

    for (const job of userJobs) {
      const status = await this.getJobStatus(job.id.toString());
      if (status) {
        jobStatuses.push(status);
      }
    }

    return jobStatuses.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async cancelJob(jobId: string, userId: string): Promise<boolean> {
    const job = await this.exportQueue.getJob(jobId);
    if (!job || job.data.userId !== userId) {
      return false;
    }

    await job.remove();
    return true;
  }

  async getProjectFiles(projectId: string, branchId?: string): Promise<Array<{ id: string; fileName: string; fileType: string }>> {
    const query = this.fileRepository.createQueryBuilder('file')
      .where('file.projectId = :projectId', { projectId })
      .select(['file.id', 'file.fileName', 'file.fileType']);

    if (branchId) {
      query.andWhere('file.branchId = :branchId', { branchId });
    }

    const files = await query.getMany();

    return files.map(file => ({
      id: file.id.toString(),
      fileName: file.fileName,
      fileType: file.fileType,
    }));
  }

  async getQueueStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.exportQueue.getWaiting(),
      this.exportQueue.getActive(),
      this.exportQueue.getCompleted(),
      this.exportQueue.getFailed(),
      this.exportQueue.getDelayed(),
    ]);

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      delayed: delayed.length,
    };
  }
}
