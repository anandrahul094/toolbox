import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import fs from 'node:fs'
import path from 'node:path'

// Precache only the app shell (what index.html loads); each tool's code is cached the first time it's opened.
const shellOnly = async <T extends { url: string }>(entries: T[]) => {
  const html = fs.readFileSync(path.resolve(__dirname, 'dist/index.html'), 'utf8')
  const used = new Set([...html.matchAll(/(?:src|href)="\/([^"]+)"/g)].map((m) => m[1]))
  const keep = entries.filter((e) => e.url === 'index.html' || used.has(e.url) || e.url.startsWith('icons/') || e.url === 'favicon.svg')
  return { manifest: keep, warnings: [] }
}

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'The Toolbox — free online tools',
        short_name: 'The Toolbox',
        description: 'Image, PDF, text, developer and everyday tools that run in your browser. Files never leave your device.',
        id: '/',
        start_url: '/?source=pwa',
        scope: '/',
        display: 'standalone',
        background_color: '#f3f0e8',
        theme_color: '#314535',
        lang: 'en',
        categories: ['productivity', 'utilities'],
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        shortcuts: [
          { name: 'Compress image', url: '/tool/image-compressor', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
          { name: 'Merge PDF', url: '/tool/pdf-merge', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
          { name: 'Exam photo resizer', url: '/tool/exam-photo-resizer', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
          { name: 'All tools', url: '/explore', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png}'],
        globIgnores: ['og-image.png', 'logo-512.png'],
        manifestTransforms: [shellOnly],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        navigateFallback: null,
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          // pages: fresh when online, the app shell when offline (the app then shows the right tool)
          { urlPattern: ({ request }) => request.mode === 'navigate', handler: 'NetworkFirst', options: { cacheName: 'pages', networkTimeoutSeconds: 4, expiration: { maxEntries: 60 }, precacheFallback: { fallbackURL: '/index.html' } } },
          // hashed files never change, so cache them for good
          { urlPattern: ({ url }) => url.origin === self.location.origin && (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/fonts/')), handler: 'CacheFirst', options: { cacheName: 'assets', expiration: { maxEntries: 250, maxAgeSeconds: 60 * 60 * 24 * 90 } } },
          { urlPattern: /^https:\/\/fonts\.googleapis\.com\//, handler: 'StaleWhileRevalidate', options: { cacheName: 'google-fonts-css' } },
          { urlPattern: /^https:\/\/fonts\.gstatic\.com\//, handler: 'CacheFirst', options: { cacheName: 'google-fonts', expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 }, cacheableResponse: { statuses: [0, 200] } } },
        ],
      },
    }),
  ],
  // pre-bundle lazily imported libraries so the dev server doesn't reload the page when a tool first loads them
  optimizeDeps: {
    include: ['pdf-lib', 'pdfjs-dist', 'jszip', 'exifr', 'qrcode', 'marked', 'dompurify', 'js-yaml', 'sql-formatter', 'jsqr', 'jsbarcode', 'heic2any', '@supabase/supabase-js', 'lucide-react', 'tesseract.js', 'gifenc', 'imagetracerjs', '@breezystack/lamejs', 'xlsx', 'mediabunny', 'docx', '@pdf-lib/fontkit', 'js-beautify', 'terser', 'bcryptjs', '@noble/hashes/sha256', '@noble/hashes/sha3', '@noble/hashes/blake2b', '@noble/hashes/blake3', '@noble/hashes/ripemd160', 'codemirror', '@codemirror/state', '@codemirror/view', '@codemirror/commands', '@codemirror/search', '@codemirror/language', '@codemirror/autocomplete', '@lezer/highlight', '@codemirror/lang-javascript', '@codemirror/lang-json', '@codemirror/lang-html', '@codemirror/lang-css', '@codemirror/lang-markdown', '@codemirror/lang-xml', '@codemirror/lang-sql', '@codemirror/lang-python', '@replit/codemirror-minimap'],
  },
})
