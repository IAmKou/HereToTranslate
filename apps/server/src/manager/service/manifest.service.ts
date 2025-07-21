import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  TranslationString,
  TranslationStringDocument,
} from '../../db/mongo/schema/translation.schema';
import PDFParser from 'pdf2json';
import * as Docx4js from 'docx4js';
import { v4 as uuidv4 } from 'uuid';
import { FileEntity } from '#LocalProject/Entities';

@Injectable()
export class ManifestService {
  constructor(
    @InjectModel(TranslationString.name)
    private readonly translationModel: Model<TranslationStringDocument>
  ) {}

  async generateManifest(file: FileEntity): Promise<void> {
    const manifestEntries: Partial<TranslationString>[] = [];

    switch (file.fileType) {
      case 'application/pdf': {
        const result = await parsePdfWithFonts(file.fileContent);
        for (const item of result.items) {
          manifestEntries.push({
            projectId: String(file.project.id),
            branchId: String(file.branch.id),
            fileId: String(file.id),
            manifestEntryId: uuidv4(),
            originalText: item.text,
            font: item.font,
            style: {},
            position: { x: item.x, y: item.y, page: item.page },
          });
        }
        break;
      }

      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
        const doc = await Docx4js.load(file.fileContent);
        if (!doc.paragraphs || !Array.isArray(doc.paragraphs)) break;

        for (const para of doc.paragraphs) {
          const runs = para.runs || [];
          for (const run of runs) {
            const text = run.text();
            if (text && text.trim().length > 0) {
              const styleObj: Record<string, any> = {};
              const rPr = run.props?.rPr;

              if (rPr) {
                // Font size
                if (typeof rPr.sz === 'number') {
                  styleObj.fontSize = rPr.sz;
                } else if (
                  typeof rPr.sz === 'object' &&
                  rPr.sz.val !== undefined
                ) {
                  styleObj.fontSize = rPr.sz.val;
                }

                // Bold
                if (rPr.b !== undefined) {
                  if (typeof rPr.b === 'boolean') styleObj.bold = rPr.b;
                  else if (typeof rPr.b === 'object' && 'val' in rPr.b) {
                    styleObj.bold = rPr.b.val === true || rPr.b.val === '1';
                  }
                }

                // Italic
                if (rPr.i !== undefined) {
                  if (typeof rPr.i === 'boolean') styleObj.italic = rPr.i;
                  else if (typeof rPr.i === 'object' && 'val' in rPr.i) {
                    styleObj.italic = rPr.i.val === true || rPr.i.val === '1';
                  }
                }

                // Color
                if (rPr.color !== undefined) {
                  if (typeof rPr.color === 'string') {
                    styleObj.color = rPr.color;
                  } else if (
                    typeof rPr.color === 'object' &&
                    'val' in rPr.color
                  ) {
                    styleObj.color = rPr.color.val;
                  }
                }
              }

              // Font name
              let fontName = 'default';
              if (rPr?.rFonts?.ascii) {
                fontName = rPr.rFonts.ascii;
              }

              manifestEntries.push({
                projectId: String(file.project.id),
                branchId: String(file.branch.id),
                fileId: String(file.id),
                manifestEntryId: uuidv4(),
                originalText: text,
                font: fontName,
                style: styleObj,
                position: { x: 0, y: 0 }, // flow-based docx doesn't have positions
              });
            }
          }
        }
        break;
      }

      default: {
        // fallback plain text
        const lines = file.fileContent
          .toString()
          .split('\n')
          .filter((l) => l.trim());
        for (const line of lines) {
          manifestEntries.push({
            projectId: String(file.project.id),
            branchId: String(file.branch.id),
            fileId: String(file.id),
            manifestEntryId: uuidv4(),
            originalText: line,
            font: 'default',
            style: {},
            position: { x: 0, y: 0 },
          });
        }
      }
    }

    if (manifestEntries.length > 0) {
      await this.translationModel.insertMany(manifestEntries);
    }
  }
}

async function parsePdfWithFonts(buffer: Buffer): Promise<{
  text: string;
  items: {
    text: string;
    font: string;
    x: number;
    y: number;
    page: number;
  }[];
}> {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser();

    pdfParser.on('pdfParser_dataError', (errData) => {
      reject(new Error(`PDF parse error: ${errData.parserError}`));
    });

    pdfParser.on('pdfParser_dataReady', (pdfData) => {
      const items: {
        text: string;
        font: string;
        x: number;
        y: number;
        page: number;
      }[] = [];

      // pdf2json structure: pdfData.Pages[pageIndex].Texts[]
      pdfData.Pages.forEach((page, pageIndex) => {
        page.Texts.forEach((t) => {
          // t.R is an array of runs (each with T = text, TS = [size, ?, ?, fontId])
          t.R.forEach((run) => {
            const decodedText = decodeURIComponent(run.T); // decode %xx
            const font = run.TS?.[3] ? String(run.TS[3]) : 'unknown';
            items.push({
              text: decodedText,
              font,
              x: t.x,
              y: t.y,
              page: pageIndex + 1,
            });
          });
        });
      });

      const joined = items.map((i) => i.text).join('\n');
      resolve({ text: joined, items });
    });

    // Load from buffer
    pdfParser.parseBuffer(buffer);
  });
}


