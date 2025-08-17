import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface PDFTronTextItem {
  text: string;
  font: string;
  fontSize: number;
  bold: boolean;
  italic: boolean;
  color: string;
  x: number;
  y: number;
  width: number;
  height: number;
  page: number;
}

export interface PDFTronImageItem {
  data: Buffer;
  x: number;
  y: number;
  width: number;
  height: number;
  page: number;
  type: string;
}

export interface PDFTronExtractionResult {
  text: string;
  items: PDFTronTextItem[];
  images: PDFTronImageItem[];
  pageCount: number;
  metadata?: any;
}

export interface PDFTronReplacementEntry {
  originalText: string;
  translatedText: string;
  position: {
    x: number;
    y: number;
    width?: number;
    height?: number;
    page: number;
  };
  style?: {
    bold?: boolean;
    italic?: boolean;
    color?: string;
    fontSize?: number;
    font?: string;
  };
}

@Injectable()
export class PDFTronBridge {
  private readonly logger = new Logger(PDFTronBridge.name);
  private pdfTronAvailable = false;
  private licenseKey: string | null = null;

  constructor(private configService?: ConfigService) {
    this.initializePDFTron();
  }

  private async initializePDFTron(): Promise<void> {
    try {
      this.licenseKey = this.configService?.get<string>('PDFTRON_LICENSE_KEY') || process.env.PDFTRON_LICENSE_KEY || 'demo:1755277791180:606d3962030000000041003993fed24a9c30d03f21d9bac30e56646a09';
      
      if (this.licenseKey) {
        const { PDFNet } = await import('@pdftron/pdfnet-node');
        await PDFNet.initialize(this.licenseKey);
        this.pdfTronAvailable = true;
        this.logger.log('PDFTron initialized successfully with license');
      } else {
        this.logger.warn('PDFTron license key not found, features will be disabled');
        this.pdfTronAvailable = false;
      }
    } catch (error) {
      this.logger.error('Failed to initialize PDFTron:', error);
      this.pdfTronAvailable = false;
    }
  }

  async extractTextWithPDFTron(buffer: Buffer): Promise<PDFTronExtractionResult> {
    if (!this.pdfTronAvailable) {
      throw new Error('PDFTron is not available');
    }

    try {
      const { PDFNet } = await import('@pdftron/pdfnet-node');
      
      // Load PDF document
      const pdfDoc = await PDFNet.PDFDoc.createFromBuffer(buffer);
      const pageCount = await pdfDoc.getPageCount();
      
      this.logger.log(`Processing PDF with ${pageCount} pages`);
      
      const allTextItems: PDFTronTextItem[] = [];
      const allImages: PDFTronImageItem[] = [];
      let fullText = '';

      // Process each page
      for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
        const page = await pdfDoc.getPage(pageNum);
        
        // Extract text from page
        const textItems = await this.extractTextFromPage(page, pageNum);
        allTextItems.push(...textItems);
        
        // Extract basic image info for preview (skip detailed processing)
        const imageItems = await this.extractBasicImageInfo(page, pageNum);
        allImages.push(...imageItems);
        
        // Build full text
        const pageText = textItems.map(item => item.text).join(' ');
        fullText += (fullText ? ' ' : '') + pageText;
      }

      // Extract metadata
      const metadata = await this.extractMetadata(pdfDoc);

      return {
        text: fullText,
        items: allTextItems,
        images: allImages,
        pageCount,
        metadata
      };

    } catch (error) {
      this.logger.error('Error extracting text with PDFTron:', error);
      throw error;
    }
  }

  async replaceTextWithPDFTron(originalBuffer: Buffer, replacements: PDFTronReplacementEntry[]): Promise<Buffer> {
    if (!this.pdfTronAvailable) {
      throw new Error('PDFTron is not available');
    }

    try {
      const { PDFNet } = await import('@pdftron/pdfnet-node');
      
      // Load PDF document
      const pdfDoc = await PDFNet.PDFDoc.createFromBuffer(originalBuffer);
      
      // Group replacements by page
      const replacementsByPage = new Map<number, PDFTronReplacementEntry[]>();
      for (const replacement of replacements) {
        const page = replacement.position.page;
        if (!replacementsByPage.has(page)) {
          replacementsByPage.set(page, []);
        }
        replacementsByPage.get(page)!.push(replacement);
      }

      // Process each page
      for (const [pageNum, pageReplacements] of Array.from(replacementsByPage.entries())) {
        if (pageNum > await pdfDoc.getPageCount()) continue;
        
        const page = await pdfDoc.getPage(pageNum);
        
        for (const replacement of pageReplacements) {
          await this.performTextReplacement(page, replacement);
        }
      }

      // Save the modified PDF
      const modifiedBuffer = await pdfDoc.saveMemoryBuffer(PDFNet.SDFDoc.SaveOptions.e_linearized);
      return Buffer.from(modifiedBuffer);

    } catch (error) {
      this.logger.error('Error replacing text with PDFTron:', error);
      throw error;
    }
  }

  isAvailable(): boolean {
    return this.pdfTronAvailable;
  }

  private async extractTextFromPage(page: any, pageNum: number): Promise<PDFTronTextItem[]> {
    try {
      const { PDFNet } = await import('@pdftron/pdfnet-node');
      
      // Create text extractor
      const textExtractor = await PDFNet.TextExtractor.create();
      await textExtractor.begin(page);
      
      // Get text as string first to check if extraction worked
      const textString = await textExtractor.getAsText();
      
      if (!textString || textString.trim().length === 0) {
        this.logger.warn(`No text found on page ${pageNum}`);
        return [];
      }

      // Get detailed text information
      const textItems: PDFTronTextItem[] = [];
      
      // For now, we'll create a basic text item since detailed extraction is complex
      // In a full implementation, you'd parse the text string and extract individual words/characters
      const lines = textString.split('\n').filter(line => line.trim());
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.trim().length === 0) continue;
        
        // Create a basic text item for each line
        // In a real implementation, you'd get actual coordinates from PDFTron
        textItems.push({
          text: line.trim(),
          font: 'default',
          fontSize: 12,
          bold: false,
          italic: false,
          color: '#000000',
          x: 50, // Default position
          y: 50 + (i * 20), // Default line spacing
          width: line.length * 7, // Rough estimate
          height: 16,
          page: pageNum
        });
      }

      await textExtractor.destroy();
      return textItems;

    } catch (error) {
      this.logger.error(`Error extracting text from page ${pageNum}:`, error);
      return [];
    }
  }

  private async extractBasicImageInfo(page: any, pageNum: number): Promise<PDFTronImageItem[]> {
    try {
      // Skip detailed image extraction for now - just return basic info
      // This keeps the interface consistent while focusing on text
      this.logger.log(`Skipping detailed image extraction on page ${pageNum} - focusing on text`);
      
      // Return empty array - images will be handled by fallback methods if needed
      return [];
      
    } catch (error) {
      this.logger.error(`Error extracting image info from page ${pageNum}:`, error);
      return [];
    }
  }

  private async extractMetadata(pdfDoc: any): Promise<any> {
    try {
      const { PDFNet } = await import('@pdftron/pdfnet-node');
      
      // Get basic document info
      const info = await pdfDoc.getDocInfo();
      
      return {
        title: info?.getTitle?.() || '',
        author: info?.getAuthor?.() || '',
        subject: info?.getSubject?.() || '',
        creator: info?.getCreator?.() || '',
        producer: info?.getProducer?.() || '',
        creationDate: info?.getCreationDate?.() || '',
        modDate: info?.getModDate?.() || ''
      };
      
    } catch (error) {
      this.logger.error('Error extracting metadata:', error);
      return {};
    }
  }

  private async performTextReplacement(page: any, replacement: PDFTronReplacementEntry): Promise<void> {
    try {
      // For now, log the replacement attempt
      // In a full implementation, you'd use PDFTron's text editing capabilities
      this.logger.log(`Would replace text "${replacement.originalText}" with "${replacement.translatedText}" at position (${replacement.position.x}, ${replacement.position.y}) on page ${replacement.position.page}`);
      
      // Note: Actual text replacement in PDFTron requires more complex implementation
      // This is a placeholder for future enhancement
      
    } catch (error) {
      this.logger.error('Error performing text replacement:', error);
      throw error;
    }
  }
}
