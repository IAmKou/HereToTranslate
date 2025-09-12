import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TranslationEntity } from '#LocalProject/Entities';
import * as JSZip from 'jszip';
import * as xml2js from 'xml2js';
import * as fs from 'fs';

interface DocxSegment {
  text: string;
  fontFamily?: string;
  fontSize?: number;
  style?: {
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
  };
}

interface DocxExtractionResult {
  segments: DocxSegment[];
}

interface FontInfo {
  family?: string;
  size?: number;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
}

interface SRXRule {
  pattern: RegExp;
  isBreak: boolean;
}

@Injectable()
export class DocxEditorService {
  private readonly logger = new Logger(DocxEditorService.name);
  private readonly srxRules: SRXRule[] = [
    // Common sentence endings
    { pattern: /[.!?]+\s+(?=[A-Z])/g, isBreak: true },
    // Abbreviations that should NOT break
    { pattern: /\b(?:Mr|Mrs|Ms|Dr|Prof|Inc|Ltd|Co|Corp|etc|vs|e\.g|i\.e)\.\s+/gi, isBreak: false },
    // Numbers with decimals
    { pattern: /\d+\.\d+/g, isBreak: false },
    // Ellipsis
    { pattern: /\.{3}/g, isBreak: false },
    // URLs and emails
    { pattern: /\b\w+\.\w+/g, isBreak: false },
  ];

  constructor(
    @InjectRepository(TranslationEntity)
    private readonly translationRepo: Repository<TranslationEntity>,
  ) {}

  private async parseDocxWithJSZip(buffer: Buffer): Promise<{ documentXml: string; stylesXml?: string }> {
    try {
      const zip = await JSZip.loadAsync(buffer);
      
      // Extract main document content
      const documentFile = zip.file('word/document.xml');
      if (!documentFile) {
        throw new Error('word/document.xml not found in DOCX file');
      }
      const documentXml = await documentFile.async('text');
      
      // Extract styles (optional)
      let stylesXml: string | undefined;
      const stylesFile = zip.file('word/styles.xml');
      if (stylesFile) {
        stylesXml = await stylesFile.async('text');
      }
      
      return { documentXml, stylesXml };
    } catch (error) {
      this.logger.error(`Failed to parse DOCX with JSZip: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  private async parseXmlToObject(xmlString: string): Promise<any> {
    try {
      const parser = new xml2js.Parser({ explicitArray: false, mergeAttrs: true });
      return await parser.parseStringPromise(xmlString);
    } catch (error) {
      this.logger.error(`Failed to parse XML: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  private extractFontInfoFromRun(run: any): FontInfo {
    const fontInfo: FontInfo = {};
    
    if (run['w:rPr']) {
      const runProps = run['w:rPr'];
      
      // Extract font family (w:rFonts)
      if (runProps['w:rFonts']) {
        fontInfo.family = runProps['w:rFonts']['w:ascii'] || runProps['w:rFonts']['w:hAnsi'];
      }
      
      // Extract font size (w:sz) - size is in half-points
      if (runProps['w:sz']) {
        const sizeValue = runProps['w:sz']['w:val'] || runProps['w:sz'];
        fontInfo.size = parseInt(sizeValue) / 2; // Convert half-points to points
      }
      
      // Extract formatting
      fontInfo.bold = !!runProps['w:b'];
      fontInfo.italic = !!runProps['w:i'];
      fontInfo.underline = !!runProps['w:u'];
    }
    
    return fontInfo;
  }

  private segmentTextBySRX(text: string): string[] {
    if (!text || text.trim().length === 0) return [];
    
    let segments: string[] = [];
    let currentText = text.trim();
    
    // Apply SRX rules for sentence segmentation
    const sentences: string[] = [];
    let lastIndex = 0;
    
    // Find sentence boundaries
    const sentencePattern = /[.!?]+\s+/g;
    let match;
    
    while ((match = sentencePattern.exec(currentText)) !== null) {
      const beforeMatch = currentText.substring(lastIndex, match.index + match[0].length);
      
      // Check if this should NOT be a break based on abbreviation rules
      let shouldBreak = true;
      for (const rule of this.srxRules) {
        if (!rule.isBreak) {
          rule.pattern.lastIndex = 0; // Reset regex
          if (rule.pattern.test(beforeMatch)) {
            shouldBreak = false;
            break;
          }
        }
      }
      
      if (shouldBreak) {
        const sentence = currentText.substring(lastIndex, match.index + match[0].length).trim();
        if (sentence) {
          sentences.push(sentence);
          lastIndex = match.index + match[0].length;
        }
      }
    }
    
    // Add remaining text as last sentence
    const remaining = currentText.substring(lastIndex).trim();
    if (remaining) {
      sentences.push(remaining);
    }
    
    return sentences.length > 0 ? sentences : [currentText];
  }

  async extractTextFromBuffer(buffer: Buffer): Promise<string> {
    try {
      const { documentXml } = await this.parseDocxWithJSZip(buffer);
      const docObject = await this.parseXmlToObject(documentXml);
      
      let text = '';
      const body = docObject['w:document']['w:body'];
      
      if (body && body['w:p']) {
        const paragraphs = Array.isArray(body['w:p']) ? body['w:p'] : [body['w:p']];
        
        for (const paragraph of paragraphs) {
          if (paragraph['w:r']) {
            const runs = Array.isArray(paragraph['w:r']) ? paragraph['w:r'] : [paragraph['w:r']];
            for (const run of runs) {
              if (run['w:t']) {
                text += run['w:t'];
              }
            }
          }
          text += '\n';
        }
      }
      
      return text.trim();
    } catch (error) {
      this.logger.error(`Failed to extract text from buffer: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  async extractDocxContentFromBuffer(buffer: Buffer): Promise<DocxExtractionResult> {
    try {
      this.logger.log('Starting DOCX content extraction from buffer using JSZip');

      // === Step 1: Parse DOCX with JSZip ===
      const { documentXml, stylesXml } = await this.parseDocxWithJSZip(buffer);
      
      // === Step 2: Parse XML to objects ===
      const docObject = await this.parseXmlToObject(documentXml);
      let stylesObject: any = null;
      if (stylesXml) {
        stylesObject = await this.parseXmlToObject(stylesXml);
      }

      // === Step 3: Extract segments with font information ===
      const segments: DocxSegment[] = [];
      const body = docObject['w:document']['w:body'];
      
      if (body && body['w:p']) {
        const paragraphs = Array.isArray(body['w:p']) ? body['w:p'] : [body['w:p']];
        
        for (const paragraph of paragraphs) {
          let paragraphText = '';
          let paragraphFontInfo: FontInfo = {};
          
          // Extract text and font info from runs
          if (paragraph['w:r']) {
            const runs = Array.isArray(paragraph['w:r']) ? paragraph['w:r'] : [paragraph['w:r']];
            
            for (const run of runs) {
              if (run['w:t']) {
                const runText = typeof run['w:t'] === 'string' ? run['w:t'] : run['w:t']['_'] || '';
                paragraphText += runText;
                
                // Get font info from this run (use first run's font info for the paragraph)
                if (Object.keys(paragraphFontInfo).length === 0) {
                  paragraphFontInfo = this.extractFontInfoFromRun(run);
                }
              }
            }
          }
          
          // Skip empty paragraphs
          if (!paragraphText.trim()) continue;
          
          // === Step 4: Apply SRX sentence segmentation ===
          const sentences = this.segmentTextBySRX(paragraphText);
          
          for (const sentence of sentences) {
            if (sentence.trim()) {
              segments.push({
                text: sentence.trim(),
                fontFamily: paragraphFontInfo.family || 'Calibri',
                fontSize: paragraphFontInfo.size || 11,
                style: {
                  bold: paragraphFontInfo.bold || false,
                  italic: paragraphFontInfo.italic || false,
                  underline: paragraphFontInfo.underline || false,
                },
              });
            }
          }
        }
      }

      this.logger.log(`Extracted ${segments.length} sentence segments from DOCX buffer`);

      return { segments };
    } catch (error) {
      this.logger.error(`Failed to extract DOCX content: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  async storeTranslationSegments(
    fileId: bigint,
    projectId: bigint,
    targetLanguage: string,
    extraction: DocxExtractionResult,
    requestId?: string,
  ): Promise<void> {
    try {
      this.logger.log(`Storing ${extraction.segments.length} translation segments for file ${fileId}`);
      
      // Delete existing segments for this file
      await this.translationRepo.delete({ fileId } as any);
      
      // Create new translation entities
      const entities: TranslationEntity[] = [];
      
      for (let i = 0; i < extraction.segments.length; i++) {
        const segment = extraction.segments[i];
        
        const entity = new TranslationEntity();
        entity.projectId = projectId;
        entity.requestId = requestId || null;
        entity.fileId = fileId;
        entity.originalText = segment.text;
        entity.language = 'AUTO';
        entity.targetLanguage = targetLanguage;
        entity.fontFamily = segment.fontFamily || 'Calibri';
        entity.fontSize = segment.fontSize as any;
        entity.style = segment.style || {};
        entity.orderIndex = i;
        entity.status = 'pending';
        
        entities.push(entity);
      }
      
      // Save all entities
      await this.translationRepo.save(entities);
      
      this.logger.log(`Successfully stored ${entities.length} translation segments`);
    } catch (error) {
      this.logger.error(`Failed to store translation segments: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  async extractAndSegmentWithPages(
    fileName: string,
    fileId: bigint,
    language = 'en',
  ): Promise<void> {
    try {
      // Read file from disk
      const filePath = `./uploads/${fileName}`;
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found at ${filePath}`);
      }

      const buffer = fs.readFileSync(filePath);
      const extraction = await this.extractDocxContentFromBuffer(buffer);
      
      // Store segments in database
      await this.storeTranslationSegments(fileId, BigInt(1), language, extraction);
      
      this.logger.log(`✅ Extracted ${extraction.segments.length} segments with page mapping.`);
    } catch (error) {
      this.logger.error(`Failed to extract and segment: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
}
