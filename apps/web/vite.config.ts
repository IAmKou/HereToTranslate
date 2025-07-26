import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(__dirname, '../../.env'), '');

  // Mixed environment: localhost for API, remote for chat
  const API_SERVER_URL = 'http://localhost:3000';
  const CHAT_SERVER_URL = env.VITE_SERVER_URL || 'http://26.82.216.71:3000';

  return {
    root: __dirname,
    cacheDir: '../../node_modules/.vite/apps/web',
    define: {
      'import.meta.env.VITE_API_URL': JSON.stringify('http://localhost:3000/api'),
      'import.meta.env.VITE_SERVER_URL': JSON.stringify(CHAT_SERVER_URL),
    },
    server: {
      port: 4200,
      host: '0.0.0.0',
      proxy: {
        '/api': {
          target: API_SERVER_URL,// ✅ localhost for API calls
          changeOrigin: true,
          secure: false,
          ws: true,
        },
        '/socket.io': {
          target: CHAT_SERVER_URL,// ✅ remote server for chat
          ws: true,
          changeOrigin: true,
        },
      },
    },
    preview: {
      port: 4300,
      host: 'localhost',
    },
    plugins: [vue()],
    build: {
      outDir: './dist',
      emptyOutDir: true,
      reportCompressedSize: true,
      commonjsOptions: {
        transformMixedEsModules: true,
      },
    },
  };
});
