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

    // Strategy 1: Aggressive complete replacement (ensures ALL text is replaced)
    try {
      const result = await aggressiveCompleteReplacement(originalBuffer, translations);
      if (result.replacedCount > 0) {
        logger.log(`[DOCX] Aggressive complete replacement successful: ${result.replacedCount} replacements`);
        return result;
      }
    } catch (error) {
      logger.warn(`[DOCX] Aggressive complete replacement failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    try {
      const result = await replaceDocxTextXmlBased(originalBuffer, translations);
      if (result.replacedCount > 0) {
        logger.log(`[DOCX] Style-preserving XML replacement successful: ${result.replacedCount} replacements`);
        return result;
      }
    } catch (error) {
      logger.warn(`[DOCX] Style-preserving XML replacement failed: ${error instanceof Error ? error.message : String(error)}`);
    }

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

      // Skip direct XML replacement to preserve formatting structure

      const runPattern = /<w:r[^>]*>(.*?)<\/w:r>/gs;
      const runs: Array<{match: string, content: string, textElements: Array<{fullMatch: string, text: string}>}> = [];
      
      let runMatch;
      while ((runMatch = runPattern.exec(content)) !== null) {
        const runContent = runMatch[1];
        const textElements: Array<{fullMatch: string, text: string}> = [];
        
        // Extract all w:t elements within this run
        const textPattern = /<w:t[^>]*>([^<]*)<\/w:t>/g;
        let textMatch;
        while ((textMatch = textPattern.exec(runContent)) !== null) {
          textElements.push({
            fullMatch: textMatch[0],
            text: textMatch[1]
          });
        }
        
        if (textElements.length > 0) {
          runs.push({
            match: runMatch[0],
            content: runContent,
            textElements
          });
        }
      }

      // Now process translations while preserving run boundaries
      for (const [originalText, translatedText] of translations) {
        // Build the complete text from all runs to find translation boundaries
        const completeText = runs.map(run => 
          run.textElements.map(te => te.text).join('')
        ).join('');
        
        // Try multiple search strategies to find the original text
        let originalIndex = -1;
        let searchText = originalText;
        
        // Strategy 1: Direct search
        originalIndex = completeText.indexOf(searchText);
        
        // Strategy 2: Normalized search
        if (originalIndex === -1) {
          searchText = originalText.normalize('NFC');
          originalIndex = completeText.normalize('NFC').indexOf(searchText);
        }
        
        // Strategy 3: Case insensitive search
        if (originalIndex === -1) {
          const lowerCompleteText = completeText.toLowerCase();
          const lowerOriginal = originalText.toLowerCase();
          originalIndex = lowerCompleteText.indexOf(lowerOriginal);
          if (originalIndex !== -1) {
            searchText = completeText.substring(originalIndex, originalIndex + originalText.length);
          }
        }
        
        // Strategy 4: Search with whitespace normalization
        if (originalIndex === -1) {
          const normalizedComplete = completeText.replace(/\s+/g, ' ');
          const normalizedOriginal = originalText.replace(/\s+/g, ' ');
          const normalizedIndex = normalizedComplete.indexOf(normalizedOriginal);
          if (normalizedIndex !== -1) {
            // Map back to original positions
            let charCount = 0;
            let normalizedCount = 0;
            for (let i = 0; i < completeText.length; i++) {
              if (normalizedCount === normalizedIndex) {
                originalIndex = charCount;
                break;
              }
              if (completeText[i] !== ' ' || (i > 0 && completeText[i-1] !== ' ')) {
                normalizedCount++;
              }
              charCount++;
            }
            searchText = originalText;
          }
        }
        
        if (originalIndex === -1) {
          logger.warn(`[DOCX] Could not find original text: "${originalText.substring(0, 50)}..."`);
          continue;
        }
        
        const originalEnd = originalIndex + searchText.length;
        
        // Build a more accurate character position map
        const runPositions: Array<{runIndex: number, startPos: number, endPos: number, text: string}> = [];
        let charPos = 0;
        
        for (let runIndex = 0; runIndex < runs.length; runIndex++) {
          const runText = runs[runIndex].textElements.map(te => te.text).join('');
          runPositions.push({
            runIndex,
            startPos: charPos,
            endPos: charPos + runText.length,
            text: runText
          });
          charPos += runText.length;
        }
        
        // Find affected runs with precise boundaries
        const affectedRuns: Array<{runIndex: number, startChar: number, endChar: number, originalText: string}> = [];
        
        for (const runPos of runPositions) {
          // Check if this run intersects with the original text
          if (runPos.startPos < originalEnd && runPos.endPos > originalIndex) {
            const startChar = Math.max(0, originalIndex - runPos.startPos);
            const endChar = Math.min(runPos.text.length, originalEnd - runPos.startPos);
            const originalTextInRun = runPos.text.substring(startChar, endChar);
            
            affectedRuns.push({
              runIndex: runPos.runIndex,
              startChar,
              endChar,
              originalText: originalTextInRun
            });
          }
        }
        
        if (affectedRuns.length === 0) {
          logger.warn(`[DOCX] No affected runs found for: "${originalText.substring(0, 50)}..."`);
          continue;
        }
        
        logger.log(`[DOCX] Found ${affectedRuns.length} affected runs for "${originalText.substring(0, 30)}..."`);
        for (const ar of affectedRuns) {
          logger.log(`[DOCX]   Run ${ar.runIndex}: chars ${ar.startChar}-${ar.endChar} = "${ar.originalText}"`);
        }
        
        // Enhanced style-preserving replacement strategy with placeholder support
        logger.log(`[DOCX] Using enhanced style-preserving replacement for "${originalText.substring(0, 30)}..."`);
        logger.log(`[DOCX] Original: "${originalText}"`);
        logger.log(`[DOCX] Translated: "${translatedText}"`);
        
        // Check if the translated text contains placeholder tags
        const hasPlaceholders = /<r\d+>.*?<\/r\d+>/.test(translatedText);
        
        if (hasPlaceholders) {
          logger.log(`[DOCX] Translated text contains placeholder tags, using precise run mapping`);
          
          // Use placeholder-aware replacement
          if (affectedRuns.length === 1) {
            // Single affected run - process placeholders within this run
            const affectedRun = affectedRuns[0];
            const run = runs[affectedRun.runIndex];
            const runText = run.textElements.map(te => te.text).join('');
            
            // Replace the matched portion with translated text (including placeholders)
            const newRunText = runText.substring(0, affectedRun.startChar) + 
                              translatedText + 
                              runText.substring(affectedRun.endChar);
            
            logger.log(`[DOCX] Single run with placeholders: "${affectedRun.originalText}" -> "${translatedText}"`);
            
            // Update the run's content while preserving all formatting
            if (run.textElements.length === 1) {
              const oldElement = run.textElements[0];
              const newElement = oldElement.fullMatch.replace(oldElement.text, newRunText);
              const oldRunMatch = run.match;
              const newRunMatch = run.match.replace(oldElement.fullMatch, newElement);
              content = content.replace(oldRunMatch, newRunMatch);
            } else {
              // Multiple text elements - combine into first, remove others
              const firstElement = run.textElements[0];
              const newFirstElement = firstElement.fullMatch.replace(firstElement.text, newRunText);
              let newRunContent = run.content.replace(firstElement.fullMatch, newFirstElement);
              
              // Remove other text elements
              for (let j = 1; j < run.textElements.length; j++) {
                newRunContent = newRunContent.replace(run.textElements[j].fullMatch, '');
              }
              
              const oldRunMatch = run.match;
              const newRunMatch = run.match.replace(run.content, newRunContent);
              content = content.replace(oldRunMatch, newRunMatch);
            }
            
            fileReplacements++;
          } else {
            // Multiple affected runs - distribute placeholders across runs
            logger.log(`[DOCX] Multiple runs with placeholders, distributing across ${affectedRuns.length} runs`);
            
            // Parse placeholders from translated text
            const placeholderMatches = Array.from(translatedText.matchAll(/<r(\d+)>(.*?)<\/r\1>/g));
            const textBeforeFirstPlaceholder = translatedText.substring(0, placeholderMatches.length > 0 ? translatedText.indexOf(placeholderMatches[0][0]) : translatedText.length);
            
            for (let i = 0; i < affectedRuns.length; i++) {
              const affectedRun = affectedRuns[i];
              const run = runs[affectedRun.runIndex];
              const runText = run.textElements.map(te => te.text).join('');
              
              let newRunText: string;
              
              if (i === 0) {
                // First run: text before match + text before first placeholder + text after match
                const beforeText = runText.substring(0, affectedRun.startChar);
                const afterText = affectedRun.endChar < runText.length ? runText.substring(affectedRun.endChar) : '';
                newRunText = beforeText + textBeforeFirstPlaceholder + afterText;
                
                logger.log(`[DOCX] First run (${affectedRun.runIndex}): "${affectedRun.originalText}" -> "${textBeforeFirstPlaceholder}"`);
              } else {
                // Subsequent runs: look for corresponding placeholder
                const placeholderIndex = i;
                const correspondingPlaceholder = placeholderMatches.find(match => parseInt(match[1]) === placeholderIndex);
                
                if (correspondingPlaceholder) {
                  const beforeText = runText.substring(0, affectedRun.startChar);
                  const afterText = runText.substring(affectedRun.endChar);
                  newRunText = beforeText + correspondingPlaceholder[2] + afterText;
                  
                  logger.log(`[DOCX] Run ${affectedRun.runIndex}: "${affectedRun.originalText}" -> "${correspondingPlaceholder[2]}"`);
                } else {
                  // No corresponding placeholder - remove matched text
                  const beforeText = runText.substring(0, affectedRun.startChar);
                  const afterText = runText.substring(affectedRun.endChar);
                  newRunText = beforeText + afterText;
                  
                  logger.log(`[DOCX] Run ${affectedRun.runIndex}: removed "${affectedRun.originalText}" (no placeholder)`);
                }
              }
              
              // Update the run's content while preserving all formatting
              if (run.textElements.length === 1) {
                const oldElement = run.textElements[0];
                const newElement = oldElement.fullMatch.replace(oldElement.text, newRunText);
                const oldRunMatch = run.match;
                const newRunMatch = run.match.replace(oldElement.fullMatch, newElement);
                content = content.replace(oldRunMatch, newRunMatch);
              } else {
                // Multiple text elements - combine into first, remove others
                const firstElement = run.textElements[0];
                const newFirstElement = firstElement.fullMatch.replace(firstElement.text, newRunText);
                let newRunContent = run.content.replace(firstElement.fullMatch, newFirstElement);
                
                // Remove other text elements
                for (let j = 1; j < run.textElements.length; j++) {
                  newRunContent = newRunContent.replace(run.textElements[j].fullMatch, '');
                }
                
                const oldRunMatch = run.match;
                const newRunMatch = run.match.replace(run.content, newRunContent);
                content = content.replace(oldRunMatch, newRunMatch);
              }
              
              fileReplacements++;
            }
          }
        } else {
          // Fallback to original replacement strategy for non-placeholder text
          logger.log(`[DOCX] No placeholders detected, using original replacement strategy`);
          
          // Strategy: Replace text while preserving exact run boundaries and styles
          // Only replace the text content, keep all formatting intact
          
          if (affectedRuns.length === 1) {
            // Simple case: text is within a single run
            const affectedRun = affectedRuns[0];
            const run = runs[affectedRun.runIndex];
            const runText = run.textElements.map(te => te.text).join('');
            
            // Build the new run text by replacing only the matched portion
            const newRunText = runText.substring(0, affectedRun.startChar) + 
                              translatedText + 
                              runText.substring(affectedRun.endChar);
            
            logger.log(`[DOCX] Single run replacement: "${affectedRun.originalText}" -> "${translatedText}"`);
            
            // Update the run's content while preserving all formatting
            if (run.textElements.length === 1) {
              const oldElement = run.textElements[0];
              const newElement = oldElement.fullMatch.replace(oldElement.text, newRunText);
              const oldRunMatch = run.match;
              const newRunMatch = run.match.replace(oldElement.fullMatch, newElement);
              content = content.replace(oldRunMatch, newRunMatch);
            } else {
              // Multiple text elements - combine into first, remove others
              const firstElement = run.textElements[0];
              const newFirstElement = firstElement.fullMatch.replace(firstElement.text, newRunText);
              let newRunContent = run.content.replace(firstElement.fullMatch, newFirstElement);
              
              // Remove other text elements
              for (let j = 1; j < run.textElements.length; j++) {
                newRunContent = newRunContent.replace(run.textElements[j].fullMatch, '');
              }
              
              const oldRunMatch = run.match;
              const newRunMatch = run.match.replace(run.content, newRunContent);
              content = content.replace(oldRunMatch, newRunMatch);
            }
            
            fileReplacements++;
          } else {
            // Complex case: text spans multiple runs with different styles
            // Strategy: Place entire translation in the first run, clear matched text from others
            
            for (let i = 0; i < affectedRuns.length; i++) {
              const affectedRun = affectedRuns[i];
              const run = runs[affectedRun.runIndex];
              const runText = run.textElements.map(te => te.text).join('');
              
              let newRunText: string;
              
              if (i === 0) {
                // First run: keep text before match + full translation + text after match (if any)
                const beforeText = runText.substring(0, affectedRun.startChar);
                const afterText = affectedRun.endChar < runText.length ? runText.substring(affectedRun.endChar) : '';
                newRunText = beforeText + translatedText + afterText;
                
                logger.log(`[DOCX] First run (${affectedRun.runIndex}): "${affectedRun.originalText}" -> "${translatedText}"`);
              } else {
                // Subsequent runs: remove only the matched portion, keep unmatched text
                const beforeText = runText.substring(0, affectedRun.startChar);
                const afterText = runText.substring(affectedRun.endChar);
                newRunText = beforeText + afterText;
                
                logger.log(`[DOCX] Subsequent run (${affectedRun.runIndex}): removed "${affectedRun.originalText}"`);
              }
              
              // Update the run's content while preserving all formatting
              if (run.textElements.length === 1) {
                const oldElement = run.textElements[0];
                const newElement = oldElement.fullMatch.replace(oldElement.text, newRunText);
                const oldRunMatch = run.match;
                const newRunMatch = run.match.replace(oldElement.fullMatch, newElement);
                content = content.replace(oldRunMatch, newRunMatch);
              } else {
                // Multiple text elements - combine into first, remove others
                const firstElement = run.textElements[0];
                const newFirstElement = firstElement.fullMatch.replace(firstElement.text, newRunText);
                let newRunContent = run.content.replace(firstElement.fullMatch, newFirstElement);
                
                // Remove other text elements
                for (let j = 1; j < run.textElements.length; j++) {
                  newRunContent = newRunContent.replace(run.textElements[j].fullMatch, '');
                }
                
                const oldRunMatch = run.match;
                const newRunMatch = run.match.replace(run.content, newRunContent);
                content = content.replace(oldRunMatch, newRunMatch);
              }
              
              fileReplacements++;
            }
          }
        }

      }

      // Fallback: Simple text replacement within w:t tags for any remaining translations
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
        
        // Try word boundary matching for phrases like "every week"
        if (originalText.includes(' ')) {
          const words = originalText.split(/\s+/);
          const wordPattern = words.map(word => escapeRegex(word)).join('\\s+');
          const wordRegex = new RegExp(`\\b${wordPattern}\\b`, 'gi');
          if (wordRegex.test(content)) {
            logger.log(`[DOCX] Found word boundary match for phrase: "${originalText}" in content: "${content.substring(0, 100)}..."`);
            const newContent = content.replace(wordRegex, translatedText);
            replacementCount++;
            directMatch = true;
            return `${openTag}${newContent}${closeTag}`;
          }
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
  if (wttags && wttags.length > 1) {
    // Extract all text contents and their positions
    const textElements = wttags.map((tag, index) => ({
      tag,
      content: tag.replace(/<w:t[^>]*>([^<]*)<\/w:t>/, '$1'),
      index
    }));

    // Try sliding window approach to find the original text
    for (let windowSize = 2; windowSize <= Math.min(10, textElements.length); windowSize++) {
      for (let startIndex = 0; startIndex <= textElements.length - windowSize; startIndex++) {
        // Combine text from consecutive elements
        let combinedText = '';
        const windowElements = [];
        
        for (let i = 0; i < windowSize; i++) {
          const element = textElements[startIndex + i];
          combinedText += element.content;
          windowElements.push(element);
        }

        // Check if this window contains our original text
        if (combinedText.includes(originalText)) {
          logger.log(`[DOCX] Found split text: "${originalText}" across ${windowSize} w:t tags: "${combinedText}"`);

          // Find the exact position of the original text within the combined text
          const originalIndex = combinedText.indexOf(originalText);
          if (originalIndex !== -1) {
            // Calculate how to distribute the translated text across the elements
            let currentPos = 0;
            let translatedPos = 0;
            
            for (const element of windowElements) {
              const elementStart = currentPos;
              const elementEnd = currentPos + element.content.length;
              
              // Check if this element overlaps with the original text
              if (elementEnd > originalIndex && elementStart < originalIndex + originalText.length) {
                // Calculate the overlap
                const overlapStart = Math.max(0, originalIndex - elementStart);
                const overlapEnd = Math.min(element.content.length, originalIndex + originalText.length - elementStart);
                
                // Create new content for this element
                let newContent = element.content;
                
                if (overlapStart === 0 && overlapEnd === element.content.length) {
                  // This element is completely within the original text
                  const translatedLength = Math.min(translatedText.length - translatedPos, element.content.length);
                  newContent = translatedText.substring(translatedPos, translatedPos + translatedLength);
                  translatedPos += translatedLength;
                } else if (overlapStart === 0) {
                  // Original text starts at the beginning of this element
                  const translatedLength = Math.min(translatedText.length - translatedPos, overlapEnd);
                  newContent = translatedText.substring(translatedPos, translatedPos + translatedLength) + 
                              element.content.substring(overlapEnd);
                  translatedPos += translatedLength;
                } else if (overlapEnd === element.content.length) {
                  // Original text ends at the end of this element
                  const translatedLength = Math.min(translatedText.length - translatedPos, overlapEnd - overlapStart);
                  newContent = element.content.substring(0, overlapStart) + 
                              translatedText.substring(translatedPos, translatedPos + translatedLength);
                  translatedPos += translatedLength;
                } else {
                  // Original text is in the middle of this element
                  const translatedLength = Math.min(translatedText.length - translatedPos, overlapEnd - overlapStart);
                  newContent = element.content.substring(0, overlapStart) + 
                              translatedText.substring(translatedPos, translatedPos + translatedLength) +
                              element.content.substring(overlapEnd);
                  translatedPos += translatedLength;
                }
                
                // Replace the element in the XML, preserving formatting and position
                const newTag = element.tag.replace(element.content, newContent);
                modifiedXml = modifiedXml.replace(element.tag, newTag);
              replacements++;
                logger.log(`[DOCX] Split-text replacement: "${element.content}" -> "${newContent}"`);
            }
              
              currentPos = elementEnd;
          }

          return { modifiedXml, replacements };
          }
        }
      }
    }
  }
  
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
      // If we have runs with different styles and a replacement occurred, preserve individual run styling
      let children: TextRun[];
      if (paragraph.runs && paragraph.runs.length > 1 && hasReplacement) {
        // Redistribute translated text across original runs to preserve styling
        children = redistributeTranslationAcrossRuns(paragraph.runs, paragraphText);
      } else {
        // Single run or no replacement - use simple approach
        children = [
          new TextRun({
            text: paragraphText,
            bold: paragraph.bold,
            italics: paragraph.italics,
            size: paragraph.size,
            font: paragraph.font,
            color: paragraph.color,
          }),
        ];
      }

      const newParagraph = new Paragraph({
        children,
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
  runs?: Array<{ text: string; bold: boolean; italics: boolean; size: number; font: string; color: string; }>;
}> {
  const paragraphs: any[] = [];

  // Parse XML to extract paragraph information
  // Group runs by paragraph to preserve individual run styling
  const paragraphRegex = /<w:p[^>]*>(.*?)<\/w:p>/gs;
  const paragraphMatches = xmlContent.match(paragraphRegex);

  if (paragraphMatches) {
    for (const paragraphMatch of paragraphMatches) {
      const runs: any[] = [];
      let paragraphText = '';
      
      // Extract text runs with their properties within this paragraph
  const textRunRegex = /<w:r[^>]*>.*?<w:t[^>]*>(.*?)<\/w:t>.*?<\/w:r>/gs;
      const runMatches = paragraphMatch.match(textRunRegex);

      if (runMatches) {
        for (const runMatch of runMatches) {
      // Extract text content
          const textMatch = runMatch.match(/<w:t[^>]*>(.*?)<\/w:t>/);
      if (textMatch) {
        const text = textMatch[1];
            paragraphText += text;

            // Extract formatting properties for this run
            const bold = runMatch.includes('<w:b/>') || runMatch.includes('<w:b val="true"/>');
            const italics = runMatch.includes('<w:i/>') || runMatch.includes('<w:i val="true"/>');
            const size = extractFontSize(runMatch);
            const font = extractFontFamily(runMatch);
            const color = extractColor(runMatch);

            runs.push({
          text,
          bold,
          italics,
          size: size || 24, // Default 12pt * 2
          font: font || 'Calibri',
          color: color || '#000000',
            });
          }
        }
      }

      if (paragraphText.trim()) {
        // Calculate dominant formatting for the paragraph
        const dominantFormatting = calculateDominantFormatting(runs);
        
        paragraphs.push({
          text: paragraphText,
          bold: dominantFormatting.bold,
          italics: dominantFormatting.italics,
          size: dominantFormatting.size,
          font: dominantFormatting.font,
          color: dominantFormatting.color,
          alignment: AlignmentType.LEFT,
          spacing: {},
          runs: runs.length > 1 ? runs : undefined, // Only store runs if multiple exist
        });
      }
    }
  }

  return paragraphs;
}

/**
 * Calculate dominant formatting from multiple runs using improved threshold logic
 */
function calculateDominantFormatting(runs: any[]): {
  bold: boolean;
  italics: boolean;
  size: number;
  font: string;
  color: string;
} {
  if (runs.length === 0) {
    return {
      bold: false,
      italics: false,
      size: 24,
      font: 'Calibri',
      color: '#000000'
    };
  }

  // Count occurrences weighted by text length
  const fontFamilies: { [key: string]: number } = {};
  const fontSizes: { [key: number]: number } = {};
  const colors: { [key: string]: number } = {};
  let boldCount = 0;
  let italicsCount = 0;
  let totalLength = 0;

  for (const run of runs) {
    const length = run.text.length;
    totalLength += length;

    fontFamilies[run.font] = (fontFamilies[run.font] || 0) + length;
    fontSizes[run.size] = (fontSizes[run.size] || 0) + length;
    colors[run.color] = (colors[run.color] || 0) + length;

    if (run.bold) boldCount += length;
    if (run.italics) italicsCount += length;
  }

  // Find most common values
  const dominantFont = Object.keys(fontFamilies).reduce((a, b) => 
    fontFamilies[a] > fontFamilies[b] ? a : b
  );
  const dominantSize = Number(Object.keys(fontSizes).reduce((a, b) => 
    fontSizes[Number(a)] > fontSizes[Number(b)] ? a : b
  ));
  const dominantColor = Object.keys(colors).reduce((a, b) => 
    colors[a] > colors[b] ? a : b
  );

  // Use 70% threshold to prevent small styled words from dominating
  const styleThreshold = 0.7;

  return {
    bold: boldCount > totalLength * styleThreshold,
    italics: italicsCount > totalLength * styleThreshold,
    size: dominantSize,
    font: dominantFont,
    color: dominantColor
  };
}

/**
 * Redistribute translated text across original runs while preserving their individual styling
 * Now supports placeholder tags for precise run boundary preservation
 */
function redistributeTranslationAcrossRuns(runs: any[], translatedText: string): TextRun[] {
  if (runs.length === 0) return [];

  // Check if the translated text contains placeholder tags
  if (hasPlaceholderTags(translatedText)) {
    return reconstructRunsFromPlaceholders(translatedText, runs);
  }

  // Fallback to proportional distribution for backward compatibility
  const originalTotalLength = runs.reduce((sum: number, r: any) => sum + r.text.length, 0);
  if (originalTotalLength === 0) {
    return [new TextRun({
      text: translatedText,
      bold: runs[0].bold,
      italics: runs[0].italics,
      size: runs[0].size,
      font: runs[0].font,
      color: runs[0].color,
    })];
  }

  const textRuns: TextRun[] = [];
  let cursor = 0;

  runs.forEach((run: any, i: number) => {
    // Calculate proportion of this run compared to total
    const proportion = run.text.length / originalTotalLength;
    const sliceLength = i === runs.length - 1
      ? translatedText.length - cursor // Last run gets all remaining text
      : Math.round(proportion * translatedText.length);

    const chunk = translatedText.slice(cursor, cursor + sliceLength);
    cursor += sliceLength;

    if (chunk.length > 0) {
      textRuns.push(new TextRun({
        text: chunk,
        bold: run.bold,
        italics: run.italics,
        size: run.size,
        font: run.font,
        color: run.color,
      }));
    }
  });

  return textRuns;
}

/**
 * Checks if the text contains placeholder tags like <r1>, <r2>, etc.
 */
function hasPlaceholderTags(text: string): boolean {
  return /<r\d+>.*?<\/r\d+>/.test(text);
}

/**
 * Reconstructs TextRuns from translated text with placeholder tags
 * Example: "Xin chào <r1>thế giới</r1>" → TextRuns with preserved styling
 */
function reconstructRunsFromPlaceholders(translatedText: string, originalRuns: any[]): TextRun[] {
  if (originalRuns.length === 0) {
    return [];
  }

  if (originalRuns.length === 1) {
    // Single run - remove any placeholder tags and use original styling
    const cleanText = translatedText.replace(/<r\d+>|<\/r\d+>/g, '');
    return [new TextRun({
      text: cleanText,
      bold: originalRuns[0].bold,
      italics: originalRuns[0].italics,
      size: originalRuns[0].size,
      font: originalRuns[0].font,
      color: originalRuns[0].color,
    })];
  }

  const resultRuns: TextRun[] = [];
  let remainingText = translatedText;
  
  // Process runs in order
  for (let i = 0; i < originalRuns.length; i++) {
    const originalRun = originalRuns[i];
    
    if (i === 0) {
      // First run - extract text before first placeholder
      const nextPlaceholderMatch = remainingText.match(/<r(\d+)>/);
      if (nextPlaceholderMatch) {
        const textBeforePlaceholder = remainingText.substring(0, nextPlaceholderMatch.index);
        if (textBeforePlaceholder) {
          resultRuns.push(new TextRun({
            text: textBeforePlaceholder,
            bold: originalRun.bold,
            italics: originalRun.italics,
            size: originalRun.size,
            font: originalRun.font,
            color: originalRun.color,
          }));
        }
        remainingText = remainingText.substring(nextPlaceholderMatch.index || 0);
      } else {
        // No placeholders found - all text goes to first run
        const cleanText = remainingText.replace(/<r\d+>|<\/r\d+>/g, '');
        resultRuns.push(new TextRun({
          text: cleanText,
          bold: originalRun.bold,
          italics: originalRun.italics,
          size: originalRun.size,
          font: originalRun.font,
          color: originalRun.color,
        }));
        remainingText = '';
      }
    } else {
      // Extract text from placeholder tags
      const placeholderPattern = new RegExp(`<r${i}>(.*?)</r${i}>`, 's');
      const match = remainingText.match(placeholderPattern);
      
      if (match) {
        const placeholderText = match[1];
        if (placeholderText) {
          resultRuns.push(new TextRun({
            text: placeholderText,
            bold: originalRun.bold,
            italics: originalRun.italics,
            size: originalRun.size,
            font: originalRun.font,
            color: originalRun.color,
          }));
        }
        // Remove the processed placeholder from remaining text
        remainingText = remainingText.replace(match[0], '');
      } else {
        // Placeholder not found - create empty run to maintain structure
        // This can happen if the translator removed or modified placeholder tags
        logger.warn(`[DOCX] Placeholder <r${i}> not found in translated text, creating empty run`);
      }
    }
  }

  // Handle any remaining text after all placeholders
  if (remainingText.trim()) {
    // Clean any remaining placeholder tags
    const cleanRemainingText = remainingText.replace(/<r\d+>|<\/r\d+>/g, '').trim();
    if (cleanRemainingText) {
      // Add remaining text to the last run
      if (resultRuns.length > 0) {

        // Create a new TextRun with combined text
        const lastRunIndex = resultRuns.length - 1;
        const lastOriginalRun = originalRuns[Math.min(lastRunIndex, originalRuns.length - 1)];
        // Since TextRun doesn't expose text property, recreate with combined content
        resultRuns[resultRuns.length - 1] = new TextRun({
          text: cleanRemainingText, // Just add the remaining text as new content
          bold: lastOriginalRun.bold,
          italics: lastOriginalRun.italics,
          size: lastOriginalRun.size,
          font: lastOriginalRun.font,
          color: lastOriginalRun.color,
        });
      } else {
        // Fallback - create a new run with default styling
        const defaultRun = originalRuns[0] || {};
        resultRuns.push(new TextRun({
          text: cleanRemainingText,
          bold: defaultRun.bold,
          italics: defaultRun.italics,
          size: defaultRun.size,
          font: defaultRun.font,
          color: defaultRun.color,
        }));
      }
    }
  }

  return resultRuns;
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
    const elementsToReplace: Array<{ match: string; content: string; start: number; end: number }> = [];
    
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

