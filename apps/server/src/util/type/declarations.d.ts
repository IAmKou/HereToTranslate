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

declare module 'pdfjs-dist' {
  export * as pdfjs from 'pdfjs-dist';
}

declare module 'pdf-lib' {
  export const StandardFonts: any;
  export function rgb(r: number, g: number, b: number): any;
  export class PDFDocument {
    static load(data: any): Promise<PDFDocument>;
    static create(): Promise<PDFDocument>;
    getPageCount(): number;
    getPages(): any[];
    getPage(index: number): any;
    addPage(size?: [number, number] | any): any;
    save(): Promise<any>;
    embedFont(font: any): Promise<any>;
  }
}

declare module 'xliff' {
  export function js2xliff(
    data: any,
    options?: {
      indent?: string;
      xmlDeclaration?: boolean;
    }
  ): string;

  export function xliff2js(
    xliff: string,
    options?: {
      ignoreAttributes?: boolean;
    }
  ): Promise<any>;

  export function target2js(
    xliff: string,
    options?: {
      ignoreAttributes?: boolean;
    }
  ): Promise<any>;

  export function js2target(
    data: any,
    options?: {
      indent?: string;
      xmlDeclaration?: boolean;
    }
  ): string;
}
