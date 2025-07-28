// Chat configuration utility for RadVPN support
import { getEnvironmentConfig } from './environment';

export interface ChatConfig {
  serverUrl: string;
  isRadVPN: boolean;
  networkType: 'localhost' | 'radVPN' | 'remote';
}

export function getChatConfig(): ChatConfig {
  // Use the centralized environment config
  const envConfig = getEnvironmentConfig();

  return {
    serverUrl: envConfig.serverUrl,
    isRadVPN: envConfig.isRadVPN,
    networkType: envConfig.isRadVPN ? 'radVPN' : (envConfig.isDevelopment ? 'localhost' : 'remote')
  };
}

export function getSocketIOConfig(config: ChatConfig) {
  return {
    withCredentials: true,
    path: '/api/chat/socket.io',
    transports: ['websocket', 'polling'] as const,
    timeout: config.isRadVPN ? 15000 : 10000, // Longer timeout for RadVPN
    forceNew: true,
    // Additional options for RadVPN
    ...(config.isRadVPN && {
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionAttempts: 10,
      maxReconnectionAttempts: 10
    })
  };
} 
