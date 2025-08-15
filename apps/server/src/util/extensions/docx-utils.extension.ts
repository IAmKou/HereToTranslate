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
    // Validate input
    if (!originalBuffer || originalBuffer.length === 0) {
      throw new Error('Empty or invalid buffer provided');
    }

    console.log(`[DOCX] Loading DOCX file, buffer size: ${originalBuffer.length} bytes`);
    
    const docx: any = await Docx4js.load(originalBuffer);
    
    console.log(`[DOCX] DOCX loaded successfully, structure:`, {
      hasMainDocumentPart: !!docx.mainDocumentPart,
      hasDocument: !!docx.mainDocumentPart?.document,
      hasBody: !!docx.mainDocumentPart?.document?.body
    });

    const body = docx.mainDocumentPart?.document?.body;
    if (!body) {
      // Try alternative paths for DOCX structure
      const alternativeBody = docx.document?.body || 
                            docx.mainDocumentPart?.body ||
                            docx.body;
      
      if (alternativeBody) {
        console.log(`[DOCX] Found alternative body path`);
        return await processDocxBody(alternativeBody, translations, docx);
      }
      
      // Log the full structure for debugging
      console.error(`[DOCX] Full DOCX structure:`, JSON.stringify(docx, null, 2));
      throw new Error('DOCX body not found. The file may be corrupted or not a valid DOCX.');
    }

    return await processDocxBody(body, translations, docx);
  } catch (error) {
    console.error(`[DOCX] Error processing DOCX:`, error);
    
    // If the file is corrupted, return the original buffer as fallback
    console.warn(`[DOCX] Returning original file as fallback due to processing error`);
    return originalBuffer;
  }
}

/**
 * Same as replaceDocxText but returns the number of replaced text nodes.
 */
export async function replaceDocxTextWithCount(
  originalBuffer: Buffer,
  translations: Map<string, string>
): Promise<{ buffer: Buffer; replacedCount: number }> {
  try {
    if (!originalBuffer || originalBuffer.length === 0) {
      throw new Error('Empty or invalid buffer provided');
    }

    const docx: any = await Docx4js.load(originalBuffer);
    const body = docx.mainDocumentPart?.document?.body
      || docx.document?.body
      || docx.mainDocumentPart?.body
      || docx.body;

    if (!body) {
      throw new Error('DOCX body not found. The file may be corrupted or not a valid DOCX.');
    }

    let replacementCount = 0;
    body.descendants().forEach((node: any) => {
      if (node.type === 'w:t') {
        const oldText: string = node.text();
        if (oldText && translations.has(oldText)) {
          node.text(translations.get(oldText));
          replacementCount++;
        }
      }
    });

    const buffer = (await docx.save('nodebuffer')) as Buffer;
    return { buffer, replacedCount: replacementCount };
  } catch (error) {
    console.error(`[DOCX] Error processing DOCX:`, error);
    return { buffer: originalBuffer, replacedCount: 0 };
  }
}

async function processDocxBody(body: any, translations: Map<string, string>, docx: any): Promise<Buffer> {
  let replacementCount = 0;
  
  body.descendants().forEach((node: any) => {
    if (node.type === 'w:t') {
      const oldText: string = node.text();
      if (oldText && translations.has(oldText)) {
        node.text(translations.get(oldText));
        replacementCount++;
      }
    }
  });

  console.log(`[DOCX] Replaced ${replacementCount} text nodes`);

  const out = await docx.save('nodebuffer');
  return out as Buffer;
}
