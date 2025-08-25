import { ConfigService } from '@nestjs/config';

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


export function getAsposeConfig(configService: ConfigService): AsposeConfig {
  const config: AsposeConfig = {
    clientId: configService.get<string>('ASPOSE_CLIENT_ID') || '',
    clientSecret: configService.get<string>('ASPOSE_CLIENT_SECRET') || '',
    baseUrl: configService.get<string>('ASPOSE_BASE_URL'),
    timeout: configService.get<number>('ASPOSE_TIMEOUT') || 30000
  };

  // Validate required fields
  if (!config.clientId || !config.clientSecret) {
    throw new Error('Missing required Aspose Cloud API credentials. Set ASPOSE_CLIENT_ID and ASPOSE_CLIENT_SECRET environment variables.');
  }

  return config;
}


export function getAsposeConfigFromEnv(): AsposeConfig {
  const config: AsposeConfig = {
    clientId: process.env.ASPOSE_CLIENT_ID || '',
    clientSecret: process.env.ASPOSE_CLIENT_SECRET || '',
    baseUrl: process.env.ASPOSE_BASE_URL,
    timeout: parseInt(process.env.ASPOSE_TIMEOUT || '30000', 10)
  };

  // Validate required fields
  if (!config.clientId || !config.clientSecret) {
    throw new Error('Missing required Aspose Cloud API credentials. Set ASPOSE_CLIENT_ID and ASPOSE_CLIENT_SECRET environment variables.');
  }

  return config;
}

export function validateAsposeConfig(config: AsposeConfig): boolean {
  return !!(config.clientId && config.clientSecret);
}


export function isAsposeCloudConfigured(configService: ConfigService): boolean {
  try {
    const config = getAsposeConfig(configService);
    return validateAsposeConfig(config);
  } catch {
    return false;
  }
}


export function isAsposeCloudConfiguredFromEnv(): boolean {
  try {
    const config = getAsposeConfigFromEnv();
    return validateAsposeConfig(config);
  } catch {
    return false;
  }
}

export function getAsposeConfigStatus(configService: ConfigService): {
  hasCredentials: boolean;
  isCloudConfigured: boolean;
  missingFields: string[];
} {
  const missingFields: string[] = [];

  if (!configService.get<string>('ASPOSE_CLIENT_ID')) {
    missingFields.push('ASPOSE_CLIENT_ID');
  }

  if (!configService.get<string>('ASPOSE_CLIENT_SECRET')) {
    missingFields.push('ASPOSE_CLIENT_SECRET');
  }

  const hasCredentials = !!(configService.get<string>('ASPOSE_CLIENT_ID') && configService.get<string>('ASPOSE_CLIENT_SECRET'));
  const isCloudConfigured = hasCredentials;

  return {
    hasCredentials,
    isCloudConfigured,
    missingFields
  };
}

/**
 * Get configuration status for debugging using process.env
 * @returns Object with configuration status information
 */
export function getAsposeConfigStatusFromEnv(): {
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
