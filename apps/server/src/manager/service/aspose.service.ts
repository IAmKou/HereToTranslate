import { Injectable } from '@nestjs/common';
import * as AsposePdfCloud from 'asposepdfcloud';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AsposeService {
  private pdfApi: AsposePdfCloud.PdfApi;
  private storage: string;

  constructor(
    private readonly configService: ConfigService,
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
   * Helper method to construct file path consistently
   */
  private constructFilePath(fileName: string, folder: string): string {
    return `${folder}/${fileName}`;
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
}
