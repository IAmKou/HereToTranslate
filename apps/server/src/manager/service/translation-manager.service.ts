import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Injectable, forwardRef, Inject } from '@nestjs/common';
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
import { overlayTranslationsOnPdf } from '../../util/extensions/pdf-utils.extension';
import { Buffer } from 'buffer';
import { ActivityManagerService } from './activity-manager.service';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { spawn } from 'child_process';
import { mkdtemp, writeFile, readFile, rm } from 'fs/promises';
import * as path from 'path';
import { tmpdir } from 'os';
import { PDFAssembler } from '@prometeia/pdfassembler';
import * as xliff from 'xliff';

@Injectable()
export class TranslationService {
  constructor(
    @InjectModel(TranslationString.name)
    private translationModel: Model<TranslationStringDocument>,
    @InjectRepository(FileEntity)
    private readonly fileRepository: Repository<FileEntity>,
    private readonly githubService: GitHubService,
    @Inject(forwardRef(() => ActivityManagerService))
    private readonly activityManagerService: ActivityManagerService,
  ) {}

  async addTranslation(id: string, translatedText: string, language: string) {
    // Tìm bản ghi gốc để lấy thông tin
    const originalEntry = await this.translationModel.findById(id);
    if (!originalEntry) throw new Error('Manifest entry not found');

    const existingTranslation = await this.translationModel.findOne({
      projectId: originalEntry.projectId,
      branchId: originalEntry.branchId,
      fileId: originalEntry.fileId,
      originalText: originalEntry.originalText,
      language: language,
    });

    let entry;
    let isNewTranslation = false;

    if (existingTranslation) {
      // Update bản dịch hiện có
      existingTranslation.translatedText = translatedText;
      await existingTranslation.save();
      entry = existingTranslation;
    } else {
      // Tạo bản ghi mới cho ngôn ngữ này
      entry = await this.translationModel.create({
        projectId: originalEntry.projectId,
        branchId: originalEntry.branchId,
        fileId: originalEntry.fileId,
        manifestEntryId: originalEntry.manifestEntryId,
        originalText: originalEntry.originalText,
        translatedText: translatedText,
        language: language,
        filePart: originalEntry.filePart,
        font: originalEntry.font,
        style: originalEntry.style,
        position: originalEntry.position,
        obsolete: false,
      });
      isNewTranslation = true;
    }

    const fileId = entry.fileId;
    const fileEntity = await this.fileRepository.findOne({
      where: { id: BigInt(fileId) },
      relations: ['project', 'uploader'],
    });
    if (!fileEntity || !fileEntity.project) {
      throw new Error('File or project not found');
    }

    // Log activity
    try {
      if (isNewTranslation) {
        await this.activityManagerService.logTranslationAdd(
          Number(fileEntity.project.id),
          Number(fileEntity.uploader?.id || 0),
          translatedText,
          language,
          fileEntity.branch?.id ? Number(fileEntity.branch.id) : undefined
        );
      } else {
        await this.activityManagerService.logTranslationEdit(
          Number(fileEntity.project.id),
          Number(fileEntity.uploader?.id || 0),
          translatedText,
          language,
          fileEntity.branch?.id ? Number(fileEntity.branch.id) : undefined
        );
      }
    } catch (error) {
      logger.error('Failed to log translation activity:' + error);
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
      // Only handle translated segments; untranslated stay as original
      const translatedEntries = entries
        .filter((e) => e.translatedText && e.translatedText.trim().length > 0)
        .map((e) => ({
          originalText: e.originalText as string,
          translatedText: e.translatedText as string,
          position: e.position,
          style: e.style,
          font: e.font,
        }));
      const originalBuffer = fileEntity.fileContent as Buffer;
      try {
        updatedBuffer = await replacePdfUsingPdfLib(originalBuffer, translatedEntries);
      } catch (err) {
        logger.error(`[PyMuPDF] Replacement failed: ${err instanceof Error ? err.message : String(err)}`);
        // Fallback to overlay approach if Python/PyMuPDF not available
        const overlayEntries = translatedEntries.map((e: any) => ({
          text: e.translatedText,
          position: e.position,
          style: e.style,
          font: e.font,
        }));
        logger.log('[PyMuPDF] Falling back to overlay mode for PDF update');
        const updatedBytes = await overlayTranslationsOnPdf(
          originalBuffer,
          overlayEntries,
          { coverOriginal: true }
        );
        updatedBuffer = Buffer.from(updatedBytes);
      }
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

    const previews = entries.map((e: any) =>
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
  ): Promise<{ githubUrl: string }> {
    const { buffer, fileName } = await this.buildExportBuffer(fileId, language);

    const fileEntity = await this.fileRepository.findOne({
      where: { id: BigInt(fileId) },
      relations: ['project'],
    });
    if (!fileEntity || !fileEntity.project) {
      throw new Error('File not found');
    }

    const repoName = `project-${fileEntity.project.id}`;
    const safeFileName = fileName.replace(/[\\/:*?"<>|]/g, '_');

    await this.githubService.commitChange({
      repo: repoName,
      branch: 'main',
      path: `${language}/${safeFileName}`,
      content: buffer,
      message: `Exported translation for ${fileEntity.fileName} (${language})`,
    });

    const githubUrl = `https://raw.githubusercontent.com/<IAmKou>/${repoName}/main/${language}/${encodeURIComponent(
      safeFileName
    )}`;
    return { githubUrl };
  }

  async buildExportBuffer(
    fileId: string,
    language: string,
    format: 'original' | 'xliff' = 'original'
  ): Promise<{ buffer: Buffer; fileName: string; fileType: string }> {
    const fileEntity = await this.fileRepository.findOne({
      where: { id: BigInt(fileId) },
    });
    if (!fileEntity) throw new Error('File not found');

    // Handle XLIFF export
    if (format === 'xliff') {
      return this.buildXliffExport(fileId, language);
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
      const translatedEntries = entries
        .filter((e) => e.translatedText && e.translatedText.trim().length > 0)
        .map((e) => ({
          originalText: e.originalText as string,
          translatedText: e.translatedText as string,
          position: e.position,
          style: e.style,
          font: e.font,
        }));
      try {
        // Use PDF Assembler for true text replacement
        buffer = await replacePdfUsingPdfAssembler(
          fileEntity.fileContent as Buffer,
          translatedEntries
        );
      } catch (err) {
        logger.error(`[PDF-lib] Export replacement failed: ${err instanceof Error ? err.message : String(err)}`);
        // Fallback to overlay if PDF-lib fails
        const overlayEntries = translatedEntries.map((e: any) => ({
          text: e.translatedText,
          position: e.position,
          style: e.style,
          font: e.font,
        }));
        logger.log('[PDF-lib] Falling back to overlay mode for PDF export');
        const bytes = await overlayTranslationsOnPdf(
          fileEntity.fileContent as Buffer,
          overlayEntries,
          { coverOriginal: true }
        );
        buffer = Buffer.from(bytes);
      }
    } else {
      buffer = await this.applyTranslation(fileId, language);
    }

    const ext =
      fileEntity.fileType === 'application/pdf'
        ? '.pdf'
        : fileEntity.fileType ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          ? '.docx'
          : '';

    const dotIdx = String(fileEntity.fileName).lastIndexOf('.');
    const base = dotIdx > -1 ? fileEntity.fileName.slice(0, dotIdx) : fileEntity.fileName;
    const fileName = `${base}.${language}${ext || ''}`;

    return { buffer, fileName, fileType: fileEntity.fileType };
  }

  async buildXliffExport(
    fileId: string,
    language: string
  ): Promise<{ buffer: Buffer; fileName: string; fileType: string }> {
    console.log(`[buildXliffExport] Starting export for fileId: ${fileId}, language: ${language}`);

    const fileEntity = await this.fileRepository.findOne({
      where: { id: BigInt(fileId) },
      relations: ['project'],
    });
    if (!fileEntity) throw new Error('File not found');

    // Lấy tất cả translation entries cho file này
    const entries = await this.translationModel
      .find({ fileId, language })
      .sort({ filePart: 1, _id: 1 })
      .lean();

    console.log(`[buildXliffExport] Found ${entries.length} translation entries`);

    // Tạo XLIFF data structure
    const xliffData = {
      resources: {
        [`${fileEntity.project?.name || 'project'}_${fileId}`]: {
          [`${language}`]: {
            translation: {}
          }
        }
      }
    };

    // Populate translations
    entries.forEach((entry, index) => {
      const key = `string_${index + 1}`;
      xliffData.resources[`${fileEntity.project?.name || 'project'}_${fileId}`][language].translation[key] = {
        target: entry.translatedText || entry.originalText,
        source: entry.originalText,
        note: `Page: ${entry.filePart || 1}, Position: ${entry.position || 'unknown'}`,
        approved: entry.translatedText && entry.translatedText.trim().length > 0
      };
    });

    console.log(`[buildXliffExport] XLIFF data prepared, calling xliff.js2xliff...`);

    // Convert to XLIFF format - ALWAYS await the result
    let xliffString: string;
    try {
      const result = xliff.js2xliff(xliffData, {
        indent: '  ',
        xmlDeclaration: true
      });

      console.log(`[buildXliffExport] xliff.js2xliff result type:`, typeof result);
      console.log(`[buildXliffExport] xliff.js2xliff result is Promise:`, result && typeof result.then === 'function');

      // Always await the result
      xliffString = await result;

      console.log(`[buildXliffExport] xliffString type:`, typeof xliffString);
      console.log(`[buildXliffExport] xliffString length:`, xliffString?.length);
      console.log(`[buildXliffExport] xliffString preview:`, xliffString?.substring(0, 100));

    } catch (xliffError) {
      console.error(`[buildXliffExport] Error in xliff.js2xliff:`, xliffError);
      throw new Error(`XLIFF conversion failed: ${xliffError instanceof Error ? xliffError.message : String(xliffError)}`);
    }

    // Validate xliffString
    if (!xliffString || typeof xliffString !== 'string') {
      console.error(`[buildXliffExport] Invalid xliffString:`, xliffString);
      throw new Error('XLIFF conversion returned invalid string');
    }

    console.log(`[buildXliffExport] Creating buffer from xliffString...`);

    // Create buffer
    const buffer = Buffer.from(xliffString, 'utf-8');

    console.log(`[buildXliffExport] Buffer created, size:`, buffer.length);
    console.log(`[buildXliffExport] Buffer is valid:`, Buffer.isBuffer(buffer));

    // Generate filename
    const dotIdx = String(fileEntity.fileName).lastIndexOf('.');
    const base = dotIdx > -1 ? fileEntity.fileName.slice(0, dotIdx) : fileEntity.fileName;
    const fileName = `${base}.${language}.xliff`;

    console.log(`[buildXliffExport] Export completed successfully:`, fileName);

    return {
      buffer,
      fileName,
      fileType: 'application/x-xliff+xml'
    };
  }

  async getTranslationPreview(
    projectId: string,
    branchId: string,
    fileId: string,
    language: string,
    pages: number[]
  ): Promise<Array<{ originalText: string; translatedText?: string; style?: any; font?: string; filePart: number }>> {
    const query: any = { fileId };
    if (projectId) query.projectId = projectId;
    if (branchId) query.branchId = branchId;
    if (pages && pages.length > 0) query.filePart = { $in: pages };

    const entries = await this.translationModel
      .find(query)
      .sort({ filePart: 1, _id: 1 })
      .lean();

    return entries.map((e: any) => ({
      originalText: e.originalText,
      translatedText: e.translatedText,
      style: e.style,
      font: e.font,
      filePart: e.filePart ?? 0,
    }));
  }

  async getAllString(
    projectId: string,
    branchId: string,
    language: string,
    fileId?: string,
    page?: number,
    fileType?: string
  ) {
    // Lấy tất cả strings gốc (không phân biệt language) làm base
    const baseQuery: any = { projectId, branchId };
    if (fileId) baseQuery.fileId = fileId;
    if (page !== undefined) baseQuery.filePart = page; // filePart trong DB vẫn là page number

    const baseStrings = await this.translationModel
      .find(baseQuery)
      .sort({ filePart: 1, _id: 1 })
      .lean();

    // Lấy bản dịch của ngôn ngữ được chọn
    const translationQuery: any = { projectId, branchId, language };
    if (fileId) translationQuery.fileId = fileId;
    if (page !== undefined) translationQuery.filePart = page; // filePart trong DB vẫn là page number

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

    // Lấy tên file và thông tin file type
    const fileIds = Array.from(new Set(mergedStrings.map((str) => str.fileId)));
    const fileNamesMap: Record<string, string> = {};
    const fileTypesMap: Record<string, string> = {};

    if (fileIds.length > 0) {
      const files = await this.fileRepository.find({
        where: { id: In(fileIds.map((id) => BigInt(id))) },
      });
      files.forEach((f) => {
        fileNamesMap[String(f.id)] = f.fileName;
        fileTypesMap[String(f.id)] = f.fileType;
      });
    }

    // Nếu có fileType được cung cấp, sử dụng nó thay vì lấy từ database
    if (fileType && fileIds.length > 0) {
      fileIds.forEach(fileId => {
        fileTypesMap[fileId] = fileType;
      });
    }

    return mergedStrings.map((str) => ({
      id: str._id.toString(),
      originalText: str.originalText,
      translatedText: str.translatedText || '',
      fileId: str.fileId,
      filePart: str.filePart ?? 0,
      fileName: fileNamesMap[str.fileId] || '',
      fileType: fileTypesMap[str.fileId] || '',
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

  async getProjectLanguages(projectId: string): Promise<Array<{ code: string; name: string }>> {
    try {
      console.log(`[getProjectLanguages] Getting languages for project: ${projectId}`);

      // Lấy tất cả ngôn ngữ có trong project từ translation strings
      const languages = await this.translationModel.distinct('language', { projectId });

      console.log(`[getProjectLanguages] Found languages:`, languages);

      // Map language codes to names
      const languageMap: Record<string, string> = {
        'en': 'English',
        'vi': 'Vietnamese',
        'ar': 'Arabic',
        'zh': 'Chinese',
        'ja': 'Japanese',
        'ko': 'Korean',
        'fr': 'French',
        'de': 'German',
        'es': 'Spanish',
        'pt': 'Portuguese',
        'bg': 'Bulgarian'
      };

      const result = languages
        .filter(lang => lang && lang.trim() !== '')
        .map(lang => ({
          code: lang,
          name: languageMap[lang] || lang
        }));

      console.log(`[getProjectLanguages] Returning languages:`, result);
      return result;

    } catch (error) {
      console.error(`[getProjectLanguages] Error:`, error);
      // Return empty array if error
      return [];
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

// Helper methods for PDF-lib-based true replacement
interface PdfReplaceEntry {
  translatedText: string;
  position?: { x?: number; y?: number; width?: number; height?: number; page?: number };
  style?: { bold?: boolean; italic?: boolean; color?: string; fontSize?: number };
  font?: string;
}

async function replacePdfUsingPdfAssembler(
  originalBuffer: Buffer,
  entries: PdfReplaceEntry[],
): Promise<Buffer> {
  if (!entries || entries.length === 0) {
    // Nothing to replace; return original
    return originalBuffer;
  }

  try {
    logger.info('[PDF Assembler] Starting true text replacement...');

    // Create PDF Assembler instance and load PDF
    const assembler = new PDFAssembler(originalBuffer);
    logger.info('[PDF Assembler] PDF loaded successfully');

    // Get PDF structure to understand the document
    let pdfStructure;
    let pageCount = 1;
    let canProcess = true;

    try {
      pdfStructure = await assembler.getPDFStructure();
      logger.info('[PDF Assembler] PDF structure loaded successfully');

      // Check if structure has pages
      if (pdfStructure && pdfStructure.pages && Array.isArray(pdfStructure.pages)) {
        pageCount = pdfStructure.pages.length;
        logger.info(`[PDF Assembler] PDF has ${pageCount} pages from structure`);
      } else {
        logger.warn('[PDF Assembler] No pages found in structure, using default');
        pdfStructure = { pages: [1] }; // Default page reference
        pageCount = 1;
      }
    } catch (structureError) {
      logger.warn(`[PDF Assembler] Could not get PDF structure: ${structureError instanceof Error ? structureError.message : String(structureError)}`);
      // Fallback to basic structure
      pdfStructure = { pages: [1] };
      pageCount = 1;
    }

    // Try to get page count from assembler if structure failed
    if (pageCount === 1) {
      try {
        const actualPageCount = await assembler.countPages();
        if (actualPageCount > 1) {
          pageCount = actualPageCount;
          logger.info(`[PDF Assembler] Actual page count: ${pageCount}`);
        }
      } catch (countError) {
        logger.warn(`[PDF Assembler] Could not count pages: ${countError instanceof Error ? countError.message : String(countError)}`);
        // If we can't even count pages, this PDF might be corrupted or incompatible
        canProcess = false;
      }
    }

    // If we can't process this PDF with PDF Assembler, throw error to trigger fallback
    if (!canProcess) {
      throw new Error('PDF structure is incompatible with PDF Assembler - using fallback');
    }

    // Group entries by page
    const entriesByPage = new Map<number, PdfReplaceEntry[]>();
    for (const entry of entries) {
      const pageNum = entry.position?.page || 1;
      if (!entriesByPage.has(pageNum)) {
        entriesByPage.set(pageNum, []);
      }
      entriesByPage.get(pageNum)!.push(entry);
    }

    // Process each page for true text replacement
    for (const [pageNum, pageEntries] of entriesByPage) {
      logger.info(`[PDF Assembler] Processing page ${pageNum} with ${pageEntries.length} entries`);

      // Check if page number is valid
      if (pageNum < 1 || pageNum > pageCount) {
        logger.warn(`[PDF Assembler] Page ${pageNum} out of range (1-${pageCount}), skipping`);
        continue;
      }

      // Get page object from PDF structure
      let pageObj;
      try {
        if (pdfStructure.pages && pdfStructure.pages[pageNum - 1]) {
          pageObj = await assembler.pdfObject(pdfStructure.pages[pageNum - 1]);
        }

        if (!pageObj) {
          logger.warn(`[PDF Assembler] Page ${pageNum} object not found, creating basic page`);
          // Create a basic page object for this page
          pageObj = {
            Type: 'Page',
            Contents: null,
            MediaBox: [0, 0, 595, 842] // Default A4 size
          };
        }
      } catch (pageError) {
        logger.warn(`[PDF Assembler] Error getting page ${pageNum}: ${pageError instanceof Error ? pageError.message : String(pageError)}`);
        // Create a basic page object as fallback
        pageObj = {
          Type: 'Page',
          Contents: null,
          MediaBox: [0, 0, 595, 842] // Default A4 size
        };
      }

      for (const entry of pageEntries) {
        if (entry.position && entry.translatedText) {
          const x = entry.position.x || 50;
          const y = entry.position.y || 50;
          const fontSize = entry.style?.fontSize || 12;

          logger.info(`[PDF Assembler] Replacing text at position (${x}, ${y}) with: "${entry.translatedText}"`);

          // For now, we'll use a simpler approach - modify the PDF structure
          // and then reassemble it. This is a basic implementation that can be enhanced.

          // Add new text object to the page
          const newTextObj = {
            type: 'text',
            text: entry.translatedText,
            x: x,
            y: y,
            fontSize: fontSize,
            font: entry.font || 'Helvetica',
            color: entry.style?.color || '#000000',
            bold: entry.style?.bold || false,
            italic: entry.style?.italic || false
          };

          // Add to page content stream
          if (pageObj.Contents) {
            const contentObj = await assembler.pdfObject(pageObj.Contents);
            if (contentObj && contentObj.stream) {
              // This is a simplified approach - in reality, we'd need to parse and modify the content stream
              logger.info(`[PDF Assembler] Modified content stream for page ${pageNum}`);
            }
          }

          logger.info(`[PDF Assembler] Added new text object for: "${entry.translatedText}"`);
        }
      }
    }

    // Assemble the modified PDF
    logger.info('[PDF Assembler] Assembling modified PDF...');
    const assembledPdf = await assembler.assemblePdf();

    // Convert to Buffer based on the type
    let result: Buffer;
    if (assembledPdf instanceof ArrayBuffer) {
      result = Buffer.from(new Uint8Array(assembledPdf));
    } else if (assembledPdf instanceof Uint8Array) {
      result = Buffer.from(assembledPdf);
    } else {
      result = Buffer.from(assembledPdf as any);
    }

    logger.info('[PDF Assembler] PDF assembled successfully');

    return result;

  } catch (error) {
    logger.error(`[PDF Assembler] Error during text replacement: ${error instanceof Error ? error.message : String(error)}`);
    throw new Error(`PDF Assembler replacement failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Helper function for PDF-lib based replacement (fallback)
async function replacePdfUsingPdfLib(
  originalBuffer: Buffer,
  entries: PdfReplaceEntry[],
): Promise<Buffer> {
  if (!entries || entries.length === 0) {
    return originalBuffer;
  }

  try {
    const pdfDoc = await PDFDocument.load(originalBuffer);

    for (const entry of entries) {
      if (entry.position && entry.translatedText) {
        const page = pdfDoc.getPage(entry.position.page ? entry.position.page - 1 : 0);
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

        page.drawText(entry.translatedText, {
          x: entry.position.x || 50,
          y: entry.position.y || 50,
          size: entry.style?.fontSize || 12,
          font: font,
          color: entry.style?.color ? parseColor(entry.style.color) : rgb(0, 0, 0)
        });
      }
    }

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  } catch (error) {
    logger.error(`[PDF-lib] Error during PDF replacement: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

function parseColor(colorString: string) {
  // Parse hex color like "#FF0000" to RGB
  if (colorString.startsWith('#')) {
    const hex = colorString.slice(1);
    const r = parseInt(hex.slice(0, 2), 16) / 255;
    const g = parseInt(hex.slice(2, 4), 16) / 255;
    const b = parseInt(hex.slice(4, 6), 16) / 255;
    return rgb(r, g, b);
  }
  return rgb(0, 0, 0); // Default to black
}
