import { Injectable } from '@nestjs/common';
import * as AsposePdfCloud from 'asposepdfcloud';
import { ConfigService } from '@nestjs/config';
import { TextReplaceListRequest } from 'asposepdfcloud/src/models/textReplaceListRequest';
import { TextReplace } from "asposepdfcloud/src/models/textReplace";
import { TextState } from "asposepdfcloud/src/models/textState";
import { Rectangle } from "asposepdfcloud/src/models/rectangle";

@Injectable()
export class AsposeService {
  private pdfApi: AsposePdfCloud.PdfApi;
  private storage: string;

  constructor(private readonly configService: ConfigService) {
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
  async uploadFile(fileName: string, fileBuffer: Buffer, folder = 'pdf', storageName?: string) {
    const storage = storageName || this.storage;
    const filePath = `${folder}/${fileName}`;
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
  
    // get detailed text items with style info (best-effort; depends on SDK version)
    let pageTextItems: any[] = [];
    try {
      let pageTextResp: any = null;
      const apiAny: any = this.pdfApi as any;
      // Prefer text rects (include more details) when available in SDK
      if (typeof apiAny.getPageTextRects === 'function') {
        try {
          pageTextResp = await apiAny.getPageTextRects(
            fileName,
            filePage,
            undefined,
            folder,
            storage
          );
        } catch (e) {
          console.warn(`[Aspose] Error getting page text rects for ${filePath}:`, e);
        }
      }
      // Fallback to getPageText if getPageTextRects is unavailable or failed
      if (!pageTextResp && typeof apiAny.getPageText === 'function') {
        try {
          // Use full-page rectangle to fetch text occurrences
          // getPageText(name, pageNumber, LLX, LLY, URX, URY, format?, regex?, splitRects?, folder?, storage?)
          pageTextResp = await apiAny.getPageText(
            fileName,
            filePage,
            0,
            0,
            9999,
            9999,
            undefined,
            undefined,
            true,
            folder,
            storage
          );
        } catch (e) {
          console.warn(`[Aspose] Error getting page text for ${filePath}:`, e);
        }
      }
      const body = pageTextResp?.body || {};
      // Normalize possible shapes: textRects.list, list, textOccurrences.list
      pageTextItems = body.textRects?.list || body.list || body.textOccurrences?.list || [];
      if (!Array.isArray(pageTextItems)) pageTextItems = [];
    } catch (e) {
      console.warn(`[Aspose] Could not fetch page text items for style inference`);
    }
 
    try {
      const textReplaces: TextReplace[] = replacements.map((r) => {
        const match = pageTextItems.find((item: any) => {
          const t = (item.text || item.Text || '').toString().trim();
          return t === r.oldText;
        });

        const textState = new TextState();
        if (match) {
          const m: any = match;
          const mState: any = m.textState || m.TextState;
          if (mState) {
            try {
              (textState as any).font = mState.font || mState.fontName || (textState as any).font;
              if (mState.fontSize != null) (textState as any).fontSize = mState.fontSize;
              if (mState.foregroundColor) (textState as any).foregroundColor = mState.foregroundColor;
              if (mState.fontStyle != null) (textState as any).fontStyle = mState.fontStyle;
              if (mState.bold != null) (textState as any).bold = mState.bold;
              if (mState.italic != null) (textState as any).italic = mState.italic;
              if (mState.underline != null) (textState as any).underline = mState.underline;
            } catch (e) {
              console.error(`[Aspose] Error getting text state for ${filePath}:`, e);
            }
          } else {
            // Try basic fields when textState isn't provided
            if (m.font || m.fontName) (textState as any).font = m.font || m.fontName;
            if (m.fontSize != null) (textState as any).fontSize = m.fontSize;
            if (m.bold != null) (textState as any).bold = m.bold;
            if (m.italic != null) (textState as any).italic = m.italic;
          }
        }

        // Rectangle: fallback to empty; if available, use it
        const rect = new Rectangle();
        if (match && (match.rect || match.Rectangle)) {
          try {
            const rct: any = match.rect || match.Rectangle;
            (rect as any).llx = rct.llx ?? rct.LLX ?? (rect as any).llx;
            (rect as any).lly = rct.lly ?? rct.LLY ?? (rect as any).lly;
            (rect as any).urx = rct.urx ?? rct.URX ?? (rect as any).urx;
            (rect as any).ury = rct.ury ?? rct.URY ?? (rect as any).ury;
          } catch (e) {
            console.error(`[Aspose] Error getting rectangle for ${filePath}:`, e);
          }
        }

        return {
          oldValue: r.oldText,
          newValue: r.newText,
          regex: false,
          textState,
          rect,
          centerTextHorizontally: false,
        };
      });
  
      const request: TextReplaceListRequest = {
        textReplaces,
        defaultFont: "Arial", // fallback
        startIndex: 0,
        countReplace: 0,
      };
  
      await this.pdfApi.postPageTextReplace(
        fileName,
        filePage,
        request,
        storage,
        folder
      );
  
      console.log(
        `[Aspose] Text replaced in ${filePath} on page ${filePage} (styles preserved)`
      );
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
      console.error(`[Aspose] Error checking file existence ${filePath}:`, error);
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
   * Check if file exists in storage with folder support
   */
  async fileExistsWithFolder(fileName: string, folder = 'pdf', storageName?: string): Promise<boolean> {
    const storage = storageName || this.storage;
    const filePath = this.constructFilePath(fileName, folder);
    return this.fileExists(filePath, storage);
  }

  /**
   * Download file from Aspose storage with folder support
   */
  async downloadFileWithFolder(fileName: string, folder = 'pdf', storageName?: string): Promise<Buffer> {
    const storage = storageName || this.storage;
    const filePath = this.constructFilePath(fileName, folder);
    return this.downloadFile(filePath, storage);
  }

  /**
   * Delete file from Aspose storage with folder support
   */
  async deleteFileWithFolder(fileName: string, folder = 'pdf', storageName?: string): Promise<void> {
    const storage = storageName || this.storage;
    const filePath = this.constructFilePath(fileName, folder);
    return this.deleteFile(filePath, storage);
  }

}
