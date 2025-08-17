import JSZip from 'jszip';
import { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle } from 'docx';
import { logger } from 'nx/src/utils/logger';
import { createAsposeBridge, AsposeDocxBridge } from './aspose-docx-bridge';

/**
 * Enhanced DOCX text replacement that preserves formatting, layouts, fonts, and styles
 * Uses multiple strategies to ensure maximum compatibility and formatting preservation
 */
export async function replaceDocxTextWithCount(
  originalBuffer: Buffer,
  translations: Map<string, string>
): Promise<{ buffer: Buffer; replacedCount: number }> {
  try {
    if (!originalBuffer || originalBuffer.length === 0) {
      throw new Error('Empty or invalid buffer provided');
    }

    logger.log(`[DOCX] Starting enhanced text replacement with ${translations.size} translations`);
    
    // Strategy 0: Try Aspose.Words Java service (highest quality - preserves ALL formatting)
    try {
      const asposeBridge = createAsposeBridge();
      if (asposeBridge.isServiceAvailable()) {
        const result = await asposeBridge.processDocxWithAspose(originalBuffer, translations);
        if (result.replacedCount > 0) {
          logger.log(`[DOCX] Aspose.Words replacement successful: ${result.replacedCount} replacements`);
          return result;
        }
      }
    } catch (error) {
      logger.warn(`[DOCX] Aspose.Words replacement failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Strategy 0.5: Try to enable Aspose.Words for Node.js if not already enabled
    try {
      const asposeBridge = createAsposeBridge();
      if (!asposeBridge.isServiceAvailable()) {
        // Try to set credentials and enable Aspose
        try {
          const enabled = await asposeBridge.setCredentials();
          if (enabled) {
            const result = await asposeBridge.processDocxWithAspose(originalBuffer, translations);
            if (result.replacedCount > 0) {
              logger.log(`[DOCX] Aspose.Words for Node.js replacement successful: ${result.replacedCount} replacements`);
              return result;
            }
          }
        } catch (credentialError) {
          logger.warn(`[DOCX] Aspose.Words credentials failed: ${credentialError instanceof Error ? credentialError.message : String(credentialError)}`);
        }
      }
    } catch (error) {
      logger.warn(`[DOCX] Aspose.Words for Node.js replacement failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Strategy 1: Try XML-based replacement (preserves all formatting)
    try {
      const result = await replaceDocxTextXmlBased(originalBuffer, translations);
      if (result.replacedCount > 0) {
        logger.log(`[DOCX] XML-based replacement successful: ${result.replacedCount} replacements`);
        return result;
      }
    } catch (error) {
      logger.warn(`[DOCX] XML-based replacement failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Strategy 2: Try ZIP-based replacement (preserves most formatting)
    try {
      const result = await replaceDocxTextZipBased(originalBuffer, translations);
      if (result.replacedCount > 0) {
        logger.log(`[DOCX] ZIP-based replacement successful: ${result.replacedCount} replacements`);
        return result;
      }
    } catch (error) {
      logger.warn(`[DOCX] ZIP-based replacement failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Strategy 3: Fallback to docx library recreation (preserves basic formatting)
    try {
      const result = await replaceDocxTextWithDocxLib(originalBuffer, translations);
      if (result.replacedCount > 0) {
        logger.log(`[DOCX] Docx library replacement successful: ${result.replacedCount} replacements`);
        return result;
      }
    } catch (error) {
      logger.warn(`[DOCX] Docx library replacement failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    logger.warn('[DOCX] All replacement strategies failed, returning original file');
    return { buffer: originalBuffer, replacedCount: 0 };
  } catch (error) {
    logger.error(`[DOCX] Error in enhanced text replacement: ${error instanceof Error ? error.message : String(error)}`);
    return { buffer: originalBuffer, replacedCount: 0 };
  }
}

/**
 * XML-based replacement strategy - directly manipulates the DOCX XML content
 * This preserves ALL formatting, styles, and layouts
 */
async function replaceDocxTextXmlBased(
  originalBuffer: Buffer,
  translations: Map<string, string>
): Promise<{ buffer: Buffer; replacedCount: number }> {
  try {
    const zip = new JSZip();
    const docxZip = await zip.loadAsync(originalBuffer);
    
    // Get the main document XML
    const documentXml = await docxZip.file('word/document.xml')?.async('string');
    if (!documentXml) {
      throw new Error('Could not read document.xml from DOCX');
    }

    let replacementCount = 0;
    let modifiedXml = documentXml;

    // Replace text while preserving XML structure
    for (const [originalText, translatedText] of translations) {
      // Escape special characters for XML
      const escapedOriginal = escapeXmlText(originalText);
      const escapedTranslated = escapeXmlText(translatedText);
      
      // Use regex to find and replace text within w:t tags
      const regex = new RegExp(`(<w:t[^>]*>)([^<]*${escapedOriginal}[^<]*)(</w:t>)`, 'g');
      const matches = modifiedXml.match(regex);
      
      if (matches) {
        modifiedXml = modifiedXml.replace(regex, (match: string, openTag: string, content: string, closeTag: string) => {
          // Replace only the text content, preserving the tags and attributes
          const newContent = content.replace(escapedOriginal, escapedTranslated);
          replacementCount++;
          return `${openTag}${newContent}${closeTag}`;
        });
      }
    }

    if (replacementCount === 0) {
      throw new Error('No text replacements found in XML');
    }

    // Update the document.xml in the ZIP
    docxZip.file('word/document.xml', modifiedXml);
    
    // Generate the new DOCX buffer
    const newBuffer = await docxZip.generateAsync({ type: 'nodebuffer' });
    
    logger.log(`[DOCX] XML-based replacement completed: ${replacementCount} replacements`);
    return { buffer: newBuffer, replacedCount: replacementCount };
  } catch (error) {
    logger.error(`[DOCX] XML-based replacement error: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

/**
 * ZIP-based replacement strategy - manipulates ZIP structure while preserving formatting
 */
async function replaceDocxTextZipBased(
  originalBuffer: Buffer,
  translations: Map<string, string>
): Promise<{ buffer: Buffer; replacedCount: number }> {
  try {
    const zip = new JSZip();
    const docxZip = await zip.loadAsync(originalBuffer);
    
    let replacementCount = 0;
    
    // Process all XML files in the DOCX
    const xmlFiles = ['word/document.xml', 'word/header1.xml', 'word/footer1.xml'];
    
    for (const xmlFile of xmlFiles) {
      const xmlContent = await docxZip.file(xmlFile)?.async('string');
      if (!xmlContent) continue;
      
      let modifiedXml = xmlContent;
      let fileReplacements = 0;
      
      for (const [originalText, translatedText] of translations) {
        const escapedOriginal = escapeXmlText(originalText);
        const escapedTranslated = escapeXmlText(translatedText);
        
        // Replace text in w:t tags
        const regex = new RegExp(`(<w:t[^>]*>)([^<]*${escapedOriginal}[^<]*)(</w:t>)`, 'g');
        const matches = modifiedXml.match(regex);
        
        if (matches) {
          modifiedXml = modifiedXml.replace(regex, (match: string, openTag: string, content: string, closeTag: string) => {
            const newContent = content.replace(escapedOriginal, escapedTranslated);
            fileReplacements++;
            return `${openTag}${newContent}${closeTag}`;
          });
        }
      }
      
      if (fileReplacements > 0) {
        docxZip.file(xmlFile, modifiedXml);
        replacementCount += fileReplacements;
      }
    }
    
    if (replacementCount === 0) {
      throw new Error('No text replacements found in ZIP files');
    }
    
    const newBuffer = await docxZip.generateAsync({ type: 'nodebuffer' });
    logger.log(`[DOCX] ZIP-based replacement completed: ${replacementCount} replacements`);
    return { buffer: newBuffer, replacedCount: replacementCount };
  } catch (error) {
    logger.error(`[DOCX] ZIP-based replacement error: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

/**
 * Fallback strategy using docx library - recreates document with basic formatting
 */
async function replaceDocxTextWithDocxLib(
  originalBuffer: Buffer,
  translations: Map<string, string>
): Promise<{ buffer: Buffer; replacedCount: number }> {
  try {
    // Parse the original DOCX to extract structure
    const zip = new JSZip();
    const docxZip = await zip.loadAsync(originalBuffer);
    
    const documentXml = await docxZip.file('word/document.xml')?.async('string');
    if (!documentXml) {
      throw new Error('Could not read document.xml');
    }
    
    // Extract paragraphs and their formatting
    const paragraphs = extractParagraphsWithFormatting(documentXml);
    
    let replacementCount = 0;
    const newParagraphs: any[] = [];
    
    for (const paragraph of paragraphs) {
      let paragraphText = paragraph.text;
      let hasReplacement = false;
      
      // Check if this paragraph contains any text to translate
      for (const [originalText, translatedText] of translations) {
        if (paragraphText.includes(originalText)) {
          paragraphText = paragraphText.replace(new RegExp(escapeRegex(originalText), 'g'), translatedText);
          hasReplacement = true;
          replacementCount++;
        }
      }
      
      // Create new paragraph with preserved formatting
      const newParagraph = new Paragraph({
        children: [
          new TextRun({
            text: paragraphText,
            bold: paragraph.bold,
            italics: paragraph.italics,
            size: paragraph.size,
            font: paragraph.font,
            color: paragraph.color,
          }),
        ],
        alignment: paragraph.alignment,
        spacing: paragraph.spacing,
      });
      
      newParagraphs.push(newParagraph);
    }
    
    if (replacementCount === 0) {
      throw new Error('No text replacements found');
    }
    
    // Create new document
    const doc = new Document({
      sections: [
        {
          children: newParagraphs,
        },
      ],
    });
    
    const buffer = await Packer.toBuffer(doc);
    logger.log(`[DOCX] Docx library replacement completed: ${replacementCount} replacements`);
    return { buffer, replacedCount: replacementCount };
  } catch (error) {
    logger.error(`[DOCX] Docx library replacement error: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

/**
 * Extract paragraphs with their formatting from DOCX XML
 */
function extractParagraphsWithFormatting(xmlContent: string): Array<{
  text: string;
  bold: boolean;
  italics: boolean;
  size: number;
  font: string;
  color: string;
  alignment: typeof AlignmentType[keyof typeof AlignmentType];
  spacing: any;
}> {
  const paragraphs: any[] = [];
  
  // Parse XML to extract paragraph information
  // This is a simplified parser - in production you'd want a more robust XML parser
  
  // Extract text runs with their properties
  const textRunRegex = /<w:r[^>]*>.*?<w:t[^>]*>(.*?)<\/w:t>.*?<\/w:r>/gs;
  const matches = xmlContent.match(textRunRegex);
  
  if (matches) {
    for (const match of matches) {
      // Extract text content
      const textMatch = match.match(/<w:t[^>]*>(.*?)<\/w:t>/);
      if (textMatch) {
        const text = textMatch[1];
        
        // Extract formatting properties
        const bold = match.includes('<w:b/>') || match.includes('<w:b val="true"/>');
        const italics = match.includes('<w:i/>') || match.includes('<w:i val="true"/>');
        const size = extractFontSize(match);
        const font = extractFontFamily(match);
        const color = extractColor(match);
        
        paragraphs.push({
          text,
          bold,
          italics,
          size: size || 24, // Default 12pt * 2
          font: font || 'Calibri',
          color: color || '#000000',
          alignment: AlignmentType.LEFT,
          spacing: {},
        });
      }
    }
  }
  
  return paragraphs;
}

/**
 * Extract font size from XML
 */
function extractFontSize(xml: string): number | null {
  const sizeMatch = xml.match(/<w:sz[^>]*val="(\d+)"[^>]*>/);
  if (sizeMatch) {
    return parseInt(sizeMatch[1]) * 2; // Convert half-points to points
  }
  return null;
}

/**
 * Extract font family from XML
 */
function extractFontFamily(xml: string): string | null {
  const fontMatch = xml.match(/<w:rFonts[^>]*w:ascii="([^"]*)"[^>]*>/);
  return fontMatch ? fontMatch[1] : null;
}

/**
 * Extract color from XML
 */
function extractColor(xml: string): string | null {
  const colorMatch = xml.match(/<w:color[^>]*val="([^"]*)"[^>]*>/);
  return colorMatch ? `#${colorMatch[1]}` : null;
}

/**
 * Escape special characters for XML
 */
function escapeXmlText(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Escape special characters for regex
 */
function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Legacy function for backward compatibility
 */
export async function replaceDocxText(
  originalBuffer: Buffer,
  translations: Map<string, string>
): Promise<Buffer> {
  const result = await replaceDocxTextWithCount(originalBuffer, translations);
  return result.buffer;
}
