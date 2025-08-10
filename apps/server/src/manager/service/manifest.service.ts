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
    const form = new FormData();
    form.append('apikey', apiKey);
    form.append('isOverlayRequired', 'false');
    form.append('file', fileBuffer, { filename: 'file.pdf', contentType: 'application/pdf' });
    form.append('language', 'eng'); // Có thể thay đổi ngôn ngữ nếu cần

    const response = await axios.post('https://api.ocr.space/parse/image', form, {
      headers: form.getHeaders(),
    });

    if (response.data && response.data.ParsedResults && response.data.ParsedResults.length > 0) {
      return response.data.ParsedResults.map((result: { ParsedText: string }) => result.ParsedText).join('\n');
    }
    return '';
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('OCR.space API error:', errorMessage);
    throw new Error('Failed to extract text using OCR service.');
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
    // Check if file has required project and branch relationships
    if (!file.project || !file.branch) {
      console.warn(`Skipping manifest generation for file ${file.id}: missing project or branch relationship`);
      return;
    }

    const manifestEntries: Partial<TranslationString>[] = [];
    const apiKey = 'K89333403988957';

    switch (file.fileType) {
      case 'application/pdf': {
        let text = '';
        let items: TextItem[] = [];

        try {
          // 1. Thử dùng parser trước để giữ layout
          const result = await parsePdfWithFonts(file.fileContent);
          items = result.items;
          if (items && items.length > 0) {
            console.log('[PDF] Parsed with pdf2json, found', items.length, 'items');
          } else {
            throw new Error("No text found with parser, falling back to OCR.");
          }
        } catch {
          // 2. Nếu parser lỗi -> Fallback sang OCR.space
          try {
            text = await extractTextWithOcrSpace(file.fileContent, apiKey);
            console.log('[PDF][OCR.space] Text extracted:', text ? text.slice(0, 200) : '[EMPTY]');
          } catch (ocrError: unknown) {
            const errorMessage = ocrError instanceof Error ? ocrError.message : String(ocrError);
            console.error('[PDF][OCR.space] OCR failed:', errorMessage);
            throw new Error('Failed to extract text from PDF: ' + errorMessage);
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
        // Sử dụng mammoth để extract HTML giữ bố cục logic
        const { value: html } = await mammoth.convertToHtml({ buffer: file.fileContent });
        // Parse HTML để tách từng đoạn, heading, bảng, list, caption, v.v.
        const cheerio = require('cheerio');
        const $ = cheerio.load(html);
        let pictureCount = 1;
        // Tách từng đoạn, heading, cell, list item, caption, th, blockquote, pre, figcaption
        const selectors = 'p, h1, h2, h3, h4, h5, h6, li, td, caption, th, blockquote, pre, figcaption';
        $(selectors).each((_i: number, el: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any -- cheerio element type
          const html = $(el).html()?.trim(); // Lấy innerHTML để giữ tag con
          // Bỏ qua nếu chỉ là ảnh (không có text nào ngoài <img>)
          const textOnly = $(el).text().trim();
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
            });
          } else if (html && (textOnly.length > 0 || /<img/i.test(html))) {
            // Đoạn có text hoặc vừa text vừa ảnh, giữ nguyên innerHTML
            manifestEntries.push({
              projectId: String(file.project.id),
              branchId: String(file.branch.id),
              fileId: String(file.id),
              manifestEntryId: uuidv4(),
              originalText: html,
              language: 'en',
              font: 'default',
              style: {},
              position: { x: 0, y: 0, page: 1 }, // Word không có thông tin trang cụ thể, mặc định page 1
            });
          }
        });
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

    // Chia part theo trang thay vì theo số lượng string cố định
    assignFilePartsByPage(manifestEntries);
    console.log(`[MANIFEST] Assigned file parts by page. Total entries: ${manifestEntries.length}`);

    // Trước khi insertMany, set obsolete: false cho từng manifestEntries
    for (const entry of manifestEntries) {
      entry.obsolete = false;
    }
    // Không insert duplicate: Nếu đã có string cũ (cùng fileId, originalText, language), chỉ update obsolete: false
    for (const entry of manifestEntries) {
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
      } else {
        // Nếu chưa có, insert mới
        await this.translationModel.create(entry);
      }
    }
    // Không dùng insertMany nữa để tránh duplicate
  }
}

async function parsePdfWithFonts(buffer: Buffer): Promise<{
  text: string;
  items: TextItem[];
}> {
  // Thiết lập worker cho pdfjs-dist
  pdfjs.GlobalWorkerOptions.workerSrc = path.resolve(
    __dirname,
    '../../../../../../node_modules/pdfjs-dist/build/pdf.worker.js',
  );

  const doc = await pdfjs.getDocument({ data: buffer }).promise;
  const numPages = doc.numPages;
  const allItems = [];
  let fullText = '';

  for (let i = 1; i <= numPages; i++) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale: 1.0 });
    const textContent = await page.getTextContent();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- pdfjs TextItem type incomplete
    fullText += textContent.items.map((item: any) => (item as any).str).join(' ');

    for (const item of textContent.items) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- pdfjs TextItem type incomplete
      const textItem = item as any; // Type assertion for pdfjs items
      if (!textItem.str?.trim()) continue;

      const tx = textItem.transform;
      const x = tx[4];
      const y = viewport.height - tx[5]; // y trong pdfjs tính từ dưới lên
      const height = textItem.height;
      const width = textItem.width;
      const fontName = textItem.fontName;

      // Heuristics đơn giản để xác định style từ font name
      const isBold = fontName?.toLowerCase().includes('bold') || false;
      const isItalic = fontName?.toLowerCase().includes('italic') || false;

      allItems.push({
        text: textItem.str,
        font: fontName || 'default',
        fontSize: height || 12,
        bold: isBold,
        italic: isItalic,
        color: '#000000', // pdfjs-dist không dễ lấy màu, tạm set default
        x,
        y,
        width: width || 0,
        height: height || 12,
        page: i,
      });
    }
  }

  return { text: fullText, items: allItems };
}
