import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return

          if (
            id.includes('/react/') ||
            id.includes('/react-dom/') ||
            id.includes('/scheduler/')
          ) {
            return 'react-core'
          }
          if (
            id.includes('react-router') ||
            id.includes('@radix-ui') ||
            id.includes('@tanstack') ||
            id.includes('framer-motion') ||
            id.includes('lucide-react') ||
            id.includes('@tabler')
          ) {
            return 'ui-vendor'
          }
          if (id.includes('leaflet') || id.includes('@turf') || id.includes('proj4') || id.includes('shpjs')) {
            return 'geo-vendor'
          }
          if (id.includes('jspdf')) {
            return 'jspdf-vendor'
          }
          if (id.includes('html2canvas') || id.includes('html-to-image')) {
            return 'capture-vendor'
          }
          if (id.includes('jszip') || id.includes('xlsx')) {
            return 'office-vendor'
          }
          if (id.includes('react-markdown') || id.includes('remark-gfm')) {
            return 'content-vendor'
          }
        },
      },
    },
  },
})
