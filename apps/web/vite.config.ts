import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(__dirname, '../../.env'), '');

  // Flexible environment configuration
  const LOCALHOST_SERVER = 'http://localhost:3000';
  const RADV_PN_SERVER = 'http://26.82.216.71:3000';

  // Smart detection: Use localhost by default, RadVPN when specified
  const API_SERVER_URL = env.VITE_API_URL?.replace('/api', '') || LOCALHOST_SERVER;
  const CHAT_SERVER_URL = env.VITE_SERVER_URL || RADV_PN_SERVER;

  return {
    root: __dirname,
    cacheDir: '../../node_modules/.vite/apps/web',
    define: {
      'import.meta.env.VITE_API_URL': JSON.stringify(API_SERVER_URL + '/api'),
      'import.meta.env.VITE_SERVER_URL': JSON.stringify(CHAT_SERVER_URL),
    },
    resolve: {
      alias: {
        '@here-to-translate/common': path.resolve(__dirname, '../../libs/common/src/index.ts'),
      },
    },
    server: {
      port: 4200,
      host: '0.0.0.0',
      proxy: {
        '/api': {
          target: API_SERVER_URL,
          changeOrigin: true,
          secure: false,
          ws: true,
        },
        '/socket.io': {
          target: CHAT_SERVER_URL,
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
      outDir: '../../dist/apps/web',
      emptyOutDir: true,
      reportCompressedSize: true,
      commonjsOptions: {
        transformMixedEsModules: true,
      },
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['vue', 'vue-router', 'pinia'],
            utils: ['axios', 'date-fns'],
            emoji: ['emoji-mart-vue-fast', '@emoji-mart/data'],
          },
        },
      },
      chunkSizeWarningLimit: 1000,
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: mode === 'production',
          drop_debugger: mode === 'production',
        },
      },
    },
  };
});
