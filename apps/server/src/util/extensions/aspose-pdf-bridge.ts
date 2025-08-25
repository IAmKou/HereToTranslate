import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import FormData from 'form-data';

export interface AsposePDFTextItem {
  text: string;
  font: string;
  fontSize: number;
  bold: boolean;
  italic: boolean;
  color: string;
  x: number;
  y: number;
  width: number;
  height: number;
  page: number;
}

export interface AsposePDFImageItem {
  data: Buffer;
  x: number;
  y: number;
  width: number;
  height: number;
  page: number;
  type: string;
}

export interface AsposePDFExtractionResult {
  text: string;
  items: AsposePDFTextItem[];
  images: AsposePDFImageItem[];
  pageCount: number;
  metadata?: any;
}

export interface AsposePDFReplacementEntry {
  originalText: string;
  translatedText: string;
  position: {
    x: number;
    y: number;
    width?: number;
    height?: number;
    page: number;
  };
  style?: {
    bold?: boolean;
    italic?: boolean;
    color?: string;
    fontSize?: number;
    font?: string;
  };
}

@Injectable()
export class AsposePDFBridge {
  private readonly logger = new Logger(AsposePDFBridge.name);
  private _isAvailable = false;
  private isInitialized = false;
  private clientId: string | null = null;
  private clientSecret: string | null = null;
  private accessToken: string | null = null;
  private tokenExpiry = 0;
  private storageName = 'test'; 
  
  // Cache for uploaded files to avoid re-uploading
  private uploadedFiles = new Map<string, string>();
  
  // Use v3.0 API for PDF operations
  private axiosInstance = axios.create({
    baseURL: 'https://api.aspose.cloud/v3.0',
    timeout: 60000, // 60 seconds timeout
    headers: {
      'Accept': 'application/json',
      'x-aspose-client': 'Containerize.Swagger'
    }
  });

  // Separate instance for file operations (v3.0)
  private fileAxiosInstance = axios.create({
    baseURL: 'https://api.aspose.cloud/v3.0',
    timeout: 60000, // 60 seconds timeout
    headers: {
      'Accept': 'application/json',
      'x-aspose-client': 'Containerize.Swagger'
    }
  });

  constructor(private configService: ConfigService) {
    this.loadCredentialsFromConfigService();
    this.initializeAsposePDF();
  }

  /**
   * Load credentials from ConfigService
   */
  private loadCredentialsFromConfigService(): void {
    // Try ConfigService first
    this.clientId = this.configService.get<string>('ASPOSE_CLIENT_ID') || null;
    this.clientSecret = this.configService.get<string>('ASPOSE_CLIENT_SECRET') || null;
    
    // If not found in ConfigService, try environment variables as fallback
    if (!this.clientId || !this.clientSecret) {
      this.clientId = process.env.ASPOSE_CLIENT_ID || null;
      this.clientSecret = process.env.ASPOSE_CLIENT_SECRET || null;
      this.logger.log('[Aspose.PDF] Credentials loaded from environment variables (fallback)');
    }
    
    // If still not found, use default credentials from config utility
    if (!this.clientId || !this.clientSecret) {
      try {
        const { getAsposeConfigFromEnv } = require('./aspose-config');
        const config = getAsposeConfigFromEnv();
        this.clientId = config.clientId;
        this.clientSecret = config.clientSecret;
        this.logger.log('[Aspose.PDF] Credentials loaded from default config utility');
      } catch (error) {
        this.logger.warn('[Aspose.PDF] No credentials available');
      }
    }
  }

  /**
   * Initialize Aspose.PDF with credentials
   */
  private async initializeAsposePDF(): Promise<void> {
    try {
      
      if (this.clientId && this.clientSecret) {
        this.logger.log('[Aspose.PDF] Credentials found, initializing...');
        
        // Add request interceptor to add auth token and handle token refresh
        this.axiosInstance.interceptors.request.use(async (config) => {
          // Check if token is expired or about to expire (within 5 minutes)
          if (!this.accessToken || this.isTokenExpired()) {
            this.logger.log('[Aspose.PDF] Token expired or missing, refreshing...');
            await this.refreshAccessToken();
          }
          
          if (this.accessToken) {
            config.headers = config.headers || {};
            config.headers.Authorization = `Bearer ${this.accessToken}`;
            this.logger.debug(`[Aspose.PDF] Request headers: ${JSON.stringify(config.headers)}`);
            this.logger.debug(`[Aspose.PDF] Request URL: ${config.url}`);
            this.logger.debug(`[Aspose.PDF] Request method: ${config.method}`);
          }
          return config;
        });

        // Add response interceptor to handle 401 errors
        this.axiosInstance.interceptors.response.use(
          (response) => response,
          async (error) => {
            if (error.response?.status === 401) {
              this.logger.warn('[Aspose.PDF] Received 401, token may be expired, refreshing...');
              this.accessToken = null; // Clear expired token
              this.tokenExpiry = 0;
              
              // Retry the request once with new token
              if (error.config && !error.config._retry) {
                error.config._retry = true;
                await this.refreshAccessToken();
                if (this.accessToken) {
                  error.config.headers.Authorization = `Bearer ${this.accessToken}`;
                  return this.axiosInstance.request(error.config);
                }
              }
            }
            return Promise.reject(error);
          }
        );
        
        await this.refreshAccessToken();
        this._isAvailable = true;
        this.isInitialized = true;
        this.logger.log('[Aspose.PDF] Initialized successfully with axios v3.0');
      } else {
        this.logger.warn('[Aspose.PDF] Credentials not found, features will be disabled');
        this._isAvailable = false;
      }
    } catch (error) {
      this.logger.error('[Aspose.PDF] Failed to initialize:', error);
      this._isAvailable = false;
    }
  }

  /**
   * Check if token is expired
   */
  private isTokenExpired(): boolean {
    const bufferTime = 5 * 60 * 1000; 
    return Date.now() >= (this.tokenExpiry - bufferTime);
  }

  /**
   * Get access token from Aspose Cloud API
   */
  private async refreshAccessToken(): Promise<void> {
    try {
      this.logger.log('[Aspose.PDF] Refreshing access token...');
      
      const tokenResponse = await axios.post('https://api.aspose.cloud/connect/token', 
        `grant_type=client_credentials&client_id=${this.clientId}&client_secret=${this.clientSecret}`,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          timeout: 30000 // 30 seconds timeout for token request
        }
      );

      const data = tokenResponse.data as { access_token: string; expires_in: number };
      if (data && data.access_token) {
        this.accessToken = data.access_token;
        // Set expiry time (expires_in is in seconds)
        this.tokenExpiry = Date.now() + (data.expires_in * 1000);
        this.logger.log(`[Aspose.PDF] Access token refreshed successfully, expires in ${data.expires_in} seconds`);
        this.logger.debug(`[Aspose.PDF] Token preview: ${this.accessToken.substring(0, 20)}...`);
      } else {
        throw new Error('Invalid token response - missing access_token');
      }
    } catch (error) {
      this.logger.error(`[Aspose.PDF] Failed to refresh access token: ${error instanceof Error ? error.message : String(error)}`);
      if (axios.isAxiosError(error)) {
        this.logger.error(`[Aspose.PDF] Axios error details: status=${error.response?.status}, data=${JSON.stringify(error.response?.data)}`);
      }
      throw error;
    }
  }

  /**
   * Check if credentials are configured
   */
  private hasCredentials(): boolean {
    return !!(this.clientId && this.clientSecret);
  }

 /**
   * Replace text in PDF using Aspose Cloud API v3.0
   */
  async replaceTextWithAsposePDF(originalBuffer: Buffer, replacements: AsposePDFReplacementEntry[]): Promise<Buffer> {
    if (!this._isAvailable) {
      throw new Error('Aspose.PDF is not available');
    }
  
    try {
      this.logger.log('[Aspose.PDF] Starting text replacement...');
      this.logger.log(`[Aspose.PDF] Buffer size: ${originalBuffer.length} bytes`);
      this.logger.log(`[Aspose.PDF] Number of replacements: ${replacements.length}`);
      
      // Log each replacement entry for debugging
      replacements.forEach((replacement, index) => {
        this.logger.log(`[Aspose.PDF] Replacement ${index + 1}: "${replacement.originalText}" -> "${replacement.translatedText}" at page ${replacement.position.page}, position (${replacement.position.x}, ${replacement.position.y})`);
      });

      // Upload file to Aspose Cloud storage and get the path (will use cache if already uploaded)
      const originalFileName = `replace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.pdf`;
      const uploadedFilePath = await this.uploadFile(originalFileName, originalBuffer);
      this.logger.log('[Aspose.PDF] File uploaded successfully to Aspose Cloud temp subfolder');
      
      // Process each replacement using v3.0 API
      for (const replacement of replacements) {
        try {
          this.logger.log(`[Aspose.PDF] Processing replacement: "${replacement.originalText}" -> "${replacement.translatedText}"`);
          
          // Use Aspose Cloud API v3.0 to replace text
          const replaceRequest = {
            oldValue: replacement.originalText,
            newValue: replacement.translatedText,
            pageNumber: replacement.position.page,
            rect: {
              x: replacement.position.x,
              y: replacement.position.y,
              width: replacement.position.width || 100,
              height: replacement.position.height || 20
            }
          };
          
          this.logger.log(`[Aspose.PDF] Replace request: ${JSON.stringify(replaceRequest, null, 2)}`);
          
          await this.axiosInstance.post(`/pdf/${uploadedFilePath}/pages/${replacement.position.page}/replaceText?storage=test&folder=temp`, {
            OldValue: replacement.originalText,
            NewValue: replacement.translatedText,
            Regex: false
          });
          this.logger.log(`[Aspose.PDF] Text replacement successful for: "${replacement.originalText}"`);
          
        } catch (replaceError) {
          this.logger.error(`[Aspose.PDF] Failed to replace text "${replacement.originalText}": ${replaceError instanceof Error ? replaceError.message : String(replaceError)}`);
          // Continue with other replacements instead of failing completely
        }
      }
      
      // Download the modified PDF
      this.logger.log('[Aspose.PDF] Downloading modified PDF...');
      const downloadResponse = await this.axiosInstance.get(`/pdf/${uploadedFilePath}`, {
        responseType: 'arraybuffer'
      });
      
      if (downloadResponse.data) {
        const modifiedPdfBuffer = Buffer.from(downloadResponse.data);
        this.logger.log(`[Aspose.PDF] Modified PDF downloaded successfully, size: ${modifiedPdfBuffer.length} bytes`);
        
        this.logger.log(`[Aspose.PDF] File remains in temp subfolder for potential reuse: ${uploadedFilePath}`);
        
        this.logger.log('[Aspose.PDF] Text replacement completed successfully');
        return modifiedPdfBuffer;
      } else {
        throw new Error('Download response is empty');
      }
      
    } catch (error) {
      this.logger.error(`[Aspose.PDF] Error in replaceTextWithAsposePDF: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error(`Aspose.PDF text replacement failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Generate a hash for the buffer to use as cache key
   */
  private generateFileHash(buffer: Buffer): string {
    const crypto = require('crypto');
    return crypto.createHash('md5').update(buffer).digest('hex');
  }

  /**
   * Upload file to Aspose Cloud storage using v3.0 API with caching and temp folder
   * This method ensures files are only uploaded once to the temp subfolder
   */
  private async uploadFile(fileName: string, buffer: Buffer): Promise<string> {
    try {
      // Generate hash for caching
      const fileHash = this.generateFileHash(buffer);
      
      // Check if file is already uploaded
      if (this.uploadedFiles.has(fileHash)) {
        const cachedFileName = this.uploadedFiles.get(fileHash)!;
        this.logger.log(`[Aspose.PDF] File already uploaded, using cached: ${cachedFileName}`);
        return cachedFileName;
      }

      // Ensure we have a valid token before upload
      if (!this.accessToken || this.isTokenExpired()) {
        this.logger.log('[Aspose.PDF] Token expired before upload, refreshing...');
        await this.refreshAccessToken();
      }

      // Always use temp subfolder for the file
      const tempFileName = `temp/${fileName}`;
      
      this.logger.log(`[Aspose.PDF] Uploading file ${tempFileName} (${buffer.length} bytes) to temp subfolder`);
      this.logger.debug(`[Aspose.PDF] Using token: ${this.accessToken ? this.accessToken.substring(0, 20) + '...' : 'NO TOKEN'}`);

      // Create FormData for the file
      const formData = new FormData();
      formData.append('File', buffer, {
        filename: fileName,
        contentType: 'application/pdf'
      });

      // Upload using v3.0 API endpoint to temp subfolder
      const response = await this.fileAxiosInstance.put(`/pdf/storage/file/${tempFileName}?storageName=${this.storageName}`, formData, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': `multipart/form-data; boundary=${formData.getBoundary()}`,
          'x-aspose-client': 'Containerize.Swagger'
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      });

      if (response.status !== 200) {
        throw new Error(`Upload failed with status: ${response.status}`);
      }

      // Cache the uploaded file with the temp path
      this.uploadedFiles.set(fileHash, tempFileName);
      
      this.logger.log(`[Aspose.PDF] File ${tempFileName} uploaded successfully to temp subfolder in storage: ${this.storageName}`);
      return tempFileName;
    } catch (error) {
      this.logger.error(`[Aspose.PDF] Failed to upload file ${fileName}: ${error instanceof Error ? error.message : String(error)}`);
      if (axios.isAxiosError(error)) {
        this.logger.error(`[Aspose.PDF] Upload error details: status=${error.response?.status}, data=${JSON.stringify(error.response?.data)}`);
        this.logger.error(`[Aspose.PDF] Request headers: ${JSON.stringify(error.config?.headers)}`);
      }
      throw error;
    }
  }

  /**
   * Public method to upload any file to Aspose Cloud storage using v3.0 API
   * This method also uses the temp subfolder for consistency
   */
  public async uploadFileToStorage(fileName: string, buffer: Buffer, contentType?: string): Promise<void> {
    try {
      // Ensure we have a valid token before upload
      if (!this.accessToken || this.isTokenExpired()) {
        this.logger.log('[Aspose.PDF] Token expired before storage upload, refreshing...');
        await this.refreshAccessToken();
      }

      // Use temp subfolder for consistency with other upload methods
      const tempFileName = `temp/${fileName}`;
      
      this.logger.log(`[Aspose.PDF] Uploading file ${tempFileName} to temp subfolder (${buffer.length} bytes)`);
      this.logger.debug(`[Aspose.PDF] Using token: ${this.accessToken ? this.accessToken.substring(0, 20) + '...' : 'NO TOKEN'}`);

      // Create FormData for the file
      const formData = new FormData();
      formData.append('File', buffer, {
        filename: fileName,
        contentType: contentType || 'application/octet-stream'
      });

      const response = await this.fileAxiosInstance.put(`/pdf/storage/file/${tempFileName}?storageName=${this.storageName}`, formData, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': `multipart/form-data; boundary=${formData.getBoundary()}`,
          'x-aspose-client': 'Containerize.Swagger'
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      });

      if (response.status !== 200) {
        throw new Error(`Upload failed with status: ${response.status}`);
      }

      this.logger.log(`[Aspose.PDF] File ${tempFileName} uploaded successfully to temp subfolder in storage: ${this.storageName}`);
    } catch (error) {
      this.logger.error(`[Aspose.PDF] Failed to upload file ${fileName} to storage: ${error instanceof Error ? error.message : String(error)}`);
      if (axios.isAxiosError(error)) {
        this.logger.error(`[Aspose.PDF] Storage upload error details: status=${error.response?.status}, data=${JSON.stringify(error.response?.data)}`);
        this.logger.error(`[Aspose.PDF] Request headers: ${JSON.stringify(error.config?.headers)}`);
      }
      throw error;
    }
  }

  /**
   * Delete file from Aspose Cloud storage using v3.0 API
   */
  private async deleteFile(fileName: string): Promise<void> {
    try {
      const response = await this.axiosInstance.delete(`/pdf/storage/file/${fileName}?storageName=${this.storageName}`);
      if (response.status === 200) {
        this.logger.log(`[Aspose.PDF] File ${fileName} deleted successfully`);
      }
    } catch (error) {
      this.logger.warn(`[Aspose.PDF] Failed to delete file ${fileName}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get page count from PDF using v3.0 API
   */
  private async getPageCount(buffer: Buffer): Promise<number> {
    try {
      const originalFileName = `pagecount_${Date.now()}.pdf`;
      const uploadedFilePath = await this.uploadFile(originalFileName, buffer);
      
      const infoResponse = await this.axiosInstance.get(`/pdf/${uploadedFilePath}`);
      
      if (infoResponse.data && infoResponse.data.pages) {
        const pageCount = infoResponse.data.pages.length;
        
        // File is cached, no cleanup needed
        
        return pageCount;
      }
      
      return 1; // Default to 1 page if we can't determine
    } catch (error) {
      this.logger.warn(`[Aspose.PDF] Could not determine page count: ${error instanceof Error ? error.message : String(error)}`);
      return 1; // Default to 1 page
    }
  }

  /**
   * Extract metadata from PDF using v3.0 API
   */
  private async extractMetadata(buffer: Buffer): Promise<any> {
    try {
      const originalFileName = `metadata_${Date.now()}.pdf`;
      const uploadedFilePath = await this.uploadFile(originalFileName, buffer);
      
      const infoResponse = await this.axiosInstance.get(`/pdf/${uploadedFilePath}`);
      
      if (infoResponse.data) {
        const info = infoResponse.data;
        const metadata = {
          title: info.title || '',
          author: info.author || '',
          subject: info.subject || '',
          creator: info.creator || '',
          producer: info.producer || '',
          creationDate: info.creationDate || '',
          modDate: info.modDate || ''
        };
        
        // File is cached, no cleanup needed

        return metadata;
      }
      
      return {};
    } catch (error) {
      this.logger.error('[Aspose.PDF] Error extracting metadata:', error);
      return {};
    }
  }

  /**
   * Create text items from extracted text
   */
  private createTextItemsFromText(text: string, pageCount: number): AsposePDFTextItem[] {
    const textItems: AsposePDFTextItem[] = [];
    
    if (!text || text.trim().length === 0) {
      return textItems;
    }

    // Split text into lines and create text items
    const lines = text.split('\n').filter(line => line.trim());
    
    // Distribute lines across pages
    const linesPerPage = Math.ceil(lines.length / pageCount);
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.trim().length === 0) continue;
      
      const pageNum = Math.floor(i / linesPerPage) + 1;
      
      textItems.push({
        text: line.trim(),
        font: 'default',
        fontSize: 12,
        bold: false,
        italic: false,
        color: '#000000',
        x: 50, // Default position
        y: 50 + ((i % linesPerPage) * 20), // Default line spacing
        width: line.length * 7, // Rough estimate
        height: 16,
        page: pageNum
      });
    }

    return textItems;
  }

  /**
   * Check if Aspose.PDF service is available
   */
  isAvailable(): boolean {
    return this._isAvailable;
  }

  /**
   * Get service information and status
   */
  public getServiceInfo(): { 
    available: boolean; 
    initialized: boolean; 
    version?: string; 
    hasCredentials: boolean;
    hasValidToken: boolean;
    tokenExpiry?: Date;
    instructions?: string;
    testMethod?: string;
  } {
    return {
      available: this._isAvailable,
      initialized: this.isInitialized,
      version: this._isAvailable ? 'Aspose.PDF Cloud API v3.0 via Axios' : undefined,
      hasCredentials: this.hasCredentials(),
      hasValidToken: !!(this.accessToken && !this.isTokenExpired()),
      tokenExpiry: this.tokenExpiry > 0 ? new Date(this.tokenExpiry) : undefined,
      instructions: !this.hasCredentials() ? 'Set ASPOSE_CLIENT_ID and ASPOSE_CLIENT_SECRET environment variables' :
                   !this._isAvailable ? 'Check credentials and network connectivity' : 
                   !this.accessToken ? 'Token not obtained - check credentials' :
                   this.isTokenExpired() ? 'Token expired - will refresh automatically' :
                   'Cloud API v3.0 - full features available',
      testMethod: 'Use testConnection() to verify setup and credentials'
    };
  }

  /**
   * Test Aspose PDF Cloud API v3.0 connection and configuration
   */
  async testConnection(): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      this.logger.log('[Aspose.PDF] Testing connection...');
      
      // Check if service is available
      if (!this._isAvailable) {
        return {
          success: false,
          message: 'Aspose.PDF service is not available',
          details: {
            isAvailable: this._isAvailable,
            isInitialized: this.isInitialized,
            hasCredentials: this.hasCredentials()
          }
        };
      }
      
      // Check credentials
      if (!this.hasCredentials()) {
        return {
          success: false,
          message: 'Missing Aspose Cloud API credentials',
          details: {
            clientId: this.clientId ? '***' + this.clientId.slice(-4) : null,
            clientSecret: this.clientSecret ? '***' + this.clientSecret.slice(-4) : null
          }
        };
      }
      
      // Ensure we have a valid token
      if (!this.accessToken || this.isTokenExpired()) {
        this.logger.log('[Aspose.PDF] Token missing or expired, refreshing...');
        await this.refreshAccessToken();
      }
      
      // Test authentication by trying to get user info
      try {
        this.logger.log('[Aspose.PDF] Testing user API endpoint...');
        const userResponse = await this.axiosInstance.get('/user');
        if (userResponse.status === 200) {
          this.logger.log('[Aspose.PDF] User API test: SUCCESS');
          
          // Test storage API specifically
          try {
            this.logger.log('[Aspose.PDF] Testing storage API endpoint...');
            const storageResponse = await this.axiosInstance.get('/storage');
            if (storageResponse.status === 200) {
              this.logger.log('[Aspose.PDF] Storage API test: SUCCESS');
              
              return {
                success: true,
                message: 'Aspose.PDF Cloud API v3.0 connection test successful',
                details: {
                  isAvailable: this._isAvailable,
                  isInitialized: this.isInitialized,
                  hasCredentials: this.hasCredentials(),
                  hasValidToken: !!(this.accessToken && !this.isTokenExpired()),
                  tokenExpiry: this.tokenExpiry > 0 ? new Date(this.tokenExpiry) : undefined,
                  userInfo: userResponse.data,
                  storageInfo: storageResponse.data,
                  apiVersion: 'v3.0',
                  baseUrl: 'https://api.aspose.cloud/v3.0'
                }
              };
            } else {
              throw new Error(`Storage API unexpected response status: ${storageResponse.status}`);
            }
          } catch (storageError) {
            this.logger.warn(`[Aspose.PDF] Storage API test failed: ${storageError instanceof Error ? storageError.message : String(storageError)}`);
            
            return {
              success: false,
              message: 'Aspose.PDF Cloud API v3.0 storage access failed',
              details: {
                isAvailable: this._isAvailable,
                isInitialized: this.isInitialized,
                hasCredentials: this.hasCredentials(),
                hasValidToken: !!(this.accessToken && !this.isTokenExpired()),
                tokenExpiry: this.tokenExpiry > 0 ? new Date(this.tokenExpiry) : undefined,
                userInfo: userResponse.data,
                storageError: storageError instanceof Error ? storageError.message : String(storageError),
                apiVersion: 'v3.0',
                baseUrl: 'https://api.aspose.cloud/v3.0'
              }
            };
          }
        } else {
          throw new Error(`Unexpected response status: ${userResponse.status}`);
        }
      } catch (authError) {
        this.logger.warn(`[Aspose.PDF] Authentication test failed: ${authError instanceof Error ? authError.message : String(authError)}`);
        
        return {
          success: false,
          message: 'Aspose.PDF Cloud API v3.0 authentication failed',
          details: {
            isAvailable: this._isAvailable,
            isInitialized: this.isInitialized,
            hasCredentials: this.hasCredentials(),
            hasValidToken: !!(this.accessToken && !this.isTokenExpired()),
            tokenExpiry: this.tokenExpiry > 0 ? new Date(this.tokenExpiry) : undefined,
            authError: authError instanceof Error ? authError.message : String(authError)
          }
        };
      }
      
    } catch (error) {
      this.logger.error(`[Aspose.PDF] Error in testConnection: ${error instanceof Error ? error.message : String(error)}`);
      return {
        success: false,
        message: `Test failed: ${error instanceof Error ? error.message : String(error)}`,
        details: { error: error instanceof Error ? error.stack : String(error) }
      };
    }
  }

  /**
   * Check if a file exists in Aspose storage using v3.0 API
   */
  async fileExists(fileName: string): Promise<boolean> {
    try {
      if (!this._isAvailable || !this.accessToken) {
        return false;
      }

      const response = await this.axiosInstance.get(`/pdf/storage/exist?path=${fileName}&storageName=${this.storageName}`);
      return response.data && response.data.exists === true;
    } catch (error) {
      this.logger.warn(`[Aspose.PDF] Failed to check if file exists: ${fileName}`, error);
      return false;
    }
  }

  /**
   * Clear the uploaded files cache
   */
  clearCache(): void {
    this.uploadedFiles.clear();
    this.logger.log('[Aspose.PDF] Upload cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; files: string[] } {
    return {
      size: this.uploadedFiles.size,
      files: Array.from(this.uploadedFiles.values())
    };
  }

  /**
   * Clean up all cached files from storage (use with caution)
   */
  async cleanupCachedFiles(): Promise<{ deleted: number; errors: number }> {
    let deleted = 0;
    let errors = 0;

    for (const [hash, filePath] of this.uploadedFiles.entries()) {
      try {
        await this.deleteFile(filePath);
        this.uploadedFiles.delete(hash);
        deleted++;
        this.logger.log(`[Aspose.PDF] Cached file deleted: ${filePath}`);
      } catch (error) {
        errors++;
        this.logger.error(`[Aspose.PDF] Failed to delete cached file: ${filePath}`, error);
      }
    }

    this.logger.log(`[Aspose.PDF] Cache cleanup completed: ${deleted} deleted, ${errors} errors`);
    return { deleted, errors };
  }
}

/**
 * Create a new AsposePDFBridge instance
 * @param configService - ConfigService instance for environment variable access
 * @returns AsposePDFBridge - New bridge instance
 */
export function createAsposePDFBridge(configService: ConfigService): AsposePDFBridge {
  return new AsposePDFBridge(configService);
}
