import Docx4js from 'docx4js';

/**
 * Replace text in a DOCX file while preserving layout, styles, tables, images, etc.
 * @param originalBuffer Buffer of the original docx file
 * @param translations Map of originalText -> translatedText
 * @returns Buffer of the updated docx
 */
export async function replaceDocxText(
  originalBuffer: Buffer,
  translations: Map<string, string>
): Promise<Buffer> {
  try {
    const docx: any = await Docx4js.load(originalBuffer);

    const body = docx.mainDocumentPart?.document?.body;
    if (!body) {
      console.warn('DOCX body not found, returning original file');
      return originalBuffer;
    }

    let hasChanges = false;
    body.descendants().forEach((node: any) => {
      if (node.type === 'w:t') {
        const oldText: string = node.text();
        if (oldText && translations.has(oldText)) {
          node.text(translations.get(oldText));
          hasChanges = true;
        }
      }
    });

    if (!hasChanges) {
      console.warn('No text replacements found in DOCX, returning original file');
      return originalBuffer;
    }

    const out = await docx.save('nodebuffer');
    return out as Buffer;
  } catch (error) {
    console.error('Error processing DOCX file:', error);
    console.warn('Returning original file due to processing error');
    return originalBuffer;
  }
}
