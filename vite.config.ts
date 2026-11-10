import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1500, // en Ko
    rollupOptions: {
      output: {
        manualChunks: {
          carto: ['leaflet', 'react-leaflet'],
          graphiques: ['recharts'],
          tableur: ['xlsx'],
        },
      },
    },
  },
})
