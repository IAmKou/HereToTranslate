import { Injectable, Inject } from '@nestjs/common';
import * as AsposePdfCloud from 'asposepdfcloud';
import { ConfigService } from '@nestjs/config';
import { TextReplaceListRequest } from 'asposepdfcloud/src/models/textReplaceListRequest';
import { TextReplace } from 'asposepdfcloud/src/models/textReplace';
import { TextState } from 'asposepdfcloud/src/models/textState';
import { Rectangle } from 'asposepdfcloud/src/models/rectangle';
import { FontStyles } from 'asposepdfcloud/src/models/fontStyles';
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
    storageName?: string
  ) {
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

  async getPdfDetail(
    fileName: string,
    folder = 'pdf',
    storageName?: string
  ) {
    const storage = storageName || this.storage;
    console.log(`[Aspose] Getting PDF details for: ${fileName} in folder: ${folder}`);
    
    try {
      const pageRes = await this.pdfApi.getPages(fileName, storage, folder);
      const pages = pageRes.body.pages.list;
      console.log(`[Aspose] Found ${pages.length} pages in PDF`);

      const pageDetails: Array<{ pageNumber: number; details: any[] }> = [];

      for (const page of pages) {
        const pageNumber = page.id;
        console.log(`[Aspose] Processing page ${pageNumber}`);
        
        const textRes = await this.pdfApi.getPageText(
          fileName,
          pageNumber,
          page.rectangle.lLX,
          page.rectangle.lLY,
          page.rectangle.uRX,
          page.rectangle.uRY,
          undefined,
          undefined,
          false,
          folder,
          storage
        );
        const list = textRes.body?.textOccurrences?.list || [];
        console.log(`[Aspose] Found ${list.length} text occurrences on page ${pageNumber}`);
        
        const textDetails = list.map((item: any) => ({
          text: item.text,
          font: item.textState?.font,
          fontSize: item.textState?.fontSize,
          isBold: Array.isArray(item.textState?.fontStyle)
            ? item.textState.fontStyle.includes(FontStyles.Bold)
            : false,
          isItalic: Array.isArray(item.textState?.fontStyle)
            ? item.textState.fontStyle.includes(FontStyles.Italic)
            : false,
          color: item.textState?.foregroundColor,
          llx: item.rect?.lLX,
          lly: item.rect?.lLY,
          urx: item.rect?.uRX,
          ury: item.rect?.uRY,
        }));

        pageDetails.push({ pageNumber, details: textDetails });
      }

      console.log(`[Aspose] Total text details collected: ${pageDetails.reduce((sum, page) => sum + page.details.length, 0)}`);
      console.log(`[Aspose] Attempting to save to MongoDB...`);

      // Upsert into Mongo with better error handling
      const result = await this.pdfTextModel.findOneAndUpdate(
        { fileName },
        { 
          fileName, 
          uploadedAt: new Date(), 
          pages: pageDetails 
        },
        { 
          upsert: true, 
          new: true, 
          setDefaultsOnInsert: true 
        }
      );

      console.log(`[Aspose] MongoDB save result:`, {
        success: !!result,
        id: result?._id,
        fileName: result?.fileName,
        pagesCount: result?.pages?.length,
        totalDetails: result?.pages?.reduce((sum: number, page: any) => sum + (page.details?.length || 0), 0)
      });

      return { fileName, pages: pageDetails };
    } catch (error) {
      console.error(`[Aspose] Error in getPdfDetail:`, error);
      throw error;
    }
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
    let pageTextItems: any[] = [];
    let storedDetailsForPage: any[] = [];
    try {
      // Prefer stored details if available
      try {
        console.log(`[Aspose] Looking for stored PDF details for: ${fileName}`);
        const stored = await this.pdfTextModel.findOne({ fileName }).lean();
        console.log(`[Aspose] Stored details found:`, {
          found: !!stored,
          pagesCount: stored?.pages?.length || 0,
          totalDetails: stored?.pages?.reduce((sum: number, page: any) => sum + (page.details?.length || 0), 0) || 0
        });
        
        if (stored?.pages?.length) {
          const pageEntry = stored.pages.find((p: any) => p.pageNumber === filePage);
          if (pageEntry?.details?.length) {
            storedDetailsForPage = pageEntry.details;
            console.log(`[Aspose] Found ${storedDetailsForPage.length} stored details for page ${filePage}`);
          } else {
            console.log(`[Aspose] No stored details found for page ${filePage}`);
          }
        } else {
          console.log(`[Aspose] No stored pages found for file: ${fileName}`);
        }
      } catch (e) {
        console.warn(`[Aspose] Error fetching stored details:`, e);
        // ignore and fallback
      }

      let pageTextResp: any = null;
      const apiAny: any = this.pdfApi as any;
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
          console.warn(
            `[Aspose] Error getting page text rects for ${filePath}:`,
            e
          );
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
      pageTextItems =
        body.textRects?.list || body.list || body.textOccurrences?.list || [];
      if (!Array.isArray(pageTextItems)) pageTextItems = [];
    } catch (e) {
      console.warn(
        `[Aspose] Could not fetch page text items for style inference`
      );
    }

    try {
      console.log(`[Aspose] Processing ${replacements.length} replacements for file ${fileName} on page ${filePage}`);
      console.log(`[Aspose] Stored details count: ${storedDetailsForPage.length}, Fetched items count: ${pageTextItems.length}`);
      
      const textReplaces: TextReplace[] = replacements.map((r, index) => {
        console.log(`[Aspose] Processing replacement ${index + 1}: "${r.oldText}" -> "${r.newText}"`);
        
        // Use stored details first, then fallback to on-the-fly fetched items
        const matchStored = storedDetailsForPage.find((item: any) => {
          const t = (item.text || '').toString().trim();
          const matches = t === r.oldText;
          if (matches) {
            console.log(`[Aspose] Found match in stored details: "${t}"`);
          }
          return matches;
        });
        
        const matchFetched = pageTextItems.find((item: any) => {
          const t = (item.text || item.Text || '').toString().trim();
          const matches = t === r.oldText;
          if (matches) {
            console.log(`[Aspose] Found match in fetched items: "${t}"`);
          }
          return matches;
        });
        
        const match: any = matchStored || matchFetched;
        
        if (!match) {
          console.warn(`[Aspose] No match found for text: "${r.oldText}"`);
        }

        const textState = new TextState();
        if (match) {
          const m: any = match;
          console.log(`[Aspose] Using match for text replacement:`, {
            text: m.text,
            font: m.font,
            fontSize: m.fontSize,
            isBold: m.isBold,
            isItalic: m.isItalic,
            color: m.color
          });
          
          // Use stored details directly since they're already processed
          if (m.font) {
            (textState as any).font = m.font;
            console.log(`[Aspose] Set font: ${m.font}`);
          }
          if (m.fontSize != null) {
            (textState as any).fontSize = m.fontSize;
            console.log(`[Aspose] Set fontSize: ${m.fontSize}`);
          }
          if (m.color) {
            (textState as any).foregroundColor = m.color;
            console.log(`[Aspose] Set color: ${m.color}`);
          }
          if (m.isBold) {
            (textState as any).bold = m.isBold;
            console.log(`[Aspose] Set bold: ${m.isBold}`);
          }
          if (m.isItalic) {
            (textState as any).italic = m.isItalic;
            console.log(`[Aspose] Set italic: ${m.isItalic}`);
          }
          
          // Fallback to textState if available
          const mState: any = m.textState || m.TextState;
          if (mState) {
            try {
              if (!(textState as any).font && mState.font) {
                (textState as any).font = mState.font;
              }
              if (!(textState as any).fontSize && mState.fontSize != null) {
                (textState as any).fontSize = mState.fontSize;
              }
              if (!(textState as any).foregroundColor && mState.foregroundColor) {
                (textState as any).foregroundColor = mState.foregroundColor;
              }
              if (mState.fontStyle != null) {
                (textState as any).fontStyle = mState.fontStyle;
              }
              if (!(textState as any).bold && mState.bold != null) {
                (textState as any).bold = mState.bold;
              }
              if (!(textState as any).italic && mState.italic != null) {
                (textState as any).italic = mState.italic;
              }
              if (mState.underline != null) {
                (textState as any).underline = mState.underline;
              }
            } catch (e) {
              console.error(
                `[Aspose] Error getting text state for ${filePath}:`,
                e
              );
            }
          }
        } else {
          console.warn(`[Aspose] No match found, using default text state`);
        }

        // Rectangle: fallback to empty; if available, use it
        const rect = new Rectangle();
        if (match && (match.rect || match.Rectangle || (match.llx != null))) {
          try {
            const rct: any = match.rect || match.Rectangle || match;
            (rect as any).llx = rct.llx ?? rct.LLX ?? (rect as any).llx;
            (rect as any).lly = rct.lly ?? rct.LLY ?? (rect as any).lly;
            (rect as any).urx = rct.urx ?? rct.URX ?? (rect as any).urx;
            (rect as any).ury = rct.ury ?? rct.URY ?? (rect as any).ury;
          } catch (e) {
            console.error(
              `[Aspose] Error getting rectangle for ${filePath}:`,
              e
            );
          }
        }

        const textReplace = {
          oldValue: r.oldText,
          newValue: r.newText,
          regex: false,
          textState,
          rect,
          centerTextHorizontally: false,
        };
        
        console.log(`[Aspose] Created text replace object for: "${r.oldText}" -> "${r.newText}"`);
        return textReplace;
      });

      const request: TextReplaceListRequest = {
        textReplaces,
        defaultFont: 'Arial', // fallback
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
    storageName?: string
  ): Promise<Buffer> {
    const storage = storageName || this.storage;
    const filePath = this.constructFilePath(fileName, folder);
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
