// Site identity used in page titles, canonical links, the sitemap and the legal pages.
// Set VITE_SITE_URL (e.g. https://yourtoolbox.com) in .env.local or your host's settings.
export const SITE_NAME = 'Toolbox'
export const SITE_URL = ((import.meta.env.VITE_SITE_URL as string | undefined) || 'https://example.com').replace(/\/+$/, '')
export const LEGAL_UPDATED = '24 October 2026'
