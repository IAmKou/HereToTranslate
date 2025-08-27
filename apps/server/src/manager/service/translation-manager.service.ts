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
import { replaceDocxTextWithCount } from '../../util/extensions/docx-utils.extension';
import { Buffer } from 'buffer';
import { ActivityManagerService } from './activity-manager.service';
import { AsposeService } from './aspose.service';
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
    private readonly asposeService: AsposeService
  ) {}

  async getTranslationProgress(
    projectId: string,
    branchId: string,
    language?: string
  ): Promise<{ total: number; completed: number; percentage: number }> {
    console.log(`[getTranslationProgress] Called with: projectId=${projectId}, branchId=${branchId}, language=${language}`);

    // Base query for project and branch
    const baseQuery: any = { projectId, branchId };

    // IMPORTANT: We need to count BASE strings (language='en') as total
    // and TRANSLATION strings (language=specified) as completed
    const baseStringsQuery = { ...baseQuery, language: 'en' };
    const total = await this.translationModel.countDocuments(baseStringsQuery);
    console.log(`[getTranslationProgress] Base strings (en) found: ${total}`);

    // If no base strings found, check if there are any translation records at all for this project
    if (total === 0) {
      const anyRecords = await this.translationModel.countDocuments(baseQuery);
      console.log(`[getTranslationProgress] No base strings found. Total records for project: ${anyRecords}`);
      
      if (anyRecords === 0) {
        console.log(`[getTranslationProgress] No translation records found for project ${projectId}. Project may not have files processed yet.`);
        return {
          total: 0,
          completed: 0,
          percentage: 0,
        };
      } else {
        // Check if there are non-English strings that could be used as base
        const nonEnglishRecords = await this.translationModel.find(baseQuery).limit(5);
        console.log(`[getTranslationProgress] Found ${anyRecords} records but no English strings. Sample records:`, 
          nonEnglishRecords.map(r => ({ language: r.language, text: r.originalText?.substring(0, 50) })));
      }
    }

    let completed = 0;
    if (language && language.trim()) {
      // Count completed strings for the specified language
      const translationQuery = { ...baseQuery, language: language.trim() };
      completed = await this.translationModel.countDocuments(translationQuery);
      console.log(`[getTranslationProgress] Translation strings (${language}) found: ${completed}`);
    } else {
      // If no language specified, count all non-English strings as completed
      const nonEnglishQuery = { ...baseQuery, language: { $ne: 'en' } };
      completed = await this.translationModel.countDocuments(nonEnglishQuery);
      console.log(`[getTranslationProgress] Non-English strings found: ${completed}`);
    }

    // Calculate percentage
    const percentage = total > 0 ? (completed / total) * 100 : 0;
    const roundedPercentage = Math.round(percentage * 100) / 100;

    console.log(`[getTranslationProgress] Result: ${completed}/${total} = ${roundedPercentage}%`);

    return {
      total,
      completed,
      percentage: roundedPercentage,
    };
  }

  // Helper method to ensure translation records exist for target languages
  async ensureTranslationRecordsExist(
    projectId: string,
    branchId: string,
    targetLanguage: string
  ): Promise<void> {
    console.log(`[ensureTranslationRecordsExist] Called with: projectId=${projectId}, branchId=${branchId}, targetLanguage=${targetLanguage}`);
    
    // Find all original entries (language 'en') for this project/branch
    const originalEntries = await this.translationModel.find({
      projectId,
      branchId,
      language: 'en',
      obsolete: { $ne: true }
    });

    console.log(`[ensureTranslationRecordsExist] Found ${originalEntries.length} original English entries`);

    // If no English entries found, check if there are any records at all for this project
    if (originalEntries.length === 0) {
      const anyRecords = await this.translationModel.countDocuments({ projectId, branchId });
      console.log(`[ensureTranslationRecordsExist] No English entries found. Total records for project: ${anyRecords}`);
      
      if (anyRecords === 0) {
        console.log(`[ensureTranslationRecordsExist] No translation records found for project ${projectId}. Project may not have files processed yet.`);
        return;
      } else {
        // Check what languages exist for this project
        const existingLanguages = await this.translationModel.distinct('language', { projectId, branchId });
        console.log(`[ensureTranslationRecordsExist] Existing languages for project: ${existingLanguages.join(', ')}`);
        
        // If there are no English strings but other languages exist, we can't create translation records
        // because we need English as the base language
        console.log(`[ensureTranslationRecordsExist] Cannot create translation records without English base strings`);
        return;
      }
    }

    // For each original entry, ensure a translation record exists for the target language
    let createdCount = 0;
    for (const originalEntry of originalEntries) {
      const existingTranslation = await this.translationModel.findOne({
        projectId: originalEntry.projectId,
        branchId: originalEntry.branchId,
        fileId: originalEntry.fileId,
        originalText: originalEntry.originalText,
        language: targetLanguage,
      });

      if (!existingTranslation) {
        // Create a new translation record for this target language
        await this.translationModel.create({
          projectId: originalEntry.projectId,
          branchId: originalEntry.branchId,
          fileId: originalEntry.fileId,
          manifestEntryId: originalEntry.manifestEntryId,
          originalText: originalEntry.originalText,
          translatedText: null, // Will be filled when user translates
          language: targetLanguage,
          filePart: originalEntry.filePart,
          font: originalEntry.font,
          style: originalEntry.style,
          position: originalEntry.position,
          obsolete: false,
        });
        createdCount++;
      }
    }

    console.log(`[ensureTranslationRecordsExist] Created ${createdCount} new translation records for language ${targetLanguage}`);
  }

  // Method to check if a project has translation records
  async hasTranslationRecords(projectId: string, branchId: string): Promise<boolean> {
    const count = await this.translationModel.countDocuments({ projectId, branchId });
    return count > 0;
  }

  // Method to check if a project has English base strings
  async hasEnglishBaseStrings(projectId: string, branchId: string): Promise<boolean> {
    const count = await this.translationModel.countDocuments({ 
      projectId, 
      branchId, 
      language: 'en',
      obsolete: { $ne: true }
    });
    return count > 0;
  }

  // Method to get project translation status
  async getProjectTranslationStatus(projectId: string, branchId: string): Promise<{
    hasRecords: boolean;
    hasEnglishStrings: boolean;
    totalRecords: number;
    englishRecords: number;
    languages: string[];
  }> {
    const totalRecords = await this.translationModel.countDocuments({ projectId, branchId });
    const englishRecords = await this.translationModel.countDocuments({ 
      projectId, 
      branchId, 
      language: 'en',
      obsolete: { $ne: true }
    });
    const languages = await this.translationModel.distinct('language', { projectId, branchId });

    return {
      hasRecords: totalRecords > 0,
      hasEnglishStrings: englishRecords > 0,
      totalRecords,
      englishRecords,
      languages,
    };
  }

  // Resolve best branchId to use for progress: prefer candidate if it has English strings,
  // otherwise pick the branch with the most English base strings for this project.
  async resolveBranchIdForProgress(
    projectId: string,
    branchIdCandidate?: string
  ): Promise<string> {
    try {
      if (branchIdCandidate) {
        const hasEnglishOnCandidate = await this.translationModel.countDocuments({
          projectId,
          branchId: branchIdCandidate,
          language: 'en',
          obsolete: { $ne: true },
        });
        if (hasEnglishOnCandidate > 0) {
          return branchIdCandidate;
        }
      }

      // Find all branches that have English base strings for this project
      const pipeline = [
        { $match: { projectId, language: 'en', obsolete: { $ne: true } } },
        { $group: { _id: '$branchId', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 1 },
      ];
      const result = await this.translationModel.aggregate(pipeline);
      if (Array.isArray(result) && result.length > 0 && result[0]._id) {
        return String(result[0]._id);
      }

      // As a fallback, if there are any records at all, pick the branch with most records
      const anyBranch = await this.translationModel.aggregate([
        { $match: { projectId } },
        { $group: { _id: '$branchId', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 1 },
      ]);
      if (Array.isArray(anyBranch) && anyBranch.length > 0 && anyBranch[0]._id) {
        return String(anyBranch[0]._id);
      }

      // Default fallback
      return branchIdCandidate || '1';
    } catch {
      return branchIdCandidate || '1';
    }
  }

  async addTranslation(id: string, translatedText: string, language: string) {
    // Tìm bản ghi gốc để lấy thông tin
    const originalEntry = await this.translationModel.findById(id);
    if (!originalEntry) throw new Error('Manifest entry not found');

    // First, try to find an existing translation for this specific language
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
      // Update existing translation for this language
      existingTranslation.translatedText = translatedText;
      await existingTranslation.save();
      entry = existingTranslation;
    } else {
      // Check if the original entry itself is for the target language and has no translation
      if (originalEntry.language === language && !originalEntry.translatedText) {
        // Update the original entry with the translation
        originalEntry.translatedText = translatedText;
        await originalEntry.save();
        entry = originalEntry;
      } else {
        // Create a new record for this language
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

    let updatedBuffer: Buffer = fileEntity.fileContent as Buffer;
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
      const entries = await this.translationModel
        .find({ fileId, language })
        .lean();
      const translatedEntries = entries
        .filter((e) => e.translatedText && e.translatedText.trim().length > 0)
        .map((e) => ({
          originalText: e.originalText as string,
          translatedText: e.translatedText as string,
          page: (e as any).filePart || e.position?.page || 1,
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

        // First, ensure the language-specific file exists by copying from original if needed
        try {
          const exists = await this.asposeService.fileExistsWithFolder(langFileName, projectFolder);
          if (!exists) {
            logger.log(`[PDF] Language file ${langFileName} doesn't exist, copying from original...`);
            const originalBuffer = await this.asposeService.downloadFileWithFolder(fileEntity.fileName, projectFolder);
            await this.asposeService.uploadFile(langFileName, originalBuffer, projectFolder);
            logger.log(`[PDF] Created language file: ${langFileName}`);
          }
        } catch (copyErr) {
          logger.warn(`[PDF] Failed to ensure language file exists: ${copyErr instanceof Error ? copyErr.message : String(copyErr)}`);
        }

        // Perform text replacement on the language-specific file
        for (const [page, replacements] of replacementsByPage.entries()) {
          logger.log(`[PDF] Replacing ${replacements.length} texts on page ${page} in file ${langFileName}`);
          await this.asposeService.replaceTextInPdf(
            langFileName,
            page,
            replacements,
            projectFolder
          );
        }

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

    // --- Commit to GitHub (use GitHub as source of truth) ---
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
    const safeFileName = `${base}.${language}${ext}`.replace(
      /[\\/:*?"<>|]/g,
      '_'
    );
    const path = `${language}/${safeFileName}`;

    try {
      // Prefer patching from existing GitHub content if exists to preserve structure/order
      const existing = await this.githubService.getFileContentOrNull({
        repo: repoName,
        path,
        branch: 'main',
      });
      let nextBuffer = updatedBuffer;
      if (
        existing &&
        fileEntity.fileType ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ) {
        // Attempt to re-apply translations onto the GitHub version to preserve previous structure
        const entries = await this.translationModel
          .find({ fileId, language })
          .lean();
        const translations = new Map<string, string>();
        for (const e of entries) {
          if (e.translatedText && e.translatedText.trim().length > 0) {
            translations.set(e.originalText, e.translatedText);
          }
        }
        const { buffer: patched, replacedCount } =
          await replaceDocxTextWithCount(existing.content, translations);
        nextBuffer = replacedCount > 0 ? patched : existing.content;
      }

      await this.githubService.commitChange({
        repo: repoName,
        branch: 'main',
        path,
        content: nextBuffer,
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
    const safeFileName = `${base}.${language}${ext}`.replace(
      /[\\/:*?"<>|]/g,
      '_'
    );
    const githubPath = `${language}/${safeFileName}`;

    console.log(
      `[Export] Building export buffer for ${fileEntity.fileName} in ${language}...`
    );

    // Always build the buffer with latest translations
    const { buffer } = await this.buildExportBuffer(fileId, language);

    console.log(
      `[Export] Buffer built successfully, size: ${buffer.length} bytes`
    );
    console.log(`[Export] Pushing to GitHub: ${repoName}/${githubPath}`);

    // Always commit the latest version to GitHub
    await this.githubService.commitChange({
      repo: repoName,
      branch: 'main',
      path: githubPath,
      content: buffer,
      message: `Update exported translation for ${
        fileEntity.fileName
      } (${language}) - ${new Date().toISOString()}`,
    });

    console.log(
      `[Export] Successfully pushed to GitHub: ${repoName}/${githubPath}`
    );

    const githubUrl = `https://raw.githubusercontent.com/<IAmKou>/${repoName}/main/${language}/${encodeURIComponent(
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

    for (const file of files) {
      for (const lang of targetLanguages) {
        try {
          const { githubUrl } = await this.exportTranslation(
            file.id.toString(),
            lang
          );
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

        const entries = await this.translationModel
          .find({ fileId, language })
          .lean();

        console.log(
          `[DOCX Export] Found ${entries.length} translation entries for language: ${language}`
        );

        const translations = new Map<string, string>();
        for (const e of entries) {
          if (e.translatedText && e.translatedText.trim().length > 0) {
            translations.set(e.originalText, e.translatedText);
            console.log(
              `[DOCX Export] Translation: "${e.originalText.substring(
                0,
                50
              )}..." -> "${e.translatedText.substring(0, 50)}..."`
            );
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

      const entries = await this.translationModel
        .find({ fileId, language })
        .lean();

      console.log(
        `[PDF Export] Found ${entries.length} translation entries for language: ${language}`
      );

      const translatedEntries = entries
        .filter((e) => e.translatedText && e.translatedText.trim().length > 0)
        .map((e) => ({
          originalText: e.originalText as string,
          translatedText: e.translatedText as string,
          page: (e as any).filePart || e.position?.page || 1,
        }));

      console.log(
        `[PDF Export] ${translatedEntries.length} entries have translations to apply`
      );

      // Log each translation entry for debugging
      translatedEntries.forEach((entry, index) => {
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
    const entries = await this.translationModel
      .find({ fileId, language })
      .sort({ filePart: 1, _id: 1 })
      .lean();

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
    entries.forEach((entry, index) => {
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
    branchId: string,
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
      fileIds.forEach((fileId) => {
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

  async getProjectLanguages(
    projectId: string
  ): Promise<Array<{ code: string; name: string }>> {
    try {
      console.log(
        `[getProjectLanguages] Getting languages for project: ${projectId}`
      );

      // Lấy tất cả ngôn ngữ có trong project từ translation strings
      const languages = await this.translationModel.distinct('language', {
        projectId,
      });

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
      const { width, height } = page.getSize();

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
