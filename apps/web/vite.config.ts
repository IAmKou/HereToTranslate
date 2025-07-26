import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(__dirname, '../../.env'), '');

  return {
    root: __dirname,
    cacheDir: '../../node_modules/.vite/apps/web',
    server: {
      port: 4200,
      host: '0.0.0.0',
      proxy: {
        '/api': {
          target: env.VITE_SERVER_URL,// ✅ use from root .env
          changeOrigin: true,
          secure: false,
          ws: true,
        },
        '/socket.io': {
          target: env.VITE_SERVER_URL,// ✅ use from root .env
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
