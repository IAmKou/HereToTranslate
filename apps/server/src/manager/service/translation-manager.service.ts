import decompress from 'decompress';
import * as pdfParse from 'pdf-parse';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Injectable } from '@nestjs/common';
import { FileEntity } from '#LocalProject/Entities';
import { TranslationString, TranslationStringDocument } from '../../db/mongo/schema/translation.schema';

@Injectable()
export class TranslationService {
  constructor(
    @InjectModel(TranslationString.name)
    private translationModel: Model<TranslationStringDocument>,
  ) {}

  async extractStrings(file: FileEntity): Promise<void> {
    const textBlocks: string[] = [];

    switch (file.fileType) {
      case 'text/plain':
        textBlocks.push(file.fileContent.toString());
        break;
      case 'application/json': {
        const json = JSON.parse(file.fileContent.toString());
        extractJsonStrings(json, textBlocks);
        break;
      }
      case 'application/pdf': {
        const pdfData = await pdfParse.default(file.fileContent);
        textBlocks.push(pdfData.text);
        break;
      }
      case 'application/zip':
      case 'application/x-rar-compressed': {
        const files = await decompress(file.fileContent);
        for (const f of files) {
          if (f.data) {
            const ext = f.path.split('.').pop();
            if (ext === 'txt' || ext === 'json') {
              const content = f.data.toString();
              if (ext === 'json') {
                extractJsonStrings(JSON.parse(content), textBlocks);
              } else {
                textBlocks.push(content);
              }
            }
          }
        }
        break;
      }
      default:
        if (file.fileName.endsWith('.unity') || file.fileName.endsWith('.uasset')) {
          await this.extractFromAssetFile(file, textBlocks);
        }
        break;
    }


    const inserts = textBlocks
      .flatMap(text => text.split('\n').map(line => line.trim()))
      .filter(line => line.length > 0)
      .map(line => ({
        fileId: String(file.id),
        branchId: String(file.branch.id),
        projectId: String(file.project.id),
        originalText: line,
      }));

    await this.translationModel.insertMany(inserts);
  }

  private async extractFromAssetFile(file: FileEntity, result: string[]) {
    // const extracted = await this.externalAssetExtractor.extractStringsFrom(file);
    // result.push(...extracted);
  }
}

function extractJsonStrings(obj: any, result: string[], path = '') {
  if (typeof obj === 'string') {
    result.push(obj);
  } else if (Array.isArray(obj)) {
    obj.forEach(item => extractJsonStrings(item, result, path));
  } else if (typeof obj === 'object' && obj !== null) {
    for (const key of Object.keys(obj)) {
      extractJsonStrings(obj[key], result, path + '.' + key);
    }
  }
}
