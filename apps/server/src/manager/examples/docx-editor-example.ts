import { DocxEditorService } from '../service/docx-editor.service';
import { SRXParserService } from '../service/srx-parser.service';
import { DocxXmlParserService } from '../service/docx-xml-parser.service';

/**
 * Example usage of the DOCX Editor Service
 * 
 * This example demonstrates the complete workflow:
 * 1. Extract file information using Aspose Words Cloud
 * 2. Extract text based on SRX rules
 * 3. Store in translation entity
 * 4. Parse DOCX to XML with page information
 */
export class DocxEditorExample {
  constructor(
    private docxEditorService: DocxEditorService,
    private srxParserService: SRXParserService,
    private docxXmlParserService: DocxXmlParserService
  ) {}

  /**
   * Complete DOCX processing workflow example
   */
  async processDocumentExample() {
    const filePath = './uploads/sample-document.docx';
    const requestId = BigInt(1);
    const fileId = BigInt(1);
    const sourceLanguage = 'en';
    const targetLanguage = 'es';

    try {
      // Step 1: Define custom SRX rules (optional)
      const customSRXRules = `<?xml version="1.0" encoding="UTF-8"?>
        <srx version="2.0">
          <header>
            <cascade>yes</cascade>
          </header>
          <body>
            <languagerules>
              <languagerule languagerulename="en">
                <rule id="sentence_break_1">
                  <beforebreak></beforebreak>
                  <break>[.!?]</break>
                  <afterbreak>\\s+[A-Z]</afterbreak>
                </rule>
                <rule id="abbreviation_exception_1">
                  <beforebreak>Mr|Mrs|Dr|Prof</beforebreak>
                  <break>\\.</break>
                  <afterbreak>\\s+[a-z]</afterbreak>
                </rule>
              </languagerule>
            </languagerules>
          </body>
        </srx>`;

      const srxDocument = this.srxParserService.parseSRXDocument(customSRXRules);

      // Step 2: Process the DOCX file
      console.log('Processing DOCX file...');
      const result = await this.docxEditorService.processDocxFile(
        filePath,
        requestId,
        fileId,
        sourceLanguage,
        targetLanguage,
        srxDocument
      );

      console.log('File processing completed!');
      console.log(`Extracted ${result.textSegments.length} text segments`);
      console.log(`Created ${result.translationEntries.length} translation entries`);
      console.log(`Document has ${result.fileInfo.pageCount} pages`);

      // Step 3: Display extracted segments
      console.log('\nExtracted text segments:');
      result.textSegments.forEach((segment, index) => {
        console.log(`${index + 1}. [Page ${segment.pageNumber}] ${segment.text}`);
        console.log(`   Font: ${segment.fontFamily}, Size: ${segment.fontSize}`);
        console.log(`   Style: ${JSON.stringify(segment.style)}`);
        console.log('');
      });

      // Step 4: Simulate translation updates
      console.log('Updating translations...');
      for (let i = 0; i < Math.min(3, result.translationEntries.length); i++) {
        const translation = result.translationEntries[i];
        const translatedText = `[TRANSLATED] ${translation.originalText}`;
        
        await this.docxEditorService.updateTranslation(
          translation.id,
          translatedText,
          BigInt(1) // translator ID
        );
        
        console.log(`Updated translation ${i + 1}: "${translatedText}"`);
      }

      // Step 5: Generate translated document
      console.log('\nGenerating translated document...');
      const outputPath = './uploads/translated/translated-document.docx';
      const translatedFilePath = await this.docxEditorService.generateTranslatedDocx(
        filePath,
        fileId,
        outputPath
      );

      console.log(`Translated document saved to: ${translatedFilePath}`);

      return result;
    } catch (error) {
      console.error('Error processing document:', error.message);
      throw error;
    }
  }

  /**
   * Example of SRX rule testing
   */
  async testSRXRulesExample() {
    const sampleText = `Hello world. This is a test document. Dr. Smith went to the store. He bought some items. The end.`;
    const languageCode = 'en';

    // Test with default rules
    console.log('Testing with default SRX rules:');
    const defaultRules = this.srxParserService.getDefaultSRXRules();
    const defaultSegments = this.srxParserService.extractTextSegments(
      sampleText,
      languageCode,
      defaultRules
    );

    console.log('Default segmentation:');
    defaultSegments.forEach((segment, index) => {
      console.log(`${index + 1}. "${segment}"`);
    });

    // Test with custom rules
    console.log('\nTesting with custom SRX rules:');
    const customRules = `<?xml version="1.0" encoding="UTF-8"?>
      <srx version="2.0">
        <body>
          <languagerules>
            <languagerule languagerulename="en">
              <rule id="sentence_break">
                <beforebreak></beforebreak>
                <break>[.!?]</break>
                <afterbreak>\\s+[A-Z]</afterbreak>
              </rule>
              <rule id="abbreviation_exception">
                <beforebreak>Dr|Mr|Mrs|Ms</beforebreak>
                <break>\\.</break>
                <afterbreak>\\s+[A-Z][a-z]</afterbreak>
              </rule>
            </languagerules>
          </body>
        </languagerules>
      </srx>`;

    const customSRXDocument = this.srxParserService.parseSRXDocument(customRules);
    const customSegments = this.srxParserService.extractTextSegments(
      sampleText,
      languageCode,
      customSRXDocument
    );

    console.log('Custom segmentation:');
    customSegments.forEach((segment, index) => {
      console.log(`${index + 1}. "${segment}"`);
    });
  }

  /**
   * Example of XML parsing and enhancement
   */
  async xmlParsingExample() {
    const docxPath = './uploads/sample-document.docx';

    try {
      console.log('Extracting XML structure from DOCX...');
      
      // Extract XML structure
      const xmlStructure = await this.docxXmlParserService.extractXmlStructure(docxPath);
      console.log('Extracted XML components:');
      console.log(`- Document XML: ${xmlStructure.document.length} characters`);
      console.log(`- Styles XML: ${xmlStructure.styles.length} characters`);
      console.log(`- Relationships: ${Object.keys(xmlStructure.relationships).length} items`);

      // Parse page information
      const pageInfo = this.docxXmlParserService.parsePageInfo(
        xmlStructure.document,
        xmlStructure.styles
      );
      
      console.log('\nPage information:');
      pageInfo.forEach((page, index) => {
        console.log(`Page ${index + 1}:`);
        console.log(`  Size: ${page.width} x ${page.height} points`);
        console.log(`  Margins: T:${page.margins.top} R:${page.margins.right} B:${page.margins.bottom} L:${page.margins.left}`);
      });

      // Extract text runs
      const textRuns = this.docxXmlParserService.extractTextRuns(
        xmlStructure.document,
        xmlStructure.styles
      );

      console.log(`\nExtracted ${textRuns.length} text runs:`);
      textRuns.slice(0, 5).forEach((run, index) => {
        console.log(`${index + 1}. "${run.text}"`);
        console.log(`   Font: ${run.formatting.fontFamily || 'default'}, Size: ${run.formatting.fontSize || 'default'}`);
        console.log(`   Bold: ${run.formatting.bold}, Italic: ${run.formatting.italic}`);
        console.log(`   Position: Page ${run.position.page}, Paragraph ${run.position.paragraph}, Run ${run.position.run}`);
        console.log('');
      });

      // Calculate page breaks
      const runsWithPages = this.docxXmlParserService.calculatePageBreaks(textRuns, pageInfo);
      
      console.log('Page distribution:');
      const pageDistribution = runsWithPages.reduce((acc, run) => {
        acc[run.position.page] = (acc[run.position.page] || 0) + 1;
        return acc;
      }, {} as Record<number, number>);

      Object.entries(pageDistribution).forEach(([page, count]) => {
        console.log(`Page ${page}: ${count} text runs`);
      });

      // Generate enhanced XML
      const enhancedXml = this.docxXmlParserService.generateTranslationXml(
        xmlStructure,
        runsWithPages,
        pageInfo
      );

      console.log(`\nGenerated enhanced XML: ${enhancedXml.length} characters`);

      return {
        xmlStructure,
        pageInfo,
        textRuns: runsWithPages,
        enhancedXml
      };
    } catch (error) {
      console.error('Error parsing XML:', error.message);
      throw error;
    }
  }

  /**
   * Example of translation workflow management
   */
  async translationWorkflowExample() {
    const fileId = BigInt(1);

    try {
      // Get all translations for a file
      console.log('Retrieving translations for file...');
      const translations = await this.docxEditorService.getTranslationsForFile(fileId);
      
      console.log(`Found ${translations.length} translation entries`);

      // Simulate translation workflow
      for (let i = 0; i < Math.min(5, translations.length); i++) {
        const translation = translations[i];
        
        // Simulate different translation states
        let newStatus: string;
        let translatedText: string;
        
        switch (i % 4) {
          case 0:
            newStatus = 'translated';
            translatedText = `[AUTO-TRANSLATED] ${translation.originalText}`;
            break;
          case 1:
            newStatus = 'reviewed';
            translatedText = `[REVIEWED] ${translation.originalText}`;
            break;
          case 2:
            newStatus = 'approved';
            translatedText = `[APPROVED] ${translation.originalText}`;
            break;
          default:
            newStatus = 'pending';
            translatedText = '';
        }

        if (translatedText) {
          await this.docxEditorService.updateTranslation(
            translation.id,
            translatedText,
            BigInt(1) // translator ID
          );
        }

        console.log(`Translation ${i + 1}: ${newStatus} - "${translation.originalText}"`);
      }

      console.log('\nTranslation workflow completed!');
      
      return translations;
    } catch (error) {
      console.error('Error in translation workflow:', error.message);
      throw error;
    }
  }
}
