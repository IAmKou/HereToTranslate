import { Injectable } from '@nestjs/common';
import * as AsposePdfCloud from 'asposepdfcloud';
import { ConfigService } from '@nestjs/config';
import { TextReplaceListRequest } from 'asposepdfcloud/src/models/textReplaceListRequest';
import { TextReplace } from 'asposepdfcloud/src/models/textReplace';
import { TextState } from 'asposepdfcloud/src/models/textState';
import { Rectangle } from 'asposepdfcloud/src/models/rectangle';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PdfTextDoc } from '../../db/mongo/schema/pdf-details.schema';

@Injectable()
export class AsposeService {
  private pdfApi: AsposePdfCloud.PdfApi;
  private storage: string;

  constructor(
    private readonly configService: ConfigService,
    @InjectModel('PdfTextDetails') private readonly pdfTextModel: Model<PdfTextDoc>
  ) {
    this.pdfApi = new AsposePdfCloud.PdfApi(
      this.configService.get<string>('ASPOSE_CLIENT_ID') || '',
      this.configService.get<string>('ASPOSE_CLIENT_SECRET') || ''
    );
    this.pdfApi.basePath = 'https://api.aspose.cloud/v3.0';
    this.storage = this.configService.get<string>('ASPOSE_STORAGE') || 'herett';
  }

  /**
   * Upload a file to Aspose Cloud storage
   */
  async uploadFile(
    fileName: string,
    fileBuffer: Buffer,
    folder = 'pdf',
    storageName?: string,
    targetLang?: string
  ) {
    const storage = storageName || this.storage;
    let finalName = fileName;
    try {
      const lang = String(targetLang || '').trim();
      if (lang) {
        const upper = lang.toUpperCase();
        const dotIdx = fileName.lastIndexOf('.');
        const base = dotIdx > -1 ? fileName.slice(0, dotIdx) : fileName;
        const ext = dotIdx > -1 ? fileName.slice(dotIdx) : '';
        finalName = `${base}(${upper})${ext || '.pdf'}`;
      }
    } catch {
      // ignore formatting errors and keep original name
    }
    const filePath = `${folder}/${finalName}`;
    await this.pdfApi.uploadFile(filePath, fileBuffer, storage);
    console.log(`[Aspose] Uploaded: ${filePath}`);
    return filePath;
  }

  /**
   * Download file from Aspose storage
   */
  async downloadFile(filePath: string, storageName?: string): Promise<Buffer> {
    const storage = storageName || this.storage;
    const result = await this.pdfApi.downloadFile(filePath, storage);
    console.log(`[Aspose] Downloaded: ${filePath}`);
    return result.body;
  }
  /**
   * Replace text in a PDF file
   */
  async replaceTextInPdf(
    fileName: string,
    filePage: number,
    replacements: Array<{ oldText: string; newText: string }>,
    folder = 'pdf',
    storageName?: string
  ): Promise<void> {
    const storage = storageName || this.storage;
    const filePath = `${folder}/${fileName}`;

    const exists = await this.pdfApi.objectExists(filePath, storage);
    if (!exists.body.exists) {
      throw new Error(`[Aspose] File not found in storage: ${filePath}`);
    }
    try {
      console.log(`[Aspose] Processing ${replacements.length} replacements for file ${fileName} on page ${filePage}`);

      const textReplaces: TextReplace[] = replacements.map((r, index) => {
        console.log(`[Aspose] Replacement ${index + 1}: "${r.oldText}" -> "${r.newText}"`);
        const textReplace = {
          oldValue: this.buildFlexibleRegex(r.oldText),
          newValue: r.newText,
          regex: true,
          textState: new TextState(),
          rect: new Rectangle(),
          centerTextHorizontally: false,
        } as unknown as TextReplace;
        return textReplace;
      });

      const request: TextReplaceListRequest = {
        textReplaces,
        defaultFont: 'Arial',
        startIndex: 0,
        countReplace: 0,
      };

      console.log(`[Aspose] Sending text replace request to Aspose API...`);
      console.log(`[Aspose] Request details:`, {
        fileName,
        filePage,
        textReplacesCount: textReplaces.length,
        storage,
        folder
      });

      const response = await this.pdfApi.postPageTextReplace(
        fileName,
        filePage,
        request,
        storage,
        folder
      );

      console.log(`[Aspose] API response received:`, {
        status: response.body.status,
        body: response.body
      });

      console.log(`[Aspose] Text replaced in ${filePath} on page ${filePage}`);
    } catch (error) {
      console.error(`[Aspose] Error replacing text in ${filePath}:`, error);
      throw new Error(`Failed to replace text in PDF: ${error}`);
    }
  }
  /**
   * Delete file from Aspose storage
   */
  async deleteFile(filePath: string, storageName?: string): Promise<void> {
    const storage = storageName || this.storage;
    try {
      await this.pdfApi.deleteFile(filePath, storage);
      console.log(`[Aspose] Deleted: ${filePath}`);
    } catch (error) {
      console.error(`[Aspose] Error deleting file ${filePath}:`, error);
      throw new Error(`Failed to delete file: ${error}`);
    }
  }

  /**
   * Check if file exists in storage
   */
  async fileExists(filePath: string, storageName?: string): Promise<boolean> {
    const storage = storageName || this.storage;
    try {
      const result = await this.pdfApi.objectExists(filePath, storage);
      return result.body.exists;
    } catch (error) {
      console.error(
        `[Aspose] Error checking file existence ${filePath}:`,
        error
      );
      return false;
    }
  }

  /**
   * Get PDF document info
   */
  async getPdfInfo(fileName: string, folder = 'pdf', storageName?: string) {
    const storage = storageName || this.storage;
    const filePath = `${folder}/${fileName}`;

    try {
      const result = await this.pdfApi.getDocument(fileName, storage, folder);
      console.log(`[Aspose] Retrieved PDF info for: ${filePath}`);
      return result.body;
    } catch (error) {
      console.error(`[Aspose] Error getting PDF info for ${filePath}:`, error);
      throw new Error(`Failed to get PDF info: ${error}`);
    }
  }

  /**
   * Helper method to construct file path consistently
   */
  private constructFilePath(fileName: string, folder: string): string {
    return `${folder}/${fileName}`;
  }

  /**
   * Build a regex that is resilient to PDF text segmentation:
   * - Collapse any whitespace sequences
   * - Allow smart quotes/quotes variants
   * - Allow optional hyphen + line-break between words
   */
  private buildFlexibleRegex(input: string): string {
    const quoteClass = `["'“”‘’]`;
    const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const tokens = input
      .split(/(\s+)/)
      .filter(Boolean)
      .map((t) => {
        if (/\s+/.test(t)) {
          // whitespace: allow arbitrary whitespace and optional hyphen breaks
          // Avoid \s in character class to satisfy linter; include common whitespace explicitly
          return `[\n\r\t\f -]+`;
        }
        // normalize quotes inside tokens to a class
        const withQuotes = t
          .replace(/["'“”‘’]/g, '"')
          .split('"')
          .map((seg) => escapeRegex(seg))
          .join(quoteClass);
        return withQuotes;
      });
    // Use case-insensitive, multiline by default; Cloud SDK flags are implicit with regex: true
    const pattern = tokens.join('');
    return pattern;
  }

  /**
   * Check if file exists in storage with folder support
   */
  async fileExistsWithFolder(
    fileName: string,
    folder = 'pdf',
    storageName?: string
  ): Promise<boolean> {
    const storage = storageName || this.storage;
    const filePath = this.constructFilePath(fileName, folder);
    return this.fileExists(filePath, storage);
  }

  /**
   * Download file from Aspose storage with folder support
   */
  async downloadFileWithFolder(
    fileName: string,
    folder = 'pdf',
    storageName?: string,
    targetLang?: string
  ): Promise<Buffer> {
    const storage = storageName || this.storage;
    let finalName = fileName;
    try {
      const lang = String(targetLang || '').trim();
      if (lang) {
        const upper = lang.toUpperCase();
        const dotIdx = fileName.lastIndexOf('.');
        const base = dotIdx > -1 ? fileName.slice(0, dotIdx) : fileName;
        const ext = dotIdx > -1 ? fileName.slice(dotIdx) : '';
        finalName = `${base}(${upper})${ext || '.pdf'}`;
      }
    } catch {
      // ignore formatting errors and keep original name
    }
    const filePath = this.constructFilePath(finalName, folder);
    return this.downloadFile(filePath, storage);
  }

  /**
   * Delete file from Aspose storage with folder support
   */
  async deleteFileWithFolder(
    fileName: string,
    folder = 'pdf',
    storageName?: string
  ): Promise<void> {
    const storage = storageName || this.storage;
    const filePath = this.constructFilePath(fileName, folder);
    return this.deleteFile(filePath, storage);
  }

  /**
   * Test MongoDB connection and schema
   */
  async testMongoConnection(): Promise<{ success: boolean; message: string; count?: number }> {
    try {
      console.log(`[Aspose] Testing MongoDB connection...`);
      const count = await this.pdfTextModel.countDocuments();
      console.log(`[Aspose] MongoDB connection successful. Document count: ${count}`);
      return {
        success: true,
        message: 'MongoDB connection successful',
        count
      };
    } catch (error) {
      console.error(`[Aspose] MongoDB connection test failed:`, error);
      return {
        success: false,
        message: `MongoDB connection failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
}
