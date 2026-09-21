import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, 'src/shared'),
      '@student': path.resolve(__dirname, 'src/modules/student'),
      '@institution': path.resolve(__dirname, 'src/modules/institution'),
      '@company': path.resolve(__dirname, 'src/modules/company'),
    },
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
    // Listen on IPv4 + IPv6 so both localhost and 127.0.0.1 work
    host: true,
    strictPort: true,
    proxy: {
      '/api': {
        // Always IPv4 — avoids macOS localhost → ::1 ECONNREFUSED
        target: 'http://127.0.0.1:5001',
        changeOrigin: true,
        secure: false,
        rewrite: (p) => p,
        configure: (proxy) => {
          proxy.on('proxyRes', (proxyRes) => {
            const cookies = proxyRes.headers['set-cookie']
            if (cookies) {
              proxyRes.headers['set-cookie'] = cookies.map((c) =>
                c.replace(/;\s*Secure/gi, '').replace(/;\s*Domain=[^;]+/gi, '')
              )
            }
          })
        },
      },
    },
  },

  optimizeDeps: {
    include: [
      'react', 'react-dom', 'react-router-dom', 'framer-motion', 'axios',
    ],
  },
})
