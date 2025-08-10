import { InjectRepository } from '@nestjs/typeorm';
import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { BranchEntity, FileEntity, ProjectEntity, RequestEntity, UserEntity } from '#LocalProject/Entities';
import { DeepPartial, Repository } from 'typeorm';
import { GitHubService } from '#LocalProject/Managers/service/github-manager.service';
import { Express } from 'express';
import { ManifestService } from '#LocalProject/Managers/service/manifest.service';
import { InjectModel } from '@nestjs/mongoose';
import { TranslationString, TranslationStringDocument } from '../../db/mongo/schema/translation.schema';
import { Model } from 'mongoose';
import { CommitEntity } from '../../db/mysql/entity/commit.entity';
import { PageDifficultyService } from './page-difficulty.service';

@Injectable()
export class FileService {
  constructor(
    @InjectRepository(FileEntity)
    private readonly fileRepository: Repository<FileEntity>,
    @InjectModel(TranslationString.name)
    private translationModel: Model<TranslationStringDocument>,
    @InjectRepository(RequestEntity)
    private readonly requestRepository: Repository<RequestEntity>,
    private readonly githubService: GitHubService,
    private readonly manifestService : ManifestService,
    @InjectRepository(CommitEntity)
    private readonly commitRepository: Repository<CommitEntity>,
    @Inject(forwardRef(() => PageDifficultyService))
    private readonly pageDifficultyService: PageDifficultyService,
  ) {
    this.logger = new Logger(FileService.name);
    this.logger.log('FileService initialized');
  }
  private readonly logger = new Logger(FileService.name);

  async saveFile(params: {
    uid: bigint;
    fileName: string;
    fileType: string;
    fileContent: Buffer;
    projectId?: bigint;
    branchId?: bigint;
    requestId?: bigint;
  }): Promise<{
    fileId: string;
    fileName: string;
    fileType: string;
    createdAt: Date;
    updatedAt: Date;
    uploaderId?: string;
    projectId?: string;
    branchId?: string;
    requestId?: string;
  }> {
    this.logger.log('===DEBUG FILE NAME saveFile===');
    const { uid, fileName, fileType, fileContent, projectId, branchId, requestId } = params;

    const file = this.fileRepository.create({
      fileName,
      fileType,
      fileContent,
      uploader: { id: uid },
      project: projectId ? { id: projectId } : undefined,
      branch: branchId ? { id: branchId } : undefined,
      request: requestId ? { id: requestId } : undefined,
    });

    this.logger.log(`Saving file: ${fileName}, type: ${fileType}, projectId: ${projectId}, branchId: ${branchId}, uploader: ${uid}`);
    this.logger.log(`File content length: ${fileContent.length}`);
    this.logger.log(`Raw fileName: ${fileName}`);
    this.logger.log(`fileName (JSON): ${JSON.stringify(fileName)}`);
    this.logger.log(`fileName (Buffer): ${Buffer.from(fileName, 'utf8').toString('hex')}`);

    const savedFile = await this.fileRepository.save(file);
    const safeFileName = fileName.replace(/[\\/:*?"<>|]/g, '_');
    const timestamped = `${Date.now()}_${safeFileName}`;
    const repoName = `project-${projectId}`;

    try {
      await this.githubService.pushInitialFile({
        repo: repoName,
        path: safeFileName,
        content: fileContent,
        message: `Uploaded ${fileName}`,
      });
    } catch (err) {
      this.logger.error('pushInitialFile error:', err);
    }

    // this.logger.log(`Saved FileEntity: ${JSON.stringify(savedFile)}`); // XÓA hoặc comment dòng này để tránh lỗi BigInt
    this.logger.log(`Pushed file to repo: ${repoName}, path: ${timestamped}`);

    return {
      fileId: savedFile.id.toString(),
      fileName: savedFile.fileName,
      fileType: savedFile.fileType,
      createdAt: savedFile.createdAt,
      updatedAt: savedFile.updatedAt,
      uploaderId: savedFile.uploader?.id ? savedFile.uploader.id.toString() : undefined,
      projectId: savedFile.project?.id ? savedFile.project.id.toString() : undefined,
      branchId: savedFile.branch?.id ? savedFile.branch.id.toString() : undefined,
      requestId: savedFile.request?.id ? savedFile.request.id.toString() : undefined,
    };
  }

  async handleUpload(
    file: Express.Multer.File,
    uid: bigint,
    projectId?: bigint,
    branchId?: bigint,
    requestId?: bigint,
  ) {
    this.logger.log('===DEBUG FILE NAME handleUpload===');

    // Tìm file trùng tên trong cùng project + branch
    const fileName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    const existingFile = await this.fileRepository.findOne({
      where: {
        fileName,
        project: projectId ? { id: projectId } : undefined,
        branch: branchId ? { id: branchId } : undefined,
      },
      relations: ['project', 'branch'],
    });

    let saved;
    let isUpdate = false;
    if (existingFile) {
      // Update nội dung file cũ
      existingFile.fileContent = file.buffer;
      existingFile.fileType = file.mimetype;
      existingFile.uploader = { id: uid } as any;
      existingFile.updatedAt = new Date();
      existingFile.status = 'processing';
      await this.fileRepository.save(existingFile);
      saved = {
        fileId: existingFile.id.toString(),
        fileName: existingFile.fileName,
        fileType: existingFile.fileType,
        createdAt: existingFile.createdAt,
        updatedAt: existingFile.updatedAt,
        uploaderId: existingFile.uploader?.id?.toString(),
        projectId: existingFile.project?.id?.toString(),
        branchId: existingFile.branch?.id?.toString(),
        requestId: existingFile.request?.id?.toString(),
      };
      isUpdate = true;
    } else {
      // Tạo file mới như cũ
      const fileEntity = this.fileRepository.create({
        fileName,
        fileType: file.mimetype,
        fileContent: file.buffer,
        uploader: { id: uid },
        project: projectId ? { id: projectId } : undefined,
        branch: branchId ? { id: branchId } : undefined,
        request: requestId ? { id: requestId } : undefined,
        status: 'processing',
      });
      const savedFile = await this.fileRepository.save(fileEntity);
      saved = {
        fileId: savedFile.id.toString(),
        fileName: savedFile.fileName,
        createdAt: savedFile.createdAt,
        updatedAt: savedFile.updatedAt,
        uploaderId: savedFile.uploader?.id?.toString(),
        projectId: savedFile.project?.id?.toString(),
        branchId: savedFile.branch?.id?.toString(),
        requestId: savedFile.request?.id?.toString(),
      };
    }

    // Chạy extract string ở background, trả về ngay cho client
    setTimeout(async () => {
      try {
        await this.extractStringsFromFile(saved.fileId, uid);
        // Cập nhật status file thành 'ready'
        const fileEntity = await this.fileRepository.findOne({ where: { id: BigInt(saved.fileId) } });
        if (fileEntity) {
          fileEntity.status = 'ready';
          await this.fileRepository.save(fileEntity);
        }
      } catch (err) {
        // Nếu lỗi, cập nhật status file thành 'error'
        this.logger.error(`Background extraction failed for file ${saved.fileId}:`, err);
        const fileEntity = await this.fileRepository.findOne({ where: { id: BigInt(saved.fileId) } });
        if (fileEntity) {
          fileEntity.status = 'error';
          // Add error details to extractLog
          const errorMessage = err instanceof Error ? err.message : String(err);
          const errorLog = `[${new Date().toISOString()}] EXTRACTION FAILED: ${errorMessage}\n`;
          fileEntity.extractLog = (fileEntity.extractLog || '') + errorLog;
          await this.fileRepository.save(fileEntity);
        }
      }
    }, 100);

    // Trả về ngay, không chờ extract xong
    return {
      ...saved,
      updated: isUpdate,
      status: 'processing',
    };
  }


  async saveTempFile(file: Express.Multer.File, uid: bigint) {
    const fileEntity = this.fileRepository.create({
      fileName: file.originalname,
      fileType: file.mimetype,
      fileContent: file.buffer,
      uploader: { id: uid } as UserEntity,
      project: null as ProjectEntity | null,
      branch: null as BranchEntity | null,
    } as DeepPartial<FileEntity>);

    const saved = await this.fileRepository.save(fileEntity);
    return { fileId: saved.id.toString(), fileName: saved.fileName };
  }



  async getProjectFiles(projectId: bigint, uid: bigint) {
    const files = await this.fileRepository.find({
      where: { project: { id: projectId } },
      relations: ['uploader'],
      select: ['id', 'fileName', 'fileType', 'createdAt', 'uploader', 'status'],
      order: { createdAt: 'DESC' }
    });

    return files.map((file: any) => ({
      fileId: file.id.toString(),
      fileName: file.fileName,
      fileType: file.fileType,
      createdAt: file.createdAt,
      status: file.status || 'ready',
      uploader: {
        uploaderId: file.uploader.id.toString(),
        username: file.uploader.username,
        fullName: file.uploader.fullName
      }
    }));
  }

  async getFileById(fileId: string) {
    const file = await this.fileRepository.findOne({
      where: { id: BigInt(fileId) },
      select: ['id', 'fileName', 'fileType', 'fileContent', 'status', 'extractLog'],
    });
    if (!file) return null;
    return {
      fileId: file.id.toString(),
      fileName: file.fileName,
      fileType: file.fileType,
      fileContent: file.fileContent,
      status: file.status || 'ready',
      extractLog: file.extractLog || '',
    };
  }

  /**
   * Get detailed file information including error logs for debugging
   */
  async getFileDetails(fileId: string) {
    const file = await this.fileRepository.findOne({
      where: { id: BigInt(fileId) },
      relations: ['uploader', 'project', 'branch'],
      select: ['id', 'fileName', 'fileType', 'status', 'extractLog', 'createdAt', 'updatedAt', 'uploader', 'project', 'branch'],
    });
    
    if (!file) {
      throw new NotFoundException('File not found');
    }

    // Get translation strings count
    const translationCount = await this.translationModel.countDocuments({ fileId: fileId });

    return {
      fileId: file.id.toString(),
      fileName: file.fileName,
      fileType: file.fileType,
      status: file.status || 'ready',
      extractLog: file.extractLog || '',
      createdAt: file.createdAt,
      updatedAt: file.updatedAt,
      translationCount,
      uploader: file.uploader ? {
        id: file.uploader.id.toString(),
        username: file.uploader.username,
        fullName: file.uploader.fullName,
      } : null,
      project: file.project ? {
        id: file.project.id.toString(),
        name: file.project.name,
      } : null,
      branch: file.branch ? {
        id: file.branch.id.toString(),
        name: file.branch.name,
      } : null,
    };
  }

  async uploadFileForRequest(
    file: Express.Multer.File,
    uid: bigint,
    requestId: bigint
  ) {
    const request = await this.requestRepository.findOne({ where: { id: requestId } });
    if (!request) throw new NotFoundException('Request not found');

    const saved = await this.saveFile({
      uid,
      fileName: Buffer.from(file.originalname, 'latin1').toString('utf8'),
      fileType: file.mimetype,
      fileContent: file.buffer,
      requestId,
    });

    const fullFile = await this.fileRepository.findOneOrFail({
      where: { id: BigInt(saved.fileId) },
      relations: ['project', 'branch'],
      select: ['id', 'fileName', 'fileType', 'fileContent', 'project', 'branch'],
    });

    await this.manifestService.generateManifest(fullFile);

    // Push manifest to GitHub if project/branch info is present
    if (fullFile.project && fullFile.branch) {
      const manifestEntries = await this.translationModel.find({ fileId: fullFile.id.toString() }).lean();
      const manifestJson = JSON.stringify(manifestEntries, null, 2);
      try {
        await this.githubService.pushInitialFile({
          repo: `project-${fullFile.project.id}`,
          path: `${fullFile.id.toString()}_manifest.json`,
          content: manifestJson,
          message: `Add manifest for ${fullFile.fileName}`,
          branch: 'main',
        });
        this.logger.log(`Manifest pushed to repo for fileId: ${fullFile.id}`);
      } catch (err) {
        this.logger.error('Error pushing manifest to GitHub', err);
      }
    }

    return {
      message: 'File uploaded and linked to request',
      fileId: saved.fileId,
    };
  }


  async deleteFile(fileId: bigint, userId: string | bigint) {
    const file = await this.fileRepository.findOne({ where: { id: BigInt(fileId) }, relations: ['uploader', 'project'] });
    if (!file) throw new NotFoundException('File not found');

    this.logger.log(`Attempting to delete file: ${file.fileName} (ID: ${fileId})`);

    // Kiểm tra quyền AttachFiles trên project
    const hasAttachFiles = await this.checkUserAttachFilesPermission(userId, file.project?.id);
    if (!hasAttachFiles) {
      throw new ForbiddenException('You do not have permission (AttachFiles) to delete this file');
    }

    // Debug: Kiểm tra tất cả commit liên quan đến file này
    const allCommits = await this.commitRepository
      .createQueryBuilder('commit')
      .where('commit.filePath = :filePath', { filePath: file.fileName })
      .getMany();

    this.logger.log(`Found ${allCommits.length} commits for file: ${file.fileName}`);
    allCommits.forEach(commit => {
      this.logger.log(`Commit ID: ${commit.id}, Message: "${commit.message}", FilePath: "${commit.filePath}"`);
    });

    // Tạm thời bypass kiểm tra commit để test
    this.logger.log('Bypassing commit check for testing...');
    /*
    // Kiểm tra commit liên quan đến file (filePath trùng tên file) - loại trừ Initial commit
    const hasCommit = await this.commitRepository
      .createQueryBuilder('commit')
      .where('commit.filePath = :filePath', { filePath: file.fileName })
      .andWhere('commit.message NOT LIKE :message', { message: '%Initial%' })
      .getCount();

    this.logger.log(`Commits excluding Initial commit: ${hasCommit}`);

    if (hasCommit > 0) {
      throw new BadRequestException('Cannot delete file: There are commits related to this file.');
    }
    */

    await this.fileRepository.delete(String(file.id));
    this.logger.log(`File deleted successfully: ${file.fileName}`);
    return { success: true, message: 'File deleted' };
  }

  async checkUserAttachFilesPermission(userId: string | bigint, projectId: string | bigint): Promise<boolean> {
 
    return true;
  }

  /**
   * Get file metadata including project and branch information
   * Used by page difficulty service to validate file relationships
   */
  async getFileMetadata(fileId: string) {
    const file = await this.fileRepository.findOne({
      where: { id: BigInt(fileId) },
      relations: ['project', 'branch', 'uploader'],
      select: ['id', 'fileName', 'fileType', 'createdAt', 'updatedAt', 'status', 'project', 'branch', 'uploader'],
    });

    if (!file) {
      throw new NotFoundException(`File with ID ${fileId} not found`);
    }

    return {
      fileId: file.id.toString(),
      fileName: file.fileName,
      fileType: file.fileType,
      createdAt: file.createdAt,
      updatedAt: file.updatedAt,
      status: file.status || 'ready',
      project: file.project ? {
        id: file.project.id.toString(),
        name: file.project.name,
      } : null,
      branch: file.branch ? {
        id: file.branch.id.toString(),
        name: file.branch.name,
      } : null,
      uploader: file.uploader ? {
        id: file.uploader.id.toString(),
        username: file.uploader.username,
        fullName: file.uploader.fullName,
      } : null,
    };
  }

  /**
   * Validate that a file has the required project and branch relationships
   * for page difficulty analysis
   */
  async validateFileForPageDifficulty(fileId: string): Promise<{ projectId: string; branchId: string }> {
    const file = await this.fileRepository.findOne({
      where: { id: BigInt(fileId) },
      relations: ['project', 'branch'],
      select: ['id', 'fileName', 'project', 'branch'],
    });

    if (!file) {
      throw new NotFoundException(`File with ID ${fileId} not found`);
    }

    if (!file.project) {
      throw new BadRequestException(`File ${file.fileName} is not associated with a project. Page difficulty analysis requires a project association.`);
    }

    if (!file.branch) {
      throw new BadRequestException(`File ${file.fileName} is not associated with a branch. Page difficulty analysis requires a branch association.`);
    }

    return {
      projectId: file.project.id.toString(),
      branchId: file.branch.id.toString(),
    };
  }

  async extractStringsFromFile(fileId: string, userId: string | bigint) {
    const file = await this.fileRepository.findOne({
      where: { id: BigInt(fileId) },
      relations: ['uploader', 'project', 'branch']
    });

    if (!file) throw new NotFoundException('File not found');

    // Check permission - chỉ uploader mới có thể extract strings
    if (file.uploader.id.toString() !== userId.toString()) {
      throw new Error('You do not have permission to extract strings from this file');
    }

    // Additional validation
    if (!file.fileContent || file.fileContent.length === 0) {
      throw new Error('File has no content to extract');
    }

    if (!file.project || !file.branch) {
      throw new Error('File must be associated with a project and branch for string extraction');
    }

    let log = '';
    function appendLog(msg: string) {
      log += `[${new Date().toISOString()}] ${msg}\n`;
      file!.extractLog = log;
    }
    try {
      appendLog('Start extracting strings...');
      // ĐÁNH DẤU OBSOLETE CHO STRING CŨ THAY VÌ XÓA CỨNG
      appendLog('Marking old strings as obsolete...');
      await this.translationModel.updateMany(
        { fileId: file.id.toString(), obsolete: { $ne: true } },
        { $set: { obsolete: true } }
      );
      appendLog('Generating manifest...');
      await this.manifestService.generateManifest(file); // Đảm bảo hàm này set obsolete: false cho string mới
      appendLog('Manifest generated.');
      
      // Auto-assign page difficulties after manifest generation
      try {
        appendLog('Auto-assigning page difficulties...');
        const autoAssignResult = await this.pageDifficultyService.autoAssignPageDifficulties(
          file.id.toString(),
          userId.toString()
        );
        appendLog(`Page difficulties auto-assigned: ${autoAssignResult.assignedPages} assigned, ${autoAssignResult.skippedPages} skipped`);
      } catch (autoAssignError: any) {
        appendLog('Warning: Auto-assignment of page difficulties failed: ' + (autoAssignError?.message || autoAssignError));
        // Don't fail the entire extraction if auto-assignment fails
      }
      
      // Optionally push manifest to GitHub if project/branch info is present
      if (file.project && file.branch) {
        appendLog('Pushing manifest to GitHub...');
        const manifestEntries = await this.translationModel.find({ fileId: file.id.toString() }).lean();
        const manifestJson = JSON.stringify(manifestEntries, null, 2);
        try {
          await this.githubService.pushInitialFile({
            repo: `project-${file.project.id}`,
            path: `${file.id.toString()}_manifest.json`,
            content: manifestJson,
            message: `Add manifest for ${file.fileName}`,
            branch: 'main',
          });
          appendLog('Manifest pushed to GitHub.');
        } catch (err: any) {
          appendLog('Error pushing manifest to GitHub: ' + (err?.message || err));
        }
      }
      appendLog('Successfully generated manifest for file.');
      await this.fileRepository.save(file);
      return {
        success: true,
        message: 'Manifest generated successfully',
        fileId: file.id.toString(),
        fileName: file.fileName
      };
    } catch (error: any) {
      appendLog('Error generating manifest: ' + (error?.message || error));
      await this.fileRepository.save(file);
      this.logger.error(`Error generating manifest for file ${file.fileName}:`, error);
      throw new Error(`Failed to generate manifest: `);
    }
  }

  async saveFileToDB(params: {
    uid: bigint;
    fileName: string;
    fileType: string;
    fileContent: Buffer;
    projectId?: bigint;
    branchId?: bigint;
    requestId?: bigint;
  }) {
    const { uid, fileName, fileType, fileContent, projectId, branchId, requestId } = params;

    const file = this.fileRepository.create({
      fileName,
      fileType,
      fileContent,
      uploader: { id: uid },
      project: projectId ? { id: projectId } : undefined,
      branch: branchId ? { id: branchId } : undefined,
      request: requestId ? { id: requestId } : undefined,
    });

    const savedFile = await this.fileRepository.save(file);
    return {
      fileId: savedFile.id.toString(),
      fileName: savedFile.fileName,
      fileType: savedFile.fileType,
      createdAt: savedFile.createdAt,
      updatedAt: savedFile.updatedAt,
      uploaderId: savedFile.uploader?.id?.toString(),
      projectId: savedFile.project?.id?.toString(),
      branchId: savedFile.branch?.id?.toString(),
      requestId: savedFile.request?.id?.toString(),
    };
  }

  async handleLocalUpload(
    file: Express.Multer.File,
    uid: bigint,
    projectId?: bigint,
    branchId?: bigint,
    requestId?: bigint,
  ) {
    this.logger.log('===DEBUG FILE NAME handleUpload===');

    const saved = await this.saveFileToDB({
      uid,
      fileName: Buffer.from(file.originalname, 'latin1').toString('utf8'),
      fileType: file.mimetype,
      fileContent: file.buffer,
      projectId,
      branchId,
      requestId,
    });

    // Find the full file entity with project/branch for manifest
    const fileEntity = await this.fileRepository.findOne({
      where: { id: BigInt(saved.fileId) },
      relations: ['project', 'branch'],
      select: ['id', 'fileName', 'fileType', 'fileContent', 'project', 'branch'],
    });

    if (fileEntity) {
      try {
        await this.manifestService.generateManifest(fileEntity);
      } catch (error) {
        this.logger.error(`Failed to generate manifest for file ${fileEntity.id}:`, error);
        // Continue execution even if manifest generation fails
      }

      // Optionally push manifest to GitHub if project/branch info is present
      if (fileEntity.project && fileEntity.branch) {
        const manifestEntries = await this.translationModel.find({ fileId: fileEntity.id.toString() }).lean();
        const manifestJson = JSON.stringify(manifestEntries, null, 2);
        try {
          await this.githubService.pushInitialFile({
            repo: `project-${fileEntity.project.id}`,
            path: `${fileEntity.id.toString()}_manifest.json`,
            content: manifestJson,
            message: `Add manifest for ${fileEntity.fileName}`,
            branch: 'main',
          });
          this.logger.log(`Manifest pushed to repo for fileId: ${fileEntity.id}`);
        } catch (err) {
          this.logger.error('Error pushing manifest to GitHub', err);
        }
      }
    }

    this.logger.log(`File uploaded and saved. fileId: ${saved.fileId}`);
    return {
      message: 'File uploaded successfully',
      fileId: saved.fileId,
    };
  }

  /**
   * Retry extraction for a failed file
   */
  async retryExtraction(fileId: string, userId: string | bigint) {
    this.logger.log(`Retrying extraction for file ${fileId}`);
    
    // Reset file status to processing
    const file = await this.fileRepository.findOne({ 
      where: { id: BigInt(fileId) },
      relations: ['uploader', 'project', 'branch']
    });
    
    if (!file) {
      throw new NotFoundException('File not found');
    }

    // Check permission
    if (file.uploader.id.toString() !== userId.toString()) {
      throw new Error('You do not have permission to retry extraction for this file');
    }

    // Reset status and clear previous error log
    file.status = 'processing';
    file.extractLog = `[${new Date().toISOString()}] Retrying extraction...\n`;
    await this.fileRepository.save(file);

    // Retry extraction in background
    setTimeout(async () => {
      try {
        await this.extractStringsFromFile(fileId, userId);
        // Update status to ready
        const updatedFile = await this.fileRepository.findOne({ where: { id: BigInt(fileId) } });
        if (updatedFile) {
          updatedFile.status = 'ready';
          await this.fileRepository.save(updatedFile);
        }
      } catch (err) {
        // Update status to error with new error details
        this.logger.error(`Retry extraction failed for file ${fileId}:`, err);
        const updatedFile = await this.fileRepository.findOne({ where: { id: BigInt(fileId) } });
        if (updatedFile) {
          updatedFile.status = 'error';
          const errorMessage = err instanceof Error ? err.message : String(err);
          const errorLog = `[${new Date().toISOString()}] RETRY FAILED: ${errorMessage}\n`;
          updatedFile.extractLog = (updatedFile.extractLog || '') + errorLog;
          await this.fileRepository.save(updatedFile);
        }
      }
    }, 100);

    return {
      success: true,
      message: 'Extraction retry initiated',
      fileId: fileId,
      status: 'processing'
    };
  }

}
