import { Injectable, Logger } from '@nestjs/common';
import * as os from 'os';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { FileEntity } from '#LocalProject/Entities';
import { ManifestService } from '#LocalProject/Managers/service/manifest.service';

@Injectable()
export class BackgroundExtractService {
  private readonly logger = new Logger(BackgroundExtractService.name);
  private isProcessing = false;
  private readonly queue: string[] = [];
  private readonly concurrency: number = Math.max(
    1,
    parseInt(process.env.EXTRACT_CONCURRENCY || '', 10) || Math.max(1, Math.floor(os.cpus().length / 2))
  );

  constructor(
    @InjectRepository(FileEntity)
    private readonly fileRepository: Repository<FileEntity>,
    private readonly manifestService: ManifestService
  ) {}

  enqueue(fileIds: string[]) {
    for (const id of fileIds) this.queue.push(id);
    this.process();
  }

  private process() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    const runNext = async () => {
      const batch: string[] = [];
      while (batch.length < this.concurrency && this.queue.length > 0) {
        batch.push(this.queue.shift()!);
      }

      if (batch.length === 0) {
        this.isProcessing = false;
        return;
      }

      try {
        const files = await this.fileRepository.find({
          where: { id: In(batch.map((b) => BigInt(b))) },
          relations: ['project'],
          select: ['id', 'fileName', 'fileType', 'fileContent'],
        });
        for (const file of files) {
          try {
            await this.manifestService.generateManifest(file);
            this.logger.log(`Extracted strings for file ${file.id}`);
          } catch (err) {
            this.logger.error(`Failed extracting file ${file.id}`, err as any);
          }
        }
      } catch (err) {
        this.logger.error('Background extract batch failed', err as any);
      } finally {
        setImmediate(runNext);
      }
    };

    setImmediate(runNext);
  }
}


