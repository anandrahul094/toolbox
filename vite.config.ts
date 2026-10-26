import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // pre-bundle lazily imported libraries so the dev server doesn't reload the page when a tool first loads them
  optimizeDeps: {
    include: ['pdf-lib', 'pdfjs-dist', 'jszip', 'exifr', 'qrcode', 'marked', 'dompurify', 'js-yaml', 'sql-formatter', 'jsqr', 'jsbarcode', 'heic2any', '@supabase/supabase-js', 'lucide-react', 'tesseract.js', 'gifenc', 'imagetracerjs', '@breezystack/lamejs', 'xlsx', 'mediabunny', 'docx', '@pdf-lib/fontkit', 'js-beautify', 'terser', 'bcryptjs', '@noble/hashes/sha256', '@noble/hashes/sha3', '@noble/hashes/blake2b', '@noble/hashes/blake3', '@noble/hashes/ripemd160', 'codemirror', '@codemirror/state', '@codemirror/view', '@codemirror/commands', '@codemirror/search', '@codemirror/language', '@codemirror/autocomplete', '@lezer/highlight', '@codemirror/lang-javascript', '@codemirror/lang-json', '@codemirror/lang-html', '@codemirror/lang-css', '@codemirror/lang-markdown', '@codemirror/lang-xml', '@codemirror/lang-sql', '@codemirror/lang-python', '@replit/codemirror-minimap'],
  },
})
