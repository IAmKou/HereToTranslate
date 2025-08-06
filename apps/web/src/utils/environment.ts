// Environment configuration utility

export interface EnvironmentConfig {
  apiUrl: string;
  serverUrl: string;
  isProduction: boolean;
  isDevelopment: boolean;
  isRadVPN: boolean;
  jwtRefreshInterval: number; // in minutes
}

export function getEnvironmentConfig(): EnvironmentConfig {
  const hostname = location.hostname;

  // Automatic detection based on current URL - NO manual config needed!
  const isRadVPN = hostname.startsWith('26.82.216.');
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
  const isProduction = !isLocalhost && import.meta.env.NODE_ENV !== 'development';

  // AUTOMATIC API URL - matches the hostname user is accessing from
  let apiUrl: string;
  let serverUrl: string;

  if (isRadVPN) {
    // RadVPN access: use production URL
    apiUrl = 'https://htt-ekpa.onrender.com/api';
    serverUrl = 'https://htt-ekpa.onrender.com';
  } else if (isLocalhost) {
    // Localhost access: use localhost API
    apiUrl = 'http://localhost:3000/api';
    serverUrl = 'http://localhost:3000';
  } else if (hostname === 'heretotranslate.onrender.com') {
    // Frontend domain: use backend domain for API
    apiUrl = 'https://htt-ekpa.onrender.com/api';
    serverUrl = 'https://htt-ekpa.onrender.com';
  } else {
    // Production or other environments: use production URL
    apiUrl = 'https://htt-ekpa.onrender.com/api';
    serverUrl = 'https://htt-ekpa.onrender.com';
  }

  // Manual override support (optional for advanced users)
  const manualApiUrl = localStorage.getItem('FORCE_API_URL');
  const manualServerUrl = localStorage.getItem('FORCE_SERVER_URL');

  if (manualApiUrl) apiUrl = manualApiUrl;
  if (manualServerUrl) serverUrl = manualServerUrl;

  // JWT refresh interval - shorter for RadVPN due to 5m expiration
  const jwtRefreshInterval = isRadVPN ? 4 : 10;

  return {
    apiUrl,
    serverUrl,
    isProduction,
    isDevelopment: !isProduction,
    isRadVPN,
    jwtRefreshInterval
  };
}

export function logEnvironmentInfo() {
  const config = getEnvironmentConfig();
  console.log('🌍 Environment Configuration:', {
    ...config,
    hostname: location.hostname,
    protocol: location.protocol,
    nodeEnv: import.meta.env.NODE_ENV
  });
}
