import { InjectRepository } from '@nestjs/typeorm';
import { Injectable, Logger } from '@nestjs/common';
import { BranchEntity, FileEntity, ProjectEntity, UserEntity } from '#LocalProject/Entities';
import { DeepPartial, Repository } from 'typeorm';
import { GitHubService } from '#LocalProject/Managers/service/github-manager.service';
import  { Express } from 'express';
import  { Multer } from 'multer';
import  slugify  from 'slugify';
import { TranslationService } from '#LocalProject/Managers/service/translation-manager.service';

@Injectable()
export class FileService {
  constructor(
    @InjectRepository(FileEntity)
    private readonly fileRepository: Repository<FileEntity>,
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
    projectId: bigint;
    branchId: bigint;
  }) {
    this.logger.log('===DEBUG FILE NAME saveFile===');
    const { uid, fileName, fileType, fileContent, projectId, branchId } = params;

    const file = this.fileRepository.create({
      fileName,
      fileType,
      fileContent,
      uploader: { id: uid },
      project: { id: projectId },
      branch: { id: branchId },
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

    await this.githubService.pushInitialFile({
      repo: repoName,
      path: `uploads/${timestamped}`,
      content: fileContent.toString('base64'),
      message: `Uploaded ${fileName}`,
    });

    this.logger.log(`Saved FileEntity: ${JSON.stringify(savedFile)}`);
    this.logger.log(`Pushed file to repo: ${repoName}, path: uploads/${timestamped}`);

    return savedFile;
  }

  async handleUpload(
    file: Express.Multer.File,
    uid: bigint,
    projectId: bigint,
    branchId: bigint,
  ) {
    this.logger.log('===DEBUG FILE NAME handleUpload===');
    const saved = await this.saveFile({
      uid,
      fileName: Buffer.from(file.originalname, 'latin1').toString('utf8'),
      fileType: file.mimetype,
      fileContent: file.buffer,
      projectId,
      branchId,
    });

    await this.translationService.extractStrings(saved);
    this.logger.log(`handleUpload called with file: ${file.originalname}, mimetype: ${file.mimetype}, size: ${file.size}`);
    this.logger.log(`File uploaded and processed, fileId: ${saved.id}`);
    return { message: 'File uploaded and processed', fileId: saved.id };
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
    return { fileId: saved.id, fileName: saved.fileName };
  }



  async getProjectFiles(projectId: bigint, uid: bigint) {
    const files = await this.fileRepository.find({
      where: { project: { id: projectId } },
      relations: ['uploader'],
      select: ['id', 'fileName', 'fileType', 'createdAt', 'uploader'],
      order: { createdAt: 'DESC' }
    });

    return files.map(file => ({
      id: file.id,
      fileName: file.fileName,
      fileType: file.fileType,
      fileSize: file.fileContent ? file.fileContent.length : 0,
      createdAt: file.createdAt,
      uploader: {
        id: file.uploader.id,
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
    return file;
  }
}
