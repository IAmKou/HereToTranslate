import {
  Controller,
  Post,
  Get,
  Put,
  Param,
  Body,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocxEditorService, DocxProcessingResult } from '../service/docx-editor.service';
import { SRXParserService, SRXDocument } from '../service/srx-parser.service';
import { TranslationEntity } from '../../db/mysql/entity/translation.entity';
import * as multer from 'multer';
import * as path from 'path';
import * as fs from 'fs';

interface ProcessDocxDto {
  requestId: string;
  fileId: string;
  targetLanguage: string;
  srxRules?: string; // XML content of SRX rules
}

interface UpdateTranslationDto {
  translatedText: string;
  translatorId?: string;
  notes?: string;
}

@Controller('docx-editor')
export class DocxEditorController {
  constructor(
    private readonly docxEditorService: DocxEditorService,
    private readonly srxParserService: SRXParserService
  ) {}

  /**
   * Process a DOCX file with the complete translation workflow
   */
  @Post('process')
  @UseInterceptors(FileInterceptor('file', {
    storage: multer.diskStorage({
      destination: './uploads/docx',
      filename: (_req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
      }
    }),
    fileFilter: (_req, file, cb) => {
      if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        cb(null, true);
      } else {
        cb(new BadRequestException('Only DOCX files are allowed'), false);
      }
    }
  }))
  async processDocxFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() processDto: ProcessDocxDto
  ): Promise<DocxProcessingResult> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    try {
      // Parse SRX rules if provided
      let srxDocument: SRXDocument | undefined;
      if (processDto.srxRules) {
        srxDocument = this.srxParserService.parseSRXDocument(processDto.srxRules);
      }

      // Process the DOCX file
      const result = await this.docxEditorService.processDocxFile(
        file.path,
        BigInt(processDto.requestId),
        BigInt(processDto.fileId),
        processDto.targetLanguage,
        srxDocument
      );

      // Clean up uploaded file
      fs.unlinkSync(file.path);

      return result;
    } catch (error) {
      // Clean up uploaded file on error
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      throw new BadRequestException(`Failed to process DOCX file: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get translations for a specific file
   */
  @Get('translations/:fileId')
  async getTranslationsForFile(
    @Param('fileId') fileId: string
  ): Promise<TranslationEntity[]> {
    try {
      return await this.docxEditorService.getTranslationsForFile(BigInt(fileId));
    } catch (error) {
      throw new NotFoundException(`Translations not found for file ${fileId}`);
    }
  }

  /**
   * Update a specific translation
   */
  @Put('translations/:translationId')
  async updateTranslation(
    @Param('translationId') translationId: string,
    @Body() updateDto: UpdateTranslationDto
  ): Promise<TranslationEntity> {
    try {
      const translatorId = updateDto.translatorId ? BigInt(updateDto.translatorId) : undefined;
      
      const updatedTranslation = await this.docxEditorService.updateTranslation(
        BigInt(translationId),
        updateDto.translatedText,
        translatorId
      );

      // Update notes if provided
      if (updateDto.notes) {
        updatedTranslation.notes = updateDto.notes;
        // You would save this through the repository if needed
      }

      return updatedTranslation;
    } catch (error) {
      throw new NotFoundException(`Translation ${translationId} not found or could not be updated`);
    }
  }

  /**
   * Generate translated DOCX file
   */
  @Post('generate/:fileId')
  async generateTranslatedDocx(
    @Param('fileId') fileId: string,
    @Body() body: { originalFilePath: string; outputFileName?: string }
  ): Promise<{ downloadUrl: string; filePath: string }> {
    try {
      const outputFileName = body.outputFileName || `translated_${Date.now()}.docx`;
      const outputPath = path.join('./uploads/translated', outputFileName);

      // Ensure output directory exists
      const outputDir = path.dirname(outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const generatedFilePath = await this.docxEditorService.generateTranslatedDocx(
        body.originalFilePath,
        BigInt(fileId),
        outputPath
      );

      return {
        downloadUrl: `/api/docx-editor/download/${path.basename(generatedFilePath)}`,
        filePath: generatedFilePath
      };
    } catch (error) {
      throw new BadRequestException(`Failed to generate translated DOCX: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Download generated translated file
   */
  @Get('download/:filename')
  async downloadFile(@Param('filename') filename: string) {
    const filePath = path.join('./uploads/translated', filename);
    
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('File not found');
    }

    return {
      file: fs.createReadStream(filePath),
      filename: filename,
      contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    };
  }

  /**
   * Parse SRX rules from uploaded file
   */
  @Post('srx/parse')
  @UseInterceptors(FileInterceptor('srxFile', {
    storage: multer.diskStorage({
      destination: './uploads/srx',
      filename: (_req, _file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'srx-' + uniqueSuffix + '.xml');
      }
    }),
    fileFilter: (_req, file, cb) => {
      if (file.mimetype === 'application/xml' || file.mimetype === 'text/xml' || file.originalname.endsWith('.xml')) {
        cb(null, true);
      } else {
        cb(new BadRequestException('Only XML files are allowed for SRX rules'), false);
      }
    }
  }))
  async parseSRXRules(
    @UploadedFile() file: Express.Multer.File
  ): Promise<SRXDocument> {
    if (!file) {
      throw new BadRequestException('No SRX file uploaded');
    }

    try {
      const srxContent = fs.readFileSync(file.path, 'utf-8');
      const srxDocument = this.srxParserService.parseSRXDocument(srxContent);

      // Clean up uploaded file
      fs.unlinkSync(file.path);

      return srxDocument;
    } catch (error) {
      // Clean up uploaded file on error
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      throw new BadRequestException(`Failed to parse SRX rules: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  @Get('srx/default')
  async getDefaultSRXRules(): Promise<SRXDocument> {
    return this.srxParserService.getDefaultSRXRules();
  }

  @Post('srx/test')
  async testTextSegmentation(
    @Body() body: {
      text: string;
      languageCode: string;
      srxRules?: string;
    }
  ): Promise<{ segments: string[] }> {
    try {
      let srxDocument: SRXDocument;
      
      if (body.srxRules) {
        srxDocument = this.srxParserService.parseSRXDocument(body.srxRules);
      } else {
        srxDocument = this.srxParserService.getDefaultSRXRules();
      }

      const segments = this.srxParserService.extractTextSegments(
        body.text,
        body.languageCode,
        srxDocument
      );

      return { segments };
    } catch (error) {
      throw new BadRequestException(`Failed to segment text: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get processing statistics for a file
   */
  @Get('stats/:fileId')
  async getProcessingStats(
    @Param('fileId') fileId: string
  ): Promise<{
    totalSegments: number;
    translatedSegments: number;
    pendingSegments: number;
    reviewedSegments: number;
    approvedSegments: number;
    progress: number;
  }> {
    try {
      const translations = await this.docxEditorService.getTranslationsForFile(BigInt(fileId));
      
      const stats = {
        totalSegments: translations.length,
        translatedSegments: translations.filter(t => t.status === 'translated').length,
        pendingSegments: translations.filter(t => t.status === 'pending').length,
        reviewedSegments: translations.filter(t => t.status === 'reviewed').length,
        approvedSegments: translations.filter(t => t.status === 'approved').length,
        progress: 0
      };

      if (stats.totalSegments > 0) {
        stats.progress = Math.round(
          ((stats.translatedSegments + stats.reviewedSegments + stats.approvedSegments) / stats.totalSegments) * 100
        );
      }

      return stats;
    } catch (error) {
      throw new NotFoundException(`Stats not found for file ${fileId}`);
    }
  }
}
