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
    // Abbreviations that should NOT break (more comprehensive list)
    { pattern: /\b(?:Mr|Mrs|Ms|Dr|Prof|Inc|Ltd|Co|Corp|etc|vs|e\.g|i\.e|Ph\.D|M\.D|B\.A|M\.A|U\.S|U\.K|U\.N|St|Ave|Blvd|Rd|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec|Mon|Tue|Wed|Thu|Fri|Sat|Sun|a\.m|p\.m|A\.M|P\.M|No|vol|pp|cf|ibid|op\.cit|et\.al|viz|ca|approx|max|min|est|govt|dept|assn|bros|corp|ltd|inc|mfg|mgr|acct|admin|asst|atty|bldg|co|dist|div|est|exec|gen|govt|info|intl|jr|sr|ltd|mfg|mgmt|natl|org|pkg|pres|prof|pub|pvt|qty|ref|rept|rev|sec|secy|supt|tech|tel|temp|univ|vol|vs|wk|yr)\.\s*/gi, isBreak: false },
    // Numbers with decimals, percentages, currency
    { pattern: /\d+\.\d+/g, isBreak: false },
    { pattern: /\d+\.\d+%/g, isBreak: false },
    { pattern: /\$\d+\.\d+/g, isBreak: false },
    // Ellipsis and multiple dots
    { pattern: /\.{2,}/g, isBreak: false },
    // URLs, emails, and file extensions
    { pattern: /\b\w+\.\w+@\w+/g, isBreak: false },
    { pattern: /https?:\/\/[^\s]+/g, isBreak: false },
    { pattern: /\b\w+\.(com|org|net|edu|gov|mil|int|co|uk|de|fr|jp|cn|ru|br|in|au|ca)\b/gi, isBreak: false },
    { pattern: /\b\w+\.(pdf|doc|docx|txt|html|htm|xml|csv|xls|xlsx|ppt|pptx|jpg|jpeg|png|gif|mp3|mp4|avi|mov|zip|rar|tar|gz)\b/gi, isBreak: false },
    // Version numbers and codes
    { pattern: /v\d+\.\d+/gi, isBreak: false },
    { pattern: /\b\d+\.\d+\.\d+/g, isBreak: false },
    // Initials
    { pattern: /\b[A-Z]\.[A-Z]\./g, isBreak: false },
    { pattern: /\b[A-Z]\.\s+[A-Z]\./g, isBreak: false },
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
    
    let currentText = text.trim();
    
    // First, split by obvious paragraph breaks (double newlines, tabs, etc.)
    const paragraphs = currentText.split(/\n\s*\n|\t+/).filter(p => p.trim());
    
    const allSentences: string[] = [];
    
    for (const paragraph of paragraphs) {
      const sentences = this.segmentParagraph(paragraph.trim());
      allSentences.push(...sentences);
    }
    
    return allSentences.length > 0 ? allSentences : [currentText];
  }

  private segmentParagraph(text: string): string[] {
    if (!text || text.trim().length === 0) return [];
    
    const sentences: string[] = [];
    let currentText = text.trim();
    
    // Enhanced sentence boundary patterns
    const boundaryPatterns = [
      // Standard sentence endings with space and capital letter
      /([.!?]+)\s+(?=[A-Z])/g,
      // Sentence endings with quotes
      /([.!?]+["'])\s+(?=[A-Z])/g,
      // Sentence endings with parentheses
      /([.!?]+\))\s+(?=[A-Z])/g,
      // Colon followed by capital letter (for lists, explanations)
      /(:\s*)(?=[A-Z][^:]*[.!?])/g,
      // Semicolon in certain contexts
      /(;\s*)(?=[A-Z])/g,
      // Line breaks with capital letters
      /(\n+)\s*(?=[A-Z])/g,
    ];
    
    let breakPoints: Array<{index: number, length: number}> = [];
    
    // Find all potential break points
    for (const pattern of boundaryPatterns) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(currentText)) !== null) {
        const fullMatch = match[0];
        const breakIndex = match.index + match[1].length;
        
        // Check if this break point should be ignored based on abbreviation rules
        const contextBefore = currentText.substring(Math.max(0, match.index - 20), match.index + fullMatch.length);
        let shouldIgnore = false;
        
        for (const rule of this.srxRules) {
          if (!rule.isBreak) {
            rule.pattern.lastIndex = 0;
            if (rule.pattern.test(contextBefore)) {
              shouldIgnore = true;
              break;
            }
          }
        }
        
        if (!shouldIgnore) {
          breakPoints.push({
            index: breakIndex,
            length: fullMatch.length - match[1].length
          });
        }
      }
    }
    
    // Sort break points by index
    breakPoints.sort((a, b) => a.index - b.index);
    
    // Remove overlapping break points
    const filteredBreakPoints: Array<{index: number, length: number}> = [];
    for (let i = 0; i < breakPoints.length; i++) {
      const current = breakPoints[i];
      const next = breakPoints[i + 1];
      
      if (!next || current.index + current.length <= next.index) {
        filteredBreakPoints.push(current);
      }
    }
    
    // Split text at break points
    let lastIndex = 0;
    for (const breakPoint of filteredBreakPoints) {
      const sentence = currentText.substring(lastIndex, breakPoint.index).trim();
      if (sentence && sentence.length > 1) {
        sentences.push(sentence);
      }
      lastIndex = breakPoint.index + breakPoint.length;
    }
    
    // Add remaining text
    const remaining = currentText.substring(lastIndex).trim();
    if (remaining && remaining.length > 1) {
      sentences.push(remaining);
    }
    
    // If no sentences were found, return the original text
    if (sentences.length === 0) {
      return [currentText];
    }
    
    // Post-process: merge very short segments with adjacent ones
    return this.postProcessSentences(sentences);
  }

  private postProcessSentences(sentences: string[]): string[] {
    const processed: string[] = [];
    
    for (let i = 0; i < sentences.length; i++) {
      const current = sentences[i].trim();
      
      // Skip empty sentences
      if (!current) continue;
      
      // If sentence is very short (likely a fragment), try to merge with previous or next
      if (current.length < 10 && !current.match(/[.!?]$/)) {
        if (processed.length > 0) {
          // Merge with previous sentence
          processed[processed.length - 1] += ' ' + current;
        } else if (i + 1 < sentences.length) {
          // Merge with next sentence
          sentences[i + 1] = current + ' ' + sentences[i + 1];
        } else {
          // Keep as is if it's the only sentence
          processed.push(current);
        }
      } else {
        processed.push(current);
      }
    }
    
    return processed.filter(s => s.trim().length > 0);
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
      
      // Check for existing segments first
      const existingSegments = await this.translationRepo.find({ 
        where: { fileId } as any 
      });
      
      if (existingSegments.length > 0) {
        this.logger.log(`Found ${existingSegments.length} existing segments, updating instead of creating duplicates`);
        
        // Update existing segments instead of deleting and recreating
        for (let i = 0; i < extraction.segments.length && i < existingSegments.length; i++) {
          const segment = extraction.segments[i];
          const existing = existingSegments[i];
          
          existing.originalText = segment.text;
          existing.fontFamily = segment.fontFamily || 'Calibri';
          existing.fontSize = segment.fontSize as any;
          existing.style = segment.style || {};
          existing.orderIndex = i;
          // Keep existing translatedText if it exists
        }
        
        // Save updated entities
        await this.translationRepo.save(existingSegments.slice(0, extraction.segments.length));
        
        // If there are more new segments than existing ones, create the additional ones
        if (extraction.segments.length > existingSegments.length) {
          const newEntities: TranslationEntity[] = [];
          for (let i = existingSegments.length; i < extraction.segments.length; i++) {
            const segment = extraction.segments[i];
            
            const entity = new TranslationEntity();
            entity.projectId = projectId;
            entity.requestId = requestId || null;
            entity.fileId = fileId;
            entity.originalText = segment.text;
            entity.language = targetLanguage;
            entity.fontFamily = segment.fontFamily || 'Calibri';
            entity.fontSize = segment.fontSize as any;
            entity.style = segment.style || {};
            entity.orderIndex = i;
            entity.status = 'pending';
            
            newEntities.push(entity);
          }
          await this.translationRepo.save(newEntities);
        }
        
        // If there are fewer new segments than existing ones, remove the extra ones
        if (extraction.segments.length < existingSegments.length) {
          const toRemove = existingSegments.slice(extraction.segments.length);
          await this.translationRepo.remove(toRemove);
        }
      } else {
        // No existing segments, create new ones
      const entities: TranslationEntity[] = [];
      
      for (let i = 0; i < extraction.segments.length; i++) {
        const segment = extraction.segments[i];
        
        const entity = new TranslationEntity();
        entity.projectId = projectId;
        entity.requestId = requestId || null;
        entity.fileId = fileId;
        entity.originalText = segment.text;
          entity.language = targetLanguage;
        entity.fontFamily = segment.fontFamily || 'Calibri';
        entity.fontSize = segment.fontSize as any;
        entity.style = segment.style || {};
        entity.orderIndex = i;
        entity.status = 'pending';
        
        entities.push(entity);
      }
      
      // Save all entities
      await this.translationRepo.save(entities);
      }
      
      this.logger.log(`Successfully processed ${extraction.segments.length} translation segments`);
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
