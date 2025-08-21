import { InjectRepository } from '@nestjs/typeorm';
import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException, forwardRef, Inject } from '@nestjs/common';
import { BranchEntity, FileEntity, ProjectEntity, RequestEntity, UserEntity } from '#LocalProject/Entities';
import { DeepPartial, Repository } from 'typeorm';
import { GitHubService } from '#LocalProject/Managers/service/github-manager.service';
import  { Express } from 'express';
import { ManifestService } from '#LocalProject/Managers/service/manifest.service';
import { InjectModel } from '@nestjs/mongoose';
import { TranslationString, TranslationStringDocument } from '../../db/mongo/schema/translation.schema';
import { Model } from 'mongoose';
import { CommitEntity } from '../../db/mysql/entity/commit.entity';
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import { renderAsync } from 'docx-preview';
import { ActivityManagerService } from './activity-manager.service';

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
    @Inject(forwardRef(() => ActivityManagerService))
    private readonly activityManagerService: ActivityManagerService,
  ) {
    this.logger = new Logger(FileService.name);
    this.logger.log('FileService initialized');
  }
  private readonly logger = new Logger(FileService.name);

  private async hasMeaningfulContentForUpload(upload: Express.Multer.File): Promise<boolean> {
    try {
      const mime = upload.mimetype || '';
      const buf = upload.buffer;
      // Quick text-like check
      const textLike = (
        mime.startsWith('text/') ||
        [
          'application/json',
          'text/html',
          'text/css',
          'application/javascript',
          'text/xml',
        ].includes(mime)
      );
      if (textLike) {
        const text = buf.toString('utf8');
        return /\S/.test(text);
      }
      // PDF check via text extraction
      if (mime === 'application/pdf') {
        try {
          const segments = await this.extractPdfTextSegments(buf);
          return Array.isArray(segments) && segments.some(seg => typeof seg?.text === 'string' && seg.text.trim().length > 0);
        } catch (e) {
          // If extraction fails, do not block by default
          this.logger.warn('PDF text extraction failed during validation; allowing upload');
          return true;
        }
      }
      // DOCX raw text extraction using mammoth
      if (mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        try {
          const result = await mammoth.extractRawText({ buffer: buf });
          const text = result?.value ?? '';
          return /\S/.test(text);
        } catch (e) {
          this.logger.warn('DOCX text extraction failed during validation; allowing upload');
          return true;
        }
      }
      // Other formats: skip strict validation
      return true;
    } catch (error) {
      this.logger.warn('Content validation encountered an error; allowing upload');
      return true;
    }
  }

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
      isSyncedFromRequest: !!requestId,
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

    // Log activity if this is a project file
    if (projectId) {
      try {
        // Count strings if it's a text-based file
        let stringCount = 0;
        if (fileType.includes('text') || fileType.includes('document') || fileType.includes('pdf')) {
          // This is a simplified count - in a real implementation you'd extract actual strings
          stringCount = Math.floor(fileContent.length / 100); // Rough estimate
        }

        await this.activityManagerService.logFileUpload(
          Number(projectId),
          Number(uid),
          fileName,
          stringCount,
          branchId ? Number(branchId) : undefined
        );
      } catch (error) {
        this.logger.error('Failed to log file upload activity:', error);
      }
    }

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
    title?: string,
  ) {
    this.logger.log('===DEBUG FILE NAME handleUpload===');
    // Validate meaningful content for certain formats to catch empty-content files with non-zero size
    const hasContent = await this.hasMeaningfulContentForUpload(file);
    if (!hasContent) {
      throw new BadRequestException('Uploaded file appears to have no extractable text content. Please upload a file with content.');
    }

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
      if (title !== undefined) existingFile.title = title;
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
        title: title,
        isSyncedFromRequest: !!requestId,
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

    // Log activity if this is a project file
    if (projectId) {
      try {
        // Count strings if it's a text-based file
        let stringCount = 0;
        if (file.mimetype.includes('text') || file.mimetype.includes('document') || file.mimetype.includes('pdf')) {
          // This is a simplified count - in a real implementation you'd extract actual strings
          stringCount = Math.floor(file.buffer.length / 100); // Rough estimate
        }

        await this.activityManagerService.logFileUpload(
          Number(projectId),
          Number(uid),
          fileName,
          stringCount,
          branchId ? Number(branchId) : undefined
        );
      } catch (error) {
        this.logger.error('Failed to log file upload activity:', error);
      }
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
        const fileEntity = await this.fileRepository.findOne({ where: { id: BigInt(saved.fileId) } });
        if (fileEntity) {
          fileEntity.status = 'error';
          await this.fileRepository.save(fileEntity);
        }
      }
    }, 100);

    // Trả về ngay, không chờ extract xong
    return {
      ...saved,
      updated: isUpdate,
      status: 'processing',
      title: title ?? undefined,
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
      relations: ['uploader', 'request'],
      select: ['id', 'fileName', 'fileType', 'createdAt', 'uploader', 'status', 'title', 'request', 'isSyncedFromRequest'],
      order: { createdAt: 'DESC' }
    });

    return files.map((file: any) => ({
      fileId: file.id.toString(),
      fileName: file.fileName,
      fileType: file.fileType,
      title: file.title ?? null,
      createdAt: file.createdAt,
      status: file.status || 'ready',
      syncedFromRequest: !!file.request || !!file.isSyncedFromRequest,
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
      relations: ['request'],
      select: ['id', 'fileName', 'fileType', 'fileContent', 'status', 'extractLog', 'title'],
    });
    if (!file) return null;
    return {
      fileId: file.id.toString(),
      fileName: file.fileName,
      fileType: file.fileType,
      fileContent: file.fileContent,
      title: file.title ?? null,
      status: file.status || 'ready',
      extractLog: file.extractLog || '',
      syncedFromRequest: !!(file as any).request,
      requestId: (file as any).request?.id ? (file as any).request.id.toString() : undefined,
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
    const file = await this.fileRepository.findOne({ where: { id: BigInt(fileId) }, relations: ['uploader', 'project', 'request'] });
    if (!file) throw new NotFoundException('File not found');

    this.logger.log(`Attempting to delete file: ${file.fileName} (ID: ${fileId})`);

    // Kiểm tra quyền AttachFiles trên project
    const hasAttachFiles = await this.checkUserAttachFilesPermission(userId, file.project?.id);
    if (!hasAttachFiles) {
      throw new ForbiddenException('You do not have permission (AttachFiles) to delete this file');
    }

    // Chặn xóa nếu file này được đồng bộ/tạo từ một request
    if (file.request || file.isSyncedFromRequest) {
      throw new BadRequestException('Cannot delete file: This file is linked to a request.');
    }

    // Extra safety: re-check via query in case relation wasn't hydrated
    const linkedCount = await this.fileRepository
      .createQueryBuilder('f')
      .leftJoin('f.request', 'req')
      .where('f.id = :id', { id: file.id })
      .andWhere('(req.id IS NOT NULL OR f.isSyncedFromRequest = true)')
      .getCount();
    if (linkedCount > 0) {
      throw new BadRequestException('Cannot delete file: This file is linked to a request.');
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

    // Log activity if this is a project file
    if (file.project?.id) {
      try {
        await this.activityManagerService.logFileDelete(
          Number(file.project.id),
          Number(userId),
          file.fileName,
          file.branch?.id ? Number(file.branch.id) : undefined
        );
      } catch (error) {
        this.logger.error('Failed to log file delete activity:', error);
      }
    }

    return { success: true, message: 'File deleted' };
  }

  // Hàm kiểm tra quyền AttachFiles (giả định, bạn cần implement đúng logic thực tế)
  async checkUserAttachFilesPermission(userId: string | bigint, projectId: string | bigint): Promise<boolean> {
    // TODO: Thay bằng logic thực tế kiểm tra quyền AttachFiles của user trên project
    // Ví dụ: kiểm tra bảng project_member, roles, permissionFlags, ...
    // Trả về true nếu có quyền, false nếu không
    return true; // Tạm thời cho phép tất cả, bạn cần thay thế bằng logic thực tế
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

    let log = '';
    function appendLog(msg: string) {
      log += `[${new Date().toISOString()}] ${msg}\n`;
      if (file) {
        file.extractLog = log;
      }
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

  async renameFile(fileId: bigint, newFileName: string, userId: bigint) {
    // Backward compatibility: delegate to updateFileMetadata
    return this.updateFileMetadata(fileId, { fileName: newFileName }, userId);
  }

  async updateFileMetadata(
    fileId: bigint,
    payload: { fileName?: string; title?: string },
    userId: bigint
  ) {
    this.logger.log(`Updating file metadata ${fileId} by user ${userId}: ${JSON.stringify(payload)}`);

    const file = await this.fileRepository.findOne({
      where: { id: fileId },
      relations: ['project', 'branch'],
    });

    if (!file) {
      throw new NotFoundException(`File with ID ${fileId} not found`);
    }

    const hasPermission = await this.checkUserAttachFilesPermission(userId, file.project?.id);
    if (!hasPermission) {
      throw new Error('You do not have permission to update this file');
    }

    let changed = false;
    if (typeof payload.fileName === 'string' && payload.fileName.trim().length > 0) {
      file.fileName = payload.fileName.trim();
      changed = true;
    }
    if (typeof payload.title === 'string') {
      file.title = payload.title.trim();
      changed = true;
    }

    if (changed) {
      file.updatedAt = new Date();
      await this.fileRepository.save(file);
    }

    return {
      fileId: file.id.toString(),
      fileName: file.fileName,
      fileType: file.fileType,
      createdAt: file.createdAt,
      updatedAt: file.updatedAt,
      uploaderId: file.uploader?.id?.toString(),
      projectId: file.project?.id?.toString(),
      branchId: file.branch?.id?.toString(),
      requestId: file.request?.id?.toString(),
      title: file.title ?? null,
    };
  }

  async getFilePreview(fileId: string): Promise<{ fileType: string; content?: string; url?: string; previewType?: string; textSegments?: any[] }> {
    this.logger.log(`Getting file preview for fileId: ${fileId}`);
    const fileEntity = await this.fileRepository.findOne({ where: { id: BigInt(fileId) } });
    if (!fileEntity) {
      throw new NotFoundException(`File with ID ${fileId} not found`);
    }

    // For PDF files, extract text segments with coordinates
    if (fileEntity.fileType === 'application/pdf') {
      try {
        const textSegments = await this.extractPdfTextSegments(fileEntity.fileContent);
        return {
          fileType: fileEntity.fileType,
          content: fileEntity.fileContent.toString('base64'),
          previewType: 'pdf',
          textSegments: textSegments
        };
      } catch (error) {
        this.logger.error(`Error extracting PDF text segments: ${error instanceof Error ? error.message : String(error)}`);
        return {
          fileType: fileEntity.fileType,
          content: fileEntity.fileContent.toString('base64'),
          previewType: 'pdf'
        };
      }
    }

    switch (fileEntity.fileType) {
      case 'text/plain': case 'application/json': case 'text/html': case 'text/css': case 'application/javascript': case 'text/xml': {
        return { fileType: fileEntity.fileType, content: fileEntity.fileContent.toString('utf8'), previewType: 'text' };
      }
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
        try {
          // Use docx-preview to render DOCX with perfect formatting
          return {
            fileType: fileEntity.fileType,
            content: fileEntity.fileContent.toString('base64'),
            previewType: 'docx-preview'
          };
        } catch (error) {
          this.logger.error(`Error processing DOCX with docx-preview: ${error instanceof Error ? error.message : String(error)}`);
          return {
            fileType: fileEntity.fileType,
            content: fileEntity.fileContent.toString('base64'),
            previewType: 'docx-preview'
          };
        }
      }
      case 'application/vnd.ms-excel':
      case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
      case 'application/vnd.ms-powerpoint':
      case 'application/vnd.openxmlformats-officedocument.presentationml.presentation': {
        return { fileType: fileEntity.fileType, content: fileEntity.fileContent.toString('base64'), previewType: 'office-viewer' };
      }
      case 'image/jpeg': case 'image/png': case 'image/gif': case 'image/webp': {
        return { fileType: fileEntity.fileType, content: fileEntity.fileContent.toString('base64'), previewType: 'image' };
      }
      default: {
        return { fileType: fileEntity.fileType, content: fileEntity.fileContent.toString('utf8'), previewType: 'text' };
      }
    }
  }

  private async extractPdfTextSegments(pdfBuffer: Buffer): Promise<any[]> {
    try {
      this.logger.log('Starting PDF text extraction (text-focused)...');
      this.logger.log(`PDF buffer size: ${pdfBuffer.length} bytes`);

      // Set up PDF.js worker for Node.js environment
      pdfjsLib.GlobalWorkerOptions.workerSrc = false; // Disable worker for Node.js
      this.logger.log('PDF.js worker disabled for Node.js environment');

      // Load PDF document
      this.logger.log('Loading PDF document...');
      // Convert Buffer to Uint8Array for PDF.js
      const uint8Array = new Uint8Array(pdfBuffer);
      const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
      const pdf = await loadingTask.promise;
      this.logger.log(`PDF loaded successfully, pages: ${pdf.numPages}`);

      const textSegments = [];
      let segmentId = 1;

      // Process each page - focus on text extraction
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        this.logger.log(`Processing page ${pageNum} (text-focused)...`);
        const page = await pdf.getPage(pageNum);

        // Use scale that matches iframe display (typically 1.0 for iframe)
        const viewport = page.getViewport({ scale: 1.0 });
        this.logger.log(`Page ${pageNum} viewport: ${viewport.width} x ${viewport.height}`);

        // Extract text content with positions - focus on text quality
        const textContent = await page.getTextContent();
        this.logger.log(`Page ${pageNum} has ${textContent.items.length} text items`);

        // Process each text item individually for precise highlighting
        textContent.items.forEach((item: any, index: number) => {
          const text = item.str.trim();
          if (text && text.length > 0) {
            // Calculate coordinates for iframe display
            const x = item.transform[4];
            const y = viewport.height - item.transform[5]; // Flip Y for iframe
            const width = item.width;
            const height = item.height;

            const segment = {
              id: `segment_${segmentId}`,
              text: text,
              coordinates: [{
                x: x,
                y: y,
                width: width,
                height: height
              }],
              page: pageNum
            };

            textSegments.push(segment);
            this.logger.log(`Created text segment ${segmentId}: "${text.substring(0, 30)}..." at (${x}, ${y})`);
            segmentId++;
          }
        });

        // Skip detailed image extraction - just log basic info for preview
        try {
          const operatorList = await page.getOperatorList();
          let imageCount = 0;

          for (let j = 0; j < operatorList.fnArray.length; j++) {
            if (operatorList.fnArray[j] === pdfjsLib.OPS.paintImageXObject) {
              imageCount++;
            }
          }

          if (imageCount > 0) {
            this.logger.log(`Page ${pageNum} has ${imageCount} images (basic info only - skipping detailed extraction)`);
          }
        } catch (error) {
          this.logger.log(`Page ${pageNum}: Skipping image extraction to focus on text`);
        }
      }

      this.logger.log(`Text-focused extraction completed. Total text segments: ${textSegments.length}`);
      return textSegments;

    } catch (error) {
      this.logger.error(`Error extracting PDF text segments: ${error instanceof Error ? error.message : String(error)}`);
      this.logger.error(`Error stack: ${error instanceof Error ? error.stack : 'No stack available'}`);
      throw error;
    }
  }

  async highlightTextInPdf(fileId: string, searchText: string): Promise<{ highlights: any[] }> {
    try {
      this.logger.log(`Highlighting text in PDF: "${searchText}"`);

      const fileEntity = await this.fileRepository.findOne({ where: { id: BigInt(fileId) } });
      if (!fileEntity) {
        throw new NotFoundException(`File with ID ${fileId} not found`);
      }

      if (fileEntity.fileType !== 'application/pdf') {
        throw new Error('File is not a PDF');
      }

      // Extract text segments
      const textSegments = await this.extractPdfTextSegments(fileEntity.fileContent);

      // Find matching segments
      const matchingSegments = textSegments.filter(segment => {
        const segmentText = segment.text.toLowerCase();
        const searchTextLower = searchText.toLowerCase();
        return segmentText.includes(searchTextLower) || searchTextLower.includes(segmentText);
      });

      this.logger.log(`Found ${matchingSegments.length} matching segments for "${searchText}"`);

      return {
        highlights: matchingSegments.map(segment => ({
          id: segment.id,
          text: segment.text,
          coordinates: segment.coordinates,
          page: segment.page
        }))
      };

    } catch (error) {
      this.logger.error(`Error highlighting text in PDF: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }



  async getFileMetadata(fileId: string): Promise<{ fileName: string; fileType: string; projectId?: string; branchId?: string }> {
    const file = await this.fileRepository.findOne({
      where: { id: BigInt(fileId) },
      relations: ['project', 'branch'],
      select: ['id', 'fileName', 'fileType', 'project', 'branch'],
    });

    if (!file) {
      throw new NotFoundException(`File with ID ${fileId} not found`);
    }

    return {
      fileName: file.fileName,
      fileType: file.fileType,
      projectId: file.project?.id?.toString(),
      branchId: file.branch?.id?.toString(),
    };
  }
}
