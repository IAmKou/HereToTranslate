import JSZip from 'jszip';
import { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle } from 'docx';
import { logger } from 'nx/src/utils/logger';

/**
 * Enhanced DOCX text replacement that preserves formatting, layouts, fonts, and styles
 * Uses multiple strategies to ensure maximum compatibility and formatting preservation
 * Prioritizes Aspose.Words Cloud API for highest quality results
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
    
    // Debug: Analyze DOCX structure to understand why some translations might not be found
    try {
      const zip = new JSZip();
      const docxZip = await zip.loadAsync(originalBuffer);
      
      // List all files in the DOCX
      const fileNames = Object.keys(docxZip.files);
      logger.log(`[DOCX] DOCX contains ${fileNames.length} files: ${fileNames.slice(0, 10).join(', ')}${fileNames.length > 10 ? '...' : ''}`);
      
      // Check main document content
      const documentXml = await docxZip.file('word/document.xml')?.async('string');
      if (documentXml) {
        logger.log(`[DOCX] Main document size: ${documentXml.length} characters`);
        
        // Log some sample text to help debug
        const sampleText = documentXml.match(/<w:t[^>]*>([^<]{1,100})<\/w:t>/g);
        if (sampleText) {
          logger.log(`[DOCX] Sample text elements: ${sampleText.slice(0, 3).map(t => t.replace(/<w:t[^>]*>([^<]*)<\/w:t>/, '$1')).join(' | ')}`);
        }
      }
    } catch (debugError) {
      logger.warn(`[DOCX] Debug analysis failed: ${debugError instanceof Error ? debugError.message : String(debugError)}`);
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
 * @param originalBuffer - Original DOCX file buffer
 * @param translations - Map of original text to translated text
 * @returns Promise<{buffer: Buffer, replacedCount: number}> - Processed buffer and replacement count
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
      logger.log(`[DOCX] Processing translation: "${originalText.substring(0, 50)}..." -> "${translatedText.substring(0, 50)}..."`);
      
      // Escape special characters for XML
      const escapedOriginal = escapeXmlText(originalText);
      const escapedTranslated = escapeXmlText(translatedText);
      
      // Strategy 1: Direct text replacement within w:t tags
      const directRegex = new RegExp(`(<w:t[^>]*>)([^<]*${escapedOriginal}[^<]*)(</w:t>)`, 'g');
      const directMatches = modifiedXml.match(directRegex);
      
      if (directMatches) {
        logger.log(`[DOCX] Found direct match for: "${originalText}" (${directMatches.length} occurrences)`);
        modifiedXml = modifiedXml.replace(directRegex, (match: string, openTag: string, content: string, closeTag: string) => {
          // Replace only the text content, preserving the tags and attributes
          const newContent = content.replace(escapedOriginal, escapedTranslated);
          replacementCount++;
          return `${openTag}${newContent}${closeTag}`;
        });
        continue; // Skip to next translation if direct replacement worked
      }
      
      // Strategy 2: Handle text split across multiple w:t tags (including HTML-tagged text)
      const splitResult = searchAndReplaceSplitText(modifiedXml, originalText, translatedText);
      if (splitResult.replacements > 0) {
        modifiedXml = splitResult.modifiedXml;
        replacementCount += splitResult.replacements;
        logger.log(`[DOCX] Split text replacement successful for: "${originalText}" (${splitResult.replacements} replacements)`);
        continue;
      }
      
      // Strategy 3: Look for text without HTML tags (strip tags for comparison)
      const strippedOriginal = stripHtmlTags(originalText);
      if (strippedOriginal !== originalText) {
        logger.log(`[DOCX] Trying stripped text search for: "${strippedOriginal}" (original: "${originalText}")`);
        
        // Search for the stripped text in the XML
        const strippedRegex = new RegExp(`(<w:t[^>]*>)([^<]*${escapeXmlText(strippedOriginal)}[^<]*)(</w:t>)`, 'g');
        const strippedMatches = modifiedXml.match(strippedRegex);
        
        if (strippedMatches) {
          logger.log(`[DOCX] Found stripped text match for: "${strippedOriginal}" (${strippedMatches.length} occurrences)`);
          modifiedXml = modifiedXml.replace(strippedRegex, (match: string, openTag: string, content: string, closeTag: string) => {
            const newContent = content.replace(escapeXmlText(strippedOriginal), escapedTranslated);
            replacementCount++;
            return `${openTag}${newContent}${closeTag}`;
          });
          continue;
        }
      }
      
      // Strategy 4: Look for text in other XML files (headers, footers, etc.)
      // This will be handled by the ZIP-based strategy
      
      logger.log(`[DOCX] No match found for: "${originalText}" - will try ZIP-based strategy`);
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
    logger.error(`[DOCX] Error in XML-based replacement: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

/**
 * Comprehensive text search that can handle text split across multiple XML elements
 * @param xmlContent - XML content to search in
 * @param originalText - Original text to find
 * @param translatedText - Translated text to replace with
 * @returns { modifiedXml: string; replacements: number } - Modified XML and replacement count
 */
function searchAndReplaceSplitText(
  xmlContent: string,
  originalText: string,
  translatedText: string
): { modifiedXml: string; replacements: number } {
  let modifiedXml = xmlContent;
  let replacements = 0;
  
  // Strategy 1: Direct replacement
  const directRegex = new RegExp(`(<w:t[^>]*>)([^<]*${escapeXmlText(originalText)}[^<]*)(</w:t>)`, 'g');
  if (modifiedXml.match(directRegex)) {
    modifiedXml = modifiedXml.replace(directRegex, (match: string, openTag: string, content: string, closeTag: string) => {
      const newContent = content.replace(escapeXmlText(originalText), escapeXmlText(translatedText));
      replacements++;
      return `${openTag}${newContent}${closeTag}`;
    });
    return { modifiedXml, replacements };
  }
  
  // Strategy 2: Look for text split across multiple w:t tags
  // This handles cases where text is broken up by formatting changes
  const wttags = xmlContent.match(/<w:t[^>]*>([^<]*)<\/w:t>/g);
  if (wttags) {
    // Try to find text that might be split across consecutive w:t tags
    for (let i = 0; i < wttags.length - 1; i++) {
      const currentTag = wttags[i];
      const nextTag = wttags[i + 1];
      
      const currentContent = currentTag.replace(/<w:t[^>]*>([^<]*)<\/w:t>/, '$1');
      const nextContent = nextTag.replace(/<w:t[^>]*>([^<]*)<\/w:t>/, '$1');
      
      // Check if combining current and next tag content contains our text
      const combinedContent = currentContent + nextContent;
      if (combinedContent.includes(originalText)) {
        logger.log(`[DOCX] Found split text: "${originalText}" across consecutive w:t tags`);
        
        // Replace the text in the first tag if it contains the beginning
        if (currentContent.includes(originalText.substring(0, Math.min(originalText.length, currentContent.length)))) {
          const newCurrentContent = currentContent.replace(
            originalText.substring(0, Math.min(originalText.length, currentContent.length)),
            translatedText.substring(0, Math.min(translatedText.length, currentContent.length))
          );
          
          // Update the XML content
          modifiedXml = modifiedXml.replace(currentTag, currentTag.replace(currentContent, newCurrentContent));
          replacements++;
          
          // If the text spans both tags, also update the second tag
          if (originalText.length > currentContent.length) {
            const remainingOriginal = originalText.substring(currentContent.length);
            const remainingTranslated = translatedText.substring(Math.min(translatedText.length, currentContent.length));
            
            if (nextContent.includes(remainingOriginal)) {
              const newNextContent = nextContent.replace(remainingOriginal, remainingTranslated);
              modifiedXml = modifiedXml.replace(nextTag, nextTag.replace(nextContent, newNextContent));
              replacements++;
            }
          }
          
          return { modifiedXml, replacements };
        }
      }
    }
    
    // Strategy 3: Look for text that might be split across more than 2 tags
    // This is more complex and requires a sliding window approach
    for (let windowSize = 3; windowSize <= Math.min(5, wttags.length); windowSize++) {
      for (let i = 0; i <= wttags.length - windowSize; i++) {
        let combinedContent = '';
        for (let j = 0; j < windowSize; j++) {
          const tagContent = wttags[i + j].replace(/<w:t[^>]*>([^<]*)<\/w:t>/, '$1');
          combinedContent += tagContent;
        }
        
        if (combinedContent.includes(originalText)) {
          logger.log(`[DOCX] Found split text: "${originalText}" across ${windowSize} w:t tags`);
          
          // This is a simplified replacement - in production you'd want more sophisticated logic
          // For now, we'll try to replace the text in the first tag that contains part of it
          for (let j = 0; j < windowSize; j++) {
            const tagContent = wttags[i + j].replace(/<w:t[^>]*>([^<]*)<\/w:t>/, '$1');
            if (tagContent.length > 0 && originalText.includes(tagContent)) {
              const newTagContent = tagContent.replace(tagContent, translatedText);
              modifiedXml = modifiedXml.replace(wttags[i + j], wttags[i + j].replace(tagContent, newTagContent));
              replacements++;
              break;
            }
          }
          
          return { modifiedXml, replacements };
        }
      }
    }
  }
  
  // Strategy 4: Try to find text without HTML tags
  const strippedOriginal = stripHtmlTags(originalText);
  if (strippedOriginal !== originalText) {
    logger.log(`[DOCX] Trying stripped text search for split text: "${strippedOriginal}"`);
    
    // Look for the stripped text in the XML
    const strippedRegex = new RegExp(`(<w:t[^>]*>)([^<]*${escapeXmlText(strippedOriginal)}[^<]*)(</w:t>)`, 'g');
    if (modifiedXml.match(strippedRegex)) {
      modifiedXml = modifiedXml.replace(strippedRegex, (match: string, openTag: string, content: string, closeTag: string) => {
        const newContent = content.replace(escapeXmlText(strippedOriginal), escapeXmlText(translatedText));
        replacements++;
        return `${openTag}${newContent}${closeTag}`;
      });
      return { modifiedXml, replacements };
    }
  }
  
  return { modifiedXml, replacements };
}

/**
 * ZIP-based replacement strategy - manipulates ZIP structure while preserving formatting
 * @param originalBuffer - Original DOCX file buffer
 * @param translations - Map of original text to translated text
 * @returns Promise<{buffer: Buffer, replacedCount: number}> - Processed buffer and replacement count
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
    const xmlFiles = [
      'word/document.xml', 
      'word/header1.xml', 
      'word/footer1.xml',
      'word/header2.xml',
      'word/footer2.xml',
      'word/header3.xml',
      'word/footer3.xml'
    ];
    
    for (const xmlFile of xmlFiles) {
      const xmlContent = await docxZip.file(xmlFile)?.async('string');
      if (!xmlContent) continue;
      
      let modifiedXml = xmlContent;
      let fileReplacements = 0;
      
      for (const [originalText, translatedText] of translations) {
        const escapedOriginal = escapeXmlText(originalText);
        const escapedTranslated = escapeXmlText(translatedText);
        
        // Strategy 1: Direct text replacement in w:t tags
        const directRegex = new RegExp(`(<w:t[^>]*>)([^<]*${escapedOriginal}[^<]*)(</w:t>)`, 'g');
        const directMatches = modifiedXml.match(directRegex);
        
        if (directMatches) {
          modifiedXml = modifiedXml.replace(directRegex, (match: string, openTag: string, content: string, closeTag: string) => {
            const newContent = content.replace(escapedOriginal, escapedTranslated);
            fileReplacements++;
            return `${openTag}${newContent}${closeTag}`;
          });
          continue;
        }
        
        // Strategy 2: Use comprehensive text search for split text
        const result = searchAndReplaceSplitText(modifiedXml, originalText, translatedText);
        if (result.replacements > 0) {
          modifiedXml = result.modifiedXml;
          fileReplacements += result.replacements;
          continue;
        }
        
        // Strategy 3: Look for text without HTML tags (strip tags for comparison)
        const strippedOriginal = stripHtmlTags(originalText);
        if (strippedOriginal !== originalText) {
          logger.log(`[DOCX] ZIP: Trying stripped text search for: "${strippedOriginal}" (original: "${originalText}")`);
          
          const strippedRegex = new RegExp(`(<w:t[^>]*>)([^<]*${escapeXmlText(strippedOriginal)}[^<]*)(</w:t>)`, 'g');
          const strippedMatches = modifiedXml.match(strippedRegex);
          
          if (strippedMatches) {
            logger.log(`[DOCX] ZIP: Found stripped text match for: "${strippedOriginal}" (${strippedMatches.length} occurrences)`);
            modifiedXml = modifiedXml.replace(strippedRegex, (match: string, openTag: string, content: string, closeTag: string) => {
              const newContent = content.replace(escapeXmlText(strippedOriginal), escapedTranslated);
              fileReplacements++;
              return `${openTag}${newContent}${closeTag}`;
            });
            continue;
          }
        }
        
        // Strategy 4: Look for partial matches (text might be split)
        const partialRegex = new RegExp(`(<w:t[^>]*>)([^<]*${escapedOriginal.substring(0, Math.max(3, Math.floor(escapedOriginal.length / 2)))}[^<]*)(</w:t>)`, 'g');
        const partialMatches = modifiedXml.match(partialRegex);
        
        if (partialMatches) {
          logger.log(`[DOCX] ZIP: Found partial match for "${originalText}" in ${xmlFile}`);
          
          // Try to find the complete text by looking at surrounding context
          // Look for text that might be split across multiple w:t tags
          const surroundingText = findSurroundingText(modifiedXml, escapedOriginal.substring(0, Math.max(3, Math.floor(escapedOriginal.length / 2))));
          if (surroundingText && surroundingText.includes(originalText)) {
            logger.log(`[DOCX] ZIP: Found surrounding text containing "${originalText}"`);
            // This is a simplified approach - in production you might want more sophisticated logic
            // For now, we'll try to replace the partial match
            modifiedXml = modifiedXml.replace(partialRegex, (match: string, openTag: string, content: string, closeTag: string) => {
              const newContent = content.replace(escapedOriginal.substring(0, Math.max(3, Math.floor(escapedOriginal.length / 2))), escapedTranslated);
              fileReplacements++;
              return `${openTag}${newContent}${closeTag}`;
            });
          }
        }
      }
      
      if (fileReplacements > 0) {
        docxZip.file(xmlFile, modifiedXml);
        replacementCount += fileReplacements;
        logger.log(`[DOCX] ZIP-based replacement in ${xmlFile}: ${fileReplacements} replacements`);
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
 * @param originalBuffer - Original DOCX file buffer
 * @param translations - Map of original text to translated text
 * @returns Promise<{buffer: Buffer, replacedCount: number}> - Processed buffer and replacement count
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
 * @param xmlContent - DOCX XML content
 * @returns Array of paragraph objects with formatting information
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
 * @param xml - XML content containing font size information
 * @returns number | null - Font size in points or null if not found
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
 * @param xml - XML content containing font family information
 * @returns string | null - Font family name or null if not found
 */
function extractFontFamily(xml: string): string | null {
  const fontMatch = xml.match(/<w:rFonts[^>]*w:ascii="([^"]*)"[^>]*>/);
  return fontMatch ? fontMatch[1] : null;
}

/**
 * Extract color from XML
 * @param xml - XML content containing color information
 * @returns string | null - Color hex value or null if not found
 */
function extractColor(xml: string): string | null {
  const colorMatch = xml.match(/<w:color[^>]*val="([^"]*)"[^>]*>/);
  return colorMatch ? `#${colorMatch[1]}` : null;
}

/**
 * Escape special characters for XML
 * @param text - Text to escape
 * @returns string - Escaped text safe for XML
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
 * @param text - Text to escape
 * @returns string - Escaped text safe for regex
 */
function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Strip HTML tags from a string.
 * @param text - The text to strip tags from.
 * @returns string - The text with HTML tags removed.
 */
function stripHtmlTags(text: string): string {
  return text.replace(/<[^>]*>/g, '');
}

/**
 * Helper to find surrounding text for partial matches.
 * This is a simplified approach and might need more sophisticated logic
 * for complex cases where text is split across multiple tags.
 * @param xmlContent - The full XML content.
 * @param partialText - The partial text to search for.
 * @returns string | null - The surrounding text if found, null otherwise.
 */
function findSurroundingText(xmlContent: string, partialText: string): string | null {
  const wttags = xmlContent.match(/<w:t[^>]*>([^<]*)<\/w:t>/g);
  if (!wttags) return null;

  for (let i = 0; i < wttags.length - 1; i++) {
    const currentTag = wttags[i];
    const nextTag = wttags[i + 1];

    const currentContent = currentTag.replace(/<w:t[^>]*>([^<]*)<\/w:t>/, '$1');
    const nextContent = nextTag.replace(/<w:t[^>]*>([^<]*)<\/w:t>/, '$1');

    // Check if combining current and next tag content contains our partial text
    const combinedContent = currentContent + nextContent;
    if (combinedContent.includes(partialText)) {
      return combinedContent;
    }
  }
  return null;
}

/**
 * Legacy function for backward compatibility
 * @param originalBuffer - Original DOCX file buffer
 * @param translations - Map of original text to translated text
 * @returns Promise<Buffer> - Processed DOCX buffer
 */
export async function replaceDocxText(
  originalBuffer: Buffer,
  translations: Map<string, string>
): Promise<Buffer> {
  const result = await replaceDocxTextWithCount(originalBuffer, translations);
  return result.buffer;
}
