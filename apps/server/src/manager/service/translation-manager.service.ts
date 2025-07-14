import decompress from 'decompress';
import * as pdfParse from 'pdf-parse';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Injectable } from '@nestjs/common';
import { FileEntity } from '#LocalProject/Entities';
import {
  TranslationString,
  TranslationStringDocument,
} from '../../db/mongo/schema/translation.schema';
import * as mammoth from 'mammoth';
import { GitHubService } from '#LocalProject/Managers/service/github-manager.service';
import { logger } from 'nx/src/utils/logger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class TranslationService {
  constructor(
    @InjectModel(TranslationString.name)
    private translationModel: Model<TranslationStringDocument>,
    @InjectRepository(FileEntity)
    private readonly fileRepository: Repository<FileEntity>,
    private readonly githubService: GitHubService
  ) {}

  async extractStrings(file: FileEntity): Promise<void> {
    const textBlocks: string[] = [];

    console.log(
      '[extractStrings] fileId:',
      file.id,
      'fileName:',
      file.fileName,
      'fileType:',
      file.fileType
    );
    if (file.fileContent) {
      console.log(
        '[extractStrings] fileContent length:',
        file.fileContent.length
      );
    } else {
      console.warn('[extractStrings] fileContent is null or undefined!');
    }

    switch (file.fileType) {
      case 'text/plain':
        textBlocks.push(file.fileContent.toString());
        break;
      case 'application/json': {
        const json = JSON.parse(file.fileContent.toString());
        extractJsonStrings(json, textBlocks);
        break;
      }
      case 'application/pdf': {
        const pdfData = await pdfParse.default(file.fileContent);
        textBlocks.push(pdfData.text);
        break;
      }
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
        if (!file.fileContent) {
          console.error(
            '[extractStrings] DOCX fileContent is empty or missing! fileId:',
            file.id,
            'fileName:',
            file.fileName
          );
          throw new Error('File content is empty or missing for DOCX');
        }
        const result = await mammoth.extractRawText({
          buffer: file.fileContent,
        });
        textBlocks.push(result.value);
        break;
      }
      case 'application/zip':
      case 'application/x-rar-compressed': {
        const files = await decompress(file.fileContent);
        for (const f of files) {
          if (f.data) {
            const ext = f.path.split('.').pop();
            if (ext === 'txt' || ext === 'json') {
              const content = f.data.toString();
              if (ext === 'json') {
                extractJsonStrings(JSON.parse(content), textBlocks);
              } else {
                textBlocks.push(content);
              }
            }
          }
        }
        break;
      }
      default:
        if (
          file.fileName.endsWith('.unity') ||
          file.fileName.endsWith('.uasset')
        ) {
          await this.extractFromAssetFile(file, textBlocks);
        } else if (file.fileName.endsWith('.docx')) {
          if (!file.fileContent) {
            console.error(
              '[extractStrings] DOCX (default) fileContent is empty or missing! fileId:',
              file.id,
              'fileName:',
              file.fileName
            );
            throw new Error('File content is empty or missing for DOCX');
          }
          const result = await mammoth.extractRawText({
            buffer: file.fileContent,
          });
          textBlocks.push(result.value);
        }
        break;
    }

    // Kiểm tra project và branch
    if (!file.project || !file.branch) {
      throw new Error('File is missing project or branch information');
    }
    const MAX_STRINGS_PER_PART = 250;

    const allLines = textBlocks
      .flatMap((text) => text.split('\n').map((line) => line.trim()))
      .filter((line) => line.length > 0);

    let part = 0;
    while (allLines.length > 0) {
      const linesForPart = allLines.splice(0, MAX_STRINGS_PER_PART);
      const inserts = linesForPart.map((line) => ({
        fileId: String(file.id),
        branchId: String(file.branch.id),
        projectId: String(file.project.id),
        originalText: line,
        filePart: part, // new field
      }));
      await this.translationModel.insertMany(inserts);
      part++;
    }
  }

  private async extractFromAssetFile(file: FileEntity, result: string[]) {
    // const extracted = await this.externalAssetExtractor.extractStringsFrom(file);
    // result.push(...extracted);
  }

  async getAllString(
    projectId: string,
    branchId: string,
    fileId?: string,
    filePart?: number
  ) {
    const query: any = { projectId, branchId };
    if (fileId) query.fileId = fileId;
    if (filePart !== undefined) query.filePart = filePart;

    const strings = await this.translationModel
      .find(query)
      .sort({ filePart: 1, _id: 1 })
      .lean();

    return strings.map((str) => ({
      id: str._id.toString(),
      originalText: str.originalText,
      translatedText: str.translatedText || '',
      fileId: str.fileId,
      filePart: str.filePart ?? 0,
    }));
  }

  async addTranslatedString(id: string, translatedText: string) {
    const stringDoc = await this.translationModel.findById(id);
    if (!stringDoc) {
      throw new Error('Translation string not found');
    }

    stringDoc.translatedText = translatedText;
    await stringDoc.save();

    return stringDoc;
  }

  async commitTranslatedFileToGitHub(
    projectId: string,
    branchId: string,
    repo: string,
    githubBranch: string
  ) {
    const strings = await this.translationModel
      .find({
        projectId,
        branchId,
        translatedText: { $exists: true, $ne: '' },
      })
      .lean();

    const translations: Record<string, string> = {};
    strings.forEach((s) => {
      translations[s.originalText] = s.translatedText!;
    });

    const fileContent = JSON.stringify(translations, null, 2);
    const filePath = `translations/${branchId}.json`;

    await this.githubService.commitChange({
      repo,
      path: filePath,
      content: fileContent,
      message: `Export translated strings for branch ${branchId}`,
      branch: githubBranch,
    });
  }

  async extractStringsForRequestFiles(requestId: bigint) {
    const files = await this.fileRepository.find({
      where: { request: { id: requestId } },
      relations: ['project', 'branch'],
    });

    for (const file of files) {
      try {
        if (file.project && file.branch) {
          await this.extractStrings(file);
          logger.log(`Strings extracted for file: ${file.fileName}`);
        } else {
          logger.warn(
            `Skipping extractStrings for ${file.fileName} due to missing project/branch`
          );
        }
      } catch (err) {
        logger.error(`Failed to extract strings for file ${file.fileName}`);
        logger.log(err);
      }
    }
  }

}

function extractJsonStrings(obj: any, result: string[], path = '') {
  if (typeof obj === 'string') {
    result.push(obj);
  } else if (Array.isArray(obj)) {
    obj.forEach((item) => extractJsonStrings(item, result, path));
  } else if (typeof obj === 'object' && obj !== null) {
    for (const key of Object.keys(obj)) {
      extractJsonStrings(obj[key], result, path + '.' + key);
    }
  }
}
