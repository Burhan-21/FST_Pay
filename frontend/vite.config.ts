import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8080',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('recharts') || id.includes('d3')) {
              return 'vendor-charts';
            }
            if (id.includes('framer-motion')) {
              return 'vendor-motion';
            }
            return 'vendor';
          }
          if (id.includes('src/features/parent')) {
            return 'parent';
          }
          if (id.includes('src/features/cards') || id.includes('src/features/transactions') || id.includes('src/features/rewards')) {
            return 'finance';
          }
          if (id.includes('src/features/analytics') || id.includes('src/features/ai-coach')) {
            return 'insights';
          }
          if (id.includes('src/features/settings')) {
            return 'settings';
          }
          if (id.includes('src/features/admin')) {
            return 'admin';
          }
        }
      }
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    exclude: ['node_modules', 'dist', '.idea', '.git', '.cache', 'tests'],
  },
})
