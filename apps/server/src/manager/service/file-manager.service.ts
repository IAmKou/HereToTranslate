import { InjectRepository } from '@nestjs/typeorm';
import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException, forwardRef, Inject } from '@nestjs/common';
import { FileEntity, ProjectEntity, RequestEntity, UserEntity } from '#LocalProject/Entities';
import { DeepPartial, Repository } from 'typeorm';
import { ManifestService } from '#LocalProject/Managers/service/manifest.service';
import { InjectModel } from '@nestjs/mongoose';
import { TranslationString, TranslationStringDocument } from '../../db/mongo/schema/translation.schema';
import { Model } from 'mongoose';
import { DocxEditorService } from './docx-editor.service';
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
    private readonly manifestService: ManifestService,
    @Inject(forwardRef(() => ActivityManagerService))
    private readonly activityManagerService: ActivityManagerService,
    private readonly docxEditorService: DocxEditorService,
  ) {
    this.logger = new Logger(FileService.name);
    this.logger.log('FileService initialized');
  }
  private readonly logger = new Logger(FileService.name);

  private async hasMeaningfulContentForUpload(upload: Express.Multer.File): Promise<boolean> {
    try {
      const mime = upload.mimetype || '';
      const buf = upload.buffer;
      
      // Quick buffer size check - files under 100 bytes are likely empty
      if (buf.length < 100) {
        this.logger.warn(`[FILE_VALIDATION] File too small (${buf.length} bytes), likely empty`);
        return false;
      }
      
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
        const hasText = /\S/.test(text);
        this.logger.log(`[TEXT_VALIDATION] Text file validation result: ${hasText}, content length: ${text.length}`);
        return hasText;
      }
      
      // PDF check via text extraction
      if (mime === 'application/pdf') {
        try {
          const segments = await this.extractPdfTextSegments(buf);
          const hasContent = Array.isArray(segments) && segments.some(seg => typeof seg?.text === 'string' && seg.text.trim().length > 0);
          this.logger.log(`[PDF_VALIDATION] PDF validation result: ${hasContent}, segments: ${segments?.length || 0}`);
          return hasContent;
        } catch (e) {
          this.logger.error(`[PDF_VALIDATION] PDF text extraction failed: ${e instanceof Error ? e.message : String(e)}`);
          // For PDFs, if extraction fails completely, it's likely corrupted or empty
          return false;
        }
      }
      
      // DOCX text extraction using docx-editor service
      if (mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        try {
          this.logger.log(`[DOCX_VALIDATION] Starting DOCX content validation for file with buffer size: ${buf.length}`);
          
          // First try plain text extraction as it's more reliable
          let hasContent = false;
          try {
            const plainText = await this.docxEditorService.extractTextFromBuffer(buf);
            hasContent = !!(plainText && plainText.trim().length > 0);
            this.logger.log(`[DOCX_VALIDATION] Plain text extraction result: ${hasContent}, text length: ${plainText?.length || 0}`);
            if (hasContent) {
              this.logger.log(`[DOCX_VALIDATION] Plain text preview: "${plainText.substring(0, 100)}..."`);
              return true; // If plain text extraction succeeds and has content, file is valid
            }
          } catch (plainTextError) {
            this.logger.warn(`[DOCX_VALIDATION] Plain text extraction failed: ${plainTextError instanceof Error ? plainTextError.message : String(plainTextError)}`);
          }
          
          // If plain text extraction failed or returned empty, try detailed extraction
          try {
            const { segments } = await this.docxEditorService.extractDocxContentFromBuffer(buf);
            this.logger.log(`[DOCX_VALIDATION] Extracted ${segments.length} segments from DOCX`);
            
            if (segments.length === 0) {
              this.logger.warn('[DOCX_VALIDATION] No segments extracted from DOCX file');
              return false;
            }
            
            // Check if any segments have meaningful text
            hasContent = segments.some(segment => {
              const hasText = segment.text && segment.text.trim().length > 0;
              if (hasText) {
                this.logger.log(`[DOCX_VALIDATION] Found meaningful content: "${segment.text.substring(0, 50)}..."`);
              }
              return hasText;
            });
            
            this.logger.log(`[DOCX_VALIDATION] Segments validation result: ${hasContent}`);
            return hasContent;
          } catch (segmentError) {
            this.logger.error(`[DOCX_VALIDATION] Segment extraction failed: ${segmentError instanceof Error ? segmentError.message : String(segmentError)}`);
            return false;
          }
        } catch (e) {
          this.logger.error(`[DOCX_VALIDATION] DOCX validation completely failed: ${e instanceof Error ? e.message : String(e)}`);
          this.logger.error(`[DOCX_VALIDATION] Error stack: ${e instanceof Error ? e.stack : 'No stack'}`);
          // If all DOCX extraction methods fail, the file is likely corrupted or empty
          return false;
        }
      }
      
      // For other formats (images, etc.), assume they have content if they have reasonable size
      if (buf.length > 1000) {
        this.logger.log(`[FILE_VALIDATION] Non-text file with size ${buf.length} bytes, assuming valid`);
        return true;
      }
      
      this.logger.warn(`[FILE_VALIDATION] File validation failed - unknown format or too small: ${mime}, ${buf.length} bytes`);
      return false;
    } catch (error) {
      this.logger.error(`[FILE_VALIDATION] Content validation encountered an error: ${error instanceof Error ? error.message : String(error)}`);
      // If validation fails due to error, be conservative and reject
      return false;
    }
  }

  async saveFile(params: {
    uid: bigint;
    fileName: string;
    fileType: string;
    fileContent: Buffer;
    projectId?: bigint;
    requestId?: bigint;
  }): Promise<{
    fileId: string;
    fileName: string;
    fileType: string;
    createdAt: Date;
    updatedAt: Date;
    uploaderId?: string;
    projectId?: string;
    requestId?: string;
  }> {
    this.logger.log('===DEBUG FILE NAME saveFile===');
    const { uid, fileName, fileType, fileContent, projectId, requestId } = params;

    const file = this.fileRepository.create({
      fileName,
      fileType,
      fileContent,
      uploader: { id: uid },
      project: projectId ? { id: projectId } : undefined,
      request: requestId ? { id: requestId } : undefined,
      isSyncedFromRequest: !!requestId,
      status: 'processing', // Set initial status
    });

    this.logger.log(`Saving file: ${fileName}, type: ${fileType}, projectId: ${projectId}, uploader: ${uid}`);
    this.logger.log(`File content length: ${fileContent.length}`);

    const savedFile = await this.fileRepository.save(file);
    const safeFileName = fileName.replace(/[\\/:*?"<>|]/g, '_');
    const timestamped = `${Date.now()}_${safeFileName}`;
    // const repoName = `project-${projectId}`; // unused

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
        );
      } catch (error) {
        this.logger.error('Failed to log file upload activity:', error);
      }
    }

    try {
      const projectFolder = projectId ? `projects/project-${projectId}` : 'pdf';
      // Skipping external storage upload; handled locally or by downstream services
      this.logger.log(`File stored locally/in-DB: ${safeFileName}`);
      try {
        const isPdf =
          (typeof fileType === 'string' && fileType.toLowerCase().includes('pdf')) ||
          (typeof safeFileName === 'string' && safeFileName.toLowerCase().endsWith('.pdf'));
        if (isPdf) {
          this.logger.log(`[FileService] Stored PDF text details for ${safeFileName}`);
        }
      } catch (e) {
        this.logger.warn(`[FileService] getPdfDetail failed post-upload: ${(e as any)?.message || String(e)}`);
      }
      // Skipping creation of PDF language-suffixed variants (no external storage)
    } catch (err) {
      this.logger.error('Storage upload hook error (skipped):', err);
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
      requestId: savedFile.request?.id ? savedFile.request.id.toString() : undefined,
    };
  }

  async handleUpload(
    file: Express.Multer.File,
    uid: bigint,
    projectId?: bigint,
    requestId?: bigint | null,
    title?: string,
  ) {
    this.logger.log('===DEBUG FILE NAME handleUpload===');
    const hasContent = await this.hasMeaningfulContentForUpload(file);
    if (!hasContent) {
      throw new BadRequestException('Uploaded file appears to have no extractable text content. Please upload a file with content.');
    }

    const fileName = Buffer.from(file.originalname, 'latin1').toString('utf8');

    // Normalize mime if needed
    let mime = file.mimetype || '';
    if (!mime || mime === 'application/octet-stream') {
      const ext = fileName.toLowerCase().split('.').pop();
      switch (ext) {
        case 'txt': mime = 'text/plain'; break;
        case 'json': mime = 'application/json'; break;
        case 'docx': mime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'; break;
        case 'pdf': mime = 'application/pdf'; break;
        default: mime = file.mimetype || 'application/octet-stream';
      }
    }

    // Upsert file record
    const existingFile = await this.fileRepository.findOne({
      where: { fileName, project: projectId ? { id: projectId } : undefined },
      relations: ['project'],
    });

    let saved;
    let isUpdate = false;
    if (existingFile) {
      existingFile.fileContent = file.buffer;
      existingFile.fileType = mime;
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
        requestId: existingFile.request?.id?.toString(),
      };
      isUpdate = true;
    } else {
      const fileEntity = this.fileRepository.create({
        fileName,
        fileType: mime,
        fileContent: file.buffer,
        uploader: { id: uid },
        project: projectId ? { id: projectId } : undefined,
        request: requestId ? { id: requestId } : undefined,
        status: 'processing',
        title: title,
        isSyncedFromRequest: !!requestId,
      });
      const savedFile = await this.fileRepository.save(fileEntity);
      saved = {
        fileId: savedFile.id.toString(),
        fileName: savedFile.fileName,
        fileType: savedFile.fileType,
        createdAt: savedFile.createdAt,
        updatedAt: savedFile.updatedAt,
        uploaderId: savedFile.uploader?.id?.toString(),
        projectId: savedFile.project?.id?.toString(),
        requestId: savedFile.request?.id?.toString(),
      };
    }

    // Activity log
    if (projectId) {
      try {
        let stringCount = 0;
        switch (true) {
          case /text\//.test(mime):
          case /json/.test(mime):
          case /pdf/.test(mime):
          case /officedocument\.wordprocessingml\.document/.test(mime):
            stringCount = Math.floor(file.buffer.length / 100);
            break;
          default:
            stringCount = 0;
        }
        await this.activityManagerService.logFileUpload(Number(projectId), Number(uid), fileName, stringCount);
      } catch (error) {
        this.logger.error('Failed to log file upload activity:', error);
      }
    }

    this.logger.log(`[UPLOAD_PROCESS] Starting file processing for ${fileName}, mime: ${mime}, fileId: ${saved.fileId}`);

    try {
      const request = requestId ? await this.requestRepository.findOne({ where: { id: requestId } }) : undefined;
      this.logger.log(`[UPLOAD_PROCESS] Request found: ${!!request}, requestId: ${requestId}`);
      
      const fileRecord = await this.fileRepository.findOne({ where: { id: BigInt(saved.fileId) }, relations: ['project'] });
      if (!fileRecord) {
        this.logger.error(`[UPLOAD_PROCESS] Saved file not found for fileId: ${saved.fileId}`);
        throw new NotFoundException('Saved file not found');
      }

      this.logger.log(`[UPLOAD_PROCESS] File record loaded: ${fileRecord.fileName}, project: ${fileRecord.project?.id || 'none'}`);

      switch (mime) {
        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
          this.logger.log(`[UPLOAD_PROCESS] Processing DOCX file: ${fileName}`);
          
          // DOCX files are processed directly by DocxEditorService without external storage
          this.logger.log(`[UPLOAD_PROCESS] Processing DOCX file directly: ${fileName}`);

          if (requestId) {
            this.logger.log(`[UPLOAD_PROCESS] DOCX processing via DocxEditorService for request: ${requestId}`);
            try {
              this.logger.log(`[UPLOAD_PROCESS] Calling docxEditorService.processDocxFile`);
              const extraction = await this.docxEditorService.extractDocxContentFromBuffer(fileRecord.fileContent);
              await this.docxEditorService.storeTranslationSegments(
                BigInt(saved.fileId),
                fileRecord.project?.id as bigint,
                request?.targetLanguages?.[0] || 'en',
                extraction,
                String(requestId)
              );
              this.logger.log(`[UPLOAD_PROCESS] DocxEditorService processing completed`);
            } catch (docxError) {
              this.logger.error(`[UPLOAD_PROCESS] DocxEditorService processing failed: ${docxError}`);
              throw docxError;
            }
          } else {
            this.logger.log(`[UPLOAD_PROCESS] DOCX processing via ManifestService (no request)`);
            await this.manifestService.generateManifest(fileRecord);
          }
          break;
        }
        case 'application/json':
        case 'text/plain':
        case 'text/html':
        case 'text/css':
        case 'application/javascript':
        case 'text/xml': {
          this.logger.log(`[UPLOAD_PROCESS] Processing text-based file: ${fileName}, type: ${mime}`);
          await this.manifestService.generateManifest(fileRecord);
          break;
        }
        case 'application/pdf': {
          this.logger.log(`[UPLOAD_PROCESS] Processing PDF file: ${fileName}`);
          await this.manifestService.generateManifest(fileRecord);
          break;
        }
        default: {
          this.logger.log(`[UPLOAD_PROCESS] Processing file with default handler: ${fileName}, type: ${mime}`);
          await this.manifestService.generateManifest(fileRecord);
          break;
        }
      }

      // Mark ready
      this.logger.log(`[UPLOAD_PROCESS] Marking file as ready: ${fileName}`);
      fileRecord.status = 'ready';
      await this.fileRepository.save(fileRecord);
      this.logger.log(`[UPLOAD_PROCESS] File processing completed successfully: ${fileName}`);
    } catch (err) {
      this.logger.error(`[UPLOAD_PROCESS] Error processing file ${fileName}:`, err);
      this.logger.error(`[UPLOAD_PROCESS] Error stack: ${err instanceof Error ? err.stack : 'No stack available'}`);
      
      const fileEntity = await this.fileRepository.findOne({ where: { id: BigInt(saved.fileId) } });
      if (fileEntity) {
        fileEntity.status = 'error';
        await this.fileRepository.save(fileEntity);
        this.logger.log(`[UPLOAD_PROCESS] Marked file as error status: ${fileName}`);
      }
    }

    // Get the final status after processing
    const finalFileRecord = await this.fileRepository.findOne({ where: { id: BigInt(saved.fileId) } });
    const finalStatus = finalFileRecord?.status || 'processing';

    return {
      ...saved,
      updated: isUpdate,
      status: finalStatus,
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
      relations: ['project'],
      select: ['id', 'fileName', 'fileType', 'fileContent', 'project'],
    });

    await this.manifestService.generateManifest(fullFile);
    if (fullFile.project) {
      // External storage upload disabled; keeping file in DB/local
      this.logger.log(`Skipping external storage upload for fileId: ${fullFile.id}`);
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
    try {
      const isPdf = typeof file.fileName === 'string' && file.fileName.toLowerCase().endsWith('.pdf');

      if (isPdf) {
        const projectId = file.project?.id;
        const candidateFolders: string[] = projectId
          ? [`projects/project-${projectId}`]
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

        // DOCX files are not stored externally, so no cleanup needed
        this.logger.log(`[FileService] Skipping external storage cleanup for DOCX file: ${file.fileName}`);
      } else {
        this.logger.log(`[FileService] Skipping Aspose deletion for non-PDF file: ${file.fileName}`);
      }

      if (isPdf) {
        try {
          const { PdfTextModel } = await import('../../db/mongo/schema/pdf-details.schema.js');
          await PdfTextModel.deleteOne({ fileName: file.fileName });
          this.logger.log(`[FileService] Deleted PDF details from MongoDB for: ${file.fileName}`);
        } catch (mongoErr) {
          this.logger.warn(`[FileService] Failed to delete PDF details from MongoDB: ${mongoErr instanceof Error ? mongoErr.message : String(mongoErr)}`);
        }
      }
    } catch (asposeCleanupErr) {
      this.logger.warn(`[FileService] Aspose cleanup encountered an error: ${asposeCleanupErr instanceof Error ? asposeCleanupErr.message : String(asposeCleanupErr)}`);
    }

    await this.fileRepository.delete(String(file.id));
    this.logger.log(`File deleted successfully: ${file.fileName}`);

    if (file.project?.id) {
      try {
        await this.activityManagerService.logFileDelete(
          Number(file.project.id),
          Number(userId),
          file.fileName,
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
    this.logger.log(`[EXTRACT_STRINGS] Starting extractStringsFromFile for fileId: ${fileId}, userId: ${userId}`);
    
    const file = await this.fileRepository.findOne({
      where: { id: BigInt(fileId) },
      relations: ['uploader', 'project']
    });

    if (!file) {
      this.logger.error(`[EXTRACT_STRINGS] File not found for fileId: ${fileId}`);
      throw new NotFoundException('File not found');
    }

    this.logger.log(`[EXTRACT_STRINGS] File found: ${file.fileName}, type: ${file.fileType}, uploader: ${file.uploader.id}, project: ${file.project?.id || 'none'}`);

    // Check if file belongs to a project - this is required for translation entities
    if (!file.project || !file.project.id) {
      this.logger.error(`[EXTRACT_STRINGS] File does not belong to any project. ProjectId is required for string extraction.`);
      throw new Error('File must belong to a project to extract strings. Please upload the file to a project first.');
    }

    // Check permission - chỉ uploader mới có thể extract strings
    if (file.uploader.id.toString() !== userId.toString()) {
      this.logger.error(`[EXTRACT_STRINGS] Permission denied. File uploader: ${file.uploader.id}, requesting user: ${userId}`);
      throw new Error('You do not have permission to extract strings from this file');
    }

    let log = '';
    function appendLog(msg: string) {
      log += `[${new Date().toISOString()}] ${msg}\n`;
      if (file) {
        file.extractLog = log;
      }
    }
    
    this.logger.log(`[EXTRACT_STRINGS] Starting extraction process for file: ${file.fileName}`);
    
    try {
      appendLog('Start extracting strings...');
      this.logger.log(`[EXTRACT_STRINGS] File content buffer size: ${file.fileContent?.length || 0} bytes`);
      
      // ĐÁNH DẤU OBSOLETE CHO STRING CŨ THAY VÌ XÓA CỨNG
      // Obsolete handling is no longer needed with SQL-only storage
      appendLog('Preparing SQL manifest extraction...');
      this.logger.log(`[EXTRACT_STRINGS] Calling manifestService.generateManifest for file: ${file.fileName}`);
      
      appendLog('Generating manifest...');
      await this.manifestService.generateManifest(file); // Đảm bảo hàm này set obsolete: false cho string mới
      
      appendLog('Manifest generated.');
      this.logger.log(`[EXTRACT_STRINGS] Manifest generation completed successfully for file: ${file.fileName}`);
      
      if (file.project) {
        this.logger.log(`[EXTRACT_STRINGS] File belongs to project: ${file.project.id}`);
      } else {
        this.logger.log(`[EXTRACT_STRINGS] File does not belong to any project`);
      }
      
      appendLog('Successfully generated manifest for file.');
      await this.fileRepository.save(file);
      
      this.logger.log(`[EXTRACT_STRINGS] Extract strings completed successfully for file: ${file.fileName}`);
      
      return {
        success: true,
        message: 'Manifest generated successfully',
        fileId: file.id.toString(),
        fileName: file.fileName
      };
    } catch (error: any) {
      const errorMsg = error?.message || error;
      appendLog('Error generating manifest: ' + errorMsg);
      this.logger.error(`[EXTRACT_STRINGS] Error generating manifest for file ${file.fileName}:`, error);
      this.logger.error(`[EXTRACT_STRINGS] Error stack: ${error?.stack || 'No stack available'}`);
      
      await this.fileRepository.save(file);
      throw new Error(`Failed to generate manifest: ${errorMsg}`);
    }
  }

  async saveFileToDB(params: {
    uid: bigint;
    fileName: string;
    fileType: string;
    fileContent: Buffer;
    projectId?: bigint;
    requestId?: bigint;
  }) {
    const { uid, fileName, fileType, fileContent, projectId, requestId } = params;

    const file = this.fileRepository.create({
      fileName,
      fileType,
      fileContent,
      uploader: { id: uid },
      project: projectId ? { id: projectId } : undefined,
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
      requestId: savedFile.request?.id?.toString(),
    };
  }

  async handleLocalUpload(
    file: Express.Multer.File,
    uid: bigint,
    projectId?: bigint,
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
      requestId,
    });

    const fileEntity = await this.fileRepository.findOne({
      where: { id: BigInt(saved.fileId) },
      relations: ['project'],
      select: ['id', 'fileName', 'fileType', 'fileContent', 'project'],
    });

    if (fileEntity) {
      try {
        await this.manifestService.generateManifest(fileEntity);
      } catch (error) {
        this.logger.error(`Failed to generate manifest for file ${fileEntity.id}:`, error);
        // Continue execution even if manifest generation fails
      }

      if (fileEntity.project) {
        // Skipping external storage upload; handled locally or by downstream services
        this.logger.log(`Skipping external storage upload for fileId: ${fileEntity.id}`);
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
      relations: ['project'],
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
        // For unknown/binary types, avoid UTF-8 decoding; return base64
        const isProbablyText = /^(text\/|application\/(json|xml|javascript))/.test(fileEntity.fileType || '');
        if (isProbablyText) {
          return { fileType: fileEntity.fileType, content: fileEntity.fileContent.toString('utf8'), previewType: 'text' };
        }
        return { fileType: fileEntity.fileType, content: fileEntity.fileContent.toString('base64'), previewType: 'binary' };
      }
    }
  }

  private async extractPdfTextSegments(pdfBuffer: Buffer): Promise<any[]> {
    // Try robust extractors first, then graceful fallbacks
    try {
      // 1) Try pdf-parse if available
      try {
        const pdfParse = (await import('pdf-parse')).default as any;
        const result = await pdfParse(pdfBuffer);
        const text = String(result?.text || '').trim();
        if (text) {
          const lines = text.split(/\r?\n/).filter(l => l.trim());
          return lines.map((line, idx) => ({
            id: `segment_${idx + 1}`,
            text: line.trim(),
            coordinates: [],
            page: 1,
          }));
        }
      } catch (e) {
        this.logger.warn(`[PDF EXTRACT] pdf-parse not available or failed: ${e instanceof Error ? e.message : String(e)}`);
      }

      // 2) Try pdfjs-dist (textContent)
      try {
        const pdfjsLib = await import('pdfjs-dist');
        // @ts-ignore
        const getDocument = (pdfjsLib as any).getDocument || (pdfjsLib as any).default?.getDocument;
        if (getDocument) {
          const loadingTask = getDocument({ data: pdfBuffer });
          const pdf = await loadingTask.promise;
          const segments: any[] = [];
          for (let pageNum = 1; pageNum <= Math.min(pdf.numPages || 1, 10); pageNum++) {
            const page = await pdf.getPage(pageNum);
            const content = await page.getTextContent();
            for (const item of content.items || []) {
              const str = String((item as any).str || '').trim();
              if (str) {
                segments.push({ id: `p${pageNum}_${segments.length + 1}`, text: str, coordinates: [], page: pageNum });
              }
            }
          }
          if (segments.length) return segments;
        }
      } catch (e) {
        this.logger.warn(`[PDF EXTRACT] pdfjs-dist not available or failed: ${e instanceof Error ? e.message : String(e)}`);
      }

      // 3) Final fallback: DO NOT decode as utf8 blindly; treat as no text
      this.logger.warn('[PDF EXTRACT] No text extracted; returning empty segments');
      return [];
    } catch (error) {
      this.logger.error(`Error extracting PDF text segments: ${error instanceof Error ? error.message : String(error)}`);
      return [];
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



  async getFileMetadata(fileId: string): Promise<{ fileName: string; fileType: string; projectId?: string }> {
    const file = await this.fileRepository.findOne({
      where: { id: BigInt(fileId) },
      relations: ['project'],
      select: ['id', 'fileName', 'fileType', 'project'],
    });

    if (!file) {
      throw new NotFoundException(`File with ID ${fileId} not found`);
    }

    return {
      fileName: file.fileName,
      fileType: file.fileType,
      projectId: file.project?.id?.toString(),
    };
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

}
