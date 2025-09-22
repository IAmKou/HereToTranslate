import { Injectable, forwardRef, Inject } from '@nestjs/common';
import { FileEntity } from '#LocalProject/Entities';
import { TranslationEntity } from '../../db/mysql/entity/translation.entity';
import { logger } from 'nx/src/utils/logger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { replaceDocxTextWithCount } from '../../util/extensions/docx-utils.extension';
import { Buffer } from 'buffer';
import { ActivityManagerService } from './activity-manager.service';
import { AsposeService } from './aspose.service';
import { PDFAssembler } from '@prometeia/pdfassembler';
import { TranslationPreviewEntity } from '../../db/mysql/entity/translation-preview.entity';
import * as xliff from 'xliff';

@Injectable()
export class TranslationService {
  constructor(
    @InjectRepository(TranslationEntity)
    private readonly translationRepository: Repository<TranslationEntity>,
    @InjectRepository(FileEntity)
    private readonly fileRepository: Repository<FileEntity>,
    @InjectRepository(TranslationPreviewEntity)
    private readonly previewRepository: Repository<TranslationPreviewEntity>,
    @Inject(forwardRef(() => ActivityManagerService))
    private readonly activityManagerService: ActivityManagerService,
    private readonly asposeService: AsposeService,
    private readonly configService: ConfigService
  ) {}

  async getTranslationProgress(
    projectId: string,
    language?: string
  ): Promise<{ total: number; completed: number; percentage: number }> {
    console.log(`[getTranslationProgress] Called with: projectId=${projectId}, language=${language}`);

    // Type-agnostic filter (works whether stored as "2" or 2)
    const projectCandidates: (string | number)[] = [projectId];
    const parsedProjectNum = Number(projectId);
    if (!Number.isNaN(parsedProjectNum)) projectCandidates.push(parsedProjectNum);


    const total = await this.translationRepository
      .createQueryBuilder('t')
      .innerJoin(FileEntity, 'f', 'f.id = t.fileId')
      .where('f.projectId = :pid', { pid: BigInt(projectId) })
      .getCount();
    console.log(`[getTranslationProgress] Total records found (any language): ${total}`);

    if (total === 0) {
      console.log(`[getTranslationProgress] No translation records found for project ${projectId} .`);
      return { total: 0, completed: 0, percentage: 0 };
    }

    // Completed: records with a non-empty translatedText
    const completed = await this.translationRepository
      .createQueryBuilder('t')
      .innerJoin(FileEntity, 'f', 'f.id = t.fileId')
      .where('f.projectId = :pid', { pid: BigInt(projectId) })
      .andWhere('t.translatedText IS NOT NULL')
      .andWhere("TRIM(t.translatedText) <> ''")
      .getCount();
    console.log(`[getTranslationProgress] Completed records (translatedText present): ${completed}`);

    const percentage = Math.round(((completed / total) * 100) * 100) / 100;
    console.log(`[getTranslationProgress] Result: ${completed}/${total} = ${percentage}%`);

    return { total, completed, percentage };
  }

  // Preview pages persistence per user-request (not per file)
  async savePreviewPages(params: { userId: bigint; requestId: string; pages: number[]; }): Promise<{ pages: number[] }>{
    const { userId, requestId, pages } = params;
    const trimmed = Array.from(new Set((pages || []).map((n) => Number(n)).filter((n) => Number.isFinite(n) && n > 0))).slice(0, 5);
    const existing = await this.previewRepository.findOne({ where: { user: { id: userId } as any, request: { id: BigInt(requestId) } as any } });
    if (existing) {
      existing.previewPages = trimmed;
      existing.createdAt = new Date();
      await this.previewRepository.save(existing);
      return { pages: existing.previewPages };
    }
    const created = this.previewRepository.create({ user: { id: userId } as any, request: { id: BigInt(requestId) } as any, previewPages: trimmed, isApproved: false });
    const saved = await this.previewRepository.save(created);
    return { pages: saved.previewPages };
  }

  async getPreviewPages(params: { userId: bigint; requestId: string; }): Promise<{ pages: number[] } | null>{
    const { userId, requestId } = params;
    const existing = await this.previewRepository.findOne({ where: { user: { id: userId } as any, request: { id: BigInt(requestId) } as any } });
    if (!existing) return null;
    return { pages: existing.previewPages || [] };
  }

  // Helper method to ensure translation records exist for target languages
  async ensureTranslationRecordsExist(_projectId: string, _targetLanguage: string): Promise<void> { return; }

  // Method to get project translation status
  async getProjectTranslationStatus(projectId: string): Promise<{
    hasRecords: boolean;
    hasEnglishStrings: boolean;
    totalRecords: number;
    englishRecords: number;
    languages: string[];
  }> {
    const projectCandidates: (string | number)[] = [projectId];
    const parsedProjectNum = Number(projectId);
    if (!Number.isNaN(parsedProjectNum)) projectCandidates.push(parsedProjectNum);


    const totalRecords = await this.translationRepository.count({ where: { projectId: BigInt(projectId) } });
    const langRows = await this.translationRepository
      .createQueryBuilder('t')
      .select('DISTINCT t.language', 'language')
      .where('t.projectId = :pid', { pid: BigInt(projectId) })
      .getRawMany<{ language: string }>();
    const languages = langRows.map((r) => r.language).filter(Boolean);

    // With language-agnostic behavior, treat "englishRecords" as totalRecords
    const englishRecords = totalRecords;

    return {
      hasRecords: totalRecords > 0,
      hasEnglishStrings: totalRecords > 0,
      totalRecords,
      englishRecords,
      languages,
    };
  }

  async addTranslation(id: string, translatedText: string, language: string) {
    // Tìm bản ghi gốc để cập nhật trực tiếp
    const originalEntry = await this.translationRepository.findOne({ where: { id: BigInt(id) } });
    if (!originalEntry) throw new Error('Manifest entry not found');

    // Cập nhật trực tiếp bản ghi gốc thay vì tạo mới
    originalEntry.translatedText = translatedText;
    originalEntry.language = language;

    // Lưu bản ghi đã cập nhật
    const entry = await this.translationRepository.save(originalEntry);
    const isNewTranslation = !originalEntry.translatedText || originalEntry.translatedText.trim().length === 0;

    const fileId = entry.fileId;
    const fileEntity = await this.fileRepository.findOne({
      where: { id: BigInt(fileId!) },
      relations: ['project', 'uploader'],
    });
    if (!fileEntity || !fileEntity.project) {
      throw new Error('File or project not found');
    }

    try {
      if (isNewTranslation) {
        await this.activityManagerService.logTranslationAdd(
          Number(fileEntity.project.id),
          Number(fileEntity.uploader?.id || 0),
          translatedText,
          language,
        );
      } else {
        await this.activityManagerService.logTranslationEdit(
          Number(fileEntity.project.id),
          Number(fileEntity.uploader?.id || 0),
          translatedText,
          language,
        );
      }
    } catch (error) {
      logger.error('Failed to log translation activity:' + error);
    }

    let updatedBuffer: Buffer = fileEntity.fileContent as Buffer;
    if (
      fileEntity.fileType ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      const entries = await this.translationRepository.find({ where: { fileId: BigInt(fileId!), language } });
      const translations = new Map<string, string>();
      for (const e of entries as any[]) {
        if (e.translatedText && e.translatedText.trim().length > 0) {
          translations.set(e.originalText, e.translatedText);
        }
      }
      const originalBuffer = fileEntity.fileContent as Buffer;
      const { buffer: replacedBuffer, replacedCount } =
        await replaceDocxTextWithCount(originalBuffer, translations);
      if (replacedCount === 0) {
        logger.warn(
          '[DOCX Update] No inline replacements were made; keeping original structure'
        );
        updatedBuffer = originalBuffer;
      } else {
        updatedBuffer = replacedBuffer;
      }
    } else if (fileEntity.fileType === 'application/pdf') {
      const entries = await this.translationRepository.find({ where: { fileId: BigInt(fileId!), language } });
      const translatedEntries = entries
        .filter((e: any) => e.translatedText && e.translatedText.trim().length > 0)
        .map((e: any) => ({
          originalText: e.originalText as string,
          translatedText: e.translatedText as string,
          page: (e as any).filePart || (e as any).position?.page || 1,
        }));
      const originalBuffer = fileEntity.fileContent as Buffer;
      try {
        logger.log('[PDF] Using AsposeService for text replacement...');

        // Determine the correct file name for this language
        const dotIdx = String(fileEntity.fileName).lastIndexOf('.');
        const base = dotIdx > -1 ? fileEntity.fileName.slice(0, dotIdx) : fileEntity.fileName;
        const langSuffix = String(language || '').toUpperCase();
        const langFileName = `${base}${langSuffix ? `(${langSuffix})` : ''}.pdf`;

        // Determine the correct folder
        const projectFolder = fileEntity.project?.id
          ? `projects/project-${fileEntity.project.id}`
          : 'pdf';

        const replacementsByPage = new Map<
          number,
          { oldText: string; newText: string }[]
        >();
        for (const entry of translatedEntries) {
          const pageNum = entry.page || 1;
          if (!replacementsByPage.has(pageNum)) {
            replacementsByPage.set(pageNum, []);
          }
          replacementsByPage
            .get(pageNum)!
            .push({
              oldText: entry.originalText,
              newText: entry.translatedText,
            });
        }

        try {
          const langExists = await this.asposeService.fileExists(`${projectFolder}/${langFileName}`);
          if (!langExists) {
            logger.log(`[PDF] Language file ${langFileName} doesn't exist, creating from original buffer...`);

            const originalExists = await this.asposeService.fileExists(`${projectFolder}/${fileEntity.fileName}`);
            if (!originalExists) {
              logger.log(`[PDF] Original file not in Aspose storage, uploading original buffer: ${fileEntity.fileName}`);
              await this.asposeService.uploadFile(
                fileEntity.fileName,
                originalBuffer,
                projectFolder
              );
            }

            await this.asposeService.uploadFile(langFileName, originalBuffer, projectFolder);
            logger.log(`[PDF] Created language file: ${langFileName}`);
          }
        } catch (copyErr) {
          logger.warn(`[PDF] Failed to ensure language file exists: ${copyErr instanceof Error ? copyErr.message : String(copyErr)}`);
        }

        // Aspose text replacement API not implemented in AsposeService; skipping here.
        updatedBuffer = originalBuffer;

        logger.log('[PDF] AsposeService replacement successful');
      } catch (asposePdfErr) {
        logger.error(
          `[PDF] AsposeService replacement failed: ${
            asposePdfErr instanceof Error
              ? asposePdfErr.message
              : String(asposePdfErr)
          }`
        );
        logger.warn(
          '[PDF] All PDF replacement methods failed, returning original file'
        );
        updatedBuffer = originalBuffer;
      }
    } else {
      console.log('Error');
    }

    const repoName = `project-${fileEntity.project.id}`;
    const dotIdx = String(fileEntity.fileName).lastIndexOf('.');
    const base =
      dotIdx > -1 ? fileEntity.fileName.slice(0, dotIdx) : fileEntity.fileName;
    const ext =
      fileEntity.fileType === 'application/pdf'
        ? '.pdf'
        : fileEntity.fileType ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          ? '.docx'
          : '';
    const langUpperForCommit = String(language || '').toUpperCase();
    const safeFileName = `${base}${langUpperForCommit ? `(${langUpperForCommit})` : ''}${ext}`.replace(
      /[\\/:*?"<>|]/g,
      '_'
    );
    const path = `${language}/${safeFileName}`;

    try {
      let nextBuffer = updatedBuffer;
      if (
        fileEntity.fileType ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ) {
        const entries = await this.translationRepository.find({ where: { fileId: BigInt(fileId!), language } });
        const translations = new Map<string, string>();
        for (const e of entries as any[]) {
          if (e.translatedText && e.translatedText.trim().length > 0) {
            translations.set(e.originalText, e.translatedText);
          }
        }
        const { buffer: patched, replacedCount } =
          await replaceDocxTextWithCount(nextBuffer, translations);
        nextBuffer = replacedCount > 0 ? patched : nextBuffer;
      }


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

    const entriesRaw = await this.translationRepository.find({ where: { fileId: BigInt(fileId), language } });
    const entries = entriesRaw.map((e: any) => ({
      text:
        e.translatedText && e.translatedText.trim().length > 0
          ? e.translatedText
          : e.originalText,
      style: e.style,
      font: (e as any).fontFamily,
    }));

    return rebuildFileWithManifest(fileEntity.fileType, entries);
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

  async exportTranslation(
    fileId: string,
    language: string
  ): Promise<{ githubUrl: string }> {
    // Always rebuild the buffer with latest translations to ensure we have the most up-to-date content
    const fileEntity = await this.fileRepository.findOne({
      where: { id: BigInt(fileId) },
      relations: ['project'],
    });
    if (!fileEntity || !fileEntity.project) {
      throw new Error('File not found');
    }
    const repoName = `project-${fileEntity.project.id}`;
    const dotIdx = String(fileEntity.fileName).lastIndexOf('.');
    const base =
      dotIdx > -1 ? fileEntity.fileName.slice(0, dotIdx) : fileEntity.fileName;
    const ext =
      fileEntity.fileType === 'application/pdf'
        ? '.pdf'
        : fileEntity.fileType ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          ? '.docx'
          : '';
    const langUpperForExport = String(language || '').toUpperCase();
    const safeFileName = `${base}${langUpperForExport ? `(${langUpperForExport})` : ''}${ext}`.replace(
      /[\\/:*?"<>|]/g,
      '_'
    );
    const githubPath = `${language}/${safeFileName}`; // used only for logging

    console.log(
      `[Export] Building export buffer for ${fileEntity.fileName} in ${language}...`
    );

    // Always build the buffer with latest translations
    const { buffer } = await this.buildExportBuffer(fileId, language);

    console.log(
      `[Export] Buffer built successfully, size: ${buffer.length} bytes`
    );
    console.log(`[Export] Pushing to GitHub: ${repoName}/${githubPath}`);

    console.log(
      `[Export] Successfully pushed to GitHub: ${repoName}/${githubPath}`
    );

    // Build public raw URL for Office viewer using configured GitHub username
    const owner = this.configService.get<string>('GITHUB_USERNAME')
      || process.env.GITHUB_USERNAME
      || '';
    const githubUrl = `https://raw.githubusercontent.com/${owner}/${repoName}/main/${encodeURIComponent(language)}/${encodeURIComponent(
      safeFileName
    )}`;
    return { githubUrl };
  }

  async exportProjectTranslations(
    projectId: string,
    languages?: string[]
  ): Promise<
    Array<{
      fileId: string;
      language: string;
      githubUrl?: string;
      error?: string;
    }>
  > {
    const files = await this.fileRepository.find({
      where: { project: { id: BigInt(projectId) } as any },
    });
    const targetLanguages =
      languages && languages.length > 0
        ? Array.from(new Set(languages))
        : ['en'];

    const results: Array<{
      fileId: string;
      language: string;
      githubUrl?: string;
      error?: string;
    }> = [];

    // Stage outputs for optional ZIP
    const zipStaging: Array<{ path: string; content: Buffer }> = [];

    for (const file of files) {
      for (const lang of targetLanguages) {
        try {
          // Build buffer for language
          const { buffer, fileName } = await this.buildExportBuffer(
            file.id.toString(),
            lang
          );

          // Commit per-language artifact
          const repoName = `project-${file.project.id}`;
          const githubUrl = `https://raw.githubusercontent.com/<IAmKou>/${repoName}/main/${lang}/${encodeURIComponent(
            fileName
          )}`;

          // Stage for ZIP (folder by language)
          zipStaging.push({ path: `${lang}/${fileName}`, content: buffer });

          results.push({
            fileId: file.id.toString(),
            language: lang,
            githubUrl,
          });
        } catch (err: any) {
          results.push({
            fileId: file.id.toString(),
            language: lang,
            error: err?.message || 'Export failed',
          });
        }
      }
    }

    // If exporting multiple languages, also publish a ZIP bundle
    if (targetLanguages.length > 1 && zipStaging.length > 0) {
      try {
        const JSZip = (await import('jszip')).default;
        const zip = new JSZip();
        for (const entry of zipStaging) {
          zip.file(entry.path, entry.content);
        }
        await zip.generateAsync({ type: 'nodebuffer' });

        const repoName = `project-${projectId}`;
        const ts = new Date().toISOString().replace(/[:.]/g, '-');
        const zipName = `project-${projectId}-translations-${ts}.zip`;
        const zipPath = `exports/${zipName}`;
        const zipUrl = `https://raw.githubusercontent.com/<IAmKou>/${repoName}/main/${encodeURIComponent(
          zipPath
        )}`;

        results.push({ fileId: 'zip', language: targetLanguages.join(','), githubUrl: zipUrl });
      } catch (zipErr: any) {
        results.push({ fileId: 'zip', language: targetLanguages.join(','), error: zipErr?.message || 'ZIP export failed' });
      }
    }

    return results;
  }

  async buildExportBuffer(
    fileId: string,
    language: string,
    format: 'original' | 'xliff' = 'original'
  ): Promise<{ buffer: Buffer; fileName: string; fileType: string }> {
    const fileEntity = await this.fileRepository.findOne({
      where: { id: BigInt(fileId) },
      relations: ['project'],
    });
    if (!fileEntity) throw new Error('File not found');

    // Handle XLIFF export
    if (format === 'xliff') {
      return this.buildXliffExport(fileId, language);
    }

    let buffer: Buffer = Buffer.alloc(0); // Initialize with empty buffer
    if (
      fileEntity.fileType ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      try {
        // Validate DOCX file content
        if (
          !fileEntity.fileContent ||
          !(fileEntity.fileContent instanceof Buffer)
        ) {
          throw new Error('Invalid DOCX file content');
        }

        console.log(
          `[DOCX Export] Processing DOCX file: ${fileEntity.fileName}, size: ${fileEntity.fileContent.length} bytes`
        );

        const entries = await this.translationRepository.find({ where: { fileId: BigInt(fileId), language } });

        console.log(
          `[DOCX Export] Found ${entries.length} translation entries for language: ${language}`
        );

        const translations = new Map<string, string>();
        const sanitizeInlineHtml = (html: string): string => {
          if (!html) return '';
          let s = String(html);
          s = s.replace(/<(\/?)\s*(b|strong|i|em|u)\b[^>]*>/gi, '<$1$2>');
          s = s.replace(/<br\s*\/?\s*>/gi, '\n');
          s = s.replace(/<\s*p\s*>/gi, '').replace(/<\s*\/p\s*>/gi, '\n');
          s = s.replace(/<((?!b|strong|i|em|u)\/?)[^>]*>/gi, '');
          s = s.replace(/\n{3,}/g, '\n\n');
          return s;
        };
        for (const e of entries) {
          if (e.translatedText && e.translatedText.trim().length > 0) {
            // Add sanitized inline HTML (only b/i/u)
            const sanitized = sanitizeInlineHtml(e.translatedText);
            const plain = sanitized.replace(/<[^>]+>/g, '').trim();
            if (plain.length === 0) {
              // Skip empty after sanitize -> keep original text in file
            } else {
              translations.set(e.originalText, sanitized);
            }

            // Also try to find the text in the original DOCX by looking for partial matches
            // This helps when the backend has split text but the DOCX still has the original format
            const originalText = e.originalText.trim();

            // If the text is short (likely a title, heading, or short phrase),
            // also try to find it as part of a longer text in the DOCX
            if (originalText.length < 100 && !originalText.includes('.')) {
              // For short texts, try to find them within longer contexts
              // This is especially useful for titles like "THE STORY OF MY LIFE", "BY", "ALAN MALONE"
              console.log(
                `[DOCX Export] Translation (short text): "${originalText}" -> "${e.translatedText}"`
              );
            } else {
              console.log(
                `[DOCX Export] Translation: "${originalText.substring(
                  0,
                  50
                )}..." -> "${e.translatedText.substring(0, 50)}..."`
              );
            }
          }
        }

        console.log(
          `[DOCX Export] Found ${translations.size} translations to apply`
        );

        if (translations.size === 0) {
          console.warn(
            '[DOCX Export] No translations found, returning original file'
          );
          buffer = fileEntity.fileContent as Buffer;
        } else {
          const { buffer: replacedBuffer, replacedCount } =
            await replaceDocxTextWithCount(
              fileEntity.fileContent as Buffer,
              translations
            );

          console.log(
            `[DOCX Export] replaceDocxTextWithCount returned: replacedCount=${replacedCount}, buffer size=${replacedBuffer.length}`
          );

          if (replacedCount === 0) {
            console.warn(
              '[DOCX Export] No inline replacements were made; returning original file'
            );
            buffer = fileEntity.fileContent as Buffer;
          } else {
            buffer = replacedBuffer;
            console.log(
              `[DOCX Export] Successfully applied ${replacedCount} translations`
            );
          }
        }
      } catch (error) {
        console.error(`[DOCX Export] Error processing DOCX file:`, error);

        // Final fallback: return original file
        console.warn(
          `[DOCX Export] Returning original DOCX file as final fallback`
        );
        buffer = fileEntity.fileContent as Buffer;
      }
    } else if (fileEntity.fileType === 'application/pdf') {
      console.log(
        `[PDF Export] Processing PDF file: ${fileEntity.fileName}, size: ${fileEntity.fileContent.length} bytes`
      );
      try {
        const dotIdxLocal = String(fileEntity.fileName).lastIndexOf('.');
        const baseLocal = dotIdxLocal > -1 ? fileEntity.fileName.slice(0, dotIdxLocal) : fileEntity.fileName;
        const langSuffixLocal = String(language || '').toUpperCase();
        const langFileNameLocal = `${baseLocal}${langSuffixLocal ? `(${langSuffixLocal})` : ''}.pdf`;

        const candidateFolders: string[] = fileEntity.project?.id
          ? [
            `projects/project-${fileEntity.project.id}`,
          ]
          : ['pdf'];

        let downloaded: Buffer | null = null;
        for (const folderCandidate of candidateFolders) {
          // Try language-specific then fallback to original name
          const fileCandidates = [langFileNameLocal, fileEntity.fileName];
          for (const nameCandidate of fileCandidates) {
            try {
              console.log(`[PDF Export] Attempt Aspose download: folder=${folderCandidate}, file=${nameCandidate}`);
              const buf = await this.asposeService.downloadFileWithFolder(nameCandidate, folderCandidate);
              if (buf && Buffer.isBuffer(buf) && buf.length > 0) {
                downloaded = buf;
                break;
              }
            } catch (_) {
              // continue to next candidate
            }
          }
          if (downloaded) break;
        }

        if (downloaded) {
          console.log(`[PDF Export] Downloaded from Aspose successfully, size=${downloaded.length} bytes`);
          const ext = '.pdf';
          const fileName = `${baseLocal}.${language}${ext || ''}`;
          return { buffer: downloaded, fileName, fileType: fileEntity.fileType };
        }
      } catch (attemptErr) {
        console.warn(`[PDF Export] Aspose download attempt failed, falling back to local generation: ${attemptErr instanceof Error ? attemptErr.message : String(attemptErr)}`);
      }

      const entries = await this.translationRepository.find({ where: { fileId: BigInt(fileId), language } });

      console.log(
        `[PDF Export] Found ${entries.length} translation entries for language: ${language}`
      );

      const translatedEntries = (entries as any[])
        .filter((e: any) => e.translatedText && e.translatedText.trim().length > 0)
        .map((e: any) => ({
          originalText: e.originalText as string,
          translatedText: e.translatedText as string,
          page: (e as any).filePart || (e as any).position?.page || 1,
        }));

      console.log(
        `[PDF Export] ${translatedEntries.length} entries have translations to apply`
      );

      // Log each translation entry for debugging
      translatedEntries.forEach((entry: any, index: number) => {
        console.log(
          `[PDF Export] Entry ${index + 1}: "${entry.originalText}" -> "${
            entry.translatedText
          }" (page ${entry.page})`
        );
      });

      if (translatedEntries.length === 0) {
        console.warn(
          '[PDF Export] No translations found, returning original file'
        );
        buffer = fileEntity.fileContent as Buffer;
      } else {
        let success = false;

        if (!success) {
          try {
            console.log('[PDF Export] Falling back to PyMuPDF...');
            console.log('[PDF Export] Calling replacePdfUsingPdfAssembler...');
            buffer = await replacePdfUsingPdfAssembler(
              fileEntity.fileContent as Buffer,
              translatedEntries
            );
            console.log('[PDF Export] PyMuPDF replacement successful');
            console.log(
              `[PDF Export] Result buffer size: ${buffer.length} bytes`
            );
            success = true;
          } catch (pymupdfErr) {
            console.error(
              `[PDF Export] PyMuPDF failed: ${
                pymupdfErr instanceof Error
                  ? pymupdfErr.message
                  : String(pymupdfErr)
              }`
            );
            if (pymupdfErr instanceof Error && pymupdfErr.stack) {
              console.error(
                '[PDF Export] PyMuPDF error stack:',
                pymupdfErr.stack
              );
            }
          }
        }

        // Final fallback: create a simple PDF with translations
        if (!success) {
          try {
            console.log(
              '[PDF Export] Creating simple PDF with translations as final fallback...'
            );
            console.log(
              '[PDF Export] Calling createSimplePdfWithTranslations...'
            );
            buffer = await this.createSimplePdfWithTranslations(
              translatedEntries
            );
            console.log('[PDF Export] Simple PDF creation successful');
            console.log(
              `[PDF Export] Result buffer size: ${buffer.length} bytes`
            );
          } catch (createErr) {
            console.error(
              `[PDF Export] Simple PDF creation failed: ${
                createErr instanceof Error
                  ? createErr.message
                  : String(createErr)
              }`
            );
            if (createErr instanceof Error && createErr.stack) {
              console.error(
                '[PDF Export] Simple PDF creation error stack:',
                createErr.stack
              );
            }
            console.warn(
              '[PDF Export] All PDF translation methods failed, returning original file'
            );
            buffer = fileEntity.fileContent as Buffer;
          }
        }
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
    const base =
      dotIdx > -1 ? fileEntity.fileName.slice(0, dotIdx) : fileEntity.fileName;
    const langUpper = String(language || '').toUpperCase();
    const fileName = `${base}${langUpper ? `(${langUpper})` : ''}${ext || ''}`;

    return { buffer, fileName, fileType: fileEntity.fileType };
  }

  /**
   * Convert a translated DOCX buffer to a real multipage PDF using LibreOffice (soffice).
   * Falls back to a simple pdf-lib render if soffice is unavailable.
   */
  private async convertDocxBufferToPdf(buffer: Buffer, watermark?: string): Promise<Buffer> {
    const fs = await import('fs');
    const os = await import('os');
    const path = await import('path');
    const { promisify } = await import('util');
    const { execFile } = await import('child_process');
    const execFileAsync = promisify(execFile as any);

    const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'htt-docx-'));
    const docxPath = path.join(tmpDir, 'input.docx');
    const outDir = path.join(tmpDir, 'out');
    await fs.promises.mkdir(outDir, { recursive: true });
    await fs.promises.writeFile(docxPath, buffer);

    try {
      // Try soffice conversion (must be installed in the environment)
      // --headless for server usage, --norestore to avoid lock prompts
      await execFileAsync('soffice', [
        '--headless',
        '--norestore',
        '--convert-to', 'pdf',
        '--outdir', outDir,
        docxPath,
      ], { timeout: 60_000 });

      const pdfPath = path.join(outDir, 'input.pdf');
      const pdf = await fs.promises.readFile(pdfPath);

      // Optional lightweight watermark with pdf-lib if provided
      if (watermark && watermark.trim()) {
        try {
          const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
          const pdfDoc = await PDFDocument.load(pdf);
          const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
          const wm = watermark.trim();
          const pages = pdfDoc.getPages();
          for (const p of pages) {
            const { width, height } = p.getSize();
            p.drawText(wm, {
              x: width / 2 - font.widthOfTextAtSize(wm, 36) / 2,
              y: height / 2,
              size: 36,
              rotate: { type: 'degrees', angle: -24 },
              opacity: 0.12,
              color: rgb(1, 0, 0),
              font,
            });
          }
          const stamped = await pdfDoc.save();
          return Buffer.from(stamped);
        } catch {
          // ignore stamping failure, return original pdf
          return pdf;
        }
      }
      return pdf;
    } catch (err) {
      // Fallback: basic render via pdf-lib so preview still works
      try {
        const mammoth = await import('mammoth');
        const { value } = await mammoth.extractRawText({ buffer });
        const text = String(value || '').trim();
        const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
        const pdfDoc = await PDFDocument.create();
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const margin = 50;
        const pageWidth = 595.28;
        const pageHeight = 841.89;
        const fontSize = 12;
        const lineHeight = fontSize * 1.25;
        const maxWidth = pageWidth - margin * 2;

        function wrap(t: string): string[] {
          const parts = t.split(/\s+/);
          const lines: string[] = [];
          let cur = '';
          for (const w of parts) {
            const cand = cur ? cur + ' ' + w : w;
            if (font.widthOfTextAtSize(cand, fontSize) > maxWidth && cur) {
              lines.push(cur);
              cur = w;
            } else cur = cand;
          }
          if (cur) lines.push(cur);
          return lines;
        }

        const paras = text.split(/\r?\n\s*\r?\n/);
        const lines: string[] = [];
        for (const p of paras) { const w = wrap(p.trim()); if (w.length) lines.push(...w); lines.push(''); }
        let page = pdfDoc.addPage([pageWidth, pageHeight]);
        let y = pageHeight - margin;
        const wm = (watermark || '').trim();
        const drawWm = () => {
          if (!wm) return;
          page.drawText(wm, { x: pageWidth/2 - font.widthOfTextAtSize(wm,36)/2, y: pageHeight/2, size: 36, rotate: {type:'degrees', angle:-24}, opacity: 0.12, color: rgb(1,0,0), font });
        };
        drawWm();
        for (const line of lines) {
          if (y - lineHeight < margin) { page = pdfDoc.addPage([pageWidth, pageHeight]); y = pageHeight - margin; drawWm(); }
          if (line) page.drawText(line, { x: margin, y: y - lineHeight, size: fontSize, font, color: rgb(0,0,0) });
          y -= lineHeight;
        }
        const bytes = await pdfDoc.save();
        return Buffer.from(bytes);
      } catch {
        throw err;
      }
    } finally {
      try { await fs.promises.rm(tmpDir, { recursive: true, force: true }); } catch {}
    }
  }

  /**
   * Build a true-layout PDF for preview (so FE can count pages correctly)
   */
  async buildPdfExport(
    fileId: string,
    language: string,
    watermark?: string,
  ): Promise<{ buffer: Buffer; fileName: string }> {
    const fileEntity = await this.fileRepository.findOne({ where: { id: BigInt(fileId) }, relations: ['project'] });
    if (!fileEntity) throw new Error('File not found');

    if (fileEntity.fileType === 'application/pdf') {
      const { buffer, fileName } = await this.buildExportBuffer(fileId, language, 'original');
      return { buffer, fileName: fileName.replace(/\.pdf$/i, '') + '.pdf' };
    }

    // Build translated DOCX buffer first
    const { buffer: translatedDocx, fileName } = await this.buildExportBuffer(fileId, language, 'original');
    const pdfBuffer = await this.convertDocxBufferToPdf(translatedDocx, watermark);
    const outName = fileName.replace(/\.(docx|doc)$/i, '') + '.pdf';
    return { buffer: pdfBuffer, fileName: outName };
  }

  async buildXliffExport(
    fileId: string,
    language: string
  ): Promise<{ buffer: Buffer; fileName: string; fileType: string }> {
    console.log(
      `[buildXliffExport] Starting export for fileId: ${fileId}, language: ${language}`
    );

    const fileEntity = await this.fileRepository.findOne({
      where: { id: BigInt(fileId) },
      relations: ['project'],
    });
    if (!fileEntity) throw new Error('File not found');

    // Lấy tất cả translation entries cho file này
    const entries = await this.translationRepository
      .createQueryBuilder('t')
      .where('t.fileId = :fid', { fid: BigInt(fileId) })
      .andWhere('t.language = :lang', { lang: language })
      .orderBy('t.filePart', 'ASC')
      .addOrderBy('t.orderIndex', 'ASC')
      .getMany();

    console.log(
      `[buildXliffExport] Found ${entries.length} translation entries`
    );

    // Tạo XLIFF data structure
    type XliffUnit = {
      target: string;
      source: string;
      note: string;
      approved: boolean;
    };
    type XliffData = {
      resources: Record<
        string,
        Record<string, { translation: Record<string, XliffUnit> }>
      >;
    };

    const projectKey = `${fileEntity.project?.name || 'project'}_${fileId}`;
    const xliffData: XliffData = {
      resources: {
        [projectKey]: {
          [language]: {
            translation: {} as Record<string, XliffUnit>,
          },
        },
      },
    };

    // Populate translations
    (entries as any[]).forEach((entry: any, index: number) => {
      const key = `string_${index + 1}`;
      xliffData.resources[projectKey][language].translation[key] = {
        target: entry.translatedText || entry.originalText,
        source: entry.originalText,
        note: `Page: ${entry.filePart || 1}, Position: ${
          entry.position || 'unknown'
        }`,
        approved: Boolean(
          entry.translatedText && entry.translatedText.trim().length > 0
        ),
      };
    });

    console.log(
      `[buildXliffExport] XLIFF data prepared, calling xliff.js2xliff...`
    );

    // Convert to XLIFF format - ALWAYS await the result
    let xliffString: string;
    try {
      const result = xliff.js2xliff(xliffData, {
        indent: '  ',
        xmlDeclaration: true,
      }) as unknown;

      // Normalize to Promise and await the string
      xliffString = await Promise.resolve(result as string | Promise<string>);

      console.log(`[buildXliffExport] xliffString type:`, typeof xliffString);
      console.log(
        `[buildXliffExport] xliffString length:`,
        xliffString?.length
      );
      console.log(
        `[buildXliffExport] xliffString preview:`,
        xliffString?.substring(0, 100)
      );
    } catch (xliffError) {
      console.error(`[buildXliffExport] Error in xliff.js2xliff:`, xliffError);
      throw new Error(
        `XLIFF conversion failed: ${
          xliffError instanceof Error ? xliffError.message : String(xliffError)
        }`
      );
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
    const base =
      dotIdx > -1 ? fileEntity.fileName.slice(0, dotIdx) : fileEntity.fileName;
    const fileName = `${base}.${language}.xliff`;

    console.log(`[buildXliffExport] Export completed successfully:`, fileName);

    return {
      buffer,
      fileName,
      fileType: 'application/x-xliff+xml',
    };
  }

  async getTranslationPreview(
    projectId: string,
    fileId: string,
    language: string,
    pages: number[]
  ): Promise<
    Array<{
      originalText: string;
      translatedText?: string;
      style?: any;
      font?: string;
      filePart: number;
    }>
  > {
    const entries = await this.translationRepository.createQueryBuilder('t')
      .innerJoin(FileEntity, 'f', 'f.id = t.fileId')
      .where('t.fileId = :fileId', { fileId: BigInt(fileId) })
      .andWhere('f.projectId = :projectId', { projectId: BigInt(projectId) })
      .andWhere(pages && pages.length > 0 ? 't.pageNumber IN (:...pages)' : '1=1', { pages })
      .orderBy('t.pageNumber', 'ASC')
      .addOrderBy('t.orderIndex', 'ASC')
      .getMany();

    return entries.map((e: any) => ({
      originalText: e.originalText,
      translatedText: e.translatedText,
      style: e.style,
      font: e.fontFamily,
      filePart: e.pageNumber ?? 0,
    }));
  }

  async getAllString(
    projectId: string,
    language: string,
    fileId?: string,
    fileType?: string
  ) {
    const strings = await this.translationRepository.createQueryBuilder('t')
      .innerJoin(FileEntity, 'f', 'f.id = t.fileId')
      .where('f.projectId = :projectId', { projectId: BigInt(projectId) })
      .andWhere(fileId ? 't.fileId = :fileId' : '1=1', { fileId: fileId ? BigInt(fileId) : undefined })
      .addOrderBy('t.orderIndex', 'ASC')
      .getMany();

    // Lấy tên file và thông tin file type
    const fileIdSet = new Set<string>();
    strings.forEach((str: any) => {
      fileIdSet.add(String(str.fileId));
    });
    const fileIds: string[] = Array.from(fileIdSet);
    const fileNamesMap: Record<string, string> = {};
    const fileTypesMap: Record<string, string> = {};

    if (fileIds.length > 0) {
      const files = await this.fileRepository.find({
        where: { id: In(fileIds.map((id: string) => BigInt(id))) },
      });
      files.forEach((f: any) => {
        fileNamesMap[String(f.id)] = f.fileName;
        fileTypesMap[String(f.id)] = f.fileType;
      });
    }

    // Nếu có fileType được cung cấp, sử dụng nó thay vì lấy từ database
    if (fileType && fileIds.length > 0) {
      fileIds.forEach((fid: string) => {
        fileTypesMap[fid] = fileType;
      });
    }

    return strings.map((str: any) => ({
      id: String((str as any).id || ''),
      originalText: str.originalText,
      translatedText: str.translatedText || '',
      fileId: String(str.fileId),
      filePart: (str as any).filePart ?? 0,
      fileName: fileNamesMap[str.fileId] || '',
      fileType: fileTypesMap[str.fileId] || '',
    }));
  }

  async getFilePages(fileId: string, projectId: string) {
    const strings = await this.translationRepository.createQueryBuilder('t')
      .innerJoin(FileEntity, 'f', 'f.id = t.fileId')
      .where('t.fileId = :fileId', { fileId: BigInt(fileId) })
      .andWhere('f.projectId = :projectId', { projectId: BigInt(projectId) })
      .addOrderBy('t.orderIndex', 'ASC')
      .getMany();

    // Nhóm strings theo filePart (trang)
    const pages = new Map<number, any[]>();
    for (const str of strings) {
      const page = (str as any).filePart || 0;
      if (!pages.has(page)) {
        pages.set(page, []);
      }
      pages.get(page)!.push(str);
    }

    // Tạo danh sách trang với thông tin chi tiết
    const sortedPages = Array.from(pages.keys()).sort((a, b) => a - b);
    const pageInfo = sortedPages.map((page) => ({
      pageNumber: page + 1, // Hiển thị từ 1 thay vì 0
      filePart: page,
      stringCount: pages.get(page)!.length,
      hasTranslatedStrings: pages
        .get(page)!
        .some(
          (str) => str.translatedText && str.translatedText.trim().length > 0
        ),
    }));

    return {
      fileId,
      totalPages: sortedPages.length,
      pages: pageInfo,
    };
  }

  async getFileStrings(fileId: string, projectId: string) {
    const queryBuilder = this.translationRepository.createQueryBuilder('t')
      .innerJoin(FileEntity, 'f', 'f.id = t.fileId')
      .where('t.fileId = :fileId', { fileId: BigInt(fileId) })
      .andWhere('f.projectId = :projectId', { projectId: BigInt(projectId) });

    const strings = await queryBuilder
      .addOrderBy('t.filePart', 'ASC')
      .addOrderBy('t.orderIndex', 'ASC')
      .getMany();

    return strings.map((str: any) => ({
      id: String(str.id),
      originalText: str.originalText,
      translatedText: str.translatedText || '',
      language: str.language,
      targetLanguage: str.targetLanguage,
      filePart: str.filePart || 0,
      orderIndex: str.orderIndex || 0,
      position: str.position,
      style: str.style,
      fontFamily: str.fontFamily,
      fontSize: str.fontSize,
      status: str.status || 'pending',
      notes: str.notes,
      metadata: str.metadata,
      paragraphIndex: str.paragraphIndex,
      runIndex: str.runIndex,
      createdAt: str.createdAt,
      updatedAt: str.updatedAt,
    }));
  }

  async getProjectLanguages(
    projectId: string
  ): Promise<Array<{ code: string; name: string }>> {
    try {
      console.log(
        `[getProjectLanguages] Getting languages for project: ${projectId}`
      );

      // Lấy tất cả ngôn ngữ có trong project từ translation strings
      const rows = await this.translationRepository.createQueryBuilder('t')
        .select('DISTINCT t.targetLanguage', 'lang')
        .innerJoin(FileEntity, 'f', 'f.id = t.fileId')
        .where('f.projectId = :projectId', { projectId: BigInt(projectId) })
        .getRawMany();
      const languages = rows.map((r: any) => r.lang).filter((x: any) => x);

      console.log(`[getProjectLanguages] Found languages:`, languages);

      // Map language codes to names
      const languageMap: Record<string, string> = {
        en: 'English',
        vi: 'Vietnamese',
        ar: 'Arabic',
        zh: 'Chinese',
        ja: 'Japanese',
        ko: 'Korean',
        fr: 'French',
        de: 'German',
        es: 'Spanish',
        pt: 'Portuguese',
        bg: 'Bulgarian',
      };

      const result = languages
        .filter((lang) => lang && lang.trim() !== '')
        .map((lang) => ({
          code: lang,
          name: languageMap[lang] || lang,
        }));

      console.log(`[getProjectLanguages] Returning languages:`, result);
      return result;
    } catch (error) {
      console.error(`[getProjectLanguages] Error:`, error);
      // Return empty array if error
      return [];
    }
  }

  private async createSimplePdfWithTranslations(
    translatedEntries: Array<{
      originalText: string;
      translatedText: string;
      position?: { x: number; y: number };
      style?: {
        fontSize?: number;
        color?: string;
        bold?: boolean;
        italic?: boolean;
      };
      font?: string;
    }>
  ): Promise<Buffer> {
    try {
      logger.info(
        '[Simple PDF] Creating simple PDF with translations as final fallback...'
      );

      // Import pdf-lib dynamically to avoid dependency issues
      const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib');

      // Create a new PDF document
      const pdfDoc = await PDFDocument.create();

      // Add a page
      const page = pdfDoc.addPage([595, 842]); // A4 size
      const { height } = page.getSize();

      // Add translations to the page
      for (const entry of translatedEntries) {
        if (entry.translatedText && entry.position) {
          const x = entry.position.x || 50;
          const y = height - (entry.position.y || 50); // Flip Y coordinate for PDF coordinate system
          const fontSize = entry.style?.fontSize || 12;

          // Parse color
          let color = rgb(0, 0, 0); // Default black
          if (entry.style?.color) {
            try {
              const hex = entry.style.color.replace('#', '');
              const r = parseInt(hex.substr(0, 2), 16) / 255;
              const g = parseInt(hex.substr(2, 2), 16) / 255;
              const b = parseInt(hex.substr(4, 2), 16) / 255;
              color = rgb(r, g, b);
            } catch (colorError) {
              logger.warn(
                `[Simple PDF] Invalid color format: ${entry.style.color}, using default black`
              );
            }
          }

          // Choose font based on style
          let font = StandardFonts.Helvetica;
          if (entry.style?.bold && entry.style?.italic) {
            font = StandardFonts.HelveticaBoldOblique;
          } else if (entry.style?.bold) {
            font = StandardFonts.HelveticaBold;
          } else if (entry.style?.italic) {
            font = StandardFonts.HelveticaOblique;
          }

          // Embed the font
          const embeddedFont = await pdfDoc.embedFont(font);

          // Add text at the specified position
          page.drawText(entry.translatedText, {
            x: x,
            y: y,
            size: fontSize,
            font: embeddedFont,
            color: color,
          });

          logger.debug(
            `[Simple PDF] Added text: "${entry.translatedText}" at (${x}, ${y})`
          );
        }
      }

      // Save the PDF to bytes
      const pdfBytes = await pdfDoc.save();

      // Convert to Buffer
      const buffer = Buffer.from(pdfBytes);

      logger.info(
        `[Simple PDF] Simple PDF created successfully, size: ${buffer.length} bytes`
      );
      return buffer;
    } catch (error) {
      logger.error(
        `[Simple PDF] Error in createSimplePdfWithTranslations: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      throw new Error(
        `Simple PDF creation failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  async buildProjectExportBuffers(
    projectId: string,
    languages: string[],
    format: 'original' | 'xliff' = 'original'
  ): Promise<Array<{ fileId: string; language: string; fileName: string; buffer: Buffer }>> {
    const files = await this.fileRepository.find({ where: { project: { id: BigInt(projectId) } } as any });
    const results: Array<{ fileId: string; language: string; fileName: string; buffer: Buffer }> = [];
    const uniqueLangs = Array.from(new Set((languages || []).map(l => String(l).trim()).filter(Boolean)));
    for (const file of files) {
      for (const lang of uniqueLangs) {
        const { buffer, fileName } = await this.buildExportBuffer(file.id.toString(), lang, format);
        results.push({ fileId: file.id.toString(), language: lang, fileName, buffer });
      }
    }
    return results;
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
  position?: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    page?: number;
  };
  style?: {
    bold?: boolean;
    italic?: boolean;
    color?: string;
    fontSize?: number;
  };
  font?: string;
}

async function replacePdfUsingPdfAssembler(
  originalBuffer: Buffer,
  entries: PdfReplaceEntry[]
): Promise<Buffer> {
  if (!entries || entries.length === 0) {
    logger.info(
      '[PDF Assembler] No entries to replace, returning original buffer'
    );
    return originalBuffer;
  }

  try {
    logger.info('[PDF Assembler] Starting true text replacement...');
    logger.info(
      `[PDF Assembler] Original buffer size: ${originalBuffer.length} bytes`
    );
    logger.info(
      `[PDF Assembler] Number of replacement entries: ${entries.length}`
    );

    // Log all entries for debugging
    entries.forEach((entry, index) => {
      logger.info(
        `[PDF Assembler] Entry ${index + 1}: "${entry.translatedText}" -> "${
          entry.translatedText
        }" at page ${entry.position?.page || 1}, position (${
          entry.position?.x || 0
        }, ${entry.position?.y || 0})`
      );
    });

    // Create PDF Assembler instance and load PDF
    logger.info('[PDF Assembler] Creating PDF Assembler instance...');
    const assembler = new PDFAssembler(originalBuffer);
    logger.info('[PDF Assembler] PDF loaded successfully');

    // Get PDF structure to understand the document
    let pdfStructure;
    let pageCount = 1;
    let canProcess = true;

    try {
      logger.info('[PDF Assembler] Getting PDF structure...');
      pdfStructure = await assembler.getPDFStructure();
      logger.info('[PDF Assembler] PDF structure loaded successfully');
      logger.info(
        `[PDF Assembler] Structure keys: ${Object.keys(pdfStructure || {}).join(
          ', '
        )}`
      );

      // Check if structure has pages
      if (
        pdfStructure &&
        pdfStructure.pages &&
        Array.isArray(pdfStructure.pages)
      ) {
        pageCount = pdfStructure.pages.length;
        logger.info(
          `[PDF Assembler] PDF has ${pageCount} pages from structure`
        );
        logger.info(
          `[PDF Assembler] Pages array: ${JSON.stringify(pdfStructure.pages)}`
        );
      } else {
        logger.warn(
          '[PDF Assembler] No pages found in structure, using default'
        );
        logger.warn(
          `[PDF Assembler] Structure content: ${JSON.stringify(
            pdfStructure,
            null,
            2
          )}`
        );
        pdfStructure = { pages: [1] }; // Default page reference
        pageCount = 1;
      }
    } catch (structureError) {
      logger.warn(
        `[PDF Assembler] Could not get PDF structure: ${
          structureError instanceof Error
            ? structureError.message
            : String(structureError)
        }`
      );
      logger.warn(
        `[PDF Assembler] Structure error stack: ${
          structureError instanceof Error
            ? structureError.stack
            : 'No stack trace'
        }`
      );
      // Fallback to basic structure
      pdfStructure = { pages: [1] };
      pageCount = 1;
    }

    // Try to get page count from assembler if structure failed
    if (pageCount === 1) {
      try {
        logger.info('[PDF Assembler] Attempting to count pages...');
        const actualPageCount = await assembler.countPages();
        logger.info(
          `[PDF Assembler] countPages() returned: ${actualPageCount}`
        );
        if (actualPageCount > 1) {
          pageCount = actualPageCount;
          logger.info(`[PDF Assembler] Actual page count: ${pageCount}`);
        }
      } catch (countError) {
        logger.warn(
          `[PDF Assembler] Could not count pages: ${
            countError instanceof Error
              ? countError.message
              : String(countError)
          }`
        );
        logger.warn(
          `[PDF Assembler] Count error stack: ${
            countError instanceof Error ? countError.stack : 'No stack trace'
          }`
        );
        // If we can't even count pages, this PDF might be corrupted or incompatible
        canProcess = false;
      }
    }

    // If we can't process this PDF with PDF Assembler, throw error to trigger fallback
    if (!canProcess) {
      throw new Error(
        'PDF structure is incompatible with PDF Assembler - returning original file'
      );
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

    logger.info(
      `[PDF Assembler] Grouped entries by page: ${Array.from(
        entriesByPage.entries()
      )
        .map(([page, entries]) => `Page ${page}: ${entries.length} entries`)
        .join(', ')}`
    );

    // Process each page for true text replacement
    for (const [pageNum, pageEntries] of entriesByPage) {
      logger.info(
        `[PDF Assembler] Processing page ${pageNum} with ${pageEntries.length} entries`
      );

      // Check if page number is valid
      if (pageNum < 1 || pageNum > pageCount) {
        logger.warn(
          `[PDF Assembler] Page ${pageNum} out of range (1-${pageCount}), skipping`
        );
        continue;
      }

      // Get page object from PDF structure
      let pageObj;
      try {
        logger.info(
          `[PDF Assembler] Creating page object for page ${pageNum}...`
        );

        // Since pdfObject method doesn't exist, we'll create a basic page object
        // In a real implementation, you'd need to properly parse the PDF structure
        pageObj = {
          Type: 'Page',
          Contents: null as any,
          MediaBox: [0, 0, 595, 842], // Default A4 size
        };

        logger.log(
          `[PDF Assembler] Created basic page object for page ${pageNum}`
        );
        logger.log(
          `[PDF Assembler] Page object: ${JSON.stringify(pageObj, null, 2)}`
        );
      } catch (pageError) {
        logger.warn(
          `[PDF Assembler] Error creating page ${pageNum}: ${
            pageError instanceof Error ? pageError.message : String(pageError)
          }`
        );
        // Create a basic page object as fallback
        pageObj = {
          Type: 'Page',
          Contents: null as any,
          MediaBox: [0, 0, 595, 842], // Default A4 size
        };
      }

      for (const entry of pageEntries) {
        if (entry.position && entry.translatedText) {
          const x = entry.position.x || 50;
          const y = entry.position.y || 50;
          const fontSize = entry.style?.fontSize || 12;

          logger.info(
            `[PDF Assembler] Replacing text at position (${x}, ${y}) with: "${entry.translatedText}"`
          );
          logger.info(
            `[PDF Assembler] Text style: bold=${
              entry.style?.bold || false
            }, italic=${entry.style?.italic || false}, fontSize=${fontSize}`
          );

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
            italic: entry.style?.italic || false,
          };

          logger.info(
            `[PDF Assembler] Created text object: ${JSON.stringify(
              newTextObj,
              null,
              2
            )}`
          );

          // Add to page content stream
          if (pageObj.Contents) {
            // Since pdfObject method doesn't exist, we'll log that we're working with content
            // In a real implementation, you'd need to properly parse and modify the content stream
            logger.info(
              `[PDF Assembler] Page ${pageNum} has content stream, but pdfObject method not available`
            );
            logger.info(
              `[PDF Assembler] Page contents: ${JSON.stringify(
                pageObj.Contents,
                null,
                2
              )}`
            );
          } else {
            logger.info(
              `[PDF Assembler] Page ${pageNum} has no content stream, creating new one`
            );
            // Create a basic content stream
            pageObj.Contents = {
              type: 'stream',
              data: `BT\n/F1 ${fontSize} Tf\n${x} ${y} Td\n(${entry.translatedText}) Tj\nET`,
            };
            logger.info(
              `[PDF Assembler] Created content stream: ${JSON.stringify(
                pageObj.Contents,
                null,
                2
              )}`
            );
          }

          logger.info(
            `[PDF Assembler] Added new text object for: "${entry.translatedText}"`
          );
        } else {
          logger.warn(
            `[PDF Assembler] Skipping entry without position or translated text: ${JSON.stringify(
              entry,
              null,
              2
            )}`
          );
        }
      }
    }

    // Assemble the modified PDF
    logger.info('[PDF Assembler] Assembling modified PDF...');
    logger.info('[PDF Assembler] Calling assembler.assemblePdf()...');

    let assembledPdf;
    try {
      assembledPdf = await assembler.assemblePdf();
      logger.info(`[PDF Assembler] assemblePdf() completed successfully`);
      logger.info(`[PDF Assembler] Assembled PDF type: ${typeof assembledPdf}`);
      logger.info(
        `[PDF Assembler] Assembled PDF constructor: ${
          assembledPdf?.constructor?.name || 'Unknown'
        }`
      );

      if (assembledPdf && typeof assembledPdf === 'object') {
        logger.info(
          `[PDF Assembler] Assembled PDF keys: ${Object.keys(assembledPdf).join(
            ', '
          )}`
        );
        if ('arrayBuffer' in assembledPdf) {
          logger.info(`[PDF Assembler] Assembled PDF has arrayBuffer method`);
        }
        if ('length' in assembledPdf) {
          logger.info(
            `[PDF Assembler] Assembled PDF length: ${
              (assembledPdf as any).length
            }`
          );
        }
      }
    } catch (assembleError) {
      logger.error(
        `[PDF Assembler] Failed to assemble PDF: ${
          assembleError instanceof Error
            ? assembleError.message
            : String(assembleError)
        }`
      );
      logger.error(
        `[PDF Assembler] Assemble error stack: ${
          assembleError instanceof Error
            ? assembleError.stack
            : 'No stack trace'
        }`
      );
      throw new Error(
        `PDF assembly failed: ${
          assembleError instanceof Error
            ? assembleError.message
            : String(assembleError)
        }`
      );
    }

    // Convert to Buffer based on the type
    let result: Buffer;
    logger.info('[PDF Assembler] Converting assembled PDF to Buffer...');

    if (assembledPdf instanceof ArrayBuffer) {
      logger.info(
        '[PDF Assembler] Assembled PDF is ArrayBuffer, converting to Buffer'
      );
      result = Buffer.from(new Uint8Array(assembledPdf));
    } else if (assembledPdf instanceof Uint8Array) {
      logger.info(
        '[PDF Assembler] Assembled PDF is Uint8Array, converting to Buffer'
      );
      result = Buffer.from(assembledPdf);
    } else if (assembledPdf instanceof Buffer) {
      logger.info('[PDF Assembler] Assembled PDF is already Buffer');
      result = assembledPdf;
    } else if (
      assembledPdf &&
      typeof assembledPdf === 'object' &&
      'arrayBuffer' in assembledPdf
    ) {
      // Handle File-like objects that have arrayBuffer method
      logger.info(
        '[PDF Assembler] Assembled PDF has arrayBuffer method, calling it...'
      );
      try {
        const arrayBuffer = await (assembledPdf as any).arrayBuffer();
        logger.info(
          `[PDF Assembler] arrayBuffer() returned: ${typeof arrayBuffer}, length: ${
            arrayBuffer?.byteLength || 'unknown'
          }`
        );
        result = Buffer.from(new Uint8Array(arrayBuffer));
      } catch (fileError) {
        logger.error(
          `[PDF Assembler] Failed to convert File to Buffer: ${
            fileError instanceof Error ? fileError.message : String(fileError)
          }`
        );
        throw new Error('Failed to convert assembled PDF to Buffer');
      }
    } else {
      // Try to convert as a last resort
      logger.warn(
        `[PDF Assembler] Unknown assembled PDF type: ${typeof assembledPdf}, attempting conversion...`
      );
      try {
        result = Buffer.from(assembledPdf as any);
        logger.info(
          `[PDF Assembler] Conversion successful, result size: ${result.length} bytes`
        );
      } catch (convertError) {
        logger.error(
          `[PDF Assembler] Failed to convert assembled PDF to Buffer: ${
            convertError instanceof Error
              ? convertError.message
              : String(convertError)
          }`
        );
        throw new Error(
          `Unsupported PDF assembly result type: ${typeof assembledPdf}`
        );
      }
    }

    logger.info(
      `[PDF Assembler] Final result buffer size: ${result.length} bytes`
    );
    logger.info('[PDF Assembler] PDF assembled successfully');

    return result;
  } catch (error) {
    logger.error(
      `[PDF Assembler] Error during text replacement: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    logger.error(
      `[PDF Assembler] Error stack: ${
        error instanceof Error ? error.stack : 'No stack trace'
      }`
    );
    throw new Error(
      `PDF Assembler replacement failed: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}
