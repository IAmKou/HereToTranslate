import { InjectRepository } from '@nestjs/typeorm';
import { Injectable } from '@nestjs/common';
import { FileEntity } from '#LocalProject/Entities';
import { Repository } from 'typeorm';
import { GitHubService } from '#LocalProject/Managers/service/github-manager.service';
import  { Express } from 'express';
import  { Multer } from 'multer';
import { TranslationService } from '#LocalProject/Managers/service/translation-manager.service';

@Injectable()
export class fileService {
  constructor(
    @InjectRepository(FileEntity)
    private readonly fileRepository: Repository<FileEntity>,
    private readonly githubService: GitHubService,
    private readonly translationService : TranslationService,
  ) {
  }
  async saveFile(params: {
    uid: bigint;
    fileName: string;
    fileType: string;
    fileContent: Buffer;
    projectId: bigint;
    branchId: bigint;
  }) {
    const { uid, fileName, fileType, fileContent, projectId, branchId } = params;

    const file = this.fileRepository.create({
      fileName,
      fileType,
      fileContent,
      uploader: { id: uid },
      project: { id: projectId },
      branch: { id: branchId },
    });

    const savedFile = await this.fileRepository.save(file);

    const repoName = `project-${projectId}`;
    await this.githubService.pushInitialFile({
      repo: repoName,
      path: `uploads/${fileName}`,
      content: fileContent.toString('base64'),
      message: `Uploaded ${fileName}`,
    });

    return savedFile;
  }

  async handleUpload(
    file: Express.Multer.File,
    uid: bigint,
    projectId: bigint,
    branchId: bigint,
  ) {
    const saved = await this.saveFile({
      uid,
      fileName: file.originalname,
      fileType: file.mimetype,
      fileContent: file.buffer,
      projectId,
      branchId,
    });

    await this.translationService.extractStrings(saved);
    return { message: 'File uploaded and processed', fileId: saved.id };
  }

}
