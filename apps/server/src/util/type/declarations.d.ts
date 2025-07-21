declare module 'pdf-parse' {
  import { Buffer } from 'buffer';

  interface PDFParseResult {
    numpages: number;
    numrender: number;
    info: any;
    metadata: any;
    version: string;
    text: string;
  }

  function pdfParse(buffer: Buffer | Uint8Array): Promise<PDFParseResult>;

  export default pdfParse;
}

declare module 'docx4js' {
  interface DocxRun {
    text(): string;
    props?: {
      rPr?: {
        sz?: number | { val?: number };
        b?: boolean | { val?: boolean | string };
        i?: boolean | { val?: boolean | string };
        color?: string | { val?: string };
        rFonts?: {
          ascii?: string;
        };
      };
    };
  }

  interface DocxParagraph {
    runs?: DocxRun[];
  }

  interface DocxDocument {
    paragraphs?: DocxParagraph[];
  }

  function load(buffer: ArrayBuffer | Buffer): Promise<DocxDocument>;

  export { load };
  export default {
    load: load,
  };
}
