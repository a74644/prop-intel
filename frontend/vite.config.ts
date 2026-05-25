import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5050',
        changeOrigin: true,
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 2000, // mapbox-gl is intentionally large (~500 kB gz)
    rollupOptions: {
      output: {
        manualChunks: {
          react:     ['react', 'react-dom', 'react-router-dom'],
          recharts:  ['recharts'],
          icons:     ['lucide-react'],
          motion:    ['framer-motion'],
          'mapbox-gl': ['mapbox-gl'],
        },
      },
    },
  },
})
