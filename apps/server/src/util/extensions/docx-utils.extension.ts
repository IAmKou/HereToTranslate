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
    console.log('[DOCX-UTILS] Starting DOCX text replacement...');
    console.log(`[DOCX-UTILS] Processing ${translations.size} translations`);
    
    const docx: any = await Docx4js.load(originalBuffer);

    const body = docx.mainDocumentPart?.document?.body;
    if (!body) {
      throw new Error('DOCX body not found. The file may be corrupted or not a valid DOCX.');
    }
    
    let replacementCount = 0;
    const descendants = body.descendants();
    console.log(`[DOCX-UTILS] Found ${descendants.length} document nodes`);
    
    descendants.forEach((node: any) => {
      try {
        if (node.type === 'w:t') {
          const oldText: string = node.text();
          if (oldText && translations.has(oldText)) {
            const newText = translations.get(oldText);
            if (newText && newText !== oldText) {
              node.text(newText);
              replacementCount++;
              console.log(`[DOCX-UTILS] Replaced: "${oldText.substring(0, 50)}..." -> "${newText.substring(0, 50)}..."`);
            }
          }
        }
      } catch (nodeError) {
        console.warn('[DOCX-UTILS] Error processing node:', nodeError);
        // Continue with other nodes
      }
    });

    console.log(`[DOCX-UTILS] Made ${replacementCount} text replacements`);

    const out = await docx.save('nodebuffer');
    console.log(`[DOCX-UTILS] Successfully generated DOCX buffer of ${(out as Buffer).length} bytes`);
    
    return out as Buffer;
  } catch (error) {
    console.error('[DOCX-UTILS] Error in replaceDocxText:', error);
    throw new Error(`Failed to process DOCX file: ${error instanceof Error ? error.message : String(error)}`);
  }
}
