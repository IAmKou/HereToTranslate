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
  // Removed style properties - only preserve font family and size
  // bold?: boolean;
  // italic?: boolean;
  // underline?: boolean;
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

  private async parseDocxWithJSZip(buffer: Buffer): Promise<{ documentXml: string; stylesXml?: string; themeXml?: string }> {
    const zip = await JSZip.loadAsync(buffer);

    const documentXml = await zip.file('word/document.xml')?.async('text');
    if (!documentXml) throw new Error('word/document.xml not found');

    const stylesXml = await zip.file('word/styles.xml')?.async('text');
    const themeXml = await zip.file('word/theme/theme1.xml')?.async('text');

    return { documentXml, stylesXml, themeXml };
  }

  private async parseXmlToObject(xmlString: string): Promise<any> {
    const parser = new xml2js.Parser({ explicitArray: false, mergeAttrs: true });
    return parser.parseStringPromise(xmlString);
  }

  private resolveThemeFont(themeKey: string, theme: any): string | undefined {
    if (!theme) return undefined;

    const scheme = theme['a:theme']?.['a:themeElements']?.['a:fontScheme'];
    if (!scheme) return undefined;

    const major = scheme['a:majorFont'];
    const minor = scheme['a:minorFont'];

    switch (themeKey) {
      case '+mj-lt': return major?.['a:latin']?.['typeface'];
      case '+mj-ea': return major?.['a:ea']?.['typeface'];
      case '+mj-cs': return major?.['a:cs']?.['typeface'];
      case '+mn-lt': return minor?.['a:latin']?.['typeface'];
      case '+mn-ea': return minor?.['a:ea']?.['typeface'];
      case '+mn-cs': return minor?.['a:cs']?.['typeface'];
    }
    return undefined;
  }

  private resolveFontFamily(rFonts: any, theme: any): string | undefined {
    if (!rFonts) return undefined;

    const candidate =
      rFonts['w:eastAsia'] ||
      rFonts['w:ascii'] ||
      rFonts['w:hAnsi'] ||
      rFonts['w:cs'];

    if (!candidate) return undefined;

    // Theme placeholder?
    if (candidate.startsWith('+')) {
      return this.resolveThemeFont(candidate, theme);
    }

    return candidate;
  }



  private extractFontInfoFromRun(run: any, styles: any, theme: any): FontInfo {
    const fontInfo: FontInfo = {};

    // 1. Direct run properties
    const runProps = run['w:rPr'];
    if (runProps) {
      fontInfo.family = this.resolveFontFamily(runProps['w:rFonts'], theme);

      if (runProps['w:sz']) {
        const sizeValue = runProps['w:sz']['w:val'] || runProps['w:sz'];
        const parsedSize = parseInt(sizeValue);
        fontInfo.size = !isNaN(parsedSize) ? parsedSize / 2 : 11;
      }

      // Remove style preservation - no longer extract bold, italic, underline
      // fontInfo.bold = !!runProps['w:b'];
      // fontInfo.italic = !!runProps['w:i'];
      // fontInfo.underline = !!runProps['w:u'];
    }

    // 2. If missing, check style inheritance
    if (!fontInfo.family && styles) {
      // TODO: resolve from paragraph style or character style
      // (requires knowing run’s styleId from w:pPr/w:pStyle or w:rStyle)
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
          } else if (textElement && textElement['_']) {
            text += textElement['_'];
          } else if (textElement && typeof textElement === 'object') {
            // Avoid [object Object] by properly extracting text content
            const textContent = this.extractTextContent(textElement);
            if (textContent && textContent !== '[object Object]') {
              text += textContent;
            }
          }
        }
      } else {
        // Single w:t element
        if (typeof run['w:t'] === 'string') {
          text += run['w:t'];
        } else if (run['w:t'] && run['w:t']['_']) {
          text += run['w:t']['_'];
        } else if (run['w:t'] && typeof run['w:t'] === 'object') {
          // Avoid [object Object] by properly extracting text content
          const textContent = this.extractTextContent(run['w:t']);
          if (textContent && textContent !== '[object Object]') {
            text += textContent;
          }
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

  private extractTextContent(obj: any): string {
    if (!obj) return '';
    
    // If it's already a string, return it
    if (typeof obj === 'string') return obj;
    
    // Check for common text properties
    if (obj['_']) return obj['_'];
    if (obj['$t']) return obj['$t'];
    if (obj['text']) return obj['text'];
    if (obj['value']) return obj['value'];
    
    // If it has a direct text content property
    if (Object.prototype.hasOwnProperty.call(obj, '_text')) return obj['_text'];
    
    // Try to find any string values in the object
    const values = Object.values(obj);
    for (const value of values) {
      if (typeof value === 'string' && value.trim()) {
        return value;
      }
    }
    
    return '';
  }

  private extractTextFromParagraph(paragraph: any, styles: any, theme: any): { text: string; fontInfo: FontInfo; runs: Run[] } {
    let paragraphText = '';
    let paragraphFontInfo: FontInfo = {};
    const runs: Run[] = [];

    if (paragraph['w:r']) {
      const docxRuns = Array.isArray(paragraph['w:r']) ? paragraph['w:r'] : [paragraph['w:r']];

      for (const run of docxRuns) {
        const runText = this.extractTextFromRun(run);
        const runFontInfo = this.extractFontInfoFromRun(run, styles, theme);

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

    // Clean up the extracted text
    paragraphText = this.cleanExtractedText(paragraphText);

    return { text: paragraphText, fontInfo: paragraphFontInfo, runs };
  }

  private cleanExtractedText(text: string): string {
    if (!text) return '';
    
    // Remove [object Object] placeholders
    text = text.replace(/\[object Object\]/g, '');
    
    // Remove run tags like <r1>, <r2>, etc.
    text = text.replace(/<r\d+>/g, '');
    text = text.replace(/<\/r\d+>/g, '');
    
    // Remove any other XML-like tags that might have been introduced
    text = text.replace(/<[^>]*>/g, '');
    
    // Remove common DOCX artifacts
    text = text.replace(/preserve/g, '');
    text = text.replace(/\bxml:space\b/g, '');
    text = text.replace(/\b_\b/g, '');
    
    // Clean up multiple spaces and normalize whitespace
    text = text.replace(/\s+/g, ' ').trim();
    
    return text;
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
                const { text, fontInfo, runs } = this.extractTextFromParagraph(paragraph, null, null);
                if (text.trim()) {
                  // Apply additional cleaning for table text
                  const cleanedText = this.cleanExtractedText(text.trim());
                  if (cleanedText) {
                    tableTexts.push({ text: cleanedText, fontInfo, runs });
                  }
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
      return { family: 'Calibri', size: 11 };
    }

    // Count occurrences of each font property weighted by text length
    const fontFamilies: { [key: string]: number } = {};
    const fontSizes: { [key: number]: number } = {};

    for (const run of runs) {
      const family = run.fontInfo.family || 'Calibri';
      const size = run.fontInfo.size || 11;

      fontFamilies[family] = (fontFamilies[family] || 0) + run.text.length;
      fontSizes[size] = (fontSizes[size] || 0) + run.text.length;

      // Remove style counting - no longer track bold, italic, underline
      // if (run.fontInfo.bold) boldCount += run.text.length;
      // if (run.fontInfo.italic) italicCount += run.text.length;
      // if (run.fontInfo.underline) underlineCount += run.text.length;
    }

    // Find most common font family and size
    const dominantFamily = Object.keys(fontFamilies).reduce((a, b) =>
      fontFamilies[a] > fontFamilies[b] ? a : b
    );
    const dominantSize = Number(Object.keys(fontSizes).reduce((a, b) =>
      fontSizes[Number(a)] > fontSizes[Number(b)] ? a : b
    ));

    return {
      family: dominantFamily,
      size: dominantSize,
      // Remove style properties - only preserve font family and size
      // bold: boldCount > totalLength * styleThreshold,
      // italic: italicCount > totalLength * styleThreshold,
      // underline: underlineCount > totalLength * styleThreshold,
    };
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
            const { text: paragraphText } = this.extractTextFromParagraph(paragraph, null, null);
            const cleanedText = this.cleanExtractedText(paragraphText.trim());
            if (cleanedText) {
              text += cleanedText + '\n';
            }
          }
        }

        // Process tables
        if (body['w:tbl']) {
          const tables = Array.isArray(body['w:tbl']) ? body['w:tbl'] : [body['w:tbl']];

          for (const table of tables) {
            const tableTexts = this.extractTextFromTable(table);
            for (const { text: tableText } of tableTexts) {
              const cleanedText = this.cleanExtractedText(tableText);
              if (cleanedText) {
                text += cleanedText + '\n';
              }
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
            const { text: paragraphText, fontInfo: paragraphFontInfo, runs } = this.extractTextFromParagraph(element, stylesObject, null);

            // Skip empty paragraphs
            if (!paragraphText.trim()) continue;

            // === Step 4: Apply SRX sentence segmentation ===
            const sentences = this.segmentTextBySRX(paragraphText);

            // For hybrid approach: map runs to sentences based on actual text boundaries
            for (const sentence of sentences) {
              const cleanedSentence = this.cleanExtractedText(sentence.trim());
              if (cleanedSentence) {
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
                  text: cleanedSentence,
                  fontFamily: paragraphFontInfo.family || 'Calibri',
                  fontSize: paragraphFontInfo.size || 11,
                  style: {
                    // Remove style preservation - only preserve font family and size
                    // bold: paragraphFontInfo.bold || false,
                    // italic: paragraphFontInfo.italic || false,
                    // underline: paragraphFontInfo.underline || false,
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
                const cleanedSentence = this.cleanExtractedText(sentence.trim());
                if (cleanedSentence) {
                  let sentenceRuns: Run[] = [];

                  if (sentences.length === 1) {
                    sentenceRuns = runs;
                  } else {
                    // Apply same logic as paragraphs for table cells
                    const sentenceText = cleanedSentence;
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
                    text: cleanedSentence,
                    fontFamily: tableFontInfo.family || 'Calibri',
                    fontSize: tableFontInfo.size || 11,
                    style: {
                      // Remove style preservation - only preserve font family and size
                      // bold: tableFontInfo.bold || false,
                      // italic: tableFontInfo.italic || false,
                      // underline: tableFontInfo.underline || false,
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
