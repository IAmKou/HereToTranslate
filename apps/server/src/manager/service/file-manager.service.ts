import { InjectRepository } from '@nestjs/typeorm';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { BranchEntity, FileEntity, ProjectEntity, RequestEntity, UserEntity } from '#LocalProject/Entities';
import { DeepPartial, Repository } from 'typeorm';
import { GitHubService } from '#LocalProject/Managers/service/github-manager.service';
import  { Express } from 'express';
import  { Multer } from 'multer';
import { TranslationService } from '#LocalProject/Managers/service/translation-manager.service';

@Injectable()
export class FileService {
  constructor(
    @InjectRepository(FileEntity)
    private readonly fileRepository: Repository<FileEntity>,
    @InjectRepository(RequestEntity)
    private readonly requestRepository: Repository<RequestEntity>,
    private readonly githubService: GitHubService,
    private readonly translationService : TranslationService,
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
        path: `uploads/${timestamped}`,
        content: fileContent,
        message: `Uploaded ${fileName}`,
      });
    } catch (err) {
      this.logger.error('pushInitialFile error:', err);
    }

    // this.logger.log(`Saved FileEntity: ${JSON.stringify(savedFile)}`); // XÓA hoặc comment dòng này để tránh lỗi BigInt
    this.logger.log(`Pushed file to repo: ${repoName}, path: uploads/${timestamped}`);

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
    const saved = await this.saveFile({
      uid,
      fileName: Buffer.from(file.originalname, 'latin1').toString('utf8'),
      fileType: file.mimetype,
      fileContent: file.buffer,
      projectId,
      branchId,
      requestId,
    });

    const fileEntity = await this.fileRepository.findOne({
      where: { id: BigInt(saved.fileId) },
      relations: ['project', 'branch'],
      select: ['id', 'fileName', 'fileType', 'fileContent', 'project', 'branch'],
    });
    if (fileEntity) {
      await this.translationService.extractStrings(fileEntity);
    } else {
      this.logger.error('Cannot find fileEntity after save for extractStrings');
    }
    this.logger.log(`handleUpload called with file: ${file.originalname}, mimetype: ${file.mimetype}, size: ${file.size}`);
    this.logger.log(`File uploaded and processed, fileId: ${saved.fileId}`);
    return {
      message: 'File uploaded and processed',
      fileId: saved.fileId,
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
      select: ['id', 'fileName', 'fileType', 'createdAt', 'uploader'],
      order: { createdAt: 'DESC' }
    });

    return files.map(file => ({
      fileId: file.id.toString(),
      fileName: file.fileName,
      fileType: file.fileType,
      fileSize: file.fileContent ? file.fileContent.length : 0,
      createdAt: file.createdAt,
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
      select: ['id', 'fileName', 'fileType', 'fileContent'],
    });
    if (!file) throw new Error('File not found');
    return {
      fileId: file.id.toString(),
      fileName: file.fileName,
      fileType: file.fileType,
      fileContent: file.fileContent,
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
    });

    await this.translationService.extractStrings(fullFile);

    return {
      message: 'File uploaded and linked to request',
      fileId: saved.fileId,
    };
  }


  async deleteFile(fileId: bigint, userId: string | bigint) {
    const file = await this.fileRepository.findOne({ where: { id: BigInt(fileId) }, relations: ['uploader'] });
    if (!file) throw new NotFoundException('File not found');
    // Chỉ cho phép uploader hoặc admin xóa (ở đây chỉ check uploader)
    if (file.uploader.id.toString() !== userId.toString()) {
      throw new Error('You do not have permission to delete this file');
    }
    await this.fileRepository.delete(String(file.id));
    return { success: true, message: 'File deleted' };
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

    try {
      await this.translationService.extractStrings(file);
      this.logger.log(`Successfully extracted strings from file: ${file.fileName}`);
      return {
        success: true,
        message: 'Strings extracted successfully',
        fileId: file.id.toString(),
        fileName: file.fileName
      };
    } catch (error) {
      this.logger.error(`Error extracting strings from file ${file.fileName}:`, error);
      throw new Error(`Failed to extract strings: ${error.message}`);
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

    this.logger.log(`File uploaded and saved. fileId: ${saved.fileId}`);
    return {
      message: 'File uploaded successfully',
      fileId: saved.fileId,
    };
  }



}
