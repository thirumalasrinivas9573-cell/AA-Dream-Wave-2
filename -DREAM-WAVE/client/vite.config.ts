import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@shared/components/ui': path.resolve(__dirname, 'src/shared/components/ui/index.jsx'),
      '@shared': path.resolve(__dirname, 'src/shared'),
      '@student': path.resolve(__dirname, 'src/modules/student'),
      '@institution': path.resolve(__dirname, 'src/modules/institution'),
      '@company': path.resolve(__dirname, 'src/modules/company'),
    },
    extensions: ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json'],
  },

  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react':  ['react', 'react-dom', 'react-router-dom'],
          'vendor-motion': ['framer-motion'],
          'vendor-axios':  ['axios'],
        },
      },
    },
    chunkSizeWarningLimit: 700,
  },

  server: {
    port: 5173,
    host: true,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5001',
        changeOrigin: true,
        secure: false,
      },
    },
  },

  test: {
    globals: true,
    environment: 'jsdom',
  },
});
