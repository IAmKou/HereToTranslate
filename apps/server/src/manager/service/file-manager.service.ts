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
import { AsposeService } from './aspose.service';
import mammoth from 'mammoth';
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
    private readonly asposeService: AsposeService,
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

    // Upload to Aspose storage instead of GitHub
    try {
      const projectFolder = projectId ? `projects/project-${projectId}` : 'pdf';
      await this.uploadToAsposeStorage(fileContent, safeFileName, fileType, projectFolder);
      this.logger.log(`File uploaded to Aspose storage: ${safeFileName}`);
      // Also upload language-suffixed variants for PDFs
      if (
        projectId && (
          (typeof fileType === 'string' && fileType.toLowerCase().includes('pdf')) ||
          (typeof safeFileName === 'string' && safeFileName.toLowerCase().endsWith('.pdf'))
        )
      ) {
        try {
          const uniqueLangs = await this.getTargetLanguagesForProject(projectId);
          if (uniqueLangs.length > 0) {
            await this.uploadPdfLanguageVariants(fileContent, safeFileName, uniqueLangs, projectFolder);
          }
        } catch (e) {
          this.logger.warn('Failed to upload language variants for PDF: ' + (e as any)?.message);
        }
      }
    } catch (err) {
      this.logger.error('Aspose storage upload error:', err);
      // Fallback to GitHub if Aspose fails
      try {
        await this.githubService.pushInitialFile({
          repo: repoName,
          path: safeFileName,
          content: fileContent,
          message: `Uploaded ${fileName}`,
        });
        this.logger.log(`Fallback: File pushed to GitHub repo: ${repoName}, path: ${timestamped}`);
      } catch (githubErr) {
        this.logger.error('GitHub fallback also failed:', githubErr);
      }
    }

    this.logger.log(`File uploaded to storage: ${timestamped}`);

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

    // Upload to Aspose storage
    try {
      const projectFolder = projectId ? `projects/project-${projectId}` : 'pdf';
      await this.uploadToAsposeStorage(file.buffer, fileName, file.mimetype, projectFolder);
      this.logger.log(`File uploaded to Aspose storage: ${fileName}`);
      // Also upload language-suffixed variants for PDFs when project present
      if (
        projectId && (
          (typeof file.mimetype === 'string' && file.mimetype.toLowerCase().includes('pdf')) ||
          (typeof fileName === 'string' && fileName.toLowerCase().endsWith('.pdf'))
        )
      ) {
        try {
          const uniqueLangs = await this.getTargetLanguagesForProject(projectId);
          if (uniqueLangs.length > 0) {
            await this.uploadPdfLanguageVariants(file.buffer, fileName, uniqueLangs, projectFolder);
          }
        } catch (e) {
          this.logger.warn('Failed to upload language variants for PDF (local upload): ' + (e as any)?.message);
        }
      }
    } catch (err) {
      this.logger.error('Aspose storage upload error:', err);
      // Continue without failing the upload
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
      relations: ['request', 'project'],
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
      project: (file as any).project ? {
        id: (file as any).project.id.toString(),
        name: (file as any).project.name
      } : undefined,
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
    if (fullFile.project && fullFile.branch) {
      try {
        await this.uploadToAsposeStorage(
          fullFile.fileContent,
          fullFile.fileName,
          fullFile.fileType
        );
        this.logger.log(`File uploaded to Aspose storage for fileId: ${fullFile.id}`);
      } catch (err) {
        this.logger.error('Error uploading file to Aspose storage', err);
        // Fallback to GitHub
        try {
          await this.githubService.pushInitialFile({
            repo: `project-${fullFile.project.id}`,
            path: fullFile.fileName,
            content: fullFile.fileContent,
            message: `Upload file: ${fullFile.fileName}`,
            branch: 'main',
          });
          this.logger.log(`Fallback: File pushed to GitHub for fileId: ${fullFile.id}`);
        } catch (githubErr) {
          this.logger.error('GitHub fallback also failed:', githubErr);
        }
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

    // Attempt to delete from Aspose storage (original and language-suffixed variants)
    try {
      const isPdf = typeof file.fileName === 'string' && file.fileName.toLowerCase().endsWith('.pdf');
      if (isPdf) {
        const projectId = file.project?.id;
        const candidateFolders: string[] = projectId
          ? [
              `projects/project-${projectId}`,
              `projects/projects-${projectId}`,
            ]
          : ['pdf'];

        const dotIdx = file.fileName.lastIndexOf('.');
        const base = dotIdx > -1 ? file.fileName.slice(0, dotIdx) : file.fileName;
        const originalName = file.fileName;

        let langCodes: string[] = [];
        try {
          langCodes = await this.getTargetLanguagesForProject(projectId);
        } catch (e) {
          this.logger.warn('Could not fetch project languages for deletion; proceeding with original only');
        }

        const suffixNames: string[] = Array.from(new Set(
          (langCodes || [])
            .map((l) => String(l).toUpperCase().replace(/[^A-Z0-9_-]/g, ''))
            .filter(Boolean)
            .map((code) => `${base}(${code}).pdf`)
        ));

        const allNames = [originalName, ...suffixNames];

        for (const folder of candidateFolders) {
          for (const name of allNames) {
            try {
              await this.asposeService.deleteFileWithFolder(name, folder);
              this.logger.log(`[FileService] Deleted from Aspose: ${folder}/${name}`);
            } catch (delErr) {
              this.logger.warn(`[FileService] Aspose delete failed for ${folder}/${name}: ${delErr instanceof Error ? delErr.message : String(delErr)}`);
            }
          }
        }
      }
    } catch (asposeCleanupErr) {
      this.logger.warn(`[FileService] Aspose cleanup encountered an error: ${asposeCleanupErr instanceof Error ? asposeCleanupErr.message : String(asposeCleanupErr)}`);
    }

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

  async checkUserAttachFilesPermission(userId: string | bigint, projectId: string | bigint): Promise<boolean> {
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
      // Upload file to Aspose storage if project/branch info is present
      if (file.project && file.branch) {
        try {
          await this.githubService.pushInitialFile({
            repo: `project-${file.project.id}`,
            path: file.fileName,
            content: file.fileContent,
            message: `Upload file: ${file.fileName}`,
            branch: 'main',
          });
          appendLog('Fallback: File pushed to GitHub.');
        } catch (githubErr: any) {
          appendLog('GitHub fallback also failed: ' + (githubErr?.message || githubErr));
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

    // Ensure proper fileType is set for evidence files
    let fileType = file.mimetype;
    if (!fileType || fileType === 'application/octet-stream') {
      const extension = file.originalname.toLowerCase().split('.').pop();
      switch (extension) {
        case 'pdf':
          fileType = 'application/pdf';
          break;
        case 'docx':
          fileType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
          break;
        case 'doc':
          fileType = 'application/msword';
          break;
        case 'png':
          fileType = 'image/png';
          break;
        case 'jpg':
        case 'jpeg':
          fileType = 'image/jpeg';
          break;
        case 'gif':
          fileType = 'image/gif';
          break;
        case 'txt':
          fileType = 'text/plain';
          break;
        case 'xml':
          fileType = 'application/xml';
          break;
        case 'json':
          fileType = 'application/json';
          break;
        default:
          fileType = 'application/octet-stream';
      }
    }

    const saved = await this.saveFileToDB({
      uid,
      fileName: Buffer.from(file.originalname, 'latin1').toString('utf8'),
      fileType: fileType,
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

      // Upload file to Aspose storage if project/branch info is present
      if (fileEntity.project && fileEntity.branch) {
        try {
          const projectFolder = `projects/project-${fileEntity.project.id}`;
          await this.uploadToAsposeStorage(
            fileEntity.fileContent,
            fileEntity.fileName,
            fileEntity.fileType,
            projectFolder
          );
          this.logger.log(`File uploaded to Aspose storage for fileId: ${fileEntity.id}`);
        } catch (err) {
          this.logger.error('Error uploading file to Aspose storage', err);
          // Fallback to GitHub
          try {
            await this.githubService.pushInitialFile({
              repo: `project-${fileEntity.project.id}`,
              path: fileEntity.fileName,
              content: fileEntity.fileContent,
              message: `Upload file: ${fileEntity.fileName}`,
              branch: 'main',
            });
            this.logger.log(`Fallback: File pushed to GitHub for fileId: ${fileEntity.id}`);
          } catch (githubErr) {
            this.logger.error('GitHub fallback also failed:', githubErr);
          }
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
      const textSegments: any[] = [];
      let segmentId = 1;

      // Simple text extraction - split by lines
      const text = pdfBuffer.toString('utf8');
      const lines = text.split('\n').filter(line => line.trim().length > 0);

      lines.forEach((line, index) => {
        if (line.trim().length > 0) {
          textSegments.push({
            id: `segment_${segmentId}`,
            text: line.trim(),
            coordinates: [{
              x: 50,
              y: 50 + (index * 20),
              width: line.length * 7,
              height: 16
            }],
            page: 1
          });
          segmentId++;
        }
      });

      this.logger.log(`Fallback extraction completed. Total text segments: ${textSegments.length}`);
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

  /**
   * Upload file to Aspose storage
   */
  private async uploadToAsposeStorage(fileContent: Buffer, fileName: string, fileType: string, folder = 'pdf'): Promise<void> {
    try {
      this.logger.log(`[FileService] Attempting to upload file to Aspose storage: ${fileName} (${fileType})`);

      // The new AsposeService handles all file types automatically
      this.logger.log('[FileService] Using AsposeService for file upload...');

      // Skip Aspose upload for DOCX files
      const isDocx =
        (typeof fileType === 'string' && fileType.includes('officedocument.wordprocessingml.document')) ||
        (typeof fileName === 'string' && fileName.toLowerCase().endsWith('.docx'));
      if (isDocx) {
        this.logger.log('[FileService] Skipping Aspose upload for DOCX file');
        return;
      }

      // Use the new AsposeService for all file types
      try {
        this.logger.log(`[FileService] Using AsposeService for file: ${fileName} (${fileType})`);
        await this.asposeService.uploadFile(fileName, fileContent, folder);
        this.logger.log(`[FileService] File uploaded to Aspose storage via AsposeService: ${fileName} (${fileType})`);
        return;
      } catch (uploadError) {
        this.logger.error(`[FileService] Failed to upload file via AsposeService: ${fileName}`, uploadError);
        throw new Error(`Aspose storage upload failed: ${uploadError instanceof Error ? uploadError.message : String(uploadError)}`);
      }

    } catch (error) {
      this.logger.error(`[FileService] Failed to upload file to Aspose storage: ${fileName}`, error);
      throw error;
    }
  }

  private async uploadPdfLanguageVariants(fileContent: Buffer, originalFileName: string, languages: string[], folder = 'pdf'): Promise<void> {
    try {
      const dotIdx = originalFileName.lastIndexOf('.');
      const base = dotIdx > -1 ? originalFileName.slice(0, dotIdx) : originalFileName;
      for (const lang of languages) {
        const code = String(lang).toUpperCase().replace(/[^A-Z0-9_-]/g, '');
        if (!code) continue;
        const langName = `${base}(${code}).pdf`;
        await this.asposeService.uploadFile(langName, fileContent, folder);
        this.logger.log(`[FileService] Uploaded language variant to Aspose: ${langName}`);
      }
    } catch (e) {
      this.logger.warn('uploadPdfLanguageVariants failed: ' + (e as any)?.message);
    }
  }

  private async getTargetLanguagesForProject(projectId?: bigint): Promise<string[]> {
    try {
      const langsFromTranslations: string[] = await this.translationModel.distinct('language', { projectId: String(projectId) });
      const normalizedFromTranslations = (langsFromTranslations || [])
        .map(l => (typeof l === 'string' ? l.trim() : ''))
        .filter(Boolean)
        .map(l => l.toUpperCase());

      // Backend fallback for known projects when FE-stored config isn't available to BE
      // Extend this map as needed or replace with DB-sourced project settings
      const backendFallbackByProject: Record<string, string[]> = {
        '44': ['EN', 'JP'],
      };

      const fallback = backendFallbackByProject[String(projectId)] || [];
      const merged = Array.from(new Set([...
        normalizedFromTranslations,
        ...fallback
      ]));

      return merged;
    } catch (e) {
      this.logger.warn('getTargetLanguagesForProject failed, using fallback []: ' + (e as any)?.message);
      return [];
    }
  }

  /**
   * Check if Aspose storage is available
   */
  public isAsposeStorageAvailable(): boolean {
    // The new AsposeService is always available if properly configured
    return true;
  }

  /**
   * Get Aspose storage status information
   */
  public getAsposeStorageStatus(): {
    asposeService: { available: boolean; info: any };
    overallAvailable: boolean;
  } {
    return {
      asposeService: {
        available: true,
        info: { service: 'AsposeService', version: '1.0' }
      },
      overallAvailable: true
    };
  }

  /**
   * Check if a file exists in Aspose storage
   */
  public async checkFileInAsposeStorage(fileName: string, fileType: string): Promise<boolean> {
    try {
      // The new AsposeService can check file existence
      // For now, we'll assume files exist if we can access them
      // This can be enhanced later with actual file existence checking
      return true;
    } catch (error) {
      this.logger.error(`Failed to check file existence in Aspose storage: ${fileName}`, error);
      return false;
    }
  }


}
