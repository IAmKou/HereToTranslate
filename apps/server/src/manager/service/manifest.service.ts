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
import * as fs from 'fs';

// Hàm mới sử dụng OCR.space API
async function extractTextWithOcrSpace(fileBuffer: Buffer, apiKey: string): Promise<string> {
  try {
    console.log('[OCR] Starting OCR extraction...');
    console.log('[OCR] Buffer size:', fileBuffer.length, 'bytes');

    // Check file size - OCR.space free API has 1MB limit
    const fileSizeMB = fileBuffer.length / (1024 * 1024);
    console.log('[OCR] File size in MB:', fileSizeMB.toFixed(2));

    let form: FormData;
    if (fileSizeMB > 1) {
      console.warn('[OCR] File is too large for free OCR.space API (>1MB). Trying with compression...');

      // Try to compress the PDF or use a different approach
      // For now, we'll try with a different OCR engine that might handle larger files
      form = new FormData();
      form.append('apikey', apiKey);
      form.append('isOverlayRequired', 'false');
      form.append('file', fileBuffer, { filename: 'file.pdf', contentType: 'application/pdf' });
      form.append('language', 'eng');
      form.append('OCREngine', '1'); // Try engine 1 which might be more lenient
      form.append('scale', 'true');
      form.append('detectOrientation', 'true');

      console.log('[OCR] Trying with OCR engine 1 for large file...');
    } else {
      form = new FormData();
      form.append('apikey', apiKey);
      form.append('isOverlayRequired', 'false');
      form.append('file', fileBuffer, { filename: 'file.pdf', contentType: 'application/pdf' });
      form.append('language', 'eng');
      form.append('OCREngine', '2'); // Use more accurate OCR engine
      form.append('scale', 'true');
      form.append('detectOrientation', 'true');

      console.log('[OCR] Sending request to OCR.space API...');
    }

    const response = await axios.post('https://api.ocr.space/parse/image', form, {
      headers: form.getHeaders(),
      timeout: 120000, // 2 minute timeout for large files
    });

    console.log('[OCR] Response received, status:', response.status);
    console.log('[OCR] Response data keys:', Object.keys(response.data || {}));

    if (response.data && response.data.ParsedResults && response.data.ParsedResults.length > 0) {
      const extractedText = response.data.ParsedResults.map((result: any) => result.ParsedText).join('\n');
      console.log('[OCR] Text extracted successfully, length:', extractedText.length);
      console.log('[OCR] First 200 chars:', extractedText.substring(0, 200));
      return extractedText;
    } else {
      console.warn('[OCR] No parsed results found in response');
      console.log('[OCR] Full response:', JSON.stringify(response.data, null, 2));

      // If file is too large, provide a helpful error message
      if (fileSizeMB > 1) {
        throw new Error(`File is too large (${fileSizeMB.toFixed(2)}MB) for OCR processing. Please try a smaller file or use a PDF with selectable text.`);
      }

      return '';
    }
  } catch (error: any) {
    console.error('[OCR] OCR.space API error:', error?.response ? error.response.data : error?.message || error);
    if (error?.response) {
      console.error('[OCR] Response status:', error.response.status);
      console.error('[OCR] Response data:', error.response.data);
    }
    throw new Error('Failed to extract text using OCR service: ' + (error?.message || error));
  }
}

function groupTextByLine(items: any[], yThreshold = 8) {
  if (!items.length) {
    return [];
  }

  // Enhanced sorting: Sort by page first, then by reading order (top-to-bottom, left-to-right)
  items.sort((a, b) => {
    // First sort by page
    if (a.page !== b.page) {
      return a.page - b.page;
    }

    // Then sort by Y position (top to bottom)
    if (Math.abs(a.y - b.y) > yThreshold) {
      return a.y - b.y;
    }

    // If on same line (within threshold), sort by X (left to right)
    return a.x - b.x;
  });

  // Debug: Log page distribution before grouping
  const pageDistribution = new Map();
  items.forEach((item: any) => {
    const page = item.page || 1;
    pageDistribution.set(page, (pageDistribution.get(page) || 0) + 1);
  });
  console.log('[PDF] Page distribution before grouping:', Array.from(pageDistribution.entries()).sort((a, b) => a[0] - b[0]));

  const lines = [];
  let currentLine = [items[0]];

  for (let i = 1; i < items.length; i++) {
    const currentItem = items[i];
    const lineBaseY = currentLine[0].y;
    const lineBasePage = currentLine[0].page;

    // Check if item is on the same page and line
    if (currentItem.page === lineBasePage && Math.abs(currentItem.y - lineBaseY) < yThreshold) {
      currentLine.push(currentItem);
    } else {
      // New line or new page
      currentLine.sort((a, b) => a.x - b.x);
      lines.push(currentLine);
      currentLine = [currentItem];
    }
  }

  // Don't forget the last line
  if (currentLine.length > 0) {
    currentLine.sort((a, b) => a.x - b.x);
    lines.push(currentLine);
  }

  // Debug: Log page distribution after grouping
  const pageDistributionAfterGrouping = new Map();
  lines.forEach((line: any) => {
    const page = line[0]?.page || 1;
    pageDistributionAfterGrouping.set(page, (pageDistributionAfterGrouping.get(page) || 0) + 1);
  });
  console.log('[PDF] Page distribution after grouping:', Array.from(pageDistributionAfterGrouping.entries()).sort((a, b) => a[0] - b[0]));

  // Enhanced processing: Merge lines into complete sentences, but respect page boundaries
  const result = [];
  let currentSentence = '';
  let currentItems: any[] = [];

  // Ensure we get the correct page from the first line
  let currentPage = 1;
  if (lines.length > 0 && lines[0].length > 0) {
    currentPage = lines[0][0].page || 1;
    console.log(`[PDF] Starting with page: ${currentPage}`);
  }

  // Debug: Log first few lines to check page distribution
  console.log('[PDF] First 10 lines page distribution:');
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const line = lines[i];
    const page = line[0]?.page || 1;
    console.log(`[PDF] Line ${i}: page ${page}, text: "${line.map((item: any) => item.text).join(' ').substring(0, 50)}..."`);
  }

  for (const lineItems of lines) {
    if (lineItems.length === 0) continue;

    // Check if we've moved to a new page
    const linePage = lineItems[0]?.page || 1;
    if (linePage !== currentPage) {
      // Save current sentence before switching pages
      if (currentSentence.trim().length >= 5) {
        result.push({
          text: currentSentence.trim(),
          items: currentItems,
        });
      }
      currentSentence = '';
      currentItems = [];
      currentPage = linePage;
    }

    // Ensure all items in this line are from the same page
    const pagesInLine = new Set(lineItems.map((item: any) => item.page));
    if (pagesInLine.size > 1) {
      console.warn(`[PDF] WARNING: Line has items from multiple pages:`, Array.from(pagesInLine));
      // Skip this line to avoid cross-page contamination
      continue;
    }

    // Force page boundary check - never merge across pages
    if (linePage !== currentPage) {
      // This should never happen due to sorting, but double-check
      console.warn(`[PDF] WARNING: Page mismatch detected: expected ${currentPage}, got ${linePage}`);
      continue;
    }

    // Sort items by x position to ensure correct reading order
    lineItems.sort((a, b) => a.x - b.x);

    let lineText = '';
    let lastX = 0;

    for (let i = 0; i < lineItems.length; i++) {
      const item = lineItems[i];
      const currentX = item.x;

      // Add space if there's a significant gap
      if (i > 0) {
        const gap = currentX - lastX;
        const avgHeight = lineItems.reduce((sum, it) => sum + (it.height || 10), 0) / lineItems.length;
        const spaceThreshold = avgHeight * 0.2;

        if (gap > spaceThreshold) {
          lineText += ' ';
        }
      }

      lineText += item.text;
      lastX = currentX + (item.width || 0);
    }

    // Clean up the line text
    lineText = lineText.trim();

    // Skip very short lines
    if (lineText.length < 3) {
      console.log(`[PDF] Skipping very short line: ${lineText}`);
      continue;
    }

    // Validation
    const vietnameseRegex = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
    const hasVietnamese = vietnameseRegex.test(lineText);

    const readableChars = lineText.replace(/[^a-zA-ZÀ-ỹ0-9\s.,!?;:()[\]{}"'`~@#$%^&*+=|\\/<>]/g, '');
    const readabilityScore = readableChars.length / lineText.length;

    if (!hasVietnamese && readabilityScore < 0.2) {
      console.log(`[PDF] Skipping very low readability line: ${lineText.substring(0, 50)}`);
      continue;
    }

    if (hasVietnamese && readabilityScore < 0.1) {
      console.log(`[PDF] Skipping very low readability Vietnamese line: ${lineText.substring(0, 50)}`);
      continue;
    }

    // Check if this looks like a table of contents or list item
    const isListOrToc = lineText.match(/^(CHƯƠNG|CHAPTER|PHẦN|PART|MỞ ĐẦU|INTRODUCTION|TÁI BÚT|POSTSCRIPT|THƯ TUYỆT MỆNH|START|END|TABLE OF CONTENTS)/i) ||
      lineText.match(/^\d+\./) ||
      lineText.match(/^[A-Z][A-Z\s]+$/); // All caps text like "TABLE OF CONTENTS"

    // Check if this is a standalone line that should be its own string
    const isStandalone = lineText.length <= 50 &&
      (lineText.match(/^[A-Z][A-Z\s]+$/) || // All caps short text
        lineText.match(/^[A-Z][a-z\s]+$/) || // Title case short text
        isListOrToc);

    // Debug: Log standalone detection
    if (isStandalone) {
      console.log(`[PDF] Detected standalone line: "${lineText}" (isListOrToc: ${isListOrToc})`);
    }

    // Add line to current sentence (only if same page and not standalone)
    if (linePage === currentPage && !isStandalone) {
      // Debug: Log only first 5 lines of first page
      if (currentPage === 3 && currentItems.length < 5) {
        console.log(`[PDF] Processing line: "${lineText}" from page ${currentPage}`);
      }

      // Merge lines into complete sentences
      currentSentence += (currentSentence ? ' ' : '') + lineText;
      currentItems = currentItems.concat(lineItems);

      // Check if sentence is complete (ends with proper punctuation)
      if (lineText.trim().match(/[.!?]$/)) {
        // Complete sentence found
        if (currentSentence.trim().length >= 5) {
          result.push({
            text: currentSentence.trim(),
            items: currentItems,
          });
          console.log(`[PDF] Added complete sentence: "${currentSentence.trim().substring(0, 50)}..." from page ${currentPage}`);
        }

        // Reset for next sentence
        currentSentence = '';
        currentItems = [];
      }
      // Check if current sentence ends with punctuation (from previous lines)
      else if (currentSentence.trim().match(/[.!?]$/)) {
        // Previous sentence ended with punctuation, start new sentence
        if (currentSentence.trim().length >= 5) {
          result.push({
            text: currentSentence.trim(),
            items: currentItems,
          });
          console.log(`[PDF] Added complete sentence from previous line: "${currentSentence.trim().substring(0, 50)}..." from page ${currentPage}`);
        }

        // Start new sentence with current line
        currentSentence = lineText;
        currentItems = lineItems;
      }
      // Check if we need to force a sentence boundary
      else if (currentSentence.length > 200 && currentSentence.includes('.')) {
        // Look for the last complete sentence
        const lastDotIndex = currentSentence.lastIndexOf('.');
        if (lastDotIndex > currentSentence.length * 0.6) { // Dot is in the latter part
          const completeSentence = currentSentence.substring(0, lastDotIndex + 1).trim();
          const remainingText = currentSentence.substring(lastDotIndex + 1).trim();

          if (completeSentence.length >= 20) {
            result.push({
              text: completeSentence,
              items: currentItems.slice(0, Math.floor(currentItems.length * 0.8)),
            });
            console.log(`[PDF] Force split long sentence: "${completeSentence.substring(0, 50)}..." from page ${currentPage}`);

            // Continue with remaining text + current line
            currentSentence = (remainingText + ' ' + lineText).trim();
            currentItems = currentItems.slice(Math.floor(currentItems.length * 0.8)).concat(lineItems);
          }
        }
      }
      // Check if sentence seems incomplete (ends with common incomplete patterns)
      else if (lineText.trim().match(/[;:,]\s*$/)) {
        // Likely incomplete - continue building sentence
        console.log(`[PDF] Continuing incomplete sentence: "${lineText.trim()}"`);
      }
      // Check if current sentence is getting too long (likely incomplete)
      else if (currentSentence.length > 500) {
        // Force a boundary to prevent extremely long sentences
        console.log(`[PDF] Forcing boundary for long sentence: "${currentSentence.substring(0, 100)}..."`);
        if (currentSentence.trim().length >= 5) {
          result.push({
            text: currentSentence.trim(),
            items: currentItems,
          });
        }
        currentSentence = lineText;
        currentItems = lineItems;
      }
      // Don't force sentence boundary for semicolons or colons - let it continue
    } else {
      // If page changed or standalone line, save current sentence and start new one
      if (currentSentence.trim().length >= 5) {
        result.push({
          text: currentSentence.trim(),
          items: currentItems,
        });
      }

      // Debug: Log page change or standalone
      if (linePage !== currentPage) {
        console.log(`[PDF] Page changed from ${currentPage} to ${linePage}`);
      } else if (isStandalone) {
        console.log(`[PDF] Found standalone line: "${lineText}" from page ${currentPage}`);
      }

      // Start new sentence on new page or standalone line
      currentSentence = lineText;
      currentItems = lineItems;
      currentPage = linePage;
    }

    // Don't force split sentences - let them grow naturally
    // Only split if we have a clear sentence boundary
    if (currentSentence.length > 1000) {
      // Only split at clear sentence endings
      const lastSentenceEnd = currentSentence.lastIndexOf('.');
      if (lastSentenceEnd > 0 && lastSentenceEnd > currentSentence.length * 0.7) {
        // Split at the last sentence ending
        const firstPart = currentSentence.substring(0, lastSentenceEnd + 1).trim();
        const secondPart = currentSentence.substring(lastSentenceEnd + 1).trim();

        if (firstPart.length >= 5) {
          result.push({
            text: firstPart,
            items: currentItems.slice(0, Math.floor(currentItems.length * 0.7)),
          });
        }

        currentSentence = secondPart;
        currentItems = currentItems.slice(Math.floor(currentItems.length * 0.7));
      }
    }
  }

  // Don't forget the last sentence if it doesn't end with punctuation
  if (currentSentence.trim().length >= 5) {
    result.push({
      text: currentSentence.trim(),
      items: currentItems,
    });
  }

  console.log(`[PDF] Processed ${lines.length} lines into ${result.length} complete sentences`);

  // Debug: Log page distribution after sentence merging
  const pageDistributionAfterMerging = new Map();
  result.forEach((sentence: any) => {
    // Ensure all items in sentence are from the same page
    const pagesInSentence = new Set(sentence.items.map((item: any) => item.page));
    if (pagesInSentence.size > 1) {
      console.warn(`[PDF] WARNING: Sentence has items from multiple pages:`, Array.from(pagesInSentence));
      console.warn(`[PDF] Sentence text:`, sentence.text.substring(0, 100));
    }

    // Use the most common page in the sentence
    const pageCounts = new Map();
    sentence.items.forEach((item: any) => {
      const page = item.page || 1;
      pageCounts.set(page, (pageCounts.get(page) || 0) + 1);
    });

    let mostCommonPage = 1;
    let maxCount = 0;
    for (const [page, count] of pageCounts) {
      if (count > maxCount) {
        maxCount = count;
        mostCommonPage = page;
      }
    }

    // Debug: Log sentences assigned to page 1 to understand why
    if (mostCommonPage === 1) {
      console.log(`[PDF] Sentence assigned to page 1: "${sentence.text.substring(0, 50)}..." (${sentence.items.length} items)`);
    }

    pageDistributionAfterMerging.set(mostCommonPage, (pageDistributionAfterMerging.get(mostCommonPage) || 0) + 1);
  });
  console.log('[PDF] Page distribution after sentence merging:', Array.from(pageDistributionAfterMerging.entries()).sort((a, b) => a[0] - b[0]));

  return result;
}

// Enhanced function to split text into meaningful sentences
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function splitIntoSentences(text: string): string[] {
  // Clean the text first
  text = text.trim();
  if (text.length < 5) return [text];

  // Try to split by Vietnamese sentence endings first
  const vietnameseEndings = /[.!?]+/g;
  const sentences = text.split(vietnameseEndings).filter(s => s.trim().length > 0);

  // If we got meaningful sentences, return them
  if (sentences.length > 1) {
    return sentences.map(s => s.trim()).filter(s => s.length >= 3);
  }

  // If no sentence endings found, try to split by common Vietnamese patterns
  const patterns = [
    /[.!?]+/, // Standard sentence endings
    /[.!?]+[\s\n]+/, // With whitespace
    /[.!?]+[\s\n]+[A-ZĐ]/, // Followed by capital letter
    /[\n\r]+/, // Line breaks
    /[;:]+[\s\n]+/, // Semicolons and colons
  ];

  for (const pattern of patterns) {
    const split = text.split(pattern).filter(s => s.trim().length > 0);
    if (split.length > 1) {
      return split.map(s => s.trim()).filter(s => s.length >= 5);
    }
  }

  // If still no good splits, split by length with word boundaries
  if (text.length > 150) {
    const chunks = [];
    const words = text.split(/\s+/);
    let currentChunk = '';

    for (const word of words) {
      if ((currentChunk + ' ' + word).length > 150) {
        if (currentChunk.trim()) {
          chunks.push(currentChunk.trim());
        }
        currentChunk = word;
      } else {
        currentChunk += (currentChunk ? ' ' : '') + word;
      }
    }

    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    return chunks.filter(chunk => chunk.length >= 5);
  }

  // If text is short enough, return as is
  return [text];
}

// Hàm mới để chia DOCX theo 100 strings/page
function assignFilePartsForDocx(manifestEntries: any[]): void {
  const DOCX_STRINGS_PER_PAGE = 100;

  // Chia entries thành các nhóm 100 strings
  for (let i = 0; i < manifestEntries.length; i++) {
    const pageIndex = Math.floor(i / DOCX_STRINGS_PER_PAGE);
    manifestEntries[i].filePart = pageIndex;
  }
}

// Enhanced function to divide PDF by original pages
function assignFilePartsByPage(manifestEntries: any[]): void {
  // Group entries by page
  const entriesByPage = new Map<number, any[]>();

  for (const entry of manifestEntries) {
    const page = entry.position?.page || 1;
    if (!entriesByPage.has(page)) {
      entriesByPage.set(page, []);
    }
    entriesByPage.get(page)!.push(entry);
  }

  // Sort pages and assign filePart
  const sortedPages = Array.from(entriesByPage.keys()).sort((a, b) => a - b);
  console.log('[PDF] Pages found:', sortedPages);
  console.log('[PDF] Total pages in PDF:', sortedPages.length);

  // Ensure we have entries for all pages from 1 to max page
  const maxPage = Math.max(...sortedPages);
  const minPage = Math.min(...sortedPages);
  console.log(`[PDF] Page range: ${minPage} to ${maxPage}`);

  // Create new page mapping: skip pages with only images
  const pagesWithText = sortedPages.filter((page: number) => {
    const entries = entriesByPage.get(page) || [];
    return entries.length > 0; // Only pages with text entries
  });

  console.log('[PDF] Pages with text only:', pagesWithText);
  console.log('[PDF] Total pages with text:', pagesWithText.length);

  // Assign filePart based on new page order (0-based index)
  for (const entry of manifestEntries) {
    const page = (entry as any).position?.page || 1;
    const newPageIndex = pagesWithText.indexOf(page);
    if (newPageIndex !== -1) {
      (entry as any).filePart = newPageIndex;
    } else {
      // Skip pages with only images
      (entry as any).filePart = -1; // Mark for removal
    }
  }

  // Remove entries from pages with only images
  const filteredEntries = manifestEntries.filter((entry: any) => entry.filePart !== -1);
  manifestEntries.length = 0;
  manifestEntries.push(...filteredEntries);

  console.log('[PDF] Successfully assigned file parts by text pages only');
  console.log(`[PDF] Total entries after filtering: ${manifestEntries.length}`);
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
        let items = [];
        let usedOcr = false;

        console.log('=== PDF PROCESSING START ===');
        console.log('[PDF] File name:', file.fileName);
        console.log('[PDF] File type:', file.fileType);
        console.log('[PDF] File size:', file.fileContent.length, 'bytes');
        console.log('[PDF] File ID:', file.id);
        console.log('[PDF] Project ID:', file.project?.id);
        console.log('[PDF] Branch ID:', file.branch?.id);

        // Check if file content is valid
        if (!file.fileContent || file.fileContent.length === 0) {
          console.error('[PDF] ERROR: File content is empty or null');
          throw new Error('File content is empty or null');
        }

        // Check file header to verify it's actually a PDF
        const header = file.fileContent.slice(0, 4).toString('hex');
        console.log('[PDF] File header (hex):', header);
        if (header !== '25504446') {
          console.error('[PDF] ERROR: File is not a valid PDF (header should be %PDF)');
          throw new Error('File is not a valid PDF');
        }

        let result: any = null;
        try {
          // 1. Thử dùng parser trước để giữ layout
          console.log('[PDF] Step 1: Attempting to parse with pdfjs-dist...');
          result = await parsePdfWithFonts(file.fileContent);
          items = result.items;
          console.log('[PDF] Parser result - items count:', items?.length || 0);
          console.log('[PDF] Parser result - text length:', result.text?.length || 0);

          if (items && items.length > 0) {
            console.log('[PDF] SUCCESS: Parsed with pdfjs-dist, found', items.length, 'items');
            console.log('[PDF] Sample items:', items.slice(0, 3).map((item: any) => ({
              text: item.text.substring(0, 50),
              font: item.font,
              page: item.page
            })));
          } else {
            console.warn('[PDF] WARNING: No text items found with parser, falling back to OCR.');
            throw new Error("No text found with parser, falling back to OCR.");
          }
        } catch (err: any) {
          console.error('[PDF] ERROR: Parser failed:', err?.message || err);
          console.error('[PDF] Parser error stack:', err?.stack);

          // 2. Nếu parser lỗi -> Fallback sang OCR.space
          try {
            console.log('[PDF] Step 2: Falling back to OCR.space...');
            text = await extractTextWithOcrSpace(file.fileContent, apiKey);
            usedOcr = true;
            console.log('[PDF] OCR result - text length:', text?.length || 0);
            console.log('[PDF] OCR result - first 200 chars:', text ? text.substring(0, 200) : '[EMPTY]');
          } catch (ocrError: any) {
            console.error('[PDF] ERROR: OCR failed:', ocrError?.message || ocrError);
            console.error('[PDF] OCR error stack:', ocrError?.stack);
            throw new Error('Failed to extract text from PDF: ' + (ocrError?.message || ocrError));
          }
        }

        if (items && items.length > 0) {
          // Group các đoạn text lại thành dòng
          console.log('[PDF] Step 3: Grouping text items into lines...');
          const groupedLines = groupTextByLine(items, 5); // Tăng threshold lên 5 để linh hoạt hơn
          console.log('[PDF] Grouped lines count:', groupedLines.length);

          for (const lineObj of groupedLines) {
            // Đảm bảo tất cả items trong line có cùng page
            const pages = new Set(lineObj.items.map(i => i.page));
            if (pages.size > 1) {
              console.warn(`[PDF] WARNING: Line has items from different pages:`, pages);
              console.warn(`[PDF] Line text:`, lineObj.text.substring(0, 100));

              // Nếu có items từ nhiều pages, tách thành nhiều entries
              const itemsByPage = new Map();
              lineObj.items.forEach((item: any) => {
                const page = item.page;
                if (!itemsByPage.has(page)) {
                  itemsByPage.set(page, []);
                }
                itemsByPage.get(page).push(item);
              });

              // Tạo entry riêng cho mỗi page
              for (const [page, pageItems] of itemsByPage) {
                const pageText = pageItems.map((i: any) => i.text).join(' ').trim();
                if (pageText.length >= 5) {
                  const minX = Math.min(...pageItems.map((i: any) => i.x));
                  const maxX = Math.max(...pageItems.map((i: any) => (i.x || 0) + (i.width || 0)));
                  const maxH = Math.max(...pageItems.map((i: any) => i.height || i.fontSize || 0));
                  manifestEntries.push({
                    projectId: String(file.project.id),
                    branchId: String(file.branch.id),
                    fileId: String(file.id),
                    manifestEntryId: uuidv4(),
                    originalText: pageText,
                    language: 'en',
                    font: pageItems[0]?.font || 'default',
                    style: {
                      bold: pageItems.some((i: any) => i.bold),
                      italic: pageItems.some((i: any) => i.italic),
                      color: pageItems[0]?.color,
                      fontSize: pageItems[0]?.fontSize || maxH || undefined,
                    },
                    position: {
                      x: minX,
                      y: Math.min(...pageItems.map((i: any) => i.y)),
                      width: isFinite(maxX - minX) ? maxX - minX : undefined,
                      height: maxH || undefined,
                      page: page,
                    },
                  });
                }
              }
              continue; // Skip the original logic for this line
            }

            // Lấy page từ item đầu tiên (vì đã được sắp xếp theo page)
            const page = lineObj.items[0]?.page || 1;

            const minX = Math.min(...lineObj.items.map((i: any) => i.x));
            const maxX = Math.max(...lineObj.items.map((i: any) => (i.x || 0) + (i.width || 0)));
            const maxH = Math.max(...lineObj.items.map((i: any) => i.height || i.fontSize || 0));
            manifestEntries.push({
              projectId: String(file.project.id),
              branchId: String(file.branch.id),
              fileId: String(file.id),
              manifestEntryId: uuidv4(),
              originalText: lineObj.text,
              language: 'en',
              font: lineObj.items[0]?.font || 'default',
              style: {
                bold: lineObj.items.some((i: any) => i.bold),
                italic: lineObj.items.some((i: any) => i.italic),
                color: lineObj.items[0]?.color,
                fontSize: lineObj.items[0]?.fontSize || maxH || undefined,
              },
              position: {
                x: minX,
                y: Math.min(...lineObj.items.map((i: any) => i.y)),
                width: isFinite(maxX - minX) ? maxX - minX : undefined,
                height: maxH || undefined,
                page: page,
              },
            });
          }
          console.log('[PDF] SUCCESS: manifestEntries from parser (grouped lines):', manifestEntries.length);
          console.log('[PDF] Sample manifest entries:', manifestEntries.slice(0, 2).map((entry: any) => ({
            text: entry.originalText?.substring(0, 50),
            page: entry.position?.page,
            font: entry.font
          })));
        }

        // Store images separately for export (not in manifest entries)
        if (result.images && result.images.length > 0) {
          console.log('[PDF] Step 4: Processing images...');
          console.log('[PDF] Found', result.images.length, 'images');

          // Store images in a separate property for later export
          // Don't add to manifestEntries to avoid cluttering the UI
          const imageData = result.images.map((image: any, i: number) => ({
            index: i + 1,
            data: image.data,
            type: image.type,
            position: {
              x: image.x,
              y: image.y,
              width: image.width,
              height: image.height,
              page: image.page,
            }
          }));

          // Store image data in the manifest for later export
          // This will be used when generating the final document
          console.log('[PDF] SUCCESS: Stored', result.images.length, 'images for export');

          // Store image data for later use (not as manifest entries)
          console.log('[PDF] Image data stored for export:', imageData.length, 'images');
        } else if (text) {
          // Xử lý kết quả text thô từ OCR
          console.log('[PDF] Step 3: Processing OCR text into lines...');
          const lines = text.split('\n').filter((l: string) => l.trim());
          console.log('[PDF] OCR lines count:', lines.length);

          // Thử phân tích page từ OCR text
          let currentPage = 1;
          const pageBreakIndicators = [
            /^page\s+\d+/i,
            /^trang\s+\d+/i,
            /^\d+\s*$/,
            /^page\s*$/i,
            /^trang\s*$/i
          ];

          for (const line of lines) {
            // Kiểm tra xem line có phải là page break indicator không
            let isPageBreak = false;
            for (const indicator of pageBreakIndicators) {
              if (indicator.test(line.trim())) {
                const pageMatch = line.match(/\d+/);
                if (pageMatch) {
                  currentPage = parseInt(pageMatch[0]);
                } else {
                  currentPage++;
                }
                isPageBreak = true;
                console.log(`[PDF] OCR detected page break: "${line}" -> page ${currentPage}`);
                break;
              }
            }

            // Bỏ qua page break indicators, chỉ thêm content
            if (!isPageBreak) {
              manifestEntries.push({
                projectId: String(file.project.id),
                branchId: String(file.branch.id),
                fileId: String(file.id),
                manifestEntryId: uuidv4(),
                originalText: line,
                language: 'en',
                font: 'default',
                style: {},
                position: { x: 0, y: 0, page: currentPage }, // Sử dụng currentPage thay vì mặc định 1
              });
            }
          }
          console.log('[PDF] SUCCESS: manifestEntries from OCR:', manifestEntries.length);
          console.log('[PDF] Sample OCR entries:', manifestEntries.slice(0, 2).map((entry: any) => ({
            text: entry.originalText?.substring(0, 50),
            page: entry.position?.page
          })));
        } else {
          console.error('[PDF] ERROR: No text extracted from PDF (parser and OCR failed)');
          console.error('[PDF] Items count:', items?.length || 0);
          console.error('[PDF] Text length:', text?.length || 0);
          throw new Error('No text could be extracted from PDF (parser and OCR failed)');
        }

        // Debug: Kiểm tra page distribution
        const pageDistribution = new Map<number, number>();
        manifestEntries.forEach((entry: any) => {
          const page = entry.position?.page || 1;
          pageDistribution.set(page, (pageDistribution.get(page) || 0) + 1);
        });

        console.log('[PDF] Page distribution:');
        const sortedPages = Array.from(pageDistribution.keys()).sort((a, b) => a - b);
        for (const page of sortedPages) {
          console.log(`[PDF] Page ${page}: ${pageDistribution.get(page)} entries`);
        }

        console.log('=== PDF PROCESSING COMPLETE ===');
        console.log('[PDF] Final manifest entries count:', manifestEntries.length);
        console.log('[PDF] Used OCR:', usedOcr);
        console.log('[PDF] Processing method:', usedOcr ? 'OCR' : 'Parser');
        console.log('[PDF] Total pages found:', sortedPages.length);
        break;
      }

      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
        // Sử dụng mammoth để extract HTML giữ bố cục logic
        const { value: html } = await mammoth.convertToHtml({ buffer: file.fileContent });
        // Parse HTML để tách từng đoạn, heading, bảng, list, caption, v.v.
        const cheerio = await import('cheerio');
        const $ = cheerio.load(html);
        let pictureCount = 1;
        // Tách từng đoạn, heading, cell, list item, caption, th, blockquote, pre, figcaption
        const selectors = 'p, h1, h2, h3, h4, h5, h6, li, td, caption, th, blockquote, pre, figcaption';
        $(selectors).each((i: number, el: any) => {
          const html = $(el).html()?.trim(); // Lấy innerHTML để giữ tag con
          // Bỏ qua nếu chỉ là ảnh (không có text nào ngoài <img>)
          const textOnly = $(el).text().trim();
          // Nếu đoạn chỉ chứa <img> (không có text), tạo entry Picture N
          if ($(el).find('img').length > 0 && (!textOnly || textOnly.length === 0)) {
            $(el).find('img').each((j: number, img: any) => {
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
          .filter((l: string) => l.trim());
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
        function extractStrings(obj: any, out: string[] = []): string[] {
          if (typeof obj === 'string') {
            out.push(obj);
          } else if (Array.isArray(obj)) {
            for (const item of obj) extractStrings(item, out);
          } else if (typeof obj === 'object' && obj !== null) {
            for (const key in obj) extractStrings(obj[key], out);
          }
          return out;
        }
        let jsonContent: any;
        try {
          jsonContent = JSON.parse(file.fileContent.toString());
        } catch (e: any) {
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
          .filter((l: string) => l.trim());
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

    // Chia part theo loại file
    if (file.fileType === 'application/pdf') {
      // PDF: chia theo page gốc
      assignFilePartsByPage(manifestEntries);
      console.log(`[MANIFEST] Assigned file parts by page for PDF. Total entries: ${manifestEntries.length}`);
    } else {
      // DOCX và file khác: chia theo 100 strings/page
      assignFilePartsForDocx(manifestEntries);
      console.log(`[MANIFEST] Assigned file parts by 100 strings/page for DOCX. Total entries: ${manifestEntries.length}`);
    }

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
        // Nếu đã có, update obsolete: false, filePart mới và position (bao gồm page)
        await this.translationModel.updateOne({ _id: existing._id }, {
          $set: {
            obsolete: false,
            filePart: entry.filePart,
            position: entry.position // Cập nhật position để đảm bảo thông tin page được lưu trữ
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
  items: {
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
  }[];
  images: {
    data: Buffer;
    x: number;
    y: number;
    width: number;
    height: number;
    page: number;
    type: string;
  }[];
}> {
  try {
    console.log('[PDF] Starting PDF parsing with pdfjs-dist...');
    console.log('[PDF] Buffer size:', buffer.length, 'bytes');

    // Thiết lập worker cho pdfjs-dist - thử nhiều cách khác nhau
    const possibleWorkerPaths = [
      path.resolve(process.cwd(), 'node_modules/pdfjs-dist/build/pdf.worker.js'),
      path.resolve(process.cwd(), 'node_modules/pdfjs-dist/legacy/build/pdf.worker.js'),
      path.resolve(process.cwd(), '../../node_modules/pdfjs-dist/build/pdf.worker.js'),
      path.resolve(process.cwd(), '../../node_modules/pdfjs-dist/legacy/build/pdf.worker.js'),
    ];

    let workerPath = null;
    for (const workerPathOption of possibleWorkerPaths) {
      try {
        fs.accessSync(workerPathOption);
        workerPath = workerPathOption;
        console.log('[PDF] Found worker at:', workerPath);
        break;
      } catch (e) {
        console.log('[PDF] Worker not found at:', workerPathOption);
      }
    }

    if (!workerPath) {
      console.warn('[PDF] No worker found, using default');
      pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    } else {
      pdfjs.GlobalWorkerOptions.workerSrc = workerPath;
    }

    console.log('[PDF] Loading PDF document...');
    // Convert Buffer to Uint8Array as required by pdfjs-dist
    const uint8Array = new Uint8Array(buffer);
    const doc = await pdfjs.getDocument({ data: uint8Array }).promise;
    console.log('[PDF] PDF loaded successfully, pages:', doc.numPages);

    const numPages = doc.numPages;
    const allItems = [];
    const allImages = [];
    let fullText = '';

    for (let i = 1; i <= numPages; i++) {
      console.log(`[PDF] Processing page ${i}/${numPages}...`);
      const page = await doc.getPage(i);
      const viewport = page.getViewport({ scale: 1.0 });
      const textContent = await page.getTextContent();

      console.log(`[PDF] Page ${i} has ${textContent.items.length} text items`);

      fullText += textContent.items.map((item: any) => item.str).join(' ');

      // Extract images from page
      try {
        const operatorList = await page.getOperatorList();
        const images = [];

        for (let j = 0; j < operatorList.fnArray.length; j++) {
          if (operatorList.fnArray[j] === pdfjs.OPS.paintImageXObject) {
            const imageObj = operatorList.argsArray[j][0];
            const img = page.objs.get(imageObj);

            if (img && img.data) {
              // Get transform matrix for position calculation
              const transform = operatorList.argsArray[j][1];
              const x = transform ? transform[4] || 0 : 0;
              const y = transform ? transform[5] || 0 : 0;

              images.push({
                data: Buffer.from(img.data),
                x: x,
                y: y,
                width: img.width || 100,
                height: img.height || 100,
                page: i,
                type: img.format || 'jpeg'
              });
            }
          }
        }

        allImages.push(...images);
        console.log(`[PDF] Page ${i} has ${images.length} images`);
      } catch (error) {
        console.log(`[PDF] Error extracting images from page ${i}:`, error);
      }

      for (const item of textContent.items) {
        if (!item.str.trim()) continue;

        const tx = item.transform;
        const x = tx[4];
        const y = viewport.height - tx[5]; // y trong pdfjs tính từ dưới lên
        const height = item.height;
        const width = item.width;
        const fontName = item.fontName;

        // Heuristics đơn giản để xác định style từ font name
        const isBold = fontName.toLowerCase().includes('bold');
        const isItalic = fontName.toLowerCase().includes('italic');

        // Enhanced text cleaning for better extraction
        let cleanText = item.str;

        // Try multiple encoding approaches
        const encodingAttempts = [
          () => cleanText, // Original
          () => Buffer.from(cleanText, 'latin1').toString('utf8'),
          () => Buffer.from(cleanText, 'latin1').toString('cp1252'),
          () => Buffer.from(cleanText, 'latin1').toString('iso-8859-1'),
        ];

        let bestText = cleanText;
        let bestScore = 0;

        for (const attempt of encodingAttempts) {
          try {
            const decoded = attempt();
            // Score based on Vietnamese characters and readability
            const vietnameseRegex = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
            const hasVietnamese = vietnameseRegex.test(decoded);

            // Calculate readability score
            const readableChars = decoded.replace(/[^a-zA-ZÀ-ỹ0-9\s.,!?;:()[\]{}"'`~@#$%^&*+=|\\/<>]/g, '');
            const score = readableChars.length / decoded.length;

            if (hasVietnamese || score > bestScore) {
              bestText = decoded;
              bestScore = score;
            }
          } catch (e) {
            // Continue with next attempt
          }
        }

        // Less aggressive validation - only skip obviously garbled text
        if (bestText.length > 15) {
          const charCount = {};
          for (const char of bestText) {
            charCount[char] = (charCount[char] || 0) + 1;
          }
          const maxCharCount = Math.max(...Object.values(charCount));
          const totalChars = bestText.length;

          // Only skip if more than 60% is the same character (very garbled)
          if (maxCharCount / totalChars > 0.6) {
            console.log(`[PDF] Skipping very garbled text: ${bestText.substring(0, 50)}`);
            continue;
          }
        }

        cleanText = bestText;

        allItems.push({
          text: cleanText,
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
    }

    console.log('[PDF] Parsing completed. Total items:', allItems.length, 'Total images:', allImages.length, 'Total text length:', fullText.length);
    return { text: fullText, items: allItems, images: allImages };
  } catch (error: any) {
    console.error('[PDF] Error in parsePdfWithFonts:', error?.message || error);
    console.error('[PDF] Error stack:', error?.stack);
    throw error;
  }
}
