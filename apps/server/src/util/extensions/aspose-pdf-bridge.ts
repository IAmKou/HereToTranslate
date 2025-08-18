import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
type AxiosInstance = any;
type AxiosRequestConfig = any;
import * as FormData from 'form-data';
import { getAsposeConfig } from './aspose-config';

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
  private tokenExpiry: number = 0;
  private axiosInstance: AxiosInstance;

  constructor(private configService?: ConfigService) {
    this.loadCredentialsFromEnv();
    this.initializeAsposePDF();
  }

  /**
   * Load credentials from environment variables or default config
   */
  private loadCredentialsFromEnv(): void {
    // Try environment variables first
    this.clientId = process.env.ASPOSE_CLIENT_ID || null;
    this.clientSecret = process.env.ASPOSE_CLIENT_SECRET || null;
    
    // If not found in env, try ConfigService
    if (!this.clientId || !this.clientSecret) {
      this.clientId = this.configService?.get<string>('ASPOSE_CLIENT_ID') || null;
      this.clientSecret = this.configService?.get<string>('ASPOSE_CLIENT_SECRET') || null;
    }
    
    // If still not found, use default credentials from config
    if (!this.clientId || !this.clientSecret) {
      try {
        const { getAsposeConfig } = require('./aspose-config');
        const config = getAsposeConfig();
        this.clientId = config.clientId;
        this.clientSecret = config.clientSecret;
        this.logger.log('[Aspose.PDF] Credentials loaded from default config');
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
        
        // Create axios instance for Aspose Cloud API
        this.axiosInstance = axios.create({
          baseURL: 'https://api.aspose.cloud/v3.0',
          timeout: 60000, // 60 seconds timeout
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        });
        
        // Add request interceptor to add auth token
        this.axiosInstance.interceptors.request.use(async (config: AxiosRequestConfig) => {
          if (this.isTokenExpired()) {
            await this.refreshAccessToken();
          }
          if (this.accessToken) {
            config.headers.Authorization = `Bearer ${this.accessToken}`;
          }
          return config;
        });
        
        await this.refreshAccessToken();
        this._isAvailable = true;
        this.isInitialized = true;
        this.logger.log('[Aspose.PDF] Initialized successfully with axios');
      } else {
        this.logger.warn('[Aspose.PDF] Credentials not found, features will be disabled');
        this._isAvailable = false;
      }
    } catch (error) {
      this.logger.error('[Aspose.PDF] Failed to initialize:', error);
      this._isAvailable = false;
    }
  }
  async createTestPDF(content: string) {
    const { clientId, clientSecret } = getAsposeConfig();
    const { PdfApi } = require("asposepdfcloud");
    const pdfApi = new PdfApi(clientId, clientSecret, 'https://api.aspose.cloud/v3.0');
  
    // Just get disc usage (simple connectivity check)
    const res = await pdfApi.getDiscUsage();
    return res.body;
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
          }
        }
      );

      const data = tokenResponse.data as { access_token: string; expires_in: number };
      if (data && data.access_token) {
        this.accessToken = data.access_token;
        this.tokenExpiry = Date.now() + (data.expires_in * 1000);
        this.logger.log('[Aspose.PDF] Access token refreshed successfully');
      } else {
        throw new Error('Invalid token response');
      }
    } catch (error) {
      this.logger.error(`[Aspose.PDF] Failed to refresh access token: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Check if current token is expired
   */
  private isTokenExpired(): boolean {
    return Date.now() >= this.tokenExpiry;
  }

  /**
   * Check if credentials are configured
   */
  private hasCredentials(): boolean {
    return !!(this.clientId && this.clientSecret);
  }

  /**
   * Extract text from PDF using Aspose Cloud API
   */
  async extractTextWithAsposePDF(buffer: Buffer): Promise<AsposePDFExtractionResult> {
    if (!this._isAvailable) {
      throw new Error('Aspose.PDF is not available');
    }

    try {
      this.logger.log('[Aspose.PDF] Starting text extraction...');
      
      // Upload file to Aspose Cloud storage
      const tempFileName = `extract_${Date.now()}.pdf`;
      await this.uploadFile(tempFileName, buffer);
      
      // Extract text from PDF
      const textResponse = await this.axiosInstance.get(`/pdf/${tempFileName}/text`);
      
      if (!textResponse.data || !textResponse.data.text) {
        throw new Error('Failed to extract text from PDF');
      }

      const extractedText = textResponse.data.text || '';
      this.logger.log(`[Aspose.PDF] Extracted text length: ${extractedText.length}`);

      // Get page count
      const pageCount = await this.getPageCount(buffer);
      
      // Create text items from extracted text
      const textItems = this.createTextItemsFromText(extractedText, pageCount);
      
      // Extract basic image info (simplified for now)
      const imageItems: AsposePDFImageItem[] = [];

      // Extract metadata
      const metadata = await this.extractMetadata(buffer);

      // Clean up temporary file
      try {
        await this.deleteFile(tempFileName);
      } catch (cleanupError) {
        this.logger.warn(`[Aspose.PDF] Failed to cleanup temp file: ${cleanupError instanceof Error ? cleanupError.message : String(cleanupError)}`);
      }

      return {
        text: extractedText,
        items: textItems,
        images: imageItems,
        pageCount,
        metadata
      };

    } catch (error) {
      this.logger.error('[Aspose.PDF] Error extracting text:', error);
      throw error;
    }
  }

  /**
   * Replace text in PDF using Aspose Cloud API
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

      // Upload file to Aspose Cloud storage
      const tempFileName = `replace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.pdf`;
      this.logger.log(`[Aspose.PDF] Uploading file to Aspose Cloud as: ${tempFileName}`);
      
      await this.uploadFile(tempFileName, originalBuffer);
      this.logger.log('[Aspose.PDF] File uploaded successfully to Aspose Cloud');
      
      // Process each replacement
      for (const replacement of replacements) {
        try {
          this.logger.log(`[Aspose.PDF] Processing replacement: "${replacement.originalText}" -> "${replacement.translatedText}"`);
          
          // Use Aspose Cloud API to replace text
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
          
          await this.axiosInstance.post(`/pdf/${tempFileName}/replaceText`, replaceRequest);
          this.logger.log(`[Aspose.PDF] Text replacement successful for: "${replacement.originalText}"`);
          
        } catch (replaceError) {
          this.logger.error(`[Aspose.PDF] Failed to replace text "${replacement.originalText}": ${replaceError instanceof Error ? replaceError.message : String(replaceError)}`);
          // Continue with other replacements instead of failing completely
        }
      }
      
      // Download the modified PDF
      this.logger.log('[Aspose.PDF] Downloading modified PDF...');
      const downloadResponse = await this.axiosInstance.get(`/pdf/${tempFileName}`, {
        responseType: 'arraybuffer'
      });
      
      if (downloadResponse.data) {
        const modifiedPdfBuffer = Buffer.from(downloadResponse.data);
        this.logger.log(`[Aspose.PDF] Modified PDF downloaded successfully, size: ${modifiedPdfBuffer.length} bytes`);
        
        // Clean up temporary file
        try {
          await this.deleteFile(tempFileName);
          this.logger.log('[Aspose.PDF] Temporary file cleaned up successfully');
        } catch (cleanupError) {
          this.logger.warn(`[Aspose.PDF] Failed to cleanup temp file: ${cleanupError instanceof Error ? cleanupError.message : String(cleanupError)}`);
        }
        
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
   * Upload file to Aspose Cloud storage
   */
  private async uploadFile(fileName: string, buffer: Buffer): Promise<void> {
    try {
      const formData = new FormData();
      formData.append('file', buffer, {
        filename: fileName,
        contentType: 'application/pdf'
      });

      const response = await this.axiosInstance.put(`/storage/file/${fileName}`, formData, {
        headers: {
          ...formData.getHeaders()
        }
      });

      if (response.status !== 200) {
        throw new Error(`Upload failed with status: ${response.status}`);
      }

      this.logger.log(`[Aspose.PDF] File ${fileName} uploaded successfully`);
    } catch (error) {
      this.logger.error(`[Aspose.PDF] Failed to upload file ${fileName}: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Delete file from Aspose Cloud storage
   */
  private async deleteFile(fileName: string): Promise<void> {
    try {
      const response = await this.axiosInstance.delete(`/storage/file/${fileName}`);
      if (response.status === 200) {
        this.logger.log(`[Aspose.PDF] File ${fileName} deleted successfully`);
      }
    } catch (error) {
      this.logger.warn(`[Aspose.PDF] Failed to delete file ${fileName}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get page count from PDF
   */
  private async getPageCount(buffer: Buffer): Promise<number> {
    try {
      const tempFileName = `pagecount_${Date.now()}.pdf`;
      await this.uploadFile(tempFileName, buffer);
      
      const infoResponse = await this.axiosInstance.get(`/pdf/${tempFileName}`);
      
      if (infoResponse.data && infoResponse.data.pages) {
        const pageCount = infoResponse.data.pages.length;
        
        // Clean up
        try {
          await this.deleteFile(tempFileName);
        } catch (cleanupError) {
          this.logger.warn(`[Aspose.PDF] Failed to cleanup temp file: ${cleanupError instanceof Error ? cleanupError.message : String(cleanupError)}`);
        }
        
        return pageCount;
      }
      
      return 1; // Default to 1 page if we can't determine
    } catch (error) {
      this.logger.warn(`[Aspose.PDF] Could not determine page count: ${error instanceof Error ? error.message : String(error)}`);
      return 1; // Default to 1 page
    }
  }

  /**
   * Extract metadata from PDF
   */
  private async extractMetadata(buffer: Buffer): Promise<any> {
    try {
      const tempFileName = `metadata_${Date.now()}.pdf`;
      await this.uploadFile(tempFileName, buffer);
      
      const infoResponse = await this.axiosInstance.get(`/pdf/${tempFileName}`);
      
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
        
        // Clean up
        try {
          await this.deleteFile(tempFileName);
        } catch (cleanupError) {
          this.logger.warn(`[Aspose.PDF] Failed to cleanup temp file: ${cleanupError instanceof Error ? cleanupError.message : String(cleanupError)}`);
        }
        
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
    instructions?: string;
    testMethod?: string;
  } {
    return {
      available: this._isAvailable,
      initialized: this.isInitialized,
      version: this._isAvailable ? 'Aspose.PDF Cloud API via Axios' : undefined,
      hasCredentials: this.hasCredentials(),
      instructions: !this.hasCredentials() ? 'Set ASPOSE_CLIENT_ID and ASPOSE_CLIENT_SECRET environment variables' :
                   !this._isAvailable ? 'Check credentials and network connectivity' : 
                   'Cloud API version - full features available',
      testMethod: 'Use testConnection() to verify setup and credentials'
    };
  }

  /**
   * Test Aspose PDF Cloud API connection and configuration
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
      
      // Test authentication by trying to get user info
      try {
        const userResponse = await this.axiosInstance.get('/user');
        if (userResponse.status === 200) {
          this.logger.log('[Aspose.PDF] Authentication test: SUCCESS');
          
          return {
            success: true,
            message: 'Aspose.PDF Cloud API connection test successful',
            details: {
              isAvailable: this._isAvailable,
              isInitialized: this.isInitialized,
              hasCredentials: this.hasCredentials(),
              userInfo: userResponse.data
            }
          };
        } else {
          throw new Error(`Unexpected response status: ${userResponse.status}`);
        }
      } catch (authError) {
        this.logger.warn(`[Aspose.PDF] Authentication test failed: ${authError instanceof Error ? authError.message : String(authError)}`);
        
        return {
          success: false,
          message: 'Aspose.PDF Cloud API authentication failed',
          details: {
            isAvailable: this._isAvailable,
            isInitialized: this.isInitialized,
            hasCredentials: this.hasCredentials(),
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
}

/**
 * Create a new AsposePDFBridge instance
 */
export function createAsposePDFBridge(): AsposePDFBridge {
  return new AsposePDFBridge();
}
