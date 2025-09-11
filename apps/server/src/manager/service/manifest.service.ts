import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FileEntity, TranslationEntity } from '#LocalProject/Entities';
import { DocxEditorService } from './docx-editor.service';

@Injectable()
export class ManifestService {
  private readonly logger = new Logger(ManifestService.name);

  constructor(
    @InjectRepository(TranslationEntity)
    private readonly translationRepository: Repository<TranslationEntity>,
    private readonly docxEditorService: DocxEditorService
  ) {}

  async generateManifest(file: FileEntity): Promise<void> {
    this.logger.log(
      `[EXTRACT_STRINGS] Starting generateManifest for file: ${
        file?.fileName || 'unknown'
      }`
    );

    if (!file) {
      this.logger.error(
        '[EXTRACT_STRINGS] No file provided to generateManifest'
      );
      return;
    }

    const buffer = file.fileContent;
    if (!buffer || !Buffer.isBuffer(buffer)) {
      this.logger.error(
        `[EXTRACT_STRINGS] Invalid file content for file: ${
          file?.fileName
        }. Buffer exists: ${!!buffer}, Is Buffer: ${Buffer.isBuffer(buffer)}`
      );
      return;
    }

    this.logger.log(
      `[EXTRACT_STRINGS] File buffer size: ${buffer.length} bytes for file: ${file?.fileName}`
    );

    // Extract primitive segments by file type
    const segments: Array<{
      text: string;
      pageNumber: number;
      orderIndex: number;
      fontFamily?: string;
      fontSize?: number;
      style?: Record<string, any>;
      position?: {
        x: number;
        y: number;
        width?: number;
        height?: number;
        page?: number;
      } | null;
    }> = [];

    const fileType = String(file.fileType || '').toLowerCase();
    const fileName = String(file.fileName || '');
    let orderIndex = 0;

    this.logger.log(
      `[EXTRACT_STRINGS] File type: ${fileType}, File name: ${fileName}`
    );

    try {
      if (fileType.includes('json')) {
        this.logger.log('[EXTRACT_STRINGS] Processing JSON file');
        const jsonText = buffer.toString('utf8');
        this.logger.log(
          `[EXTRACT_STRINGS] JSON text length: ${jsonText.length}`
        );

        if (jsonText.trim().length === 0) {
          this.logger.warn('[EXTRACT_STRINGS] JSON file is empty');
          return;
        }

        try {
          const parsed = JSON.parse(jsonText);
          const flat = flattenJsonToStrings(parsed);
          this.logger.log(
            `[EXTRACT_STRINGS] Flattened JSON strings count: ${flat.length}`
          );
          for (const line of flat) {
            if (String(line).trim()) {
              segments.push({
                text: String(line),
                pageNumber: 1,
                orderIndex: orderIndex++,
              });
            }
          }
          this.logger.log(
            `[EXTRACT_STRINGS] JSON segments extracted: ${segments.length}`
          );
        } catch (jsonError) {
          this.logger.warn(
            `[EXTRACT_STRINGS] JSON parsing failed: ${
              jsonError instanceof Error ? jsonError.message : String(jsonError)
            }. Falling back to text extraction.`
          );
          const lines = jsonText.split(/\r?\n/);
          lines.forEach((line) => {
            if (line.trim())
              segments.push({
                text: line.trim(),
                pageNumber: 1,
                orderIndex: orderIndex++,
              });
          });
          this.logger.log(
            `[EXTRACT_STRINGS] JSON fallback segments extracted: ${segments.length}`
          );
        }
      } else if (
        fileType.includes('text') ||
        fileType.includes('plain') ||
        fileName.toLowerCase().endsWith('.txt')
      ) {
        this.logger.log('[EXTRACT_STRINGS] Processing text/plain file');
        const text = buffer.toString('utf8');
        this.logger.log(
          `[EXTRACT_STRINGS] Text content length: ${text.length}`
        );

        if (text.trim().length === 0) {
          this.logger.warn('[EXTRACT_STRINGS] Text file is empty');
          return;
        }

        const lines = text.split(/\r?\n/);
        this.logger.log(`[EXTRACT_STRINGS] Split into ${lines.length} lines`);
        lines.forEach((line) => {
          if (line.trim())
            segments.push({
              text: line.trim(),
              pageNumber: 1,
              orderIndex: orderIndex++,
            });
        });
        this.logger.log(
          `[EXTRACT_STRINGS] Text segments extracted: ${segments.length}`
        );
      } else if (
        fileType.includes('wordprocessingml.document') ||
        fileName.toLowerCase().endsWith('.docx')
      ) {
        this.logger.log('[EXTRACT_STRINGS] Processing DOCX file');
        try {
          this.logger.log(
            `[EXTRACT_STRINGS] Processing DOCX buffer directly, size: ${buffer.length} bytes`
          );

          // Extract content using docx-editor service directly from buffer
          const extractionResult =
            await this.docxEditorService.extractDocxContentFromBuffer(buffer);

          this.logger.log(
            `[EXTRACT_STRINGS] DOCX segments extracted via docx-editor service: ${extractionResult.segments.length}`
          );

          // Convert extracted segments to manifest format
          for (const segment of extractionResult.segments) {
            segments.push({
              text: segment.text,
              pageNumber: segment.pageNumber,
              orderIndex: orderIndex++,
              fontFamily: segment.fontFamily,
              fontSize: segment.fontSize,
              style: segment.style,
              position: segment.position,
            });
          }

          this.logger.log(
            `[EXTRACT_STRINGS] DOCX segments processed: ${segments.length}`
          );
        } catch (docxError) {
          this.logger.warn(
            `[EXTRACT_STRINGS] DocxEditor extraction failed: ${
              docxError instanceof Error ? docxError.message : String(docxError)
            }`
          );
          this.logger.warn(
            `[EXTRACT_STRINGS] Falling back to Mammoth for DOCX text extraction.`
          );
          try {
            const mammoth = require('mammoth');
            const { value } = await mammoth.extractRawText({ buffer });
            const lines = value.split(/\r?\n/);
            for (const line of lines) {
              if (line.trim()) {
                segments.push({
                  text: line.trim(),
                  pageNumber: 1,
                  orderIndex: orderIndex++,
                });
              }
            }
            this.logger.log(
              `[EXTRACT_STRINGS] DOCX segments extracted via Mammoth fallback: ${segments.length}`
            );
          } catch (mammothError) {
            this.logger.error(
              `[EXTRACT_STRINGS] Mammoth fallback also failed: ${
                mammothError instanceof Error
                  ? mammothError.message
                  : String(mammothError)
              }`
            );
            const text = buffer.toString('utf8');
            const lines = text.split(/\r?\n/);
            for (const line of lines)
              if (line.trim())
                segments.push({
                  text: line.trim(),
                  pageNumber: 1,
                  orderIndex: orderIndex++,
                });
          }
          this.logger.log(
            `[EXTRACT_STRINGS] DOCX segments extracted via fallback: ${segments.length}`
          );
        }
      } else {
        this.logger.log(
          '[EXTRACT_STRINGS] Processing file with generic fallback (UTF8 text)'
        );
        // Generic fallback: treat as utf8 text
        const text = buffer.toString('utf8');
        this.logger.log(
          `[EXTRACT_STRINGS] Generic fallback text length: ${text.length}`
        );
        const lines = text.split(/\r?\n/);
        this.logger.log(
          `[EXTRACT_STRINGS] Generic fallback split into ${lines.length} lines`
        );
        for (const line of lines)
          if (line.trim())
            segments.push({
              text: line.trim(),
              pageNumber: 1,
              orderIndex: orderIndex++,
            });
        this.logger.log(
          `[EXTRACT_STRINGS] Generic fallback segments extracted: ${segments.length}`
        );
      }
    } catch (parseError) {
      this.logger.error(
        `[EXTRACT_STRINGS] Parsing failed for file ${fileName}: ${
          parseError instanceof Error ? parseError.message : String(parseError)
        }`
      );
      this.logger.error(
        `[EXTRACT_STRINGS] Parse error stack: ${
          parseError instanceof Error ? parseError.stack : 'No stack available'
        }`
      );
    }

    // Safety limit to avoid excessive memory/DB usage
    const MAX_SEGMENTS = 10000;
    if (segments.length > MAX_SEGMENTS) {
      this.logger.warn(
        `[EXTRACT_STRINGS] Segment count ${segments.length} exceeds limit ${MAX_SEGMENTS}. Truncating.`
      );
      segments.length = MAX_SEGMENTS;
    }

    this.logger.log(
      `[EXTRACT_STRINGS] Total segments extracted: ${segments.length}`
    );

    // SQL-only: remove any previous extracted segments for this file
    const toBigInt = (v: any): bigint | null => {
      try {
        if (v === null || v === undefined) return null;
        return typeof v === 'bigint' ? v : BigInt(v);
      } catch {
        return null;
      }
    };

    const fileIdBig: bigint | null = toBigInt(file.id);
    const requestIdBig: bigint | null = toBigInt(file.request?.id);
    const projectIdBig: bigint | null = toBigInt(file.project?.id);
    const targetLang = file.request?.targetLanguages?.[0] || 'en';

    this.logger.log(
      `[EXTRACT_STRINGS] File metadata - ID: ${fileIdBig}, RequestID: ${requestIdBig}, ProjectID: ${projectIdBig}, TargetLang: ${targetLang}`
    );

    if (typeof fileIdBig === 'bigint') {
      this.logger.log(
        `[EXTRACT_STRINGS] Deleting existing translation entries for fileId: ${fileIdBig}`
      );
      const deleteResult = await this.translationRepository.delete({
        fileId: fileIdBig,
      } as any);
      this.logger.log(
        `[EXTRACT_STRINGS] Deleted ${
          deleteResult.affected || 0
        } existing entries`
      );

      // Ensure we have a valid projectId - this is required by the entity
      if (!projectIdBig || typeof projectIdBig !== 'bigint') {
        this.logger.error(
          `[EXTRACT_STRINGS] Missing or invalid projectId: ${projectIdBig}. Cannot create translation entities without a valid project.`
        );
        throw new Error(
          'Project ID is required for creating translation entries'
        );
      }

      // Ensure we have a valid requestId - use null if no request
      const validRequestId =
        requestIdBig && typeof requestIdBig === 'bigint' ? requestIdBig : null;

      this.logger.log(
        `[EXTRACT_STRINGS] Saving ${segments.length} new translation entities with projectId: ${projectIdBig}, requestId: ${validRequestId}`
      );
      let savedCount = 0;
      for (const s of segments) {
        try {
          const entity = new TranslationEntity();
          entity.projectId = projectIdBig!;
          entity.requestId = validRequestId ? validRequestId.toString() : null;
          entity.fileId = fileIdBig!;
          entity.originalText = s.text;
          entity.language = 'AUTO';
          entity.targetLanguage = targetLang;
          entity.pageNumber = s.pageNumber;
          entity.fontFamily = s.fontFamily || 'default';
          entity.fontSize = s.fontSize as any;
          entity.style = s.style || {};
          entity.position = s.position as any;
          entity.orderIndex = s.orderIndex;
          entity.status = 'pending';

          const savedEntity = await this.translationRepository.save(entity);
          savedCount++;

          if (savedCount <= 5) {
            this.logger.log(
              `[EXTRACT_STRINGS] Sample saved entity ${savedCount}: ID=${
                savedEntity.id
              }, Text="${s.text.substring(0, 50)}${
                s.text.length > 50 ? '...' : ''
              }"`
            );
          }
        } catch (saveError) {
          this.logger.error(
            `[EXTRACT_STRINGS] Failed to save segment "${s.text.substring(
              0,
              50
            )}": ${
              saveError instanceof Error ? saveError.message : String(saveError)
            }`
          );
          this.logger.error(
            `[EXTRACT_STRINGS] Save error details: ${
              saveError instanceof Error
                ? saveError.stack
                : 'No stack available'
            }`
          );
        }
      }
      this.logger.log(
        `[EXTRACT_STRINGS] Successfully saved ${savedCount}/${segments.length} translation entities`
      );
    } else {
      this.logger.error(
        `[EXTRACT_STRINGS] Invalid fileId type: ${typeof fileIdBig}, value: ${fileIdBig}`
      );
    }

    this.logger.log(
      `[EXTRACT_STRINGS] generateManifest completed for file: ${fileName}`
    );
  }
}

function flattenJsonToStrings(value: any, prefix = ''): string[] {
  const out: string[] = [];
  if (value == null) return out;
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    out.push(String(value));
    return out;
  }
  if (Array.isArray(value)) {
    value.forEach((v, i) => {
      out.push(...flattenJsonToStrings(v, `${prefix}[${i}]`));
    });
    return out;
  }
  if (typeof value === 'object') {
    Object.keys(value).forEach((k) => {
      out.push(
        ...flattenJsonToStrings(value[k], prefix ? `${prefix}.${k}` : k)
      );
    });
    return out;
  }
  return out;
}
