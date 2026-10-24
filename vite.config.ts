import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // pre-bundle lazily imported libraries so the dev server doesn't reload the page when a tool first loads them
  optimizeDeps: {
    include: ['pdf-lib', 'pdfjs-dist', 'jszip', 'exifr', 'qrcode', 'marked', 'dompurify', 'js-yaml', 'sql-formatter', 'jsqr', 'jsbarcode', 'heic2any', '@supabase/supabase-js', 'lucide-react', 'tesseract.js', 'gifenc', 'imagetracerjs', '@breezystack/lamejs', 'xlsx', 'mediabunny', 'docx'],
  },
})
