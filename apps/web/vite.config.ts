import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import fs from 'fs'

// https://vitejs.dev/config/
export default defineConfig({
  base: process.env.NODE_ENV === 'production' && !process.env.VERCEL ? '/BeamLab/' : '/',
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'copy-404-html',
      closeBundle() {
        const distDir = path.resolve(__dirname, 'dist')
        const indexHtml = path.resolve(distDir, 'index.html')
        const notFoundHtml = path.resolve(distDir, '404.html')
        if (fs.existsSync(indexHtml)) {
          fs.copyFileSync(indexHtml, notFoundHtml)
        }
      }
    }
  ],
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      '@beamworks': path.resolve(__dirname, '../../packages')
    }
  },
  define: {
    'process.env': {},
  }
})
