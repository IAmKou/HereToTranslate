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

    // Try different ways to access the document body
    let body = docx.mainDocumentPart?.document?.body;

    if (!body) {
      // Try alternative paths
      body = docx.document?.body;
    }

    if (!body) {
      // Try getting from mainDocumentPart directly
      const mainPart = docx.mainDocumentPart;
      if (mainPart && mainPart.document) {
        body = mainPart.document.body;
      }
    }

    if (!body) {
      // If still no body, try to find it in the document structure
      const document = docx.document || docx.mainDocumentPart?.document;
      if (document) {
        body = document.body || document.getElementsByTagName('w:body')[0];
      }
    }

    if (!body) {
      console.warn('DOCX body not found, returning original file');
      return originalBuffer;
    }

    // Process text nodes
    let textNodesProcessed = 0;
    body.descendants().forEach((node: any) => {
      if (node.type === 'w:t' || node.nodeType === 'w:t') {
        const oldText: string = node.text ? node.text() : node.textContent;
        if (oldText && translations.has(oldText)) {
          const newText = translations.get(oldText);
          if (node.text) {
            node.text(newText);
          } else if (node.textContent !== undefined) {
            node.textContent = newText;
          }
          textNodesProcessed++;
        }
      }
    });

    console.log(`Processed ${textNodesProcessed} text nodes in DOCX`);

    const out = await docx.save('nodebuffer');
    return out as Buffer;
  } catch (error) {
    console.error('Error processing DOCX:', error);
    // Return original buffer if processing fails
    return originalBuffer;
  }
}
