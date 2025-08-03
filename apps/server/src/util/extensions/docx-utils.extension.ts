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
  const docx: any = await Docx4js.load(originalBuffer);

  const body = docx.mainDocumentPart?.document?.body;
  if (!body) {
    throw new Error('DOCX body not found. The file may be corrupted or not a valid DOCX.');
  }
  body.descendants().forEach((node: any) => {
    if (node.type === 'w:t') {
      const oldText: string = node.text();
      if (oldText && translations.has(oldText)) {
        node.text(translations.get(oldText));
      }
    }
  });

  const out = await docx.save('nodebuffer');
  return out as Buffer;
}
