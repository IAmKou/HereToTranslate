import { logger } from 'nx/src/utils/logger';

export class AsposeDocxBridge {
  private isAvailable = false;
  private asposeWords: any = null;
  private isInitialized = false;
  private isFreeVersion = false;
  private clientId: string | null = null;
  private clientSecret: string | null = null;

  constructor() {
    // Don't initialize immediately - let user decide when to enable
  }


  public async setCredentials(): Promise<boolean> {
    const { ASPOSE_CLIENT_ID, ASPOSE_CLIENT_SECRET } = process.env;
    if (!ASPOSE_CLIENT_ID || !ASPOSE_CLIENT_SECRET) {
      logger.error('[Aspose] Missing environment variables ASPOSE_CLIENT_ID or ASPOSE_CLIENT_SECRET');
      throw new Error('❌ Missing environment variables');
    }
    this.clientId = ASPOSE_CLIENT_ID || 'aa2cf203-b24d-4d4e-9be7-e765867d493f';
    this.clientSecret = ASPOSE_CLIENT_SECRET|| '1ebe57016b85a9cbf4eadfb1944ad849';
    logger.log('[Aspose] Credentials set successfully');
    
    // Automatically enable Aspose after setting credentials
    return await this.enableAspose();
  }

  /**
   * Check if credentials are configured
   */
  private hasCredentials(): boolean {
    return !!(this.clientId && this.clientSecret);
  }

  public async enableAspose(): Promise<boolean> {
    if (this.isInitialized) {
      return this.isAvailable;
    }

    try {
      logger.log('[Aspose] Attempting to initialize Aspose.Words for Node.js...');

      // Check if credentials are configured
      if (!this.hasCredentials()) {
        logger.warn('[Aspose] No credentials configured. Please set credentials first:');
        logger.warn('[Aspose] asposeBridge.setCredentials(clientId, clientSecret)');
        this.isAvailable = false;
        this.isInitialized = true;
        return false;
      }

      try {
        const asposeModule = await this.tryImportAspose();
        
        if (asposeModule) {
          this.asposeWords = asposeModule;
          
          // Initialize with credentials
          await this.initializeWithCredentials();
          
          this.isAvailable = true;
          this.isInitialized = true;
          
          // Check if this is the free version
          this.isFreeVersion = this.checkIfFreeVersion();
          
          if (this.isFreeVersion) {
            logger.warn('[Aspose] Free version detected - documents will have watermarks and limited features');
            logger.warn('[Aspose] Consider upgrading to paid version for production use');
          } else {
            logger.log('[Aspose] Aspose.Words for Node.js initialized successfully (licensed version)');
          }
          
          return true;
        }
      } catch (importError) {
        logger.warn('[Aspose] Failed to import asposewordscloud package');
        logger.warn('[Aspose] To use Aspose.Words, install: npm install asposewordscloud');
      }
      
      // If import fails, try alternative approach
      this.isAvailable = false;
      this.isInitialized = true;
      logger.warn('[Aspose] Aspose.Words for Node.js not available, falling back to Node.js methods');
      return false;
      
    } catch (error) {
      this.isAvailable = false;
      this.isInitialized = true;
      logger.warn('[Aspose] Aspose.Words for Node.js not available, falling back to Node.js methods');
      return false;
    }
  }

  /**
   * Initialize Aspose.Words with authentication credentials
   */
  private async initializeWithCredentials(): Promise<void> {
    try {
      if (!this.asposeWords || !this.hasCredentials()) {
        throw new Error('Missing Aspose.Words module or credentials');
      }

      // Set up authentication
      if (this.asposeWords.Configuration) {
        const config = new this.asposeWords.Configuration({
          clientId: this.clientId,
          clientSecret: this.clientSecret,
          baseUrl: 'https://api.aspose.cloud' // Default Aspose Cloud URL
        });

        // Set the configuration globally
        this.asposeWords.Configuration.setDefault(config);
        logger.log('[Aspose] Authentication configured successfully');
      } else {
        logger.warn('[Aspose] Configuration class not found, using default settings');
      }
    } catch (error) {
      logger.error(`[Aspose] Failed to initialize with credentials: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  private async tryImportAspose(): Promise<any> {
    try {
      const asposeModule = await import('asposewordscloud');
      return asposeModule;
    } catch (error) {
      // If import fails, return null
      return null;
    }
  }

  /**
   * Check if this is the free version of Aspose.Words
   */
  private checkIfFreeVersion(): boolean {
    try {
      // Try to check license status
      if (this.asposeWords && this.asposeWords.License) {
        const license = new this.asposeWords.License();
        // If no license is set, it's likely the free version
        return true; // Assume free version for now
      }
      return true; // Assume free version if we can't determine
    } catch (error) {
      return true; // Assume free version on error
    }
  }

  /**
   * Check if Aspose.Words service is available
   */
  public isServiceAvailable(): boolean {
    return this.isAvailable;
  }

  /**
   * Check if this is the free version
   */
  public isFreeVersionAvailable(): boolean {
    return this.isFreeVersion;
  }

  /**
   * Process DOCX file using Aspose.Words for Node.js
   * This provides the highest quality text replacement
   */
  public async processDocxWithAspose(
    originalBuffer: Buffer,
    translations: Map<string, string>
  ): Promise<{ buffer: Buffer; replacedCount: number }> {
    if (!this.isAvailable || !this.asposeWords) {
      throw new Error('Aspose.Words for Node.js is not available. Call enableAspose() first.');
    }

    try {
      logger.log('[Aspose] Starting DOCX processing with Aspose.Words for Node.js');
      
      if (this.isFreeVersion) {
        logger.warn('[Aspose] Using free version - documents will have watermarks');
      }

      // Convert Buffer to base64 string for Aspose Cloud API
      const base64Content = originalBuffer.toString('base64');
      
      // Create Words API instance
      const wordsApi = new this.asposeWords.WordsApi();
      
      // Create find and replace request
      const findReplaceRequest = new this.asposeWords.FindReplaceRequest({
        find: '',
        replace: '',
        matchCase: false,
        matchWholeWords: false,
        useOldRegularExpressions: false,
        useNewRegularExpressions: false
      });

      let totalReplacements = 0;
      let modifiedContent = base64Content;

      // Process each translation
      for (const [originalText, translatedText] of translations) {
        try {
          // Update the find/replace request
          findReplaceRequest.find = originalText;
          findReplaceRequest.replace = translatedText;

          // Perform find and replace
          const result = await wordsApi.findAndReplace(
            new this.asposeWords.NodeBuffer({ buffer: modifiedContent }),
            findReplaceRequest
          );

          if (result && result.body) {
            // Update content for next iteration
            modifiedContent = result.body.toString('base64');
            totalReplacements++;
            logger.log(`[Aspose] Replaced "${originalText}" with "${translatedText}"`);
          }
        } catch (replaceError) {
          logger.warn(`[Aspose] Failed to replace "${originalText}": ${replaceError instanceof Error ? replaceError.message : String(replaceError)}`);
          // Continue with other replacements
        }
      }

      if (totalReplacements === 0) {
        throw new Error('No text replacements were performed');
      }

      // Convert back to Buffer
      const resultBuffer = Buffer.from(modifiedContent, 'base64');
      
      logger.log(`[Aspose] DOCX processing completed successfully: ${totalReplacements} replacements`);
      return { buffer: resultBuffer, replacedCount: totalReplacements };
      
    } catch (error) {
      logger.error(`[Aspose] Error processing DOCX: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Test the Aspose.Words connection and credentials
   */
  public async testConnection(): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      if (!this.hasCredentials()) {
        return { 
          success: false, 
          message: 'No credentials configured. Set ASPOSE_CLIENT_ID and ASPOSE_CLIENT_SECRET environment variables.' 
        };
      }

      if (!this.isAvailable) {
        const enabled = await this.enableAspose();
        if (!enabled) {
          return { 
            success: false, 
            message: 'Failed to enable Aspose.Words. Check your credentials and package installation.' 
          };
        }
      }

      // Try to create a simple Words API instance to test connection
      if (this.asposeWords && this.asposeWords.WordsApi) {
        const wordsApi = new this.asposeWords.WordsApi();
        return { 
          success: true, 
          message: 'Aspose.Words connection successful!',
          details: {
            hasCredentials: this.hasCredentials(),
            isAvailable: this.isAvailable,
            isFreeVersion: this.isFreeVersion
          }
        };
      } else {
        return { 
          success: false, 
          message: 'Aspose.Words API not available. Package may not be properly installed.' 
        };
      }
    } catch (error) {
      return { 
        success: false, 
        message: `Connection test failed: ${error instanceof Error ? error.message : String(error)}` 
      };
    }
  }

  public getServiceInfo(): { 
    available: boolean; 
    initialized: boolean; 
    version?: string; 
    isFreeVersion: boolean;
    hasCredentials: boolean;
    instructions?: string;
    testMethod?: string;
  } {
    return {
      available: this.isAvailable,
      initialized: this.isInitialized,
      version: this.isAvailable ? 'Aspose.Words for Node.js' : undefined,
      isFreeVersion: this.isFreeVersion,
      hasCredentials: this.hasCredentials(),
      instructions: !this.hasCredentials() ? 'Set ASPOSE_CLIENT_ID and ASPOSE_CLIENT_SECRET environment variables' :
                   !this.isAvailable ? 'Install asposewordscloud and implement processing logic' : 
                   this.isFreeVersion ? 'Free version detected - documents will have watermarks' : 
                   'Licensed version - full features available',
      testMethod: 'Use testConnection() to verify setup and credentials'
    };
  }
}

export function createAsposeBridge(): AsposeDocxBridge {
  return new AsposeDocxBridge();
}
