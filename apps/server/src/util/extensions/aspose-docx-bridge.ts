import { logger } from 'nx/src/utils/logger';
import { ConfigService } from '@nestjs/config';

export class AsposeDocxBridge {
  private _isAvailable = false;
  private asposeWords: any = null;
  private wordsApi: any = null;
  private isInitialized = false;
  private isLicensedVersion = false;
  private clientId: string | null = null;
  private clientSecret: string | null = null;
  private configService?: ConfigService;

  constructor(configService?: ConfigService) {
    this.configService = configService;
    // Try to load credentials from ConfigService or environment variables
    this.loadCredentialsFromConfig();
    
          // Automatically try to enable the service if credentials are available
      if (this.hasCredentials()) {
        // Use setTimeout to avoid constructor async issues
        setTimeout(() => {
          this.enableAspose().catch(error => {
            logger.warn(`[Aspose.Words] Auto-enable failed: ${error instanceof Error ? error.message : String(error)}`);
          });
        }, 0);
      }
  }

  /**
   * Load credentials from ConfigService or environment variables
   */
  private loadCredentialsFromConfig(): void {
    // Try ConfigService first if available
    if (this.configService) {
      this.clientId = this.configService.get<string>('ASPOSE_CLIENT_ID') || null;
      this.clientSecret = this.configService.get<string>('ASPOSE_CLIENT_SECRET') || null;
      
      if (this.clientId && this.clientSecret) {
        logger.log('[Aspose.Words] Credentials loaded from ConfigService');
        return;
      }
    }
    
    // Fallback to environment variables
    const { ASPOSE_CLIENT_ID, ASPOSE_CLIENT_SECRET } = process.env;
    
    if (ASPOSE_CLIENT_ID && ASPOSE_CLIENT_SECRET) {
      this.clientId = ASPOSE_CLIENT_ID;
      this.clientSecret = ASPOSE_CLIENT_SECRET;
      logger.log('[Aspose.Words] Credentials loaded from environment variables');
    } else {
      // Use default credentials from config utility
      try {
        const { getAsposeConfigFromEnv } = require('./aspose-config');
        const config = getAsposeConfigFromEnv();
        this.clientId = config.clientId;
        this.clientSecret = config.clientSecret;
        logger.log('[Aspose.Words] Credentials loaded from default config utility');
      } catch (error) {
        logger.warn('[Aspose.Words] No credentials available');
      }
    }
  }

  /**
   * Set Aspose.Words Cloud API credentials
   * @returns Promise<boolean> - true if credentials are set successfully
   */
  public async setCredentials(): Promise<boolean> {
    // Try ConfigService first if available
    if (this.configService) {
      const clientId = this.configService.get<string>('ASPOSE_CLIENT_ID');
      const clientSecret = this.configService.get<string>('ASPOSE_CLIENT_SECRET');
      
      if (clientId && clientSecret) {
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        logger.log('[Aspose.Words] Cloud API credentials configured from ConfigService');
        return await this.enableAspose();
      }
    }
    
    // Fallback to environment variables
    const { ASPOSE_CLIENT_ID, ASPOSE_CLIENT_SECRET } = process.env;
    
    if (!ASPOSE_CLIENT_ID || !ASPOSE_CLIENT_SECRET) {
      logger.error('[Aspose.Words] Missing required environment variables: ASPOSE_CLIENT_ID or ASPOSE_CLIENT_SECRET');
      throw new Error('Missing required Aspose.Words Cloud API credentials');
    }

    this.clientId = ASPOSE_CLIENT_ID;
    this.clientSecret = ASPOSE_CLIENT_SECRET;
    
    logger.log('[Aspose.Words] Cloud API credentials configured from environment variables');
    
    // Automatically enable Aspose after setting credentials
    return await this.enableAspose();
  }

  /**
   * Check if credentials are configured
   * @returns boolean - true if credentials are available
   */
  private hasCredentials(): boolean {
    return !!(this.clientId && this.clientSecret);
  }

  /**
   * Check if Cloud API subscription is active (always true when credentials are valid)
   * @returns boolean - true if Cloud API is available
   */
  private hasCloudSubscription(): boolean {
    return this.hasCredentials();
  }

  /**
   * Enable Aspose.Words with proper licensing
   * @returns Promise<boolean> - true if Aspose.Words is successfully enabled
   */
  public async enableAspose(): Promise<boolean> {
    if (this.isInitialized) {
      return this._isAvailable;
    }

    try {
      logger.log('[Aspose.Words] Initializing Aspose.Words for Node.js...');

      // Check if credentials are configured
      if (!this.hasCredentials()) {
        logger.warn('[Aspose.Words] No credentials configured. Please set credentials first:');
        logger.warn('[Aspose.Words] asposeBridge.setCredentials()');
        this._isAvailable = false;
        this.isInitialized = true;
        return false;
      }

      try {
        const asposeModule = await this.tryImportAspose();
        
        if (asposeModule) {
          this.asposeWords = asposeModule;
          
          // Initialize with credentials and license
          await this.initializeWithCredentials();
          
          this._isAvailable = true;
          this.isInitialized = true;
          
          // Check if this is the Cloud API version
          this.isLicensedVersion = this.checkIfCloudVersion();
          
          if (this.isLicensedVersion) {
            logger.log('[Aspose.Words] Aspose.Words Cloud API initialized successfully (full features)');
          } else {
            logger.warn('[Aspose.Words] Cloud API not available - check your credentials');
          }
          
          return true;
        }
      } catch (importError) {
        logger.warn('[Aspose.Words] Failed to import asposewordscloud package');
        logger.warn('[Aspose.Words] To use Aspose.Words, install: npm install asposewordscloud');
      }
      
      // If import fails, try alternative approach
      this._isAvailable = false;
      this.isInitialized = true;
      logger.warn('[Aspose.Words] Aspose.Words for Node.js not available, falling back to Node.js methods');
      return false;
      
    } catch (error) {
      this._isAvailable = false;
      this.isInitialized = true;
      logger.warn('[Aspose.Words] Aspose.Words for Node.js not available, falling back to Node.js methods');
      return false;
    }
  }

  /**
   * Initialize Aspose.Words with authentication credentials and license
   */
  private async initializeWithCredentials(): Promise<void> {
    try {
      if (!this.asposeWords || !this.hasCredentials()) {
        throw new Error('Missing Aspose.Words module or credentials');
      }

      // Create WordsApi instance with credentials directly
      this.wordsApi = new this.asposeWords.WordsApi(
        this.clientId,
        this.clientSecret,
        'https://api.aspose.cloud'
      );
      
      // Test the connection to ensure credentials are valid
      try {
        const testResult = await this.wordsApi.getDocumentProperties({
          name: 'test.docx',
          folder: ''
        });
        logger.log('[Aspose.Words] Authentication test successful');
      } catch (authError) {
        logger.error(`[Aspose.Words] Authentication test failed: ${authError instanceof Error ? authError.message : String(authError)}`);
        throw new Error('Invalid Aspose Cloud API credentials');
      }
      
      logger.log('[Aspose.Words] Authentication configured successfully');
      logger.log('[Aspose.Words] Cloud API subscription active - no license key needed');
    } catch (error) {
      logger.error(`[Aspose.Words] Failed to initialize with credentials: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Try to import Aspose.Words module
   * @returns Promise<any> - Aspose.Words module or null if import fails
   */
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
   * Check if this is the Cloud API version of Aspose.Words
   * @returns boolean - true if Cloud API version is detected
   */
  private checkIfCloudVersion(): boolean {
    try {
      // With Cloud API, we assume full features when credentials are valid
      return this.hasCloudSubscription();
    } catch (error) {
      return this.hasCloudSubscription(); // Assume Cloud API if we have credentials
    }
  }

  /**
   * Create a test DOCX file to verify the service is working
   * @returns Promise<any> Test result
   */
  public async createTestDOCX(): Promise<any> {
    if (!this._isAvailable || !this.wordsApi) {
      throw new Error('Aspose.Words for Node.js is not available. Call enableAspose() first.');
    }

    try {
      // Create a simple test document
      const request = {
        name: 'test.docx',
        folder: '',
        body: {
          documentProperties: {
            title: 'Test Document',
            author: 'Aspose Test'
          }
        }
      };

      // Test the API by getting document properties
      const result = await this.wordsApi.getDocumentProperties(request);
      return result.body;
    } catch (error) {
      throw new Error(`Failed to create test DOCX: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Check if Aspose.Words service is available
   * @returns boolean - true if service is available
   */
  public isServiceAvailable(): boolean {
    return this._isAvailable;
  }

  /**
   * Check if Aspose.Words service is available (alias for isServiceAvailable)
   * @returns boolean - true if service is available
   */
  public isAvailable(): boolean {
    return this._isAvailable;
  }

  /**
   * Check if this is the licensed version
   * @returns boolean - true if licensed version is available
   */
  public isLicensedVersionAvailable(): boolean {
    return this.isLicensedVersion;
  }

  /**
   * Process DOCX file using Aspose.Words for Node.js (paid version)
   * This provides the highest quality text replacement with full formatting preservation
   * @param originalBuffer - Original DOCX file buffer
   * @param translations - Map of original text to translated text
   * @returns Promise<{buffer: Buffer, replacedCount: number}> - Processed buffer and replacement count
   */
  public async processDocxWithAspose(
    originalBuffer: Buffer,
    translations: Map<string, string>
  ): Promise<{ buffer: Buffer; replacedCount: number }> {
    if (!this._isAvailable || !this.wordsApi) {
      throw new Error('Aspose.Words for Node.js is not available. Call enableAspose() first.');
    }

    try {
      logger.log('[Aspose.Words] Starting DOCX processing with Aspose.Words for Node.js');
      
      if (!this.isLicensedVersion) {
        logger.warn('[Aspose.Words] Using free version - documents will have watermarks');
      }

      // Convert Buffer to base64 string for Aspose Cloud API
      const base64Content = originalBuffer.toString('base64');
      
      // Use the configured Words API instance
      const wordsApi = this.wordsApi;
      
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
            logger.log(`[Aspose.Words] Replaced "${originalText}" with "${translatedText}"`);
          }
        } catch (replaceError) {
          logger.warn(`[Aspose.Words] Failed to replace "${originalText}": ${replaceError instanceof Error ? replaceError.message : String(replaceError)}`);
          // Continue with other replacements
        }
      }

      if (totalReplacements === 0) {
        throw new Error('No text replacements were performed');
      }

      // Convert back to Buffer
      const resultBuffer = Buffer.from(modifiedContent, 'base64');
      
      logger.log(`[Aspose.Words] DOCX processing completed successfully: ${totalReplacements} replacements`);
      return { buffer: resultBuffer, replacedCount: totalReplacements };
      
    } catch (error) {
      logger.error(`[Aspose.Words] Error processing DOCX: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Test the Aspose.Words connection, credentials, and license
   * @returns Promise<{success: boolean, message: string, details?: any}> - Test results
   */
  public async testConnection(): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      if (!this.hasCredentials()) {
        return { 
          success: false, 
          message: 'No credentials configured. Set ASPOSE_CLIENT_ID and ASPOSE_CLIENT_SECRET environment variables.' 
        };
      }

      if (!this._isAvailable) {
        const enabled = await this.enableAspose();
        if (!enabled) {
          return { 
            success: false, 
            message: 'Failed to enable Aspose.Words. Check your credentials and package installation.' 
          };
        }
      }

      // Test connection using the configured WordsApi instance
      if (this.wordsApi) {
        return { 
          success: true, 
          message: 'Aspose.Words connection successful!',
          details: {
            hasCredentials: this.hasCredentials(),
            hasCloudSubscription: this.hasCloudSubscription(),
            isAvailable: this._isAvailable,
            isLicensedVersion: this.isLicensedVersion
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

  /**
   * Get service information and status
   * @returns Object containing service status and configuration details
   */
  public getServiceInfo(): { 
    available: boolean; 
    initialized: boolean; 
    version?: string; 
    isLicensedVersion: boolean;
    hasCredentials: boolean;
    hasCloudSubscription: boolean;
    instructions?: string;
    testMethod?: string;
  } {
    return {
      available: this._isAvailable,
      initialized: this.isInitialized,
      version: this._isAvailable ? 'Aspose.Words Cloud API v4.0' : undefined,
      isLicensedVersion: this.isLicensedVersion,
      hasCredentials: this.hasCredentials(),
      hasCloudSubscription: this.hasCloudSubscription(),
      instructions: !this.hasCredentials() ? 'Set ASPOSE_CLIENT_ID and ASPOSE_CLIENT_SECRET environment variables' :
                   !this._isAvailable ? 'Install asposewordscloud and implement processing logic' : 
                   !this.isLicensedVersion ? 'Check your Cloud API credentials and subscription' : 
                   'Cloud API v4.0 - full features available',
      testMethod: 'Use testConnection() to verify setup and Cloud API credentials'
    };
  }

  /**
   * Upload file to Aspose Cloud storage
   */
  public async uploadFileToStorage(fileName: string, buffer: Buffer, contentType?: string): Promise<void> {
    try {
      if (!this._isAvailable || !this.wordsApi) {
        throw new Error('Aspose.Words is not available. Call enableAspose() first.');
      }

      // Get access token for storage operations
      if (!this.clientId || !this.clientSecret) {
        throw new Error('Missing Aspose Cloud API credentials');
      }

      // Get access token
      const tokenResponse = await fetch('https://api.aspose.cloud/connect/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: `grant_type=client_credentials&client_id=${this.clientId}&client_secret=${this.clientSecret}`
      });

      if (!tokenResponse.ok) {
        throw new Error(`Failed to get access token: ${tokenResponse.status}`);
      }

      const tokenData = await tokenResponse.json() as { access_token: string };
      const accessToken = tokenData.access_token;

      const storageName = 'f87eef71-fe5d-45f6-8960-f28afebea66f'; 
      const uploadResponse = await fetch(`https://api.aspose.cloud/v4.0/storage/file/temp/${fileName}?storageName=${storageName}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': contentType || 'application/octet-stream',
          'x-aspose-client': 'Containerize.Swagger'
        },
        body: buffer
      });

      if (!uploadResponse.ok) {
        throw new Error(`Upload failed with status: ${uploadResponse.status}`);
      }

      logger.log(`[Aspose.Words] File ${fileName} uploaded successfully to storage: ${storageName}`);
      logger.log(`[Aspose.Words] File size: ${buffer.length} bytes, Content-Type: ${contentType || 'application/octet-stream'}`);
      
    } catch (error) {
      logger.error(`[Aspose.Words] Failed to upload file ${fileName} to storage: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Check if a file exists in Aspose storage
   */
  async fileExists(fileName: string): Promise<boolean> {
    try {
      if (!this._isAvailable || !this.clientId || !this.clientSecret) {
        return false;
      }

      // Get access token
      const tokenResponse = await fetch('https://api.aspose.cloud/connect/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: `grant_type=client_credentials&client_id=${this.clientId}&client_secret=${this.clientSecret}`
      });

      if (!tokenResponse.ok) {
        return false;
      }

      const tokenData = await tokenResponse.json() as { access_token: string };
      const accessToken = tokenData.access_token;
      const storageName = 'f87eef71-fe5d-45f6-8960-f28afebea66f';

      const response = await fetch(`https://api.aspose.cloud/v4.0/storage/exist?path=${fileName}&storageName=${storageName}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'x-aspose-client': 'Containerize.Swagger'
        }
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json() as { exists?: boolean };
      return data && data.exists === true;
    } catch (error) {
      logger.warn(`[Aspose.Words] Failed to check if file exists: ${fileName} - ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }
}

/**
 * Create a new AsposeDocxBridge instance
 * @param configService - Optional ConfigService instance for environment variable access
 * @returns AsposeDocxBridge - New bridge instance
 */
export function createAsposeBridge(configService?: ConfigService): AsposeDocxBridge {
  return new AsposeDocxBridge(configService);
}
