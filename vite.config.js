import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/volleywarrior/',
  build: {
    outDir: 'dist'
  },
  server: {
    proxy: {
      '/nevobo-api': {
        target: 'https://api.nevobo.nl',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/nevobo-api/, ''),
      },
      '/dwf-api': {
        target: 'https://dwf.nevobo.nl',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/dwf-api/, ''),
      },
    }
  }
})
