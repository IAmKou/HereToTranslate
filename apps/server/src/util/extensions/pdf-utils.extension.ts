import { PDFTronBridge, PDFTronReplacementEntry } from './pdftron-bridge';
import * as path from 'path';
import * as fs from 'fs';

// Use dynamic import to avoid type resolution issues at build time
async function getPdfLib() {
  return await import('pdf-lib');
}

// Dynamic import for pdfjs-dist to avoid import issues
let pdfjs: any = null;

/**
 * Parse PDF with font information using pdfjs-dist - Focused on text extraction
 */
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
  pageCount: number;
}> {
  try {
    console.log('[PDF] Starting PDF parsing with pdfjs-dist (text-focused)...');
    console.log('[PDF] Buffer size:', buffer.length, 'bytes');

    // Initialize pdfjs if not already done
    if (!pdfjs) {
      try {
        pdfjs = await import('pdfjs-dist');
        console.log('[PDF] PDF.js imported successfully');
      } catch (importError) {
        console.error('[PDF] Failed to import PDF.js:', importError);
        throw new Error('PDF.js library not available');
      }
    }

    // Set up worker for pdfjs-dist
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

      // Skip detailed image extraction - just get basic info for preview
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

              // Store basic image info for preview (skip detailed processing)
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
        console.log(`[PDF] Page ${i} has ${images.length} images (basic info only)`);
      } catch (error) {
        console.log(`[PDF] Error extracting basic image info from page ${i}:`, error);
      }

      // Focus on text extraction with enhanced processing
      for (const item of textContent.items) {
        if (!item.str.trim()) continue;

        const tx = item.transform;
        const x = tx[4];
        const y = viewport.height - tx[5]; // y in pdfjs is calculated from bottom up
        const height = item.height;
        const width = item.width;
        const fontName = item.fontName;

        // Simple heuristics to determine style from font name
        const isBold = fontName.toLowerCase().includes('bold');
        const isItalic = fontName.toLowerCase().includes('italic');

        // Enhanced text cleaning for better extraction
        let cleanText = item.str;

        // Try multiple encoding approaches - only use supported encodings
        const encodingAttempts = [
          () => cleanText, // Original
          () => Buffer.from(cleanText, 'latin1').toString('utf8'),
          () => Buffer.from(cleanText, 'latin1').toString('ascii'),
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
          const charCount: Record<string, number> = {};
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
          color: '#000000', // pdfjs-dist doesn't easily get colors, set default
          x,
          y,
          width,
          height,
          page: i,
        });
      }
    }

    console.log('[PDF] Text-focused parsing completed. Total items:', allItems.length, 'Total images (basic):', allImages.length, 'Total text length:', fullText.length);
    return { text: fullText, items: allItems, images: allImages, pageCount: numPages };
  } catch (error: any) {
    console.error('[PDF] Error in parsePdfWithFonts:', error?.message || error);
    console.error('[PDF] Error stack:', error?.stack);
    throw error;
  }
}

/**
 * Build a translated PDF from text entries.
 * ⚠️ This is a reconstruction, not an in-place edit.
 * @param originalBuffer Original PDF (currently unused in simple rebuild, see notes below)
 * @param entries Array of translated entries (in order)
 * @returns Buffer of new PDF
 */
export async function buildTranslatedPdf(
  originalBuffer: any,
  entries: { text: string }[]
): Promise<any> {
  const { PDFDocument, StandardFonts, rgb: makeRgb } = await getPdfLib();
  const originalPdf = await PDFDocument.load(originalBuffer);
  // const pageCount = originalPdf.getPageCount();
  const [firstPage] = originalPdf.getPages();
  const { width, height } = firstPage.getSize();

  const pdfDoc = await PDFDocument.create();
  let page = pdfDoc.addPage([width, height]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  let y = height - 24;
  const lineHeight = 16;
  const margin = 50;

  for (const entry of entries) {
    // Draw text
    page.drawText(entry.text, {
      x: margin,
      y,
      size: 12,
      font,
      color: makeRgb(0, 0, 0),
    });
    y -= lineHeight;

    if (y < 40) {
      page = pdfDoc.addPage([width, height]);
      y = height - 24;
    }
  }

  const newPdfBytes = await pdfDoc.save();
  return newPdfBytes;
}

/**
 * Overlay translations onto the original PDF at recorded positions, attempting to preserve layout.
 * If coverOriginal is true, draws a white rectangle behind each translated text to hide the original.
 */
export async function overlayTranslationsOnPdf(
  originalBuffer: any,
  entries: Array<{
    text: string;
    position?: { x: number; y: number; width?: number; height?: number; page?: number };
    style?: { bold?: boolean; italic?: boolean; color?: string; fontSize?: number };
    font?: string;
  }>,
  options?: { coverOriginal?: boolean }
): Promise<any> {
  const coverOriginal = options?.coverOriginal ?? true;

  const { PDFDocument, StandardFonts, rgb: makeRgb } = await getPdfLib();
  const pdfDoc = await PDFDocument.load(originalBuffer);

  // Pre-embed common fonts for simple bold/italic handling
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const helveticaOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  // Helper to parse hex color like '#RRGGBB' into rgb()
  function parseColor(color?: string) {
    if (!color) return makeRgb(0, 0, 0);
    const hex = color.startsWith('#') ? color.slice(1) : color;
    if (hex.length === 6) {
      const r = parseInt(hex.slice(0, 2), 16) / 255;
      const g = parseInt(hex.slice(2, 4), 16) / 255;
      const b = parseInt(hex.slice(4, 6), 16) / 255;
      if (Number.isFinite(r) && Number.isFinite(g) && Number.isFinite(b)) return makeRgb(r, g, b);
    }
    return makeRgb(0, 0, 0);
  }

  // Simple word-wrap to original line width
  function wrapText(t: string, font: any, size: number, maxWidth: number): string[] {
    const words = t.split(/\s+/);
    const lines: string[] = [];
    let current = '';
    for (const w of words) {
      const candidate = current ? current + ' ' + w : w;
      const wWidth = font.widthOfTextAtSize(candidate, size);
      if (wWidth <= maxWidth || current === '') {
        current = candidate;
      } else {
        lines.push(current);
        current = w;
      }
    }
    if (current) lines.push(current);
    return lines;
  }

  for (const entry of entries) {
    const pageIndex = Math.max(0, (entry.position?.page ?? 1) - 1);
    if (pageIndex >= pdfDoc.getPageCount()) continue;
    const page = pdfDoc.getPages()[pageIndex];
    const pageHeight = page.getHeight();

    const x = Math.max(0, entry.position?.x ?? 50);
    // Assume extracted Y is from top; convert to pdf-lib coordinate from bottom
    const yTop = Math.max(0, entry.position?.y ?? 50);
    const y = Math.max(0, pageHeight - yTop);

    const style = entry.style ?? {};
    const size = Math.max(6, Math.min(64, style.fontSize ?? 12));
    const color = parseColor(style.color);

    // Pick font variant (very rough approximation)
    const font = style.bold ? helveticaBold : style.italic ? helveticaOblique : helvetica;

    const text = entry.text ?? '';
    if (!text) continue;

    const maxWidth = Math.max(0, entry.position?.width ?? (page.getWidth() - x - 40));
    const lineHeight = (entry.position?.height && entry.position.height > 0)
      ? entry.position.height * 1.05
      : size * 1.2;

    const lines = wrapText(text, font, size, maxWidth);
    const blockHeight = lines.length * lineHeight;
    if (coverOriginal) {
      page.drawRectangle({ x, y: y - (lineHeight * 0.8), width: maxWidth, height: blockHeight, color: makeRgb(1, 1, 1) });
    }

    let drawY = y;
    for (const line of lines) {
      page.drawText(line, { x, y: drawY, size, font, color });
      drawY -= lineHeight;
      if (drawY < 20) break; // avoid drawing off page
    }
  }

  const out = await pdfDoc.save();
  return out;
}

/**
 * Replace text in PDF using PDFTron for better layout preservation
 * This function provides true text replacement while maintaining formatting
 */
export async function replacePdfTextWithPDFTron(
  originalBuffer: Buffer,
  replacements: PDFTronReplacementEntry[],
  pdfTronBridge?: PDFTronBridge
): Promise<Buffer> {
  // If PDFTron bridge is provided and available, use it
  if (pdfTronBridge && pdfTronBridge.isAvailable()) {
    try {
      console.log('[PDF] Using PDFTron for text replacement...');
      return await pdfTronBridge.replaceTextWithPDFTron(originalBuffer, replacements);
    } catch (error) {
      console.error('[PDF] PDFTron replacement failed, falling back to overlay:', error);
      // Fall back to overlay method
    }
  }

  // Fall back to overlay method if PDFTron is not available
  console.log('[PDF] Using overlay method for text replacement...');
  const overlayEntries = replacements.map((entry) => ({
    text: entry.translatedText,
    position: entry.position,
    style: entry.style,
    font: entry.style?.font,
  }));

  const updatedBytes = await overlayTranslationsOnPdf(
    originalBuffer,
    overlayEntries,
    { coverOriginal: true }
  );
  return Buffer.from(updatedBytes);
}

/**
 * Extract text from PDF using PDFTron for better accuracy - Focused on text extraction
 */
export async function extractPdfTextWithPDFTron(
  buffer: Buffer,
  pdfTronBridge?: PDFTronBridge
): Promise<{
  text: string;
  items: any[];
  images: any[];
  pageCount: number;
  metadata?: any;
}> {
  // If PDFTron bridge is provided and available, use it
  if (pdfTronBridge && pdfTronBridge.isAvailable()) {
    try {
      console.log('[PDF] Using PDFTron for text extraction...');
      const result = await pdfTronBridge.extractTextWithPDFTron(buffer);
      
      // Convert PDFTron items to the expected format
      const convertedItems = result.items.map(item => ({
        text: item.text,
        font: item.font,
        fontSize: item.fontSize,
        bold: item.bold,
        italic: item.italic,
        color: item.color,
        x: item.x,
        y: item.y,
        width: item.width,
        height: item.height,
        page: item.page,
      }));

      // Keep basic image info for preview (skip detailed processing)
      const convertedImages = result.images.map(image => ({
        data: image.data,
        x: image.x,
        y: image.y,
        width: image.width,
        height: image.height,
        page: image.page,
        type: image.type,
      }));

      console.log('[PDF] PDFTron extraction successful - focusing on text quality');
      return {
        text: result.text,
        items: convertedItems,
        images: convertedImages,
        pageCount: result.pageCount,
        metadata: result.metadata,
      };
    } catch (error) {
      console.error('[PDF] PDFTron extraction failed, falling back to pdfjs-dist:', error);
      // Fall back to pdfjs-dist method
    }
  }

  // Fall back to existing pdfjs-dist method (text-focused)
  console.log('[PDF] Using pdfjs-dist for text extraction...');
  return await parsePdfWithFonts(buffer);
}
