// Use dynamic import to avoid type resolution issues at build time
async function getPdfLib() {
  return await import('pdf-lib');
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

    // Simple word-wrap to original line width
    function wrapText(t: string): string[] {
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

    const lines = wrapText(text);
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
