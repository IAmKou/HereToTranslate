export interface AsposeConfig {
  clientId: string;
  clientSecret: string;
  baseUrl?: string;
  timeout?: number;
}

export interface AsposeServiceStatus {
  words: {
    available: boolean;
    licensed: boolean;
    version: string;
  };
  pdf: {
    available: boolean;
    licensed: boolean;
    version: string;
  };
}

/**
 * Get Aspose configuration from environment variables
 * @returns AsposeConfig object with credentials and settings
 */
export function getAsposeConfig(): AsposeConfig {
  const config: AsposeConfig = {
    clientId: process.env.ASPOSE_CLIENT_ID || 'aa2cf203-b24d-4d4e-9be7-e765867d493f',
    clientSecret: process.env.ASPOSE_CLIENT_SECRET || '3c8165a61a7ebb4686e4b1de692a8857',
    baseUrl: process.env.ASPOSE_BASE_URL || 'https://api.aspose.cloud',
    timeout: parseInt(process.env.ASPOSE_TIMEOUT || '30000', 10)
  };

  // Validate required fields
  if (!config.clientId || !config.clientSecret) {
    throw new Error('Missing required Aspose Cloud API credentials. Set ASPOSE_CLIENT_ID and ASPOSE_CLIENT_SECRET environment variables.');
  }

  return config;
}

/**
 * Validate Aspose configuration
 * @param config - Aspose configuration object
 * @returns boolean - true if configuration is valid
 */
export function validateAsposeConfig(config: AsposeConfig): boolean {
  return !!(config.clientId && config.clientSecret);
}

/**
 * Check if Aspose is properly configured for Cloud API
 * @returns boolean - true if Cloud API is configured
 */
export function isAsposeCloudConfigured(): boolean {
  try {
    const config = getAsposeConfig();
    return validateAsposeConfig(config);
  } catch {
    return false;
  }
}

/**
 * Get configuration status for debugging
 * @returns Object with configuration status information
 */
export function getAsposeConfigStatus(): {
  hasCredentials: boolean;
  isCloudConfigured: boolean;
  missingFields: string[];
} {
  const missingFields: string[] = [];
  
  if (!process.env.ASPOSE_CLIENT_ID) {
    missingFields.push('ASPOSE_CLIENT_ID');
  }
  
  if (!process.env.ASPOSE_CLIENT_SECRET) {
    missingFields.push('ASPOSE_CLIENT_SECRET');
  }

  const hasCredentials = !!(process.env.ASPOSE_CLIENT_ID && process.env.ASPOSE_CLIENT_SECRET);
  const isCloudConfigured = hasCredentials;

  return {
    hasCredentials,
    isCloudConfigured,
    missingFields
  };
}
/**
 * Error messages for common Aspose configuration issues
 */
export const ASPOSE_ERROR_MESSAGES = {
  MISSING_CREDENTIALS: 'Missing Aspose Cloud credentials. Set ASPOSE_CLIENT_ID and ASPOSE_CLIENT_SECRET environment variables.',
  INVALID_CREDENTIALS: 'Invalid Aspose Cloud credentials. Please check your ASPOSE_CLIENT_ID and ASPOSE_CLIENT_SECRET.',
  NETWORK_ERROR: 'Network error connecting to Aspose Cloud. Check your internet connection and firewall settings.',
  PACKAGE_NOT_INSTALLED: 'Aspose package not installed. Run: npm install asposewordscloud asposepdfcloud',
  QUOTA_EXCEEDED: 'Aspose Cloud API quota exceeded. Please upgrade your subscription plan or wait for quota reset.',
  SUBSCRIPTION_EXPIRED: 'Aspose Cloud subscription has expired. Please renew your subscription.'
};

/**
 * Get helpful error message based on error type
 * @param error - Error object or string
 * @returns string - Helpful error message with resolution steps
 */
export function getAsposeErrorMessage(error: any): string {
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  if (errorMessage.includes('Missing environment variables')) {
    return ASPOSE_ERROR_MESSAGES.MISSING_CREDENTIALS;
  }
  
  if (errorMessage.includes('subscription')) {
    return ASPOSE_ERROR_MESSAGES.SUBSCRIPTION_EXPIRED;
  }
  
  if (errorMessage.includes('credentials')) {
    return ASPOSE_ERROR_MESSAGES.INVALID_CREDENTIALS;
  }
  
  if (errorMessage.includes('network') || errorMessage.includes('connection')) {
    return ASPOSE_ERROR_MESSAGES.NETWORK_ERROR;
  }
  
  if (errorMessage.includes('Cannot find module')) {
    return ASPOSE_ERROR_MESSAGES.PACKAGE_NOT_INSTALLED;
  }
  
  if (errorMessage.includes('quota') || errorMessage.includes('limit')) {
    return ASPOSE_ERROR_MESSAGES.QUOTA_EXCEEDED;
  }
  
  return `Aspose error: ${errorMessage}`;
}
