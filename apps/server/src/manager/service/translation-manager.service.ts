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

    // Lấy danh sách fileId duy nhất
    const fileIds = Array.from(new Set(strings.map((str) => str.fileId)));
    // Lấy tên file từ MySQL
    const fileNamesMap: Record<string, string> = {};
    if (fileIds.length > 0) {
      const files = await this.fileRepository.findByIds(fileIds);
      files.forEach((f) => {
        fileNamesMap[String(f.id)] = f.fileName;
      });
    }

    return strings.map((str) => ({
      id: str._id.toString(),
      originalText: str.originalText,
      translatedText: str.translatedText || '',
      fileId: str.fileId,
      filePart: str.filePart ?? 0,
      fileName: fileNamesMap[str.fileId] || '',
    }));
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

  async addTranslation(id: string, translatedText: string) {
    const entry = await this.translationModel.findById(id);
    if (!entry) throw new Error('Manifest entry not found');

    entry.translatedText = translatedText;
    await entry.save();

    const fileId = entry.fileId;
    const fileEntity = await this.fileRepository.findOne({
      where: { id: BigInt(fileId) },
      relations: ['project'],
    });
    if (!fileEntity || !fileEntity.project) {
      throw new Error('File or project not found');
    }

    const updatedBuffer = await this.applyTranslation(fileId);


    const repoName = `project-${fileEntity.project.id}`;
    const safeFileName = fileEntity.fileName.replace(/[\\/:*?"<>|]/g, '_');
    const path = safeFileName;

    try {
      await this.githubService.commitChange({
        repo: repoName,
        branch: 'main',
        path,
        content: updatedBuffer.toString('utf8'),
        message: `Update translations for ${fileEntity.fileName}`,
      });
      logger.log(`✅ Translation committed to GitHub: ${repoName}/${path}`);
    } catch (err) {
      logger.error(`❌ Error committing translation to GitHub: ${err}`);
    }

    return entry;
  }


  async applyTranslation(fileId: string): Promise<Buffer> {
    const fileEntity = await this.fileRepository.findOne({
      where: { id: BigInt(fileId) },
    });
    if (!fileEntity) throw new Error('File not found');

    const entriesRaw = await this.translationModel.find({ fileId }).lean();
    const entries = entriesRaw.map((e) => ({
      text:
        e.translatedText && e.translatedText.trim().length > 0
          ? e.translatedText
          : e.originalText,
      style: e.style,
      font: e.font,
    }));

    return rebuildFileWithManifest(fileEntity.fileType, entries);
  }

  async revertTranslation(fileId: string): Promise<Buffer> {
    const fileEntity = await this.fileRepository.findOne({
      where: { id: BigInt(fileId) },
    });
    if (!fileEntity) throw new Error('File not found');

    const entries = await this.translationModel.find({ fileId }).lean();
    const map = new Map<string, { text: string; style: any; font: string }>();
    for (const e of entries) {
      map.set(e.manifestEntryId, {
        text: e.originalText,
        style: e.style || {},
        font: e.font || 'default',
      });
    }

    const entriesArray = Array.from(map.values());
    return rebuildFileWithManifest(fileEntity.fileType, entriesArray);
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
async function rebuildFileWithManifest(
  fileType: string,
  entries: { text: string; style?: any; font?: string }[]
): Promise<Buffer> {
  switch (fileType) {
    case 'text/plain': {
      const combined = entries.map((e) => e.text).join('\n');
      return Buffer.from(combined, 'utf8');
    }

    case 'application/json': {
      const jsonArray = entries.map((e) => e.text);
      return Buffer.from(JSON.stringify(jsonArray, null, 2), 'utf8');
    }

    case 'application/pdf': {
      const { PDFDocument, StandardFonts } = await import('pdf-lib');
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      let y = page.getHeight() - 24;
      for (const e of entries) {
        page.drawText(e.text, { x: 50, y, font, size: 12 });
        y -= 16;
        if (y < 40) {
          const newPage = pdfDoc.addPage();
          y = newPage.getHeight() - 24;
        }
      }
      const pdfBytes = await pdfDoc.save();
      return Buffer.from(pdfBytes);
    }

    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
      const { Document, Packer, Paragraph, TextRun } = await import('docx');
      const paragraphs = entries.map((e) => {
        return new Paragraph({
          children: [
            new TextRun({
              text: e.text,
              bold: e.style?.bold || false,
              italics: e.style?.italic || false,
              color: e.style?.color,
              size: e.style?.fontSize ? e.style.fontSize * 2 : undefined,
              font: e.font !== 'default' ? e.font : undefined,
            }),
          ],
        });
      });
      const doc = new Document({ sections: [{ children: paragraphs }] });
      const buffer = await Packer.toBuffer(doc);
      return buffer;
    }

    default: {
      const defaultCombined = entries.map((e) => e.text).join('\n');
      return Buffer.from(defaultCombined, 'utf8');
    }
  }
}
