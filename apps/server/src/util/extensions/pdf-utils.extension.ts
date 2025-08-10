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
  try {
    console.log('[PDF-UTILS] Starting PDF translation build...');
    console.log(`[PDF-UTILS] Processing ${entries.length} text entries`);
    
    const originalPdf = await PDFDocument.load(originalBuffer);
    const pageCount = originalPdf.getPageCount();
    const [firstPage] = originalPdf.getPages();
    const { width, height } = firstPage.getSize();

    console.log(`[PDF-UTILS] Original PDF: ${pageCount} pages, ${width}x${height} size`);

    const pdfDoc = await PDFDocument.create();
    let page = pdfDoc.addPage([width, height]);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    let y = height - 24;
    const lineHeight = 16;
    const margin = 50;
    let pageNumber = 1;
    let entryCount = 0;

    for (const entry of entries) {
      try {
        // Skip empty entries
        if (!entry.text || entry.text.trim().length === 0) {
          continue;
        }

        const text = entry.text.trim();
        
        // Handle long text by wrapping
        const maxWidth = width - (margin * 2);
        const fontSize = 12;
        const textWidth = font.widthOfTextAtSize(text, fontSize);
        
        if (textWidth > maxWidth) {
          // Simple word wrapping
          const words = text.split(' ');
          let currentLine = '';
          
          for (const word of words) {
            const testLine = currentLine ? `${currentLine} ${word}` : word;
            const testWidth = font.widthOfTextAtSize(testLine, fontSize);
            
            if (testWidth > maxWidth && currentLine) {
              // Draw current line and start new one
              page.drawText(currentLine, {
                x: margin,
                y,
                size: fontSize,
                font,
                color: rgb(0, 0, 0),
              });
              y -= lineHeight;
              currentLine = word;
              
              // Check if we need a new page
              if (y < 40) {
                page = pdfDoc.addPage([width, height]);
                y = height - 24;
                pageNumber++;
              }
            } else {
              currentLine = testLine;
            }
          }
          
          // Draw the last line
          if (currentLine) {
            page.drawText(currentLine, {
              x: margin,
              y,
              size: fontSize,
              font,
              color: rgb(0, 0, 0),
            });
            y -= lineHeight;
          }
        } else {
          // Text fits on one line
          page.drawText(text, {
            x: margin,
            y,
            size: fontSize,
            font,
            color: rgb(0, 0, 0),
          });
          y -= lineHeight;
        }

        entryCount++;

        // Check if we need a new page
        if (y < 40) {
          page = pdfDoc.addPage([width, height]);
          y = height - 24;
          pageNumber++;
        }
      } catch (entryError) {
        console.warn(`[PDF-UTILS] Error processing entry ${entryCount}:`, entryError);
        // Continue with other entries
      }
    }

    console.log(`[PDF-UTILS] Successfully processed ${entryCount} entries across ${pageNumber} pages`);

    const newPdfBytes = await pdfDoc.save();
    const resultBuffer = Buffer.from(newPdfBytes);
    
    console.log(`[PDF-UTILS] Generated PDF buffer of ${resultBuffer.length} bytes`);
    return resultBuffer;
  } catch (error) {
    console.error('[PDF-UTILS] Error in buildTranslatedPdf:', error);
    throw new Error(`Failed to build translated PDF: ${error instanceof Error ? error.message : String(error)}`);
  }
}
