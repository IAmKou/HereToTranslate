import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  TranslationString,
  TranslationStringDocument,
} from '../../db/mongo/schema/translation.schema';
import { v4 as uuidv4 } from 'uuid';
import { FileEntity } from '#LocalProject/Entities';
import axios from 'axios';
import FormData from 'form-data';
import * as pdfjs from 'pdfjs-dist';
import * as path from 'path';
import mammoth from 'mammoth';

// Hàm mới sử dụng OCR.space API
async function extractTextWithOcrSpace(fileBuffer: Buffer, apiKey: string): Promise<string> {
  try {
    console.log('[OCR] Starting OCR.space text extraction...');
    
    const form = new FormData();
    form.append('apikey', apiKey);
    form.append('isOverlayRequired', 'false');
    form.append('file', fileBuffer, { filename: 'file.pdf', contentType: 'application/pdf' });
    form.append('language', 'eng'); // Có thể thay đổi ngôn ngữ nếu cần

    const response = await axios.post('https://api.ocr.space/parse/image', form, {
      headers: form.getHeaders(),
      timeout: 30000, // 30 second timeout
    });

    console.log('[OCR] OCR.space response status:', response.status);
    
    if (response.data) {
      if (response.data.IsErroredOnProcessing) {
        console.error('[OCR] OCR.space processing error:', response.data.ErrorMessage);
        throw new Error(`OCR processing failed: ${response.data.ErrorMessage}`);
      }
      
      if (response.data.ParsedResults && response.data.ParsedResults.length > 0) {
        const extractedText = response.data.ParsedResults
          .map((result: { ParsedText: string }) => result.ParsedText || '')
          .join('\n')
          .trim();
        
        console.log(`[OCR] Successfully extracted ${extractedText.length} characters`);
        return extractedText;
      } else {
        console.warn('[OCR] No parsed results found in OCR response');
        return '';
      }
    }
    
    console.warn('[OCR] Empty response from OCR.space');
    return '';
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[OCR] OCR.space API error:', errorMessage);
    
    // Check if it's a network/timeout error
    if (errorMessage.includes('timeout') || errorMessage.includes('ECONNRESET') || errorMessage.includes('ENOTFOUND')) {
      throw new Error('OCR service is currently unavailable. Please try again later.');
    }
    
    throw new Error(`Failed to extract text using OCR service: ${errorMessage}`);
  }
}

interface TextItem {
  text: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  font?: string;
  fontSize?: number;
  bold?: boolean;
  italic?: boolean;
  color?: string;
  page?: number;
}

function groupTextByLine(items: TextItem[], yThreshold = 5) {
  if (!items.length) {
    return [];
  }

  // Sắp xếp các item theo tọa độ y trước, sau đó là x.
  items.sort((a: TextItem, b: TextItem) => a.y - b.y || a.x - b.x);

  const lines = [];
  let currentLine = [items[0]];

  for (let i = 1; i < items.length; i++) {
    const currentItem = items[i];
    // Dùng tọa độ Y của item ĐẦU TIÊN làm mốc để tránh bị "trôi" dòng.
    const lineBaseY = currentLine[0].y;

    if (Math.abs(currentItem.y - lineBaseY) < yThreshold) {
      // Item đủ gần, thêm vào dòng hiện tại.
      currentLine.push(currentItem);
    } else {
      // Item ở quá xa, đây là dòng mới.
      // Sắp xếp lại dòng vừa hoàn thành theo tọa độ x để đảm bảo thứ tự.
      currentLine.sort((a, b) => a.x - b.x);
      lines.push(currentLine);
      // Bắt đầu dòng mới.
      currentLine = [currentItem];
    }
  }

  // Đừng quên dòng cuối cùng.
  if (currentLine.length > 0) {
    currentLine.sort((a, b) => a.x - b.x);
    lines.push(currentLine);
  }

  // Bây giờ, xử lý từng dòng để ghép các mẩu text lại.
  return lines.map((lineItems: TextItem[]) => {
    let lineText = '';
    if (lineItems.length > 0) {
      lineText = lineItems[0].text;
      for (let i = 1; i < lineItems.length; i++) {
        const prev = lineItems[i-1];
        const curr = lineItems[i];

        const spaceThreshold = (prev.height || 10) * 0.25;
        const gap = curr.x - (prev.x + (prev.width || 0));

        if (gap > spaceThreshold) {
          lineText += ' ';
        }

        lineText += curr.text;
      }
    }

    return {
      text: lineText,
      items: lineItems, // Giữ lại các item gốc của dòng
    };
  });
}

// Hàm mới để chia part theo trang
function assignFilePartsByPage(manifestEntries: Partial<TranslationString>[]): void {
  // Nhóm các entries theo trang
  const entriesByPage = new Map<number, Partial<TranslationString>[]>();

  for (const entry of manifestEntries) {
    const page = entry.position?.page || 1; // Mặc định page 1 nếu không có thông tin trang
    if (!entriesByPage.has(page)) {
      entriesByPage.set(page, []);
    }
    const pageEntries = entriesByPage.get(page);
    if (pageEntries) {
      pageEntries.push(entry);
    }
  }

  // Gán filePart theo số trang (filePart = pageNumber - 1 để consistent với PageDifficultyService)
  const sortedPages = Array.from(entriesByPage.keys()).sort((a, b) => a - b);
  for (const page of sortedPages) {
    const entries = entriesByPage.get(page);
    if (!entries) continue;
    for (const entry of entries) {
      entry.filePart = page - 1; // filePart = pageNumber - 1 for consistency
    }
  }
  
  console.log(`[MANIFEST] Assigned fileParts for ${sortedPages.length} pages: ${sortedPages.map(p => `page ${p} -> filePart ${p-1}`).join(', ')}`);
}

@Injectable()
export class ManifestService {
  constructor(
    @InjectModel(TranslationString.name)
    private readonly translationModel: Model<TranslationStringDocument>
  ) {}

  async generateManifest(file: FileEntity): Promise<void> {
    console.log(`[MANIFEST] Starting manifest generation for file ${file.id} (${file.fileName})`);
    
    // Check if file has required project and branch relationships
    if (!file.project || !file.branch) {
      console.warn(`[MANIFEST] Skipping manifest generation for file ${file.id}: missing project or branch relationship`);
      return;
    }

    if (!file.fileContent || file.fileContent.length === 0) {
      console.error(`[MANIFEST] File ${file.id} has no content`);
      throw new Error('File has no content to process');
    }

    console.log(`[MANIFEST] Processing file: ${file.fileName}, type: ${file.fileType}, size: ${file.fileContent.length} bytes`);

    const manifestEntries: Partial<TranslationString>[] = [];
    const apiKey = 'K89333403988957';

    switch (file.fileType) {
      case 'application/pdf': {
        console.log('[PDF] Starting PDF text extraction...');
        let text = '';
        let items: TextItem[] = [];

        try {
          // 1. Thử dùng parser trước để giữ layout
          console.log('[PDF] Attempting PDF parsing with pdfjs-dist...');
          const result = await parsePdfWithFonts(file.fileContent);
          items = result.items;
          text = result.text;
          
          if (items && items.length > 0) {
            console.log(`[PDF] Successfully parsed with pdfjs-dist, found ${items.length} text items`);
          } else if (text && text.trim().length > 0) {
            console.log(`[PDF] No positioned items but found ${text.length} characters of text`);
            // Convert plain text to items for consistency
            const lines = text.split('\n').filter(l => l.trim());
            items = lines.map((line, index) => ({
              text: line.trim(),
              x: 0,
              y: index * 16,
              width: 0,
              height: 12,
              font: 'default',
              fontSize: 12,
              bold: false,
              italic: false,
              color: '#000000',
              page: 1,
            }));
          } else {
            throw new Error("No text found with parser, falling back to OCR.");
          }
        } catch (parseError) {
          console.warn('[PDF] PDF parsing failed:', parseError instanceof Error ? parseError.message : String(parseError));
          
          // 2. Nếu parser lỗi -> Fallback sang OCR.space
          try {
            console.log('[PDF] Falling back to OCR.space...');
            text = await extractTextWithOcrSpace(file.fileContent, apiKey);
            
            if (text && text.trim().length > 0) {
              console.log(`[PDF][OCR] Successfully extracted ${text.length} characters via OCR`);
            } else {
              throw new Error('OCR returned empty text');
            }
          } catch (ocrError: unknown) {
            const errorMessage = ocrError instanceof Error ? ocrError.message : String(ocrError);
            console.error('[PDF][OCR] OCR failed:', errorMessage);
            
            // Check if it's a file size issue
            if (errorMessage.includes('file size') || errorMessage.includes('1024 KB') || errorMessage.includes('maximum permissible')) {
              throw new Error(`Failed to extract text from PDF. Parser error: ${parseError instanceof Error ? parseError.message : String(parseError)}. OCR error: File is too large for OCR processing (limit: 1024KB). Please try with a smaller PDF file or use a different extraction method.`);
            }
            
            throw new Error(`Failed to extract text from PDF. Parser error: ${parseError instanceof Error ? parseError.message : String(parseError)}. OCR error: ${errorMessage}`);
          }
        }

        if (items && items.length > 0) {
          // Group các đoạn text lại thành dòng
          const groupedLines = groupTextByLine(items, 5); // Tăng threshold lên 5 để linh hoạt hơn
          for (const lineObj of groupedLines) {
            manifestEntries.push({
              projectId: String(file.project.id),
              branchId: String(file.branch.id),
              fileId: String(file.id),
              manifestEntryId: uuidv4(),
              originalText: lineObj.text,
              language: 'en',
              font: lineObj.items[0]?.font || 'default',
              style: {
                bold: lineObj.items.some(i => i.bold),
                italic: lineObj.items.some(i => i.italic),
                color: lineObj.items[0]?.color,
              },
              position: {
                x: Math.min(...lineObj.items.map(i => i.x)),
                y: Math.min(...lineObj.items.map(i => i.y)),
                page: lineObj.items[0]?.page,
              },
            });
          }
          console.log('[PDF] manifestEntries from parser (grouped lines):', manifestEntries.length);
        } else if (text) {
          // Xử lý kết quả text thô từ OCR
          const lines = text.split('\n').filter(l => l.trim());
          for (const line of lines) {
            manifestEntries.push({
              projectId: String(file.project.id),
              branchId: String(file.branch.id),
              fileId: String(file.id),
              manifestEntryId: uuidv4(),
              originalText: line,
              language: 'en',
              font: 'default',
              style: {},
              position: { x: 0, y: 0, page: 1 }, // OCR không có thông tin trang, mặc định page 1
            });
          }
          console.log('[PDF][OCR.space] manifestEntries from OCR:', manifestEntries.length);
        } else {
          console.error('[PDF] No text extracted from PDF (parser and OCR failed)');
          throw new Error('No text could be extracted from PDF (parser and OCR failed)');
        }
        break;
      }

      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
        try {
          console.log('[DOCX] Starting text extraction...');
          
        // Sử dụng mammoth để extract HTML giữ bố cục logic
          const { value: html, messages } = await mammoth.convertToHtml({ buffer: file.fileContent });
          
          if (messages && messages.length > 0) {
            console.log('[DOCX] Mammoth messages:', messages.map(m => m.message).join(', '));
          }
          
          if (!html || html.trim().length === 0) {
            console.warn('[DOCX] No HTML content extracted from DOCX');
            throw new Error('No content could be extracted from DOCX file');
          }
          
          console.log(`[DOCX] Extracted HTML length: ${html.length}`);
          
        // Parse HTML để tách từng đoạn, heading, bảng, list, caption, v.v.
        const cheerio = require('cheerio');
        const $ = cheerio.load(html);
        let pictureCount = 1;
          let entryCount = 0;
          
        // Tách từng đoạn, heading, cell, list item, caption, th, blockquote, pre, figcaption
        const selectors = 'p, h1, h2, h3, h4, h5, h6, li, td, caption, th, blockquote, pre, figcaption';
          
        $(selectors).each((_i: number, el: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any -- cheerio element type
            try {
              const htmlContent = $(el).html()?.trim(); // Lấy innerHTML để giữ tag con
          const textOnly = $(el).text().trim();
              
              // Skip empty elements
              if (!htmlContent && !textOnly) {
                return;
              }
              
          // Nếu đoạn chỉ chứa <img> (không có text), tạo entry Picture N
          if ($(el).find('img').length > 0 && (!textOnly || textOnly.length === 0)) {
            $(el).find('img').each(() => {
              manifestEntries.push({
                projectId: String(file.project.id),
                branchId: String(file.branch.id),
                fileId: String(file.id),
                manifestEntryId: uuidv4(),
                originalText: `Picture ${pictureCount}`,
                language: 'en',
                font: 'default',
                style: {},
                position: { x: 0, y: 0, page: 1 }, // Word không có thông tin trang cụ thể, mặc định page 1
              });
              pictureCount++;
                  entryCount++;
                });
              } else if (textOnly.length > 0) {
                // Prefer plain text over HTML to avoid formatting issues
                const finalText = textOnly.length > 0 ? textOnly : htmlContent;
                
                if (finalText && finalText.trim().length > 0) {
            manifestEntries.push({
              projectId: String(file.project.id),
              branchId: String(file.branch.id),
              fileId: String(file.id),
              manifestEntryId: uuidv4(),
                    originalText: finalText.trim(),
              language: 'en',
              font: 'default',
              style: {},
              position: { x: 0, y: 0, page: 1 }, // Word không có thông tin trang cụ thể, mặc định page 1
            });
                  entryCount++;
                }
              }
            } catch (elementError) {
              console.error('[DOCX] Error processing element:', elementError);
              // Continue with other elements
            }
          });
          
          console.log(`[DOCX] Successfully extracted ${entryCount} entries (${pictureCount - 1} pictures)`);
          
          if (manifestEntries.length === 0) {
            console.warn('[DOCX] No manifest entries created, trying fallback text extraction');
            
            // Fallback: try to extract plain text
            const { value: plainText } = await mammoth.extractRawText({ buffer: file.fileContent });
            if (plainText && plainText.trim().length > 0) {
              const lines = plainText.split('\n').filter(line => line.trim().length > 0);
              for (const line of lines) {
                manifestEntries.push({
                  projectId: String(file.project.id),
                  branchId: String(file.branch.id),
                  fileId: String(file.id),
                  manifestEntryId: uuidv4(),
                  originalText: line.trim(),
                  language: 'en',
                  font: 'default',
                  style: {},
                  position: { x: 0, y: 0, page: 1 },
                });
              }
              console.log(`[DOCX] Fallback extraction created ${lines.length} entries`);
            }
          }
          
        } catch (docxError) {
          console.error('[DOCX] Error extracting text from DOCX:', docxError);
          throw new Error(`Failed to extract text from DOCX: ${docxError instanceof Error ? docxError.message : String(docxError)}`);
        }
        break;
      }

      case 'text/plain': {
        // Treat as plain text, one line per entry
        const lines = file.fileContent
          .toString()
          .split('\n')
          .filter((l) => l.trim());
        for (const line of lines) {
          manifestEntries.push({
            projectId: String(file.project.id),
            branchId: String(file.branch.id),
            fileId: String(file.id),
            manifestEntryId: uuidv4(),
            originalText: line,
            language: 'en',
            font: 'default',
            style: {},
            position: { x: 0, y: 0, page: 1 }, // Plain text không có thông tin trang, mặc định page 1
          });
        }
        break;
      }

      case 'application/json': {
        // Parse JSON and extract all string values (recursively)
        function extractStrings(obj: unknown, out: string[] = []): string[] {
          if (typeof obj === 'string') {
            out.push(obj);
          } else if (Array.isArray(obj)) {
            for (const item of obj) extractStrings(item, out);
          } else if (typeof obj === 'object' && obj !== null) {
            for (const key in obj as Record<string, unknown>) {
              extractStrings((obj as Record<string, unknown>)[key], out);
            }
          }
          return out;
        }
        let jsonContent: unknown;
        try {
          jsonContent = JSON.parse(file.fileContent.toString());
        } catch {
          break;
        }
        const strings = extractStrings(jsonContent);
        for (const str of strings) {
          if (str && str.trim()) {
            manifestEntries.push({
              projectId: String(file.project.id),
              branchId: String(file.branch.id),
              fileId: String(file.id),
              manifestEntryId: uuidv4(),
              originalText: str,
              language: 'en',
              font: 'default',
              style: {},
              position: { x: 0, y: 0, page: 1 }, // JSON không có thông tin trang, mặc định page 1
            });
          }
        }
        break;
      }

      default: {
        // fallback plain text
        const lines = file.fileContent
          .toString()
          .split('\n')
          .filter((l) => l.trim());
        for (const line of lines) {
          manifestEntries.push({
            projectId: String(file.project.id),
            branchId: String(file.branch.id),
            fileId: String(file.id),
            manifestEntryId: uuidv4(),
            originalText: line,
            language: 'en',
            font: 'default',
            style: {},
            position: { x: 0, y: 0, page: 1 }, // Fallback không có thông tin trang, mặc định page 1
          });
        }
      }
    }

    if (manifestEntries.length === 0) {
      console.error(`[MANIFEST] No manifest entries were created for file ${file.id} (${file.fileName})`);
      throw new Error(`No content could be extracted from file ${file.fileName}. The file may be empty, corrupted, or in an unsupported format.`);
    }

    // Chia part theo trang thay vì theo số lượng string cố định
    assignFilePartsByPage(manifestEntries);
    console.log(`[MANIFEST] Assigned file parts by page. Total entries: ${manifestEntries.length}`);

    // Trước khi insertMany, set obsolete: false cho từng manifestEntries
    for (const entry of manifestEntries) {
      entry.obsolete = false;
    }
    
    console.log(`[MANIFEST] Saving ${manifestEntries.length} entries to database...`);
    let savedCount = 0;
    let updatedCount = 0;
    
    // Không insert duplicate: Nếu đã có string cũ (cùng fileId, originalText, language), chỉ update obsolete: false
    for (const entry of manifestEntries) {
      try {
      const existing = await this.translationModel.findOne({
        fileId: entry.fileId,
        originalText: entry.originalText,
        language: entry.language
      });
      if (existing) {
        // Nếu đã có, chỉ update obsolete: false và filePart mới
        await this.translationModel.updateOne({ _id: existing._id }, {
          $set: {
            obsolete: false,
            filePart: entry.filePart
          }
        });
          updatedCount++;
      } else {
        // Nếu chưa có, insert mới
        await this.translationModel.create(entry);
          savedCount++;
        }
      } catch (dbError) {
        console.error(`[MANIFEST] Error saving entry for file ${file.id}:`, dbError);
        throw new Error(`Database error while saving manifest entries: ${dbError instanceof Error ? dbError.message : String(dbError)}`);
      }
    }
    
    console.log(`[MANIFEST] Successfully processed ${manifestEntries.length} entries: ${savedCount} new, ${updatedCount} updated`);
    // Không dùng insertMany nữa để tránh duplicate
  }

  /**
   * Test manifest generation without saving to database (for debugging)
   */
  async testManifestGeneration(file: FileEntity): Promise<{ success: boolean; entries: number; error?: string; details?: any }> {
    try {
      console.log(`[MANIFEST-TEST] Testing manifest generation for file ${file.id} (${file.fileName})`);
      
      if (!file.project || !file.branch) {
        return {
          success: false,
          entries: 0,
          error: 'File missing project or branch relationship'
        };
      }

      if (!file.fileContent || file.fileContent.length === 0) {
        return {
          success: false,
          entries: 0,
          error: 'File has no content'
        };
      }

      const apiKey = 'K89333403988957';

      switch (file.fileType) {
        case 'application/pdf': {
          console.log('[MANIFEST-TEST] Testing PDF extraction...');
          let text = '';
          let items: TextItem[] = [];

          try {
            const result = await parsePdfWithFonts(file.fileContent);
            items = result.items;
            text = result.text;
            
            console.log(`[MANIFEST-TEST] PDF parsing result: ${items.length} items, ${text.length} chars`);
            
            if (items && items.length > 0) {
              const groupedLines = groupTextByLine(items, 5);
              console.log(`[MANIFEST-TEST] Grouped into ${groupedLines.length} lines`);
              return {
                success: true,
                entries: groupedLines.length,
                details: {
                  fileType: file.fileType,
                  fileSize: file.fileContent.length,
                  sampleEntries: groupedLines.slice(0, 3).map(line => line.text)
                }
              };
            } else if (text && text.trim().length > 0) {
              const lines = text.split('\n').filter(l => l.trim());
              return {
                success: true,
                entries: lines.length,
                details: {
                  fileType: file.fileType,
                  fileSize: file.fileContent.length,
                  sampleEntries: lines.slice(0, 3)
                }
              };
            } else {
              // Try OCR as fallback
              console.log('[MANIFEST-TEST] Trying OCR fallback...');
              try {
                text = await extractTextWithOcrSpace(file.fileContent, apiKey);
                if (text && text.trim().length > 0) {
                  const lines = text.split('\n').filter(l => l.trim());
                  return {
                    success: true,
                    entries: lines.length,
                    details: {
                      fileType: file.fileType,
                      fileSize: file.fileContent.length,
                      sampleEntries: lines.slice(0, 3),
                      method: 'OCR'
                    }
                  };
                }
              } catch (ocrError) {
                console.log('[MANIFEST-TEST] OCR also failed:', ocrError);
                return {
                  success: false,
                  entries: 0,
                  error: `Both PDF parsing and OCR failed. OCR error: ${ocrError instanceof Error ? ocrError.message : String(ocrError)}`
                };
              }
            }
          } catch (pdfError) {
            console.log('[MANIFEST-TEST] PDF parsing failed:', pdfError);
            return {
              success: false,
              entries: 0,
              error: `PDF parsing failed: ${pdfError instanceof Error ? pdfError.message : String(pdfError)}`
            };
          }
          break;
        }

        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
          console.log('[MANIFEST-TEST] Testing DOCX extraction...');
          try {
            const { value: html, messages } = await mammoth.convertToHtml({ buffer: file.fileContent });
            
            if (messages && messages.length > 0) {
              console.log('[MANIFEST-TEST] Mammoth messages:', messages.map(m => m.message).join(', '));
            }
            
            if (!html || html.trim().length === 0) {
              return {
                success: false,
                entries: 0,
                error: 'No HTML content extracted from DOCX'
              };
            }
            
            const cheerio = require('cheerio');
            const $ = cheerio.load(html);
            let entryCount = 0;
            const sampleEntries: string[] = [];
            
            const selectors = 'p, h1, h2, h3, h4, h5, h6, li, td, caption, th, blockquote, pre, figcaption';
            
            $(selectors).each((_i: number, el: any) => {
              const textOnly = $(el).text().trim();
              if (textOnly.length > 0) {
                entryCount++;
                if (sampleEntries.length < 3) {
                  sampleEntries.push(textOnly);
                }
              }
            });
            
            console.log(`[MANIFEST-TEST] DOCX extraction would create ${entryCount} entries`);
            return {
              success: true,
              entries: entryCount,
              details: {
                fileType: file.fileType,
                fileSize: file.fileContent.length,
                sampleEntries
              }
            };
          } catch (docxError) {
            return {
              success: false,
              entries: 0,
              error: `DOCX parsing failed: ${docxError instanceof Error ? docxError.message : String(docxError)}`
            };
          }
        }

        default: {
          return {
            success: false,
            entries: 0,
            error: `Unsupported file type: ${file.fileType}`
          };
        }
      }

      return {
        success: false,
        entries: 0,
        error: 'No content could be extracted'
      };

    } catch (error) {
      console.error('[MANIFEST-TEST] Test failed:', error);
      return {
        success: false,
        entries: 0,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
}

async function parsePdfWithFonts(buffer: Buffer): Promise<{
  text: string;
  items: TextItem[];
}> {
  try {
    // Try multiple possible worker paths
    const possibleWorkerPaths = [
      path.resolve(__dirname, '../../../../../../node_modules/pdfjs-dist/build/pdf.worker.js'),
      path.resolve(__dirname, '../../../../../node_modules/pdfjs-dist/build/pdf.worker.js'),
      path.resolve(__dirname, '../../../../node_modules/pdfjs-dist/build/pdf.worker.js'),
      path.resolve(process.cwd(), 'node_modules/pdfjs-dist/build/pdf.worker.js'),
    ];

    let workerFound = false;
    for (const workerPath of possibleWorkerPaths) {
      try {
        const fs = require('fs');
        if (fs.existsSync(workerPath)) {
          pdfjs.GlobalWorkerOptions.workerSrc = workerPath;
          workerFound = true;
          console.log(`[PDF] Using worker at: ${workerPath}`);
          break;
        }
      } catch (err) {
        // Continue to next path
      }
    }

    if (!workerFound) {
      // Use CDN worker as fallback
      pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      console.log('[PDF] Using CDN worker as fallback');
    }

    // Convert Buffer to Uint8Array for pdfjs-dist compatibility
    const uint8Array = new Uint8Array(buffer);
    
    const doc = await pdfjs.getDocument({ 
      data: uint8Array,
      verbosity: 0 // Reduce console noise
    }).promise;
    
  const numPages = doc.numPages;
    console.log(`[PDF] Processing ${numPages} pages`);
    
  const allItems = [];
  let fullText = '';

  for (let i = 1; i <= numPages; i++) {
      try {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale: 1.0 });
    const textContent = await page.getTextContent();

        console.log(`[PDF] Page ${i}: Found ${textContent.items.length} text items`);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- pdfjs TextItem type incomplete
        const pageText = textContent.items.map((item: any) => (item as any).str || '').join(' ');
        fullText += pageText + ' ';

    for (const item of textContent.items) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- pdfjs TextItem type incomplete
      const textItem = item as any; // Type assertion for pdfjs items
      if (!textItem.str?.trim()) continue;

          const tx = textItem.transform || [1, 0, 0, 1, 0, 0];
          const x = tx[4] || 0;
          const y = viewport.height - (tx[5] || 0); // y trong pdfjs tính từ dưới lên
          const height = textItem.height || 12;
          const width = textItem.width || 0;
          const fontName = textItem.fontName || 'default';

      // Heuristics đơn giản để xác định style từ font name
      const isBold = fontName?.toLowerCase().includes('bold') || false;
      const isItalic = fontName?.toLowerCase().includes('italic') || false;

      allItems.push({
        text: textItem.str,
            font: fontName,
            fontSize: height,
        bold: isBold,
        italic: isItalic,
        color: '#000000', // pdfjs-dist không dễ lấy màu, tạm set default
        x,
        y,
            width,
            height,
        page: i,
      });
        }
      } catch (pageError) {
        console.error(`[PDF] Error processing page ${i}:`, pageError);
        // Continue with other pages
      }
    }

    console.log(`[PDF] Successfully extracted ${allItems.length} text items from ${numPages} pages`);
    return { text: fullText.trim(), items: allItems };
    
  } catch (error) {
    console.error('[PDF] Error in parsePdfWithFonts:', error);
    throw new Error(`Failed to parse PDF: ${error instanceof Error ? error.message : String(error)}`);
  }
}
