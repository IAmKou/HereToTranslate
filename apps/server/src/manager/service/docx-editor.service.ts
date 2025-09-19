import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TranslationEntity } from '#LocalProject/Entities';
import * as JSZip from 'jszip';
import * as xml2js from 'xml2js';
import * as fs from 'fs';

interface Run {
  text: string;
  fontInfo: {
    family?: string;
    size?: number;
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    color?: string;
  };
}

interface DocxSegment {
  text: string;
  fontFamily?: string;
  fontSize?: number;
  style?: {
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
  };
  runs?: Run[]; // Store original runs for hybrid approach
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

  private extractTextFromRun(run: any): string {
    let text = '';
    
    // Skip image elements (w:drawing, w:pict)
    if (run['w:drawing'] || run['w:pict']) {
      return '';
    }
    
    // Extract text from w:t elements - handle both single and multiple elements
    if (run['w:t']) {
      if (Array.isArray(run['w:t'])) {
        // Multiple w:t elements in the same run
        for (const textElement of run['w:t']) {
          if (typeof textElement === 'string') {
            text += textElement;
          } else if (textElement['_']) {
            text += textElement['_'];
          } else if (typeof textElement === 'object' && textElement.toString) {
            text += textElement.toString();
          }
        }
      } else {
        // Single w:t element
        if (typeof run['w:t'] === 'string') {
          text += run['w:t'];
        } else if (run['w:t']['_']) {
          text += run['w:t']['_'];
        } else if (typeof run['w:t'] === 'object' && run['w:t'].toString) {
          text += run['w:t'].toString();
        }
      }
    }
    
    // Handle tab characters
    if (run['w:tab']) {
      text += '\t';
    }
    
    // Handle line breaks
    if (run['w:br']) {
      text += '\n';
    }
    
    return text;
  }

  private extractTextFromParagraph(paragraph: any): { text: string; fontInfo: FontInfo; runs: Run[] } {
    let paragraphText = '';
    let paragraphFontInfo: FontInfo = {};
    const runs: Run[] = [];
    
    if (paragraph['w:r']) {
      const docxRuns = Array.isArray(paragraph['w:r']) ? paragraph['w:r'] : [paragraph['w:r']];
      
      for (const run of docxRuns) {
        const runText = this.extractTextFromRun(run);
        const runFontInfo = this.extractFontInfoFromRun(run);
        
        paragraphText += runText;
        
        // Store each run with its styling
        if (runText) {
          runs.push({
            text: runText,
            fontInfo: runFontInfo
          });
        }
        
        // Get font info from first non-empty run for backward compatibility
        if (runText && Object.keys(paragraphFontInfo).length === 0) {
          paragraphFontInfo = runFontInfo;
        }
      }
    }
    
    return { text: paragraphText, fontInfo: paragraphFontInfo, runs };
  }

  private extractTextFromTable(table: any): Array<{ text: string; fontInfo: FontInfo; runs: Run[] }> {
    const tableTexts: Array<{ text: string; fontInfo: FontInfo; runs: Run[] }> = [];
    
    if (table['w:tr']) {
      const rows = Array.isArray(table['w:tr']) ? table['w:tr'] : [table['w:tr']];
      
      for (const row of rows) {
        if (row['w:tc']) {
          const cells = Array.isArray(row['w:tc']) ? row['w:tc'] : [row['w:tc']];
          
          for (const cell of cells) {
            // Each cell can contain paragraphs
            if (cell['w:p']) {
              const paragraphs = Array.isArray(cell['w:p']) ? cell['w:p'] : [cell['w:p']];
              
              for (const paragraph of paragraphs) {
                const { text, fontInfo, runs } = this.extractTextFromParagraph(paragraph);
                if (text.trim()) {
                  tableTexts.push({ text: text.trim(), fontInfo, runs });
                }
              }
            }
          }
        }
      }
    }
    
    return tableTexts;
  }

  private segmentTextBySRX(text: string): string[] {
    if (!text || text.trim().length === 0) return [];
    
    const currentText = text.trim();
    
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
    const currentText = text.trim();
    
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
    
    const breakPoints: Array<{index: number, length: number}> = [];
    
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

  private findDominantFontInfo(runs: Run[]): FontInfo {
    if (runs.length === 0) {
      return { family: 'Calibri', size: 11, bold: false, italic: false, underline: false };
    }
    
    // Count occurrences of each font property weighted by text length
    const fontFamilies: { [key: string]: number } = {};
    const fontSizes: { [key: number]: number } = {};
    let boldCount = 0;
    let italicCount = 0;
    let underlineCount = 0;
    
    for (const run of runs) {
      const family = run.fontInfo.family || 'Calibri';
      const size = run.fontInfo.size || 11;
      
      fontFamilies[family] = (fontFamilies[family] || 0) + run.text.length;
      fontSizes[size] = (fontSizes[size] || 0) + run.text.length;
      
      if (run.fontInfo.bold) boldCount += run.text.length;
      if (run.fontInfo.italic) italicCount += run.text.length;
      if (run.fontInfo.underline) underlineCount += run.text.length;
    }
    
    const totalLength = runs.reduce((sum, run) => sum + run.text.length, 0);
    
    // Find most common font family and size
    const dominantFamily = Object.keys(fontFamilies).reduce((a, b) => 
      fontFamilies[a] > fontFamilies[b] ? a : b
    );
    const dominantSize = Number(Object.keys(fontSizes).reduce((a, b) => 
      fontSizes[Number(a)] > fontSizes[Number(b)] ? a : b
    ));
    
    // Use a higher threshold for styling to prevent small styled words from dominating
    // Only apply bold/italic/underline if it covers at least 70% of the text
    const styleThreshold = 0.7;
    
    return {
      family: dominantFamily,
      size: dominantSize,
      bold: boldCount > totalLength * styleThreshold,
      italic: italicCount > totalLength * styleThreshold,
      underline: underlineCount > totalLength * styleThreshold,
    };
  }

  /**
   * Redistributes translated text across original runs while preserving styling
   * This prevents small styled words from dominating entire sentences
   */
  private redistributeTranslation(runs: Run[], translatedText: string): Run[] {
    if (runs.length === 0) return [];

    const originalTotalLength = runs.reduce((sum, r) => sum + r.text.length, 0);
    if (originalTotalLength === 0) {
      // fallback: just put all in first run
      return [{ text: translatedText, fontInfo: runs[0].fontInfo }];
    }

    const translatedRuns: Run[] = [];
    let cursor = 0;

    runs.forEach((run, i) => {
      // proportion of this run compared to total
      const proportion = run.text.length / originalTotalLength;
      const sliceLength =
        i === runs.length - 1
          ? translatedText.length - cursor // last run → take all remaining
          : Math.round(proportion * translatedText.length);

      const chunk = translatedText.slice(cursor, cursor + sliceLength);
      cursor += sliceLength;

      translatedRuns.push({
        text: chunk,
        fontInfo: run.fontInfo, // keep original style
      });
    });

    return translatedRuns;
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
      
      if (body) {
        // Process paragraphs
        if (body['w:p']) {
          const paragraphs = Array.isArray(body['w:p']) ? body['w:p'] : [body['w:p']];
          
          for (const paragraph of paragraphs) {
            const { text: paragraphText } = this.extractTextFromParagraph(paragraph);
            if (paragraphText.trim()) {
              text += paragraphText + '\n';
            }
          }
        }
        
        // Process tables
        if (body['w:tbl']) {
          const tables = Array.isArray(body['w:tbl']) ? body['w:tbl'] : [body['w:tbl']];
          
          for (const table of tables) {
            const tableTexts = this.extractTextFromTable(table);
            for (const { text: tableText } of tableTexts) {
              text += tableText + '\n';
            }
          }
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
      
      if (body) {
        // Process all body elements in order (paragraphs, tables, etc.)
        const bodyElements: Array<{ type: 'paragraph' | 'table'; element: any }> = [];
        
        // Collect paragraphs
        if (body['w:p']) {
          const paragraphs = Array.isArray(body['w:p']) ? body['w:p'] : [body['w:p']];
          paragraphs.forEach(p => bodyElements.push({ type: 'paragraph', element: p }));
        }
        
        // Collect tables
        if (body['w:tbl']) {
          const tables = Array.isArray(body['w:tbl']) ? body['w:tbl'] : [body['w:tbl']];
          tables.forEach(t => bodyElements.push({ type: 'table', element: t }));
        }
        
        // Process elements in document order
        for (const { type, element } of bodyElements) {
          if (type === 'paragraph') {
            const { text: paragraphText, fontInfo: paragraphFontInfo, runs } = this.extractTextFromParagraph(element);
            
            // Skip empty paragraphs
            if (!paragraphText.trim()) continue;
            
            // === Step 4: Apply SRX sentence segmentation ===
            const sentences = this.segmentTextBySRX(paragraphText);
            
            // For hybrid approach: map runs to sentences based on actual text boundaries
            for (const sentence of sentences) {
              if (sentence.trim()) {
                let sentenceRuns: Run[] = [];
                
                if (sentences.length === 1) {
                  // Single sentence gets all runs
                  sentenceRuns = runs;
                } else {
                  // Multiple sentences: find exact character boundaries
                  const sentenceText = sentence.trim();
                  const sentenceStart = paragraphText.indexOf(sentenceText);
                  
                  if (sentenceStart !== -1) {
                    const sentenceEnd = sentenceStart + sentenceText.length;
                    let currentPos = 0;
                    
                    for (const run of runs) {
                      const runStart = currentPos;
                      const runEnd = currentPos + run.text.length;
                      
                      // Check if this run intersects with the sentence boundaries
                      if (runStart < sentenceEnd && runEnd > sentenceStart) {
                        // Calculate the exact overlapping text
                        const overlapStart = Math.max(runStart, sentenceStart) - runStart;
                        const overlapEnd = Math.min(runEnd, sentenceEnd) - runStart;
                        const overlapText = run.text.substring(overlapStart, overlapEnd);
                        
                        if (overlapText.length > 0) {
                          sentenceRuns.push({
                            text: overlapText,
                            fontInfo: run.fontInfo
                          });
                        }
                      }
                      currentPos += run.text.length;
                    }
                  }
                  
                  // Fallback: if no runs mapped, use dominant style from paragraph
                  if (sentenceRuns.length === 0 && runs.length > 0) {
                    // Find the most common font info from runs
                    const dominantFontInfo = this.findDominantFontInfo(runs);
                    sentenceRuns = [{
                      text: sentenceText,
                      fontInfo: dominantFontInfo
                    }];
                  }
                }

                segments.push({
                  text: sentence.trim(),
                  fontFamily: paragraphFontInfo.family || 'Calibri',
                  fontSize: paragraphFontInfo.size || 11,
                  style: {
                    bold: paragraphFontInfo.bold || false,
                    italic: paragraphFontInfo.italic || false,
                    underline: paragraphFontInfo.underline || false,
                  },
                  runs: sentenceRuns, // Store runs for hybrid approach
                });
              }
            }
          } else if (type === 'table') {
            const tableTexts = this.extractTextFromTable(element);
            
            for (const { text: tableText, fontInfo: tableFontInfo, runs } of tableTexts) {
              // Apply SRX sentence segmentation to table cell text
              const sentences = this.segmentTextBySRX(tableText);
              
              for (const sentence of sentences) {
                if (sentence.trim()) {
                  let sentenceRuns: Run[] = [];
                  
                  if (sentences.length === 1) {
                    sentenceRuns = runs;
                  } else {
                    // Apply same logic as paragraphs for table cells
                    const sentenceText = sentence.trim();
                    const sentenceStart = tableText.indexOf(sentenceText);
                    
                    if (sentenceStart !== -1) {
                      const sentenceEnd = sentenceStart + sentenceText.length;
                      let currentPos = 0;
                      
                      for (const run of runs) {
                        const runStart = currentPos;
                        const runEnd = currentPos + run.text.length;
                        
                        if (runStart < sentenceEnd && runEnd > sentenceStart) {
                          const overlapStart = Math.max(runStart, sentenceStart) - runStart;
                          const overlapEnd = Math.min(runEnd, sentenceEnd) - runStart;
                          const overlapText = run.text.substring(overlapStart, overlapEnd);
                          
                          if (overlapText.length > 0) {
                            sentenceRuns.push({
                              text: overlapText,
                              fontInfo: run.fontInfo
                            });
                          }
                        }
                        currentPos += run.text.length;
                      }
                    }
                    
                    // Fallback for table cells
                    if (sentenceRuns.length === 0 && runs.length > 0) {
                      const dominantFontInfo = this.findDominantFontInfo(runs);
                      sentenceRuns = [{
                        text: sentenceText,
                        fontInfo: dominantFontInfo
                      }];
                    }
                  }

                  segments.push({
                    text: sentence.trim(),
                    fontFamily: tableFontInfo.family || 'Calibri',
                    fontSize: tableFontInfo.size || 11,
                    style: {
                      bold: tableFontInfo.bold || false,
                      italic: tableFontInfo.italic || false,
                      underline: tableFontInfo.underline || false,
                    },
                    runs: sentenceRuns, // Store runs for hybrid approach
                  });
                }
              }
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
          // Store runs data for hybrid approach
          existing.runs = segment.runs || [];
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
            // Store runs data for hybrid approach
            entity.runs = segment.runs || [];
            
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
        // Store runs data for hybrid approach
        entity.runs = segment.runs || [];
        
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
