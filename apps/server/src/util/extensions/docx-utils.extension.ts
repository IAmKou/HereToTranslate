import JSZip from 'jszip';
import { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle } from 'docx';
import { logger } from 'nx/src/utils/logger';

/**
 * Enhanced DOCX text replacement that ensures ALL original text is replaced
 * Uses aggressive multi-level replacement strategies to guarantee complete replacement
 * Prioritizes complete replacement over formatting preservation when necessary
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

    // Debug: Log all translations being attempted
    let translationIndex = 0;
    for (const [originalText, translatedText] of translations) {
      translationIndex++;
      logger.log(`[DOCX] Translation ${translationIndex}/${translations.size}: "${originalText.substring(0, 100)}${originalText.length > 100 ? '...' : ''}" -> "${translatedText.substring(0, 100)}${translatedText.length > 100 ? '...' : ''}"`);
    }

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

        // Log some sample text to help debug - extract actual text content
        const sampleText = documentXml.match(/<w:t[^>]*>([^<]{1,200})<\/w:t>/g);
        if (sampleText) {
          logger.log(`[DOCX] Sample text elements found: ${sampleText.length}`);
          sampleText.slice(0, 5).forEach((element, index) => {
            const textContent = element.replace(/<w:t[^>]*>([^<]*)<\/w:t>/, '$1');
            logger.log(`[DOCX] Text element ${index + 1}: "${textContent}"`);
          });
        }

        // Check if any of our translation texts exist in the raw XML
        for (const [originalText] of translations) {
          if (documentXml.includes(originalText)) {
            logger.log(`[DOCX] Found original text "${originalText.substring(0, 50)}..." in raw XML`);
          } else {
            logger.warn(`[DOCX] Original text "${originalText.substring(0, 50)}..." NOT found in raw XML`);
            
            // Check for partial matches
            const words = originalText.split(/\s+/);
            if (words.length > 1) {
              const firstWord = words[0];
              const lastWord = words[words.length - 1];
              if (documentXml.includes(firstWord)) {
                logger.log(`[DOCX] Found first word "${firstWord}" in XML`);
              }
              if (documentXml.includes(lastWord)) {
                logger.log(`[DOCX] Found last word "${lastWord}" in XML`);
              }
            }
          }
        }
      }
    } catch (debugError) {
      logger.warn(`[DOCX] Debug analysis failed: ${debugError instanceof Error ? debugError.message : String(debugError)}`);
    }

    // Strategy 1: Aggressive complete replacement - ensures ALL text is replaced
    try {
      const result = await aggressiveCompleteReplacement(originalBuffer, translations);
      logger.log(`[DOCX] Aggressive complete replacement: ${result.replacedCount} replacements`);
      return result;
    } catch (error) {
      logger.error(`[DOCX] Aggressive replacement failed: ${error instanceof Error ? error.message : String(error)}`);
      // Continue to fallback strategies
    }

    // Strategy 2: Try XML-based replacement (preserves all formatting)
    try {
      const result = await replaceDocxTextXmlBased(originalBuffer, translations);
      if (result.replacedCount > 0) {
        logger.log(`[DOCX] XML-based replacement successful: ${result.replacedCount} replacements`);
        return result;
      }
    } catch (error) {
      logger.warn(`[DOCX] XML-based replacement failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Strategy 3: Try ZIP-based replacement (preserves most formatting)
    try {
      const result = await replaceDocxTextZipBased(originalBuffer, translations);
      if (result.replacedCount > 0) {
        logger.log(`[DOCX] ZIP-based replacement successful: ${result.replacedCount} replacements`);
        return result;
      }
    } catch (error) {
      logger.warn(`[DOCX] ZIP-based replacement failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Strategy 4: Fallback to docx library recreation (preserves basic formatting)
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
 * Aggressive complete replacement strategy - ensures ALL original text is replaced
 * Uses multiple passes and techniques to guarantee complete replacement
 */
async function aggressiveCompleteReplacement(
  originalBuffer: Buffer,
  translations: Map<string, string>
): Promise<{ buffer: Buffer; replacedCount: number }> {
  try {
    const zip = new JSZip();
    const docxZip = await zip.loadAsync(originalBuffer);
    let totalReplacements = 0;

    // Get all XML files that might contain text
    const xmlFiles = [
      'word/document.xml',
      'word/header1.xml',
      'word/header2.xml', 
      'word/header3.xml',
      'word/footer1.xml',
      'word/footer2.xml',
      'word/footer3.xml',
      'word/footnotes.xml',
      'word/endnotes.xml',
      'word/comments.xml'
    ];

    for (const fileName of xmlFiles) {
      const file = docxZip.file(fileName);
      if (!file) continue;

      let content = await file.async('string');
      let fileReplacements = 0;

      logger.log(`[DOCX] Processing ${fileName} (${content.length} chars)`);

      // Pass 1: Direct text replacement in XML content with Unicode normalization
      for (const [originalText, translatedText] of translations) {
        const beforeLength = content.length;
        
        // Normalize Unicode for Vietnamese text handling
        const normalizedOriginal = originalText.normalize('NFC');
        const normalizedTranslated = translatedText.normalize('NFC');
        
        // Replace all occurrences with multiple strategies
        const strategies = [
          // Direct replacement
          () => content.replace(new RegExp(escapeRegex(originalText), 'g'), translatedText),
          // Direct replacement with normalized text
          () => content.replace(new RegExp(escapeRegex(normalizedOriginal), 'g'), normalizedTranslated),
          // Case insensitive
          () => content.replace(new RegExp(escapeRegex(originalText), 'gi'), translatedText),
          // Case insensitive with normalized text
          () => content.replace(new RegExp(escapeRegex(normalizedOriginal), 'gi'), normalizedTranslated),
          // Normalized whitespace
          () => content.replace(new RegExp(escapeRegex(originalText).replace(/\s+/g, '\\s+'), 'gi'), translatedText),
          // Normalized whitespace with normalized Unicode
          () => content.replace(new RegExp(escapeRegex(normalizedOriginal).replace(/\s+/g, '\\s+'), 'gi'), normalizedTranslated),
          // XML-encoded version
          () => content.replace(new RegExp(escapeRegex(escapeXmlText(originalText)), 'gi'), escapeXmlText(translatedText)),
          // XML-encoded with normalized Unicode
          () => content.replace(new RegExp(escapeRegex(escapeXmlText(normalizedOriginal)), 'gi'), escapeXmlText(normalizedTranslated)),
          // NFD normalization (decomposed form)
          () => content.replace(new RegExp(escapeRegex(originalText.normalize('NFD')), 'gi'), translatedText.normalize('NFD')),
          // NFKC normalization (compatibility)
          () => content.replace(new RegExp(escapeRegex(originalText.normalize('NFKC')), 'gi'), translatedText.normalize('NFKC')),
          // NFKD normalization (compatibility decomposed)
          () => content.replace(new RegExp(escapeRegex(originalText.normalize('NFKD')), 'gi'), translatedText.normalize('NFKD'))
        ];

        for (const strategy of strategies) {
          const newContent = strategy();
          if (newContent !== content) {
            content = newContent;
            fileReplacements++;
            logger.log(`[DOCX] Replaced "${originalText.substring(0, 50)}..." in ${fileName}`);
          }
        }
      }

      // Pass 2: Extract and replace text within w:t tags with Unicode normalization
      content = content.replace(/<w:t[^>]*>([^<]*)<\/w:t>/g, (match, textContent) => {
        let modifiedText = textContent;
        let hasChanges = false;

        for (const [originalText, translatedText] of translations) {
          // Try multiple Unicode normalizations
          const normalizations = [
            { orig: originalText, trans: translatedText },
            { orig: originalText.normalize('NFC'), trans: translatedText.normalize('NFC') },
            { orig: originalText.normalize('NFD'), trans: translatedText.normalize('NFD') },
            { orig: originalText.normalize('NFKC'), trans: translatedText.normalize('NFKC') },
            { orig: originalText.normalize('NFKD'), trans: translatedText.normalize('NFKD') }
          ];

          for (const norm of normalizations) {
            if (modifiedText.includes(norm.orig)) {
              modifiedText = modifiedText.replace(new RegExp(escapeRegex(norm.orig), 'g'), norm.trans);
              hasChanges = true;
              fileReplacements++;
              logger.log(`[DOCX] Replaced in w:t tag: "${originalText.substring(0, 30)}..."`);
              break; // Exit normalization loop once we find a match
            }
          }
        }

        return hasChanges ? match.replace(textContent, modifiedText) : match;
      });

      // Pass 3: Handle text split across multiple w:t tags with mixed formatting
      for (const [originalText, translatedText] of translations) {
        const words = originalText.split(/\s+/);
        if (words.length > 1) {
          // Strategy 3a: Find and replace text that spans multiple w:t elements
          const result = replaceTextAcrossMultipleElements(content, originalText, translatedText);
          if (result.replaced) {
            content = result.content;
            fileReplacements += result.count;
            logger.log(`[DOCX] Replaced split text across elements: "${originalText.substring(0, 30)}..."`);
            continue;
          }

          // Strategy 3b: Handle mixed case and formatting within the same sentence
          const mixedCaseResult = replaceMixedFormattingText(content, originalText, translatedText);
          if (mixedCaseResult.replaced) {
            content = mixedCaseResult.content;
            fileReplacements += mixedCaseResult.count;
            logger.log(`[DOCX] Replaced mixed formatting text: "${originalText.substring(0, 30)}..."`);
            continue;
          }

          // Strategy 3c: Original pattern matching (fallback)
          const pattern = words.map(word => `<w:t[^>]*>[^<]*${escapeRegex(word)}[^<]*</w:t>`).join('[\\s\\S]*?');
          const regex = new RegExp(pattern, 'gi');
          
          if (regex.test(content)) {
            // If pattern matches, do a more aggressive replacement
            const simplePattern = words.map(word => escapeRegex(word)).join('[\\s\\S]*?');
            const simpleRegex = new RegExp(simplePattern, 'gi');
            content = content.replace(simpleRegex, translatedText);
            fileReplacements++;
            logger.log(`[DOCX] Replaced split text: "${originalText.substring(0, 30)}..."`);
          }
        }
      }

      // Pass 4: Brute force - replace any remaining original text anywhere in XML with Unicode normalization
      for (const [originalText, translatedText] of translations) {
        // Try all Unicode normalizations for brute force replacement
        const normalizations = [
          { orig: originalText, trans: translatedText },
          { orig: originalText.normalize('NFC'), trans: translatedText.normalize('NFC') },
          { orig: originalText.normalize('NFD'), trans: translatedText.normalize('NFD') },
          { orig: originalText.normalize('NFKC'), trans: translatedText.normalize('NFKC') },
          { orig: originalText.normalize('NFKD'), trans: translatedText.normalize('NFKD') }
        ];

        for (const norm of normalizations) {
          const occurrences = (content.match(new RegExp(escapeRegex(norm.orig), 'g')) || []).length;
          if (occurrences > 0) {
            content = content.replace(new RegExp(escapeRegex(norm.orig), 'g'), norm.trans);
            fileReplacements += occurrences;
            logger.log(`[DOCX] Brute force replaced ${occurrences} occurrences of "${originalText.substring(0, 30)}..." (normalization: ${norm.orig === originalText ? 'original' : 'normalized'})`);
            break; // Exit normalization loop once we find matches
          }
        }
      }

      if (fileReplacements > 0) {
        docxZip.file(fileName, content);
        totalReplacements += fileReplacements;
        logger.log(`[DOCX] ${fileName}: ${fileReplacements} replacements made`);
      }
    }

    // Generate the new DOCX buffer
    const newBuffer = await docxZip.generateAsync({ type: 'nodebuffer' });
    
    logger.log(`[DOCX] Aggressive replacement completed: ${totalReplacements} total replacements`);
    return { buffer: newBuffer, replacedCount: totalReplacements };

  } catch (error) {
    logger.error(`[DOCX] Aggressive replacement error: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
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
      const directRegex = new RegExp(`(<w:t[^>]*>)([^<]*)(</w:t>)`, 'g');
      let directMatch = false;

        modifiedXml = modifiedXml.replace(directRegex, (match: string, openTag: string, content: string, closeTag: string) => {
        // Try exact match first
        if (content.includes(originalText)) {
          logger.log(`[DOCX] Found exact match for: "${originalText}" in content: "${content.substring(0, 100)}..."`);
          const newContent = content.replace(new RegExp(escapeRegex(originalText), 'g'), translatedText);
          replacementCount++;
          directMatch = true;
          return `${openTag}${newContent}${closeTag}`;
        }
        
        // Try case-insensitive match
        if (content.toLowerCase().includes(originalText.toLowerCase())) {
          logger.log(`[DOCX] Found case-insensitive match for: "${originalText}" in content: "${content.substring(0, 100)}..."`);
          const newContent = content.replace(new RegExp(escapeRegex(originalText), 'gi'), translatedText);
          replacementCount++;
          directMatch = true;
          return `${openTag}${newContent}${closeTag}`;
        }
        
        // Try normalized whitespace match
        const normalizedContent = content.replace(/\s+/g, ' ').trim();
        const normalizedOriginal = originalText.replace(/\s+/g, ' ').trim();
        if (normalizedContent.includes(normalizedOriginal)) {
          logger.log(`[DOCX] Found normalized match for: "${originalText}" in normalized content: "${normalizedContent.substring(0, 100)}..."`);
          // Find the actual text in the original content and replace it
          const regex = new RegExp(escapeRegex(originalText).replace(/\s+/g, '\\s+'), 'gi');
          const newContent = content.replace(regex, translatedText);
          replacementCount++;
          directMatch = true;
          return `${openTag}${newContent}${closeTag}`;
        }
        
        return match;
        });

      if (directMatch) {
        continue; // Skip to next translation if direct replacement worked
      }

      // Strategy 1.5: Normalize whitespace and try exact matching
      const normalizedOriginal = originalText.replace(/\s+/g, ' ').trim();
      const normalizedTranslated = translatedText.replace(/\s+/g, ' ').trim();
      
      const normalizedRegex = new RegExp(`(<w:t[^>]*>)([^<]*)(</w:t>)`, 'g');
      let normalizedMatch = false;
      
      modifiedXml = modifiedXml.replace(normalizedRegex, (match: string, openTag: string, content: string, closeTag: string) => {
        const normalizedContent = content.replace(/\s+/g, ' ').trim();
        if (normalizedContent.includes(normalizedOriginal)) {
          logger.log(`[DOCX] Found normalized match for: "${originalText}" in normalized content: "${normalizedContent.substring(0, 100)}..."`);
          // Replace in the original content to preserve original spacing
          const newContent = content.replace(new RegExp(escapeRegex(originalText), 'gi'), translatedText);
            replacementCount++;
          normalizedMatch = true;
            return `${openTag}${newContent}${closeTag}`;
        }
        return match;
          });

      if (normalizedMatch) {
          continue;
      }

      // Strategy 2: Handle text split across multiple w:t tags and word boundaries
      const splitResult = searchAndReplaceSplitText(modifiedXml, originalText, translatedText);
      if (splitResult.replacements > 0) {
        modifiedXml = splitResult.modifiedXml;
        replacementCount += splitResult.replacements;
        logger.log(`[DOCX] Split text replacement successful for: "${originalText}" (${splitResult.replacements} replacements)`);
        continue;
      }

      // Strategy 2.5: Try word-by-word replacement for sentences that might be broken
      const words = originalText.split(/\s+/);
      if (words.length > 1) {
        let wordReplacements = 0;
        let tempXml = modifiedXml;
        
        // Check if we can find all words individually and reconstruct
        const allWordsFound = words.every(word => tempXml.includes(word));
        
        if (allWordsFound) {
          logger.log(`[DOCX] All words found individually for: "${originalText}", attempting reconstruction`);
          
          // Try to find the sentence pattern in the XML
          const sentencePattern = words.map(word => escapeRegex(word)).join('\\s*(?:<[^>]*>\\s*)*');
          const sentenceRegex = new RegExp(`(<w:t[^>]*>)([^<]*)(${sentencePattern})([^<]*)(</w:t>)`, 'gi');
          
          tempXml = tempXml.replace(sentenceRegex, (match: string, openTag: string, beforeText: string, sentenceText: string, afterText: string, closeTag: string) => {
            logger.log(`[DOCX] Found sentence pattern match for: "${originalText}"`);
            const newSentenceText = sentenceText.replace(new RegExp(escapeRegex(originalText), 'gi'), translatedText);
            wordReplacements++;
            return `${openTag}${beforeText}${newSentenceText}${afterText}${closeTag}`;
          });
          
          if (wordReplacements > 0) {
            modifiedXml = tempXml;
            replacementCount += wordReplacements;
            continue;
          }
        }
      }

      // Strategy 3: Look for text without HTML tags and with flexible matching
      const strippedOriginal = stripHtmlTags(originalText);
      if (strippedOriginal !== originalText || strippedOriginal.length > 0) {
        logger.log(`[DOCX] Trying stripped/flexible text search for: "${strippedOriginal}" (original: "${originalText}")`);

        const flexibleRegex = new RegExp(`(<w:t[^>]*>)([^<]*)(</w:t>)`, 'g');
        let flexibleMatch = false;
        
        modifiedXml = modifiedXml.replace(flexibleRegex, (match: string, openTag: string, content: string, closeTag: string) => {
          // Try multiple matching strategies
          const searchText = strippedOriginal || originalText;
          
          // Exact match
          if (content.includes(searchText)) {
            logger.log(`[DOCX] Found flexible exact match for: "${searchText}" in content: "${content.substring(0, 100)}..."`);
            const newContent = content.replace(new RegExp(escapeRegex(searchText), 'gi'), translatedText);
            replacementCount++;
            flexibleMatch = true;
            return `${openTag}${newContent}${closeTag}`;
          }
          
          // Normalized match (remove extra whitespace)
          const normalizedContent = content.replace(/\s+/g, ' ').trim();
          const normalizedSearch = searchText.replace(/\s+/g, ' ').trim();
          if (normalizedContent.includes(normalizedSearch)) {
            logger.log(`[DOCX] Found flexible normalized match for: "${normalizedSearch}" in normalized content: "${normalizedContent.substring(0, 100)}..."`);
            const newContent = content.replace(new RegExp(escapeRegex(originalText), 'gi'), translatedText);
            replacementCount++;
            flexibleMatch = true;
            return `${openTag}${newContent}${closeTag}`;
          }
          
          // Partial match for longer texts (if original text is long, try to match significant portions)
          if (searchText.length > 50) {
            const partialLength = Math.floor(searchText.length * 0.7); // Match 70% of the text
            const partialSearch = searchText.substring(0, partialLength);
            if (content.includes(partialSearch)) {
              logger.log(`[DOCX] Found flexible partial match for: "${partialSearch}..." in content: "${content.substring(0, 100)}..."`);
              // Try to replace the full original text if it exists
              if (content.includes(originalText)) {
                const newContent = content.replace(new RegExp(escapeRegex(originalText), 'gi'), translatedText);
            replacementCount++;
                flexibleMatch = true;
            return `${openTag}${newContent}${closeTag}`;
              }
            }
          }
          
          return match;
          });

        if (flexibleMatch) {
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

  // Strategy 1: Improved direct replacement with flexible matching
  const directRegex = new RegExp(`(<w:t[^>]*>)([^<]*)(</w:t>)`, 'g');
  let directMatch = false;
  
    modifiedXml = modifiedXml.replace(directRegex, (match: string, openTag: string, content: string, closeTag: string) => {
    if (content.includes(originalText)) {
      logger.log(`[DOCX Split] Found direct match for: "${originalText}" in content: "${content.substring(0, 100)}..."`);
      const newContent = content.replace(new RegExp(escapeRegex(originalText), 'g'), translatedText);
      replacements++;
      directMatch = true;
      return `${openTag}${newContent}${closeTag}`;
    }
    return match;
    });
  
  if (directMatch) {
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

        // Strategy 1: Improved direct text replacement in w:t tags
        const directRegex = new RegExp(`(<w:t[^>]*>)([^<]*)(</w:t>)`, 'g');
        let directMatch = false;
        
        const tempXml = modifiedXml.replace(directRegex, (match: string, openTag: string, content: string, closeTag: string) => {
          if (content.includes(originalText)) {
            logger.log(`[DOCX ZIP] Found direct match for: "${originalText}" in ${xmlFile}`);
            const newContent = content.replace(new RegExp(escapeRegex(originalText), 'g'), translatedText);
            fileReplacements++;
            directMatch = true;
            return `${openTag}${newContent}${closeTag}`;
          }
          return match;
          });
        
        if (directMatch) {
          modifiedXml = tempXml;
          continue;
        }

        // Strategy 2: Use comprehensive text search for split text
        const result = searchAndReplaceSplitText(modifiedXml, originalText, translatedText);
        if (result.replacements > 0) {
          modifiedXml = result.modifiedXml;
          fileReplacements += result.replacements;
          continue;
        }

        // Strategy 3: Enhanced flexible text matching
        const strippedOriginal = stripHtmlTags(originalText);
        const flexibleRegex = new RegExp(`(<w:t[^>]*>)([^<]*)(</w:t>)`, 'g');
        let flexibleMatch = false;
        
        const tempXml2 = modifiedXml.replace(flexibleRegex, (match: string, openTag: string, content: string, closeTag: string) => {
          // Try multiple matching approaches
          const searchText = strippedOriginal || originalText;
          
          // Exact match
          if (content.includes(searchText)) {
            logger.log(`[DOCX ZIP] Found flexible exact match for: "${searchText}" in ${xmlFile}`);
            const newContent = content.replace(new RegExp(escapeRegex(searchText), 'gi'), translatedText);
            fileReplacements++;
            flexibleMatch = true;
            return `${openTag}${newContent}${closeTag}`;
          }
          
          // Normalized whitespace match
          const normalizedContent = content.replace(/\s+/g, ' ').trim();
          const normalizedSearch = searchText.replace(/\s+/g, ' ').trim();
          if (normalizedContent.includes(normalizedSearch)) {
            logger.log(`[DOCX ZIP] Found flexible normalized match for: "${normalizedSearch}" in ${xmlFile}`);
            const newContent = content.replace(new RegExp(escapeRegex(originalText), 'gi'), translatedText);
              fileReplacements++;
            flexibleMatch = true;
              return `${openTag}${newContent}${closeTag}`;
          }
          
          return match;
            });
        
        if (flexibleMatch) {
          modifiedXml = tempXml2;
            continue;
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
 * Replace text that spans across multiple w:t elements with different formatting
 * @param xmlContent - The XML content to process
 * @param originalText - The original text to find and replace
 * @param translatedText - The translated text to replace with
 * @returns {content: string, replaced: boolean, count: number}
 */
function replaceTextAcrossMultipleElements(
  xmlContent: string,
  originalText: string,
  translatedText: string
): { content: string; replaced: boolean; count: number } {
  let modifiedContent = xmlContent;
  let replacementCount = 0;

  // Extract all w:t elements with their positions
  const wtElements: Array<{ match: string; content: string; start: number; end: number }> = [];
  const wtRegex = /<w:t[^>]*>([^<]*)<\/w:t>/g;
  let match;
  
  while ((match = wtRegex.exec(xmlContent)) !== null) {
    wtElements.push({
      match: match[0],
      content: match[1],
      start: match.index,
      end: match.index + match[0].length
    });
  }

  // Try to find the original text by combining consecutive w:t elements
  for (let i = 0; i < wtElements.length; i++) {
    let combinedText = '';
    let elementsToReplace: Array<{ match: string; content: string; start: number; end: number }> = [];
    
    // Look ahead to combine text from multiple elements
    for (let j = i; j < Math.min(i + 10, wtElements.length); j++) {
      combinedText += wtElements[j].content;
      elementsToReplace.push(wtElements[j]);
      
      // Check if we have a match (with various normalizations)
      const normalizations = [
        originalText,
        originalText.normalize('NFC'),
        originalText.normalize('NFD'),
        originalText.normalize('NFKC'),
        originalText.normalize('NFKD')
      ];
      
      for (const normalized of normalizations) {
        if (combinedText.includes(normalized) || 
            combinedText.toLowerCase().includes(normalized.toLowerCase()) ||
            combinedText.replace(/\s+/g, ' ').trim().includes(normalized.replace(/\s+/g, ' ').trim())) {
          
          // Found a match! Replace the entire span
          logger.log(`[DOCX] Found text across ${elementsToReplace.length} elements: "${combinedText.substring(0, 50)}..."`);
          
          // Create replacement: replace only the matched text portion
          const matchStart = combinedText.indexOf(normalized);
          const matchEnd = matchStart + normalized.length;
          
          // Calculate positions for each element in forward order
          const elementPositions: Array<{element: typeof elementsToReplace[0], textStart: number, textEnd: number}> = [];
          let currentPos = 0;
          
          for (const element of elementsToReplace) {
            const elementStart = currentPos;
            const elementEnd = currentPos + element.content.length;
            elementPositions.push({
              element,
              textStart: elementStart,
              textEnd: elementEnd
            });
            currentPos = elementEnd;
          }
          
          let replacementDone = false;
          
          // Replace from last to first to maintain XML indices
          for (let k = elementPositions.length - 1; k >= 0; k--) {
            const {element, textStart, textEnd} = elementPositions[k];
            
            // Check if this element contains part of the match
            if (textStart < matchEnd && textEnd > matchStart) {
              const relativeStart = Math.max(0, matchStart - textStart);
              const relativeEnd = Math.min(element.content.length, matchEnd - textStart);
              
              let newContent = element.content;
              
              if (matchStart >= textStart && matchEnd <= textEnd) {
                // Match is entirely within this element
                newContent = element.content.substring(0, relativeStart) + 
                           translatedText + 
                           element.content.substring(relativeEnd);
                replacementDone = true;
              } else if (matchStart >= textStart && matchStart < textEnd) {
                // Match starts in this element
                if (!replacementDone) {
                  newContent = element.content.substring(0, relativeStart) + translatedText;
                  replacementDone = true;
                } else {
                  newContent = element.content.substring(0, relativeStart);
                }
              } else if (matchEnd > textStart && matchEnd <= textEnd) {
                // Match ends in this element
                newContent = element.content.substring(relativeEnd);
              } else if (matchStart < textStart && matchEnd > textEnd) {
                // Match spans this entire element
                if (!replacementDone) {
                  newContent = translatedText;
                  replacementDone = true;
                } else {
                  newContent = '';
                }
              }
              
              const newXmlElement = element.match.replace(element.content, newContent);
              modifiedContent = modifiedContent.substring(0, element.start) + 
                               newXmlElement + 
                               modifiedContent.substring(element.end);
            }
          }
          
          replacementCount++;
          return { content: modifiedContent, replaced: true, count: replacementCount };
        }
      }
    }
  }

  return { content: modifiedContent, replaced: false, count: 0 };
}

/**
 * Handle mixed formatting text (different cases, styles within same sentence)
 * @param xmlContent - The XML content to process
 * @param originalText - The original text to find and replace
 * @param translatedText - The translated text to replace with
 * @returns {content: string, replaced: boolean, count: number}
 */
function replaceMixedFormattingText(
  xmlContent: string,
  originalText: string,
  translatedText: string
): { content: string; replaced: boolean; count: number } {
  let modifiedContent = xmlContent;
  let replacementCount = 0;

  // Strategy 1: Extract plain text from all w:t elements and check for matches
  const plainTextPattern = /<w:t[^>]*>([^<]*)<\/w:t>/g;
  let allTextContent = '';
  const textPositions: Array<{ start: number; end: number; xmlStart: number; xmlEnd: number; content: string }> = [];
  
  let match;
  while ((match = plainTextPattern.exec(xmlContent)) !== null) {
    const startPos = allTextContent.length;
    const content = match[1];
    allTextContent += content;
    const endPos = allTextContent.length;
    
    textPositions.push({
      start: startPos,
      end: endPos,
      xmlStart: match.index,
      xmlEnd: match.index + match[0].length,
      content: content
    });
  }

  // Check if the original text exists in the combined plain text
  const normalizations = [
    originalText,
    originalText.normalize('NFC'),
    originalText.normalize('NFD'),
    originalText.normalize('NFKC'),
    originalText.normalize('NFKD')
  ];

  for (const normalized of normalizations) {
    // Try exact match
    let textIndex = allTextContent.indexOf(normalized);
    if (textIndex === -1) {
      // Try case-insensitive match
      textIndex = allTextContent.toLowerCase().indexOf(normalized.toLowerCase());
    }
    if (textIndex === -1) {
      // Try normalized whitespace match
      const normalizedAllText = allTextContent.replace(/\s+/g, ' ').trim();
      const normalizedOriginal = normalized.replace(/\s+/g, ' ').trim();
      textIndex = normalizedAllText.indexOf(normalizedOriginal);
      if (textIndex !== -1) {
        // Map back to original text position (approximate)
        textIndex = Math.floor((textIndex / normalizedAllText.length) * allTextContent.length);
      }
    }

    if (textIndex !== -1) {
      const textEndIndex = textIndex + normalized.length;
      
      // Find which w:t elements contain this text
      const affectedElements: Array<{ 
        position: typeof textPositions[0]; 
        textStart: number; 
        textEnd: number;
        xmlElement: string;
      }> = [];
      
      for (const pos of textPositions) {
        // Check if this w:t element overlaps with our text range
        if (pos.start < textEndIndex && pos.end > textIndex) {
          const textStart = Math.max(0, textIndex - pos.start);
          const textEnd = Math.min(pos.content.length, textEndIndex - pos.start);
          
          // Extract the full XML element
          const xmlElement = xmlContent.substring(pos.xmlStart, pos.xmlEnd);
          
          affectedElements.push({
            position: pos,
            textStart,
            textEnd,
            xmlElement
          });
        }
      }

      if (affectedElements.length > 0) {
        logger.log(`[DOCX] Found mixed formatting text across ${affectedElements.length} elements`);
        
        // Replace text in affected elements - preserve all non-matched content
        let replacementDone = false;
        
        for (let i = affectedElements.length - 1; i >= 0; i--) {
          const element = affectedElements[i];
          let newContent = element.position.content;
          
          if (!replacementDone) {
            // This is where we place the translation
            const beforeText = newContent.substring(0, element.textStart);
            const afterText = newContent.substring(element.textEnd);
            
            if (i === 0) {
              // First element: keep before text + translation + after text
              newContent = beforeText + translatedText + afterText;
            } else {
              // Middle element: keep before text + translation, remove matched portion
              newContent = beforeText + translatedText;
            }
            replacementDone = true;
          } else {
            // Subsequent elements: remove only the matched portion, keep the rest
            const beforeText = newContent.substring(0, element.textStart);
            const afterText = newContent.substring(element.textEnd);
            newContent = beforeText + afterText;
          }
          
          const newXmlElement = element.xmlElement.replace(element.position.content, newContent);
          modifiedContent = modifiedContent.substring(0, element.position.xmlStart) + 
                           newXmlElement + 
                           modifiedContent.substring(element.position.xmlEnd);
        }
        
        replacementCount++;
        return { content: modifiedContent, replaced: true, count: replacementCount };
      }
    }
  }

  return { content: modifiedContent, replaced: false, count: 0 };
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

