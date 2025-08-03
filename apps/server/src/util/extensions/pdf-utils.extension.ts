import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

/**
 * Build a translated PDF from text entries.
 * ⚠️ This is a reconstruction, not an in-place edit.
 * @param originalBuffer Original PDF (currently unused in simple rebuild, see notes below)
 * @param entries Array of translated entries (in order)
 * @returns Buffer of new PDF
 */
export async function buildTranslatedPdf(
  originalBuffer: Buffer,
  entries: { text: string }[]
): Promise<Buffer> {
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
      color: rgb(0, 0, 0),
    });
    y -= lineHeight;

    if (y < 40) {
      page = pdfDoc.addPage([width, height]);
      y = height - 24;
    }
  }

  const newPdfBytes = await pdfDoc.save();
  return Buffer.from(newPdfBytes);
}
