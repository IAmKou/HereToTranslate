import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Injectable} from '@nestjs/common';
import { FileEntity } from '#LocalProject/Entities';
import {
  TranslationString,
  TranslationStringDocument,
} from '../../db/mongo/schema/translation.schema';
import { GitHubService } from '#LocalProject/Managers/service/github-manager.service';
import { logger } from 'nx/src/utils/logger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { replaceDocxText } from '../../util/extensions/docx-utils.extension';
import { buildTranslatedPdf } from '../../util/extensions/pdf-utils.extension';
import { Buffer } from 'buffer';

@Injectable()
export class TranslationService {
  constructor(
    @InjectModel(TranslationString.name)
    private translationModel: Model<TranslationStringDocument>,
    @InjectRepository(FileEntity)
    private readonly fileRepository: Repository<FileEntity>,
    private readonly githubService: GitHubService
  ) {}

  async addTranslation(id: string, translatedText: string, language: string) {
    // Tìm bản ghi gốc để lấy thông tin
    const originalEntry = await this.translationModel.findById(id);
    if (!originalEntry) throw new Error('Manifest entry not found');

    // Handle missing manifestEntryId by generating one
    let manifestEntryId = originalEntry.manifestEntryId;
    if (!manifestEntryId) {
      console.warn('Original entry missing manifestEntryId, generating one:', {
        id: originalEntry._id,
        projectId: originalEntry.projectId,
        fileId: originalEntry.fileId,
        originalText: originalEntry.originalText?.substring(0, 50)
      });

      // Generate a new manifestEntryId
      manifestEntryId = `legacy_${originalEntry._id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Update the original entry with the new manifestEntryId
      await this.translationModel.updateOne(
        { _id: originalEntry._id },
        { $set: { manifestEntryId } }
      );

      console.log(`✅ Fixed original entry ${originalEntry._id} with manifestEntryId: ${manifestEntryId}`);
    }

    const existingTranslation = await this.translationModel.findOne({
      projectId: originalEntry.projectId,
      branchId: originalEntry.branchId,
      fileId: originalEntry.fileId,
      originalText: originalEntry.originalText,
      language: language,
    });

    let entry;

    if (existingTranslation) {
      // Update bản dịch hiện có
      existingTranslation.translatedText = translatedText;
      await existingTranslation.save();
      entry = existingTranslation;
    } else {
      // Tạo bản ghi mới cho ngôn ngữ này
      const newEntryData = {
        projectId: originalEntry.projectId,
        branchId: originalEntry.branchId,
        fileId: originalEntry.fileId,
        manifestEntryId: manifestEntryId, // Use the fixed manifestEntryId
        originalText: originalEntry.originalText,
        translatedText: translatedText,
        language: language,
        filePart: originalEntry.filePart,
        font: originalEntry.font,
        style: originalEntry.style,
        position: originalEntry.position,
        obsolete: false,
      };

      console.log('Creating new translation entry:', {
        manifestEntryId: newEntryData.manifestEntryId,
        language: newEntryData.language,
        fileId: newEntryData.fileId
      });

      entry = await this.translationModel.create(newEntryData);
    }

    const fileId = entry.fileId;
    const fileEntity = await this.fileRepository.findOne({
      where: { id: BigInt(fileId) },
      relations: ['project'],
    });
    if (!fileEntity || !fileEntity.project) {
      throw new Error('File or project not found');
    }

    let updatedBuffer: Buffer;
    if (
      fileEntity.fileType ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      const entries = await this.translationModel
        .find({ fileId, language })
        .lean();
      const translations = new Map<string, string>();
      for (const e of entries) {
        if (e.translatedText && e.translatedText.trim().length > 0) {
          translations.set(e.originalText, e.translatedText);
        }
      }
      const originalBuffer = fileEntity.fileContent as Buffer;
      updatedBuffer = await replaceDocxText(originalBuffer, translations);
    } else if (fileEntity.fileType === 'application/pdf') {
      const entries = await this.translationModel
        .find({ fileId, language })
        .lean();
      const translatedEntries = entries.map((e) => ({
        text: e.translatedText?.trim() ? e.translatedText : e.originalText,
      }));
      const originalBuffer = fileEntity.fileContent as Buffer;
      updatedBuffer = await buildTranslatedPdf(
        originalBuffer,
        translatedEntries
      );
    } else {
      updatedBuffer = await this.applyTranslation(fileId, language);
    }

    // --- Commit to GitHub ---
    const repoName = `project-${fileEntity.project.id}`;
    const safeFileName = fileEntity.fileName.replace(/[\\/:*?"<>|]/g, '_');
    const path = `${language}/${safeFileName}`;

    try {
      await this.githubService.commitChange({
        repo: repoName,
        branch: 'main',
        path,
        content: updatedBuffer,
        message: `Update translations for ${fileEntity.fileName} (${language})`,
      });
      logger.log(`✅ Translation committed to GitHub: ${repoName}/${path}`);
    } catch (err) {
      logger.error(`❌ Error committing translation to GitHub: ${err}`);
    }

    return entry;
  }

  async applyTranslation(fileId: string, language: string): Promise<Buffer> {
    const fileEntity = await this.fileRepository.findOne({
      where: { id: BigInt(fileId) },
    });
    if (!fileEntity) throw new Error('File not found');

    const entriesRaw = await this.translationModel
      .find({ fileId, language })
      .lean();
    const entries = entriesRaw.map((e: any) => ({
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

  async previewTranslation(
    fileId: string,
    language: string
  ): Promise<{ fileType: string; preview: string }> {
    const fileEntity = await this.fileRepository.findOne({
      where: { id: BigInt(fileId) },
    });
    if (!fileEntity) throw new Error('File not found');

    // Build translated file buffer
    const buffer = await this.applyTranslation(fileId, language);

    // Return preview based on type
    switch (fileEntity.fileType) {
      case 'text/plain':
      case 'application/json': {
        // For text-based files, return the UTF-8 string
        return {
          fileType: fileEntity.fileType,
          preview: buffer.toString('utf8'),
        };
      }
      case 'application/pdf':
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
        // For binary files, return base64 for preview
        return {
          fileType: fileEntity.fileType,
          preview: buffer.toString('base64'),
        };
      }
      default: {
        // Fallback to utf8
        return {
          fileType: fileEntity.fileType,
          preview: buffer.toString('utf8'),
        };
      }
    }
  }

  async previewTranslationPart(
    fileId: string,
    language: string,
    limit = 3,
    skip = 0
  ): Promise<{ fileType: string; previews: string[] }> {
    const fileEntity = await this.fileRepository.findOne({
      where: { id: BigInt(fileId) },
    });
    if (!fileEntity) throw new Error('File not found');

    const entries = await this.translationModel
      .find({ fileId, language })
      .skip(skip)
      .limit(limit)
      .lean();

    const previews = entries.map((e) =>
      e.translatedText?.trim() ? e.translatedText : e.originalText
    );

    return {
      fileType: fileEntity.fileType,
      previews,
    };
  }

  async exportTranslation(
    fileId: string,
    language: string
  ): Promise<{ fileContent: string; fileName: string; fileType: string }> {
    const fileEntity = await this.fileRepository.findOne({
      where: { id: BigInt(fileId) },
      relations: ['project'],
    });
    if (!fileEntity || !fileEntity.project) {
      throw new Error('File not found');
    }

    let buffer: Buffer;
    if (
      fileEntity.fileType ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      const entries = await this.translationModel
        .find({ fileId, language })
        .lean();
      const translations = new Map<string, string>();
      for (const e of entries) {
        if (e.translatedText && e.translatedText.trim().length > 0) {
          translations.set(e.originalText, e.translatedText);
        }
      }
      buffer = await replaceDocxText(
        fileEntity.fileContent as Buffer,
        translations
      );
    } else if (fileEntity.fileType === 'application/pdf') {
      const entries = await this.translationModel
        .find({ fileId, language })
        .lean();
      const translatedEntries = entries.map((e) => ({
        text: e.translatedText?.trim() ? e.translatedText : e.originalText,
      }));
      buffer = await buildTranslatedPdf(
        fileEntity.fileContent as Buffer,
        translatedEntries
      );
    } else {
      buffer = await this.applyTranslation(fileId, language);
    }

    // Create translated filename
    const fileNameParts = fileEntity.fileName.split('.');
    const extension = fileNameParts.pop();
    const baseName = fileNameParts.join('.');
    const translatedFileName = `${baseName}_${language}.${extension}`;

    return {
      fileContent: buffer.toString('base64'),
      fileName: translatedFileName,
      fileType: fileEntity.fileType
    };
  }

  async getAllString(
    projectId: string,
    branchId: string,
    language: string,
    fileId?: string,
    filePart?: number
  ) {
    // Lấy tất cả strings gốc (không phân biệt language) làm base
    const baseQuery: any = { projectId, branchId };
    if (fileId) baseQuery.fileId = fileId;
    if (filePart !== undefined) baseQuery.filePart = filePart;

    const baseStrings = await this.translationModel
      .find(baseQuery)
      .sort({ filePart: 1, _id: 1 })
      .lean();

    // Lấy bản dịch của ngôn ngữ được chọn
    const translationQuery: any = { projectId, branchId, language };
    if (fileId) translationQuery.fileId = fileId;
    if (filePart !== undefined) translationQuery.filePart = filePart;

    const translatedStrings = await this.translationModel
      .find(translationQuery)
      .sort({ filePart: 1, _id: 1 })
      .lean();

    // Tạo map để merge nhanh: originalText -> translatedText
    const translationMap = new Map();
    translatedStrings.forEach((str) => {
      translationMap.set(str.originalText, str.translatedText);
    });

    // Merge base strings với bản dịch của ngôn ngữ được chọn
    const mergedStrings = baseStrings.map((str) => {
      const translatedText = translationMap.get(str.originalText) || '';
      return {
        ...str,
        translatedText,
      };
    });

    // Lấy tên file
    const fileIds = Array.from(new Set(mergedStrings.map((str) => str.fileId)));
    const fileNamesMap: Record<string, string> = {};
    if (fileIds.length > 0) {
      const files = await this.fileRepository.find({
        where: { id: In(fileIds.map((id) => BigInt(id))) },
      });
      files.forEach((f) => {
        fileNamesMap[String(f.id)] = f.fileName;
      });
    }

    return mergedStrings.map((str) => ({
      id: str._id.toString(),
      originalText: str.originalText,
      translatedText: str.translatedText || '',
      fileId: str.fileId,
      filePart: str.filePart ?? 0,
      fileName: fileNamesMap[str.fileId] || '',
    }));
  }

  async getFilePages(fileId: string, projectId: string, branchId: string) {
    // Lấy tất cả strings của file để phân tích số trang
    const strings = await this.translationModel
      .find({ fileId, projectId, branchId })
      .sort({ filePart: 1, _id: 1 })
      .lean();

    // Nhóm strings theo filePart (trang)
    const pages = new Map<number, any[]>();
    for (const str of strings) {
      const page = str.filePart || 0;
      if (!pages.has(page)) {
        pages.set(page, []);
      }
      pages.get(page)!.push(str);
    }

    // Tạo danh sách trang với thông tin chi tiết
    const sortedPages = Array.from(pages.keys()).sort((a, b) => a - b);
    const pageInfo = sortedPages.map(page => ({
      pageNumber: page + 1, // Hiển thị từ 1 thay vì 0
      filePart: page,
      stringCount: pages.get(page)!.length,
      hasTranslatedStrings: pages.get(page)!.some(str => str.translatedText && str.translatedText.trim().length > 0)
    }));

    return {
      fileId,
      totalPages: sortedPages.length,
      pages: pageInfo
    };
  }

  async fixMissingManifestEntryIds() {
    // Find all translation entries that are missing manifestEntryId
    const entriesWithoutManifestId = await this.translationModel.find({
      manifestEntryId: { $exists: false }
    });

    console.log(`Found ${entriesWithoutManifestId.length} entries without manifestEntryId`);

    for (const entry of entriesWithoutManifestId) {
      // Generate a new manifestEntryId for this entry
      const newManifestEntryId = `legacy_${entry._id}_${Date.now()}`;

      await this.translationModel.updateOne(
        { _id: entry._id },
        { $set: { manifestEntryId: newManifestEntryId } }
      );

      console.log(`Fixed entry ${entry._id} with manifestEntryId: ${newManifestEntryId}`);
    }

    return entriesWithoutManifestId.length;
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
      const jsonArray = entries.map((e: any) => e.text);
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
      const defaultCombined = entries.map((e: any) => e.text).join('\n');
      return Buffer.from(defaultCombined, 'utf8');
    }
  }
}
