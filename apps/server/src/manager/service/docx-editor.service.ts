import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TranslationEntity } from '../../db/mysql/entity/translation.entity';
import { TranslationService as TranslationManagerService } from './translation-manager.service';
import mammoth from 'mammoth';
import docx4js from 'docx4js';
import { Document, Packer, Paragraph, TextRun, PageBreak } from 'docx';
import * as fs from 'fs';
import * as cheerio from 'cheerio';

interface ExtractedSegment {
  text: string;
  fontFamily: string;
  fontSize: number;
  style: {
    bold: boolean;
    italic: boolean;
    underline: string;
  };
  pageNumber: number;
  orderIndex: number;
  paragraphIndex: number;
  runIndex: number;
  position?: {
    x: number;
    y: number;
    width?: number;
    height?: number;
    page?: number;
  } | null;
  metadata?: Record<string, any>;
}

interface DocxExtractionResult {
  segments: ExtractedSegment[];
  totalPages: number;
  metadata: Record<string, any>;
}

@Injectable()
export class DocxEditorService {
  constructor(
    @InjectRepository(TranslationEntity)
    private translationRepository: Repository<TranslationEntity>,
    private translationManagerService: TranslationManagerService,
  ) {}

  /**
   * Extract plain text using Mammoth from buffer
   */
  async extractTextFromBuffer(buffer: Buffer): Promise<string> {
    const { value } = await mammoth.extractRawText({ buffer });
    return value;
  }

  /**
   * Extract plain text using Mammoth from file path
   */
  private async extractText(filePath: string): Promise<string> {
    const { value } = await mammoth.extractRawText({ path: filePath });
    return value;
  }

  /**
   * Fallback method using docx4js cheerio wrapper when direct XML extraction fails
   */
  private extractWithDocx4jsWrapper($: any): { segments: ExtractedSegment[]; totalPages: number } {
    const segments: ExtractedSegment[] = [];
    let currentPage = 1;
    let orderIndex = 0;
    let paragraphIndex = 0;

    // Process each paragraph using docx4js wrapper
    $("w\\:p").each((i: number, p: any) => {
      const $p = $(p);
      let runIndex = 0;

      // Check for paragraph-level page breaks
      const paragraphPageBreak = $p.find("w\\:pPr w\\:pageBreakBefore");
      if (paragraphPageBreak.length > 0) {
        currentPage++;
      }

      // Process each run in the paragraph
      $p.find("w\\:r").each((j: number, r: any) => {
        const $r = $(r);
        
        // Check for run-level page breaks
        const runPageBreak = $r.find("w\\:br[w\\:type='page']");
        if (runPageBreak.length > 0) {
          currentPage++;
          return; // Skip this run as it's just a page break
        }

        // Extract text from all text nodes in this run
        const textNodes = $r.find("w\\:t");
        if (textNodes.length === 0) return;
        
        let runText = "";
        textNodes.each((k: number, t: any) => {
          runText += $(t).text() || "";
        });
        
        if (!runText || runText.trim().length === 0) return;

        // Extract formatting
        const $rPr = $r.find("w\\:rPr");
        const fontFamily = $rPr.find("w\\:rFonts").attr("w:ascii") || 
                         $rPr.find("w\\:rFonts").attr("w:hAnsi") || 
                         "Calibri";
        
        const sizeVal = $rPr.find("w\\:sz").attr("w:val");
        const fontSize = sizeVal ? parseInt(sizeVal, 10) / 2 : 11;
        
        const bold = $rPr.find("w\\:b").length > 0;
        const italic = $rPr.find("w\\:i").length > 0;
        const underlineNode = $rPr.find("w\\:u");
        const underline = underlineNode.attr("w:val") || 
                        (underlineNode.length > 0 ? "single" : "none");

        // Segment the run text into sentences
        const textSegments = this.segmentText(runText);
        
        // Create a segment for each sentence
        textSegments.forEach((segmentText, segmentIdx) => {
          const segment: ExtractedSegment = {
            text: segmentText,
            fontFamily: fontFamily,
            fontSize: fontSize,
            style: {
              bold: bold,
              italic: italic,
              underline: underline
            },
            pageNumber: currentPage,
            orderIndex: orderIndex++,
            paragraphIndex: paragraphIndex,
            runIndex: runIndex + segmentIdx,
            metadata: {
              originalRunText: runText,
              segmentIndex: segmentIdx,
              totalSegmentsInRun: textSegments.length,
              wordCount: segmentText.split(/\s+/).length,
              extractionMethod: 'docx4js-wrapper-fallback'
            }
          };
          
          segments.push(segment);
        });

        runIndex++;
      });

      paragraphIndex++;
    });

    const totalPages = Math.max(currentPage, 1);
    return { segments, totalPages };
  }

  /**
   * Segment text into sentences using improved sentence boundary detection
   */
  private segmentText(text: string): string[] {
    if (!text || text.trim().length === 0) {
      return [];
    }

    // Clean the text first
    const cleanText = text.trim();
    
    // Advanced sentence segmentation
    const sentences = cleanText
      // Split on sentence endings followed by whitespace and capital letter or number
      .split(/(?<=[.!?])\s+(?=[A-Z0-9])/g)
      // Also split on line breaks that indicate new sentences
      .flatMap(sentence => sentence.split(/\n+/))
      .map(sentence => sentence.trim())
      .filter(sentence => sentence.length > 0)
      // Further split very long segments (over 200 chars) at natural boundaries
      .flatMap(sentence => {
        if (sentence.length > 200) {
          // Try to split at commas, semicolons, or em dashes followed by space
          const parts = sentence.split(/(?<=[,;—–])\s+/);
          if (parts.length > 1) {
            return parts.map(part => part.trim()).filter(part => part.length > 0);
          }
        }
        return [sentence];
      });

    return sentences.length > 0 ? sentences : [cleanText];
  }

  /**
   * Extract detailed content with proper segmentation from buffer
   */
  private async extractDetailedContentFromBuffer(buffer: Buffer): Promise<{
    segments: ExtractedSegment[];
    totalPages: number;
  }> {
    try {
      console.log(`[DOCX_DETAILED] Loading document from buffer...`);
      const doc: any = await docx4js.load(buffer);
      console.log(`[DOCX_DETAILED] Document loaded, parts available:`, Object.keys(doc.parts || {}));

      // Get the main WordprocessingML part
      const officeDocument = doc.parts["word/document.xml"];
      if (!officeDocument) {
        console.error(`[DOCX_DETAILED] Missing officeDocument part (word/document.xml)`);
        throw new Error("Missing officeDocument part (word/document.xml)");
      }

      console.log(`[DOCX_DETAILED] Found officeDocument part`);

      // Try to get XML string - handle different docx4js versions
      let xml: string;
      try {
        // Method 1: Try _data property
        if (officeDocument._data) {
          xml = officeDocument._data.toString();
          console.log(`[DOCX_DETAILED] XML extracted via _data property, length: ${xml.length}`);
        }
        // Method 2: Try data property
        else if (officeDocument.data) {
          xml = officeDocument.data.toString();
          console.log(`[DOCX_DETAILED] XML extracted via data property, length: ${xml.length}`);
        }
        // Method 3: Try toString method
        else if (typeof officeDocument.toString === 'function') {
          xml = officeDocument.toString();
          console.log(`[DOCX_DETAILED] XML extracted via toString method, length: ${xml.length}`);
        }
        // Method 4: Fall back to docx4js cheerio wrapper
        else {
          console.log(`[DOCX_DETAILED] Using docx4js cheerio wrapper fallback`);
          const $ = officeDocument.root();
          xml = $.html();
          console.log(`[DOCX_DETAILED] XML extracted via cheerio wrapper, length: ${xml.length}`);
        }
      } catch (xmlError) {
        console.warn('[DOCX_DETAILED] Failed to extract XML, falling back to docx4js wrapper:', xmlError);
        // Fallback to original docx4js approach
        const $ = officeDocument.root();
        return this.extractWithDocx4jsWrapper($);
      }

      console.log(`[DOCX_DETAILED] XML preview: ${xml.substring(0, 200)}...`);

      // Parse with cheerio
      const $ = cheerio.load(xml, { xmlMode: true });
      console.log(`[DOCX_DETAILED] XML parsed with cheerio successfully`);
      
    const segments: ExtractedSegment[] = [];
    let currentPage = 1;
    let orderIndex = 0;
      let paragraphIndex = 0;

      console.log(`[DOCX_DETAILED] Starting paragraph processing...`);
      const paragraphs = $("w\\:p");
      console.log(`[DOCX_DETAILED] Found ${paragraphs.length} paragraphs`);

    // Process each paragraph
      $("w\\:p").each((i: number, p: any) => {
        const $p = $(p);
        let runIndex = 0;

        // Check for paragraph-level page breaks
        const paragraphPageBreak = $p.find("w\\:pPr w\\:pageBreakBefore");
        if (paragraphPageBreak.length > 0) {
        currentPage++;
      }

      // Process each run in the paragraph
        $p.find("w\\:r").each((j: number, r: any) => {
          const $r = $(r);
          
          // Check for run-level page breaks
          const runPageBreak = $r.find("w\\:br[w\\:type='page']");
          if (runPageBreak.length > 0) {
            currentPage++;
            return; // Skip this run as it's just a page break
          }

          // Extract text from all text nodes in this run
          const textNodes = $r.find("w\\:t");
          if (textNodes.length === 0) return;
          
          let runText = "";
          textNodes.each((k: number, t: any) => {
            runText += $(t).text() || "";
          });
          
          if (!runText || runText.trim().length === 0) return;

          // Extract formatting
          const $rPr = $r.find("w\\:rPr");
          const fontFamily = $rPr.find("w\\:rFonts").attr("w:ascii") || 
                           $rPr.find("w\\:rFonts").attr("w:hAnsi") || 
                           "Calibri";
          
          const sizeVal = $rPr.find("w\\:sz").attr("w:val");
          // Word stores font size in half-points, so divide by 2 to get points
          const fontSize = sizeVal ? parseInt(sizeVal, 10) / 2 : 11;
          
          const bold = $rPr.find("w\\:b").length > 0;
          const italic = $rPr.find("w\\:i").length > 0;
          const underlineNode = $rPr.find("w\\:u");
          const underline = underlineNode.attr("w:val") || 
                          (underlineNode.length > 0 ? "single" : "none");

          // Segment the run text into sentences
          const textSegments = this.segmentText(runText);
          
          // Create a segment for each sentence
          textSegments.forEach((segmentText, segmentIdx) => {
          const segment: ExtractedSegment = {
              text: segmentText,
              fontFamily: fontFamily,
              fontSize: fontSize,
            style: {
                bold: bold,
                italic: italic,
                underline: underline
            },
            pageNumber: currentPage,
            orderIndex: orderIndex++,
              paragraphIndex: paragraphIndex,
              runIndex: runIndex + segmentIdx, // Adjust run index for segments
            metadata: {
                originalRunText: runText,
                segmentIndex: segmentIdx,
                totalSegmentsInRun: textSegments.length,
                wordCount: segmentText.split(/\s+/).length
              }
            };
            
            segments.push(segment);
          });

          runIndex++;
        });

        paragraphIndex++;
      });

      // Calculate total pages by finding the maximum page number
      const totalPages = Math.max(currentPage, 1);

    return {
      segments,
        totalPages
    };

    } catch (error) {
      console.error('Error extracting detailed content:', error);
      throw new Error(`Failed to extract detailed content: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract detailed content with proper segmentation from file path
   */
  private async extractDetailedContent(filePath: string): Promise<{
    segments: ExtractedSegment[];
    totalPages: number;
  }> {
    try {
      const doc: any = await docx4js.load(fs.readFileSync(filePath));

      // Get the main WordprocessingML part
      const officeDocument = doc.parts["word/document.xml"];
      if (!officeDocument) {
        throw new Error("Missing officeDocument part (word/document.xml)");
      }

      // Try to get XML string - handle different docx4js versions
      let xml: string;
      try {
        // Method 1: Try _data property
        if (officeDocument._data) {
          xml = officeDocument._data.toString();
        }
        // Method 2: Try data property
        else if (officeDocument.data) {
          xml = officeDocument.data.toString();
        }
        // Method 3: Try toString method
        else if (typeof officeDocument.toString === 'function') {
          xml = officeDocument.toString();
        }
        // Method 4: Fall back to docx4js cheerio wrapper
        else {
          const $ = officeDocument.root();
          xml = $.html();
        }
      } catch (xmlError) {
        console.warn('Failed to extract XML, falling back to docx4js wrapper:', xmlError);
        // Fallback to original docx4js approach
        const $ = officeDocument.root();
        return this.extractWithDocx4jsWrapper($);
      }

      // Parse with cheerio
      const $ = cheerio.load(xml, { xmlMode: true });
      
    const segments: ExtractedSegment[] = [];
    let currentPage = 1;
    let orderIndex = 0;
      let paragraphIndex = 0;

    // Process each paragraph
      $("w\\:p").each((i: number, p: any) => {
        const $p = $(p);
        let runIndex = 0;

        // Check for paragraph-level page breaks
        const paragraphPageBreak = $p.find("w\\:pPr w\\:pageBreakBefore");
        if (paragraphPageBreak.length > 0) {
        currentPage++;
      }

      // Process each run in the paragraph
        $p.find("w\\:r").each((j: number, r: any) => {
          const $r = $(r);
          
          // Check for run-level page breaks
          const runPageBreak = $r.find("w\\:br[w\\:type='page']");
          if (runPageBreak.length > 0) {
            currentPage++;
            return; // Skip this run as it's just a page break
          }

          // Extract text from all text nodes in this run
          const textNodes = $r.find("w\\:t");
          if (textNodes.length === 0) return;
          
          let runText = "";
          textNodes.each((k: number, t: any) => {
            runText += $(t).text() || "";
          });
          
          if (!runText || runText.trim().length === 0) return;

          // Extract formatting
          const $rPr = $r.find("w\\:rPr");
          const fontFamily = $rPr.find("w\\:rFonts").attr("w:ascii") || 
                           $rPr.find("w\\:rFonts").attr("w:hAnsi") || 
                           "Calibri";
          
          const sizeVal = $rPr.find("w\\:sz").attr("w:val");
          // Word stores font size in half-points, so divide by 2 to get points
          const fontSize = sizeVal ? parseInt(sizeVal, 10) / 2 : 11;
          
          const bold = $rPr.find("w\\:b").length > 0;
          const italic = $rPr.find("w\\:i").length > 0;
          const underlineNode = $rPr.find("w\\:u");
          const underline = underlineNode.attr("w:val") || 
                          (underlineNode.length > 0 ? "single" : "none");

          // Segment the run text into sentences
          const textSegments = this.segmentText(runText);
          
          // Create a segment for each sentence
          textSegments.forEach((segmentText, segmentIdx) => {
          const segment: ExtractedSegment = {
              text: segmentText,
              fontFamily: fontFamily,
              fontSize: fontSize,
            style: {
                bold: bold,
                italic: italic,
                underline: underline
            },
            pageNumber: currentPage,
            orderIndex: orderIndex++,
              paragraphIndex: paragraphIndex,
              runIndex: runIndex + segmentIdx, // Adjust run index for segments
            metadata: {
                originalRunText: runText,
                segmentIndex: segmentIdx,
                totalSegmentsInRun: textSegments.length,
                wordCount: segmentText.split(/\s+/).length
              }
            };
            
            segments.push(segment);
          });

          runIndex++;
        });

        paragraphIndex++;
      });

      // Calculate total pages by finding the maximum page number
      const totalPages = Math.max(currentPage, 1);

    return {
      segments,
        totalPages
      };

    } catch (error) {
      console.error('Error extracting detailed content:', error);
      throw new Error(`Failed to extract detailed content: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Main method to extract DOCX content with formatting and segmentation from buffer
   */
  async extractDocxContentFromBuffer(buffer: Buffer): Promise<DocxExtractionResult> {
    try {
      console.log(`[DOCX_EXTRACT] Starting extraction from buffer of size: ${buffer.length}`);
      
      // Extract plain text for metadata first
      const plainText = await this.extractTextFromBuffer(buffer);
      console.log(`[DOCX_EXTRACT] Plain text extracted, length: ${plainText.length}`);
      console.log(`[DOCX_EXTRACT] Plain text preview: "${plainText.substring(0, 100)}..."`);
      
      // If we have plain text but detailed extraction fails, create basic segments
      let segments: ExtractedSegment[] = [];
      let totalPages = 1;
      
      try {
        // Try detailed extraction first
        const detailedResult = await this.extractDetailedContentFromBuffer(buffer);
        segments = detailedResult.segments;
        totalPages = detailedResult.totalPages;
        console.log(`[DOCX_EXTRACT] Detailed extraction completed: ${segments.length} segments, ${totalPages} pages`);
      } catch (detailedError) {
        console.warn(`[DOCX_EXTRACT] Detailed extraction failed, falling back to plain text segmentation: ${detailedError instanceof Error ? detailedError.message : String(detailedError)}`);
        
        // Fallback: create segments from plain text
        if (plainText && plainText.trim().length > 0) {
          const textSegments = this.segmentText(plainText);
          segments = textSegments.map((text, index) => ({
            text,
            fontFamily: 'Calibri',
            fontSize: 11,
            style: {
              bold: false,
              italic: false,
              underline: 'none'
            },
            pageNumber: 1,
            orderIndex: index,
            paragraphIndex: index,
            runIndex: 0,
            metadata: {
              extractionMethod: 'mammoth-fallback',
              segmentIndex: index,
              totalSegmentsInRun: 1,
              wordCount: text.split(/\s+/).length
            }
          }));
          totalPages = 1;
          console.log(`[DOCX_EXTRACT] Created ${segments.length} fallback segments from plain text`);
        }
      }
      
      if (segments.length > 0) {
        console.log(`[DOCX_EXTRACT] First segment: "${segments[0].text}"`);
      }

      return {
        segments,
        totalPages,
        metadata: {
          extractedAt: new Date().toISOString(),
          totalSegments: segments.length,
          originalTextLength: plainText.length,
          processingMethod: segments.length > 0 && segments[0].metadata?.extractionMethod === 'mammoth-fallback' 
            ? 'mammoth-fallback' 
            : 'docx4js + advanced-segmentation',
          averageSegmentLength: segments.length > 0 ? Math.round(plainText.length / segments.length) : 0
        }
      };

    } catch (error) {
      console.error(`[DOCX_EXTRACT] Failed to extract DOCX content: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error(`[DOCX_EXTRACT] Error stack: ${error instanceof Error ? error.stack : 'No stack'}`);
      throw new Error(`Failed to extract DOCX content: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Main method to extract DOCX content with formatting and segmentation from file path
   */
  async extractDocxContent(filePath: string): Promise<DocxExtractionResult> {
    try {
      // Extract plain text for metadata
      const plainText = await this.extractText(filePath);
      
      // Extract detailed formatting and segmented content
      const { segments, totalPages } = await this.extractDetailedContent(filePath);

      return {
        segments,
        totalPages,
        metadata: {
          extractedAt: new Date().toISOString(),
          totalSegments: segments.length,
          originalTextLength: plainText.length,
          processingMethod: 'docx4js + advanced-segmentation',
          averageSegmentLength: segments.length > 0 ? Math.round(plainText.length / segments.length) : 0
        }
      };

    } catch (error) {
      throw new Error(`Failed to extract DOCX content: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Store extracted segments in translation entity
   */
  async storeTranslationSegments(
    fileId: bigint,
    projectId: bigint,
    language: string,
    extractionResult: DocxExtractionResult,
    requestId?: string
  ): Promise<TranslationEntity[]> {
    const translations: TranslationEntity[] = [];

    for (const segment of extractionResult.segments) {
      const translation = new TranslationEntity();
      
      translation.fileId = fileId;
      translation.projectId = projectId;
      translation.requestId = requestId || null;
      translation.originalText = segment.text;
      translation.language = language;
      translation.pageNumber = segment.pageNumber;
      translation.fontFamily = segment.fontFamily;
      translation.fontSize = segment.fontSize;
      translation.style = segment.style;
      translation.position = segment.position ?? null;
      translation.orderIndex = segment.orderIndex;
      translation.paragraphIndex = segment.paragraphIndex;
      translation.runIndex = segment.runIndex;
      translation.status = 'pending';
      translation.metadata = {
        ...segment.metadata,
        ...extractionResult.metadata
      };

      translations.push(translation);
    }

    // Batch save all translations
    return await this.translationRepository.save(translations);
  }

  /**
   * Rebuild DOCX with translated content preserving formatting
   */
  async rebuildDocxWithTranslations(
    fileId: bigint,
    targetLanguage: string,
    outputPath?: string
  ): Promise<Buffer> {
    // Get all translations for this file in correct order
    const translations = await this.translationRepository.find({
      where: { 
        fileId,
        targetLanguage,
        status: 'translated'
      },
      order: { 
        pageNumber: 'ASC',
        paragraphIndex: 'ASC',
        runIndex: 'ASC',
        orderIndex: 'ASC'
      }
    });

    if (translations.length === 0) {
      throw new Error('No translated content found for this file');
    }

    // Create new document
    const doc = new Document({
      sections: [{
        properties: {},
        children: this.buildDocumentContent(translations)
      }]
    });

    // Generate buffer
    const buffer = await Packer.toBuffer(doc);

    // Save to file if path provided
    if (outputPath) {
      fs.writeFileSync(outputPath, buffer);
    }

    return buffer;
  }

  /**
   * Build document content from translations preserving formatting
   */
  private buildDocumentContent(translations: TranslationEntity[]): Paragraph[] {
    const paragraphs: Paragraph[] = [];
    let currentParagraph: Paragraph | null = null;
    let lastParagraphIndex = -1;

    for (const translation of translations) {
      // Start new paragraph if paragraph index changed or first iteration
      if (translation.paragraphIndex !== lastParagraphIndex) {
        if (currentParagraph) {
          paragraphs.push(currentParagraph);
        }
        currentParagraph = new Paragraph({
          children: []
        });
        lastParagraphIndex = translation.paragraphIndex || 0;
      }

      // Create text run with original formatting
      const textRun = new TextRun({
        text: translation.translatedText || translation.originalText,
        font: translation.fontFamily || 'Calibri',
        size: translation.fontSize ? Math.round(translation.fontSize * 2) : 22, // Convert to half-points
        bold: translation.style?.bold || false,
        italics: translation.style?.italic || false,
        underline: this.convertUnderlineStyle(translation.style?.underline),
        color: translation.style?.color || '000000'
      });

      currentParagraph?.addChildElement(textRun);

      // Add page break if needed
      if (translation.hasPageBreak) {
        currentParagraph?.addChildElement(new PageBreak());
      }
    }

    // Add last paragraph
    if (currentParagraph) {
      paragraphs.push(currentParagraph);
    }

    return paragraphs;
  }

  /**
   * Convert underline style to docx format
   */
  private convertUnderlineStyle(underline?: string): any {
    switch (underline) {
      case 'single':
        return { type: 'single' };
      case 'double':
        return { type: 'double' };
      case 'thick':
        return { type: 'thick' };
      case 'none':
      default:
        return undefined;
    }
  }

  /**
   * Get pending translations for user to translate manually
   */
  async getPendingTranslations(
    fileId: bigint,
    targetLanguage?: string
  ): Promise<TranslationEntity[]> {
    const whereCondition: any = { 
      fileId,
      status: 'pending'
    };
    
    if (targetLanguage) {
      whereCondition.targetLanguage = targetLanguage;
    }

    return await this.translationRepository.find({
      where: whereCondition,
      order: { 
        pageNumber: 'ASC',
        paragraphIndex: 'ASC',
        runIndex: 'ASC',
        orderIndex: 'ASC'
      }
    });
  }

  /**
   * Update translation status to indicate user will handle translation
   */
  async markForUserTranslation(
    fileId: bigint,
    targetLanguage: string
  ): Promise<TranslationEntity[]> {
    const pendingTranslations = await this.translationRepository.find({
      where: { 
        fileId,
        status: 'pending'
      },
      order: { orderIndex: 'ASC' }
    });

    const updatedTranslations: TranslationEntity[] = [];

    for (const translation of pendingTranslations) {
      translation.targetLanguage = targetLanguage;
      translation.status = 'awaiting_translation';

      const updated = await this.translationRepository.save(translation);
      updatedTranslations.push(updated);
    }

    return updatedTranslations;
  }

  /**
   * Complete DOCX processing workflow for user translation
   */
  async processDocxForUserTranslation(
    filePath: string,
    fileId: bigint,
    projectId: bigint,
    sourceLanguage: string,
    targetLanguage: string,
    requestId?: string
  ): Promise<{
    originalTranslations: TranslationEntity[];
    pendingTranslations: TranslationEntity[];
    extractionResult: DocxExtractionResult;
  }> {
    // Step 1: Extract and store original content
    const { translations: originalTranslations, extractionResult } = 
      await this.processDocxFile(filePath, fileId, projectId, sourceLanguage, requestId);

    // Step 2: Mark segments for user translation
    const pendingTranslations = await this.markForUserTranslation(
      fileId, 
      targetLanguage
    );

    return {
      originalTranslations,
      pendingTranslations,
      extractionResult
    };
  }

  /**
   * Add individual translation using translation manager
   */
  async addUserTranslation(
    translationId: string,
    translatedText: string,
    language: string
  ): Promise<TranslationEntity> {
    return await this.translationManagerService.addTranslation(
      translationId,
      translatedText,
      language
    );
  }

  /**
   * Get all strings for user translation interface
   */
  async getAllStringsForTranslation(
    projectId: string,
    language: string,
    fileId?: string,
    page?: number
  ) {
    return await this.translationManagerService.getAllString(
      projectId,
      language,
      fileId,
      page
    );
  }

  /**
   * Export translated DOCX using translation manager
   */
  async exportTranslatedDocx(
    fileId: string,
    language: string
  ): Promise<{ githubUrl: string }> {
    return await this.translationManagerService.exportTranslation(
      fileId,
      language
    );
  }

  /**
   * Complete DOCX processing workflow
   */
  async processDocxFile(
    filePath: string,
    fileId: bigint,
    projectId: bigint,
    language: string,
    requestId?: string
  ): Promise<{
    translations: TranslationEntity[];
    extractionResult: DocxExtractionResult;
  }> {
    // Extract content with formatting and segmentation
    const extractionResult = await this.extractDocxContent(filePath);

    // Store in translation entity
    const translations = await this.storeTranslationSegments(
      fileId,
      projectId,
      language,
      extractionResult,
      requestId
    );

    return {
      translations,
      extractionResult
    };
  }
}