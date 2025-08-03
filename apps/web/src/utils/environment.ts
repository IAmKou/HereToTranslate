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
  const protocol = location.protocol;

  // Automatic detection based on current URL - NO manual config needed!
  const isRadVPN = hostname.startsWith('26.82.216.');
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
  const isDevelopment = isLocalhost || import.meta.env.NODE_ENV === 'development';
  const isProduction = !isDevelopment;

  // AUTOMATIC API URL - matches the hostname user is accessing from
  let apiUrl: string;
  let serverUrl: string;

  if (isRadVPN) {
    // RadVPN access: use same IP for API
    apiUrl = `${protocol}//${hostname}:3000/api`;
    serverUrl = `${protocol}//${hostname}:3000`;
  } else if (isLocalhost) {
    // Localhost access: use localhost API
    apiUrl = 'http://localhost:3000/api';
    serverUrl = 'http://localhost:3000';
  } else {
    // Other IP: assume server on same IP
    apiUrl = `${protocol}//${hostname}:3000/api`;
    serverUrl = `${protocol}//${hostname}:3000`;
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
    isDevelopment,
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
