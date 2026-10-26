# Project Prompt — The Toolbox (thetoolbox.site)

> A complete brief for building **The Toolbox**: a free, privacy-first collection of 130+ everyday online tools that run entirely in the browser. Give this whole file to an AI coding assistant (or a developer) to rebuild the project from scratch, or to onboard someone onto the existing code. Current state: live at https://thetoolbox.site, source in `anandrahul094/toolbox`.

---

## 1. Role and goal

You are a senior full-stack engineer and product designer. Build a fast, accessible, mobile-first website that puts **every useful small software tool in one place** — image, PDF, video, text, developer, SEO, design, QR, maths/science, finance (India), everyday and fun tools — with a calm "digital toolbox" design.

**Non-negotiable principles**

1. **Files never leave the device.** Every tool processes text and files in the browser (JavaScript/WebAssembly). No uploads. Say so on every tool ("Runs in your browser — nothing is uploaded").
2. **Free, no sign-up required.** Accounts are optional and only sync personal lists.
3. **No ads, no tracking cookies, no analytics scripts** (server-side Cloudflare request counts are fine). If cookie-free visitor analytics is added later, update the privacy page.
4. **India-first, global-ready:** ₹ and lakh/crore formats, GST, UPI, exam-form photo sizes, CGPA rules; full **Hindi** version at `/hi`.
5. **Fast:** each tool is a lazily loaded chunk; heavy libraries load only when the tool needs them.
6. **Honest and safe:** no password cracking, no social-media downloaders, no removing other people's watermarks; clear disclaimers ("not affiliated with SSC/UIDAI/banks/universities — always check official requirements").
7. **Personal project:** use only the owner's personal accounts (GitHub `anandrahul094`, Cloudflare, Supabase, GoDaddy domain). Never use office/company credentials or services.

---

## 2. Tech stack

| Area | Choice |
|---|---|
| App | React 18 + TypeScript + Vite 5, `react-router-dom` v6 **BrowserRouter** (clean URLs) |
| Icons | `lucide-react` |
| State | Small local-first store (`useSyncExternalStore` + `localStorage`, cross-tab sync via `storage` event) |
| Backend (optional) | Supabase: email/password auth (PKCE), `feedback` table, `ratings` with a `rate_tool` security-definer RPC and a `tool_rating_summary` view. Works without it (outbox in `localStorage`). Never use the service-role key in the browser. |
| Hosting | Cloudflare Workers static assets (`wrangler.jsonc`, `worker/index.js` redirects `www` and `*.workers.dev` → canonical host with 301) |
| PWA | `vite-plugin-pwa` (Workbox `generateSW`, `registerType: 'prompt'`) |
| Build | `tsc -b && vite build && node scripts/prerender.mjs` |

**Libraries (all loaded lazily where large):** pdf-lib, @pdf-lib/fontkit, pdfjs-dist (render with `intent: 'print'`), @neslinesli93/qpdf-wasm (PDF encrypt/decrypt), docx, jszip, xlsx (SheetJS CE tarball from cdn.sheetjs.com), exifr, heic2any, tesseract.js (OCR), imagetracerjs, gifenc, @breezystack/lamejs (MP3), mediabunny (WebCodecs video compression), qrcode, jsqr, jsbarcode, js-yaml, sql-formatter, marked + dompurify, js-beautify, terser, bcryptjs, @noble/hashes, CodeMirror 6 (+ language packs, @replit/codemirror-minimap), workbox-window.

**Environment variables:** `VITE_SITE_URL` (canonical domain, used for links and sitemap), `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_GOOGLE_SIGNIN` (false until Google login is configured).

---

## 3. Architecture

```
src/
  registry.ts          # every tool: id, name, category, description, keywords, howTo, faq, lazy component
                       # helpers: withProps(), alias() for SEO landing pages, presets (exam, toKB, convert, qr)
  meta.ts              # tool icons, RECENTLY_ADDED, NEW_SET, BULK_SET, STARTER_POCKETS
  store.ts             # favourites ("bench"), pockets, recents, settings; export/import (merge, never overwrite)
  search.ts            # fuzzy search over names, keywords, synonyms ("make photo smaller" → compressor)
  site.ts              # SITE_NAME = 'The Toolbox', SITE_URL, LEGAL_UPDATED
  i18n/                # lang.ts (language from /hi path prefix), hi.ts (UI strings), tools-hi.ts (tool texts), localize.ts
  guides/              # types.ts, data.ts (how-to articles), links.ts (extra tool → guide links)
  lib/                 # pdf.ts, qpdf.ts (queued runs), compressToSize.ts, codec.ts (encodings, ciphers, AES, hashes,
                       # compression), operations.ts (85 recipe ops + "magic" detect), mathExpr.ts (safe parser),
                       # invoice.ts (PDF invoice), money.ts, pwa.ts (install prompt), editor/ (CodeMirror setup,
                       # languages, ~70 text commands), safeRegex.ts, backend.ts (Supabase)
  components/          # Shell (sidebar, topbar, bottom nav, banners), Search, ToolItems, Dialogs, Rating,
                       # ErrorBoundary, ui.tsx (FileDrop, Field, Row, Stat, NumberInput…), Batch.tsx (bulk mode),
                       # CodeEditor.tsx (Sublime-style editor), Share.tsx
  pages/               # Home, Explore (+category), ToolPage, Favourites, Pockets, Recent, Settings, Feedback,
                       # Auth (login/join/forgot/reset), Legal (privacy/terms), Guides (index + article), NotFound
  tools/               # one file per tool (~130)
scripts/prerender.mjs  # writes static HTML per page + sitemap/robots/llms.txt
worker/index.js        # canonical-host redirects, then serves assets
supabase/schema.sql
public/                # favicon.svg, logo-512.png, og-image.png, icons/ (192, 512, maskable, apple-touch), fonts/ (Noto Sans for invoices), _headers
```

**Rules for tools**
- Each tool is a default-exported component with no required props; landing pages reuse a tool with preset props (`withProps`) and are marked `alias` (reachable, searchable, in the sitemap, but not duplicated in category lists).
- Heavy work lives in plain async functions outside React so single and bulk modes share it.
- Old `/#/tool/x` links redirect to `/tool/x`.
- An error boundary wraps every tool. After a redeploy, a missing chunk triggers at most one reload per minute, never while offline; offline it shows "You're offline — open this tool once with internet".

---

## 4. Design system — "a digital toolbox"

**Concept vocabulary:** tools sit on your **bench** (pinned favourites), you group them in **pockets** (custom collections; starter pockets: Office work, Developer kit, Creator & social, Money matters), and you **explore** the toolbox by category. Calm, crafted, workshop feel — not a noisy ad-tool site.

**Typography:** Inter (UI), Fraunces (display headings), JetBrains Mono (code), Noto Sans Devanagari (Hindi). Loaded from Google Fonts.

**Colour tokens** (CSS variables on `:root`, dark set on `:root[data-theme='dark']`; theme = light / dark / match device, applied before first paint):

| Token | Light | Dark |
|---|---|---|
| `--bg` | `#f3f0e8` | `#1a1c19` |
| `--surface` / `--surface-2` | `#fffefa` / `#ebe8df` | `#222520` / `#2b2e28` |
| `--border` | `#dad6cb` | `#383c35` |
| `--text` / `--muted` | `#292d29` / `#62655e` | `#ebe8df` / `#a5a89e` |
| `--primary` (sage green) | `#314535` | `#a9c4a4` |
| `--accent` (brass) | `#bc8646` | `#d6a466` |
| `--danger` / `--ok` | `#a5362b` / `#2f6b3a` | `#f08a7c` / `#9fd2a5` |

Theme colour `#314535`. Radius 6–8 px, soft shadows, generous spacing.

**Layout**
- **Desktop:** left sidebar (Home, Explore all tools, How-to guides, Pinned to bench, My pockets, Recently used, Settings; Feedback / Request a tool; category list; Install app button; collapse toggle). Top bar: search, हिंदी/English switch, Log in / Join now (or avatar menu), theme toggle.
- **Mobile:** compact header and a bottom nav (Home, Explore, Search, Bench, Pockets).
- **Tool page:** breadcrumbs → icon, name, description, privacy badge, rating summary, Pin / Add to pocket / Share → tool panel → guide link → How to use + FAQ → rating → share row → related tools.
- Shared CSS classes: `btn`, `btn primary`, `seg` (segmented buttons with `aria-pressed`), `chip`, `filter-chips`, `field`, `row`, `cols`, `stats`/`stat`, `output`, `notice`, `error`, `badge`, `muted`, `mono`, `tile`, `new-tag` (+ `bulk-tag`).

**Accessibility:** WCAG AA contrast, visible focus, keyboard-operable everything, labelled controls, `aria-live` results, reduced-motion support, no horizontal scroll at 375 px, skip-to-content link.

---

## 5. Pages and routes

`/` home (search, bench, recent, pockets, categories, how-to guides, recently added) · `/explore` (search, category filter, sort, "New only", "Bulk (many files)") · `/category/:slug` · `/tool/:id` · `/guides` · `/guides/:slug` · `/favourites` · `/pockets`, `/pockets/:id`, `/pockets/starter/:slug` · `/recent` · `/settings` (theme, sidebar, history on/off, export/import, reset, account) · `/feedback` (general / request a tool / report a problem) · `/login` `/join` `/forgot-password` `/reset-password` · `/privacy` `/terms` · Hindi mirrors under `/hi/...` · 404.

---

## 6. Tool catalogue (151 entries, 19 of them SEO landing pages marked *)

**Image (26):** Image Resizer & Compressor · Crop, Rotate & Resize · Image Format Converter · Add Watermark · EXIF Viewer & Remover · Color Palette from Image · Favicon Generator · Social Media Image Resizer · Background Remover (plain backgrounds) · Watermark & Object Remover (inpaint; own images only) · Image to Base64 · Passport Size Photo Maker (sizes + 4×6/A4/5×7 print sheets, tight layout when it fits more) · Image to Text OCR (English, Hindi + Indian languages) · Meme Maker · Photo Collage Maker · Image to SVG · Exam Photo & Signature Resizer (SSC, IBPS/SBI/RBI, UPSC, NTA presets with KB limits; "check the official notification") · Compress Image to Exact KB · HEIC to JPG · Online Signature Maker · *Compress to 20/50/100/200/500 KB, *1 MB · *SSC / *Bank / *UPSC / *NEET-JEE photo resizers · *Signature resizer · *JPG↔PNG, *PNG→JPG, *WebP→JPG, *JPG→WebP, *PNG→WebP.

**PDF (17):** Merge · Split · Organize pages (reorder, rotate, delete) · Images to PDF · PDF to Images · Page Numbers · Watermark · Extract Text · Compress · Sign & Fill (draw/upload/type, text, dates, marks) · Crop · Protect with password (AES-256 via qpdf, permissions) · Unlock (known password only) · PDF to Word (editable text or exact look) · *JPG to PDF · *PDF to JPG · *Rotate PDF.

**Video & Audio (3):** Compress Video (by quality or target MB, e.g. WhatsApp 16 MB; WebCodecs) · Video to MP3/WAV · Video to GIF.

**Text (16):** Online Text Editor (Sublime-style, tabs, open/save files) · Word Counter · Case Converter · Text Cleaner · Find & Replace · Extract Emails/URLs/Phones · Line Tools · Text Diff · Lorem Ipsum · Markdown Preview · Slug Generator · Unicode Inspector · Morse Code (with audio) · Caesar & Classic Ciphers (12 ciphers, brute force, frequency analysis) · *ROT13 · *Character Counter.

**Developer (29):** JSON Formatter · YAML⇄JSON · CSV⇄JSON · SQL Formatter · Base64/Base32/Base58/Base85/Hex (text or files, data URIs) · URL Encode/Decode & Parser (edit query, remove tracking, defang) · JWT Decoder/Verifier/Generator (HS256/384/512) · **Data Transformer** (CyberChef-style recipes, 85 operations, "Magic" auto-detect, shareable recipe links) · Hex Viewer & File Inspector (magic bytes, entropy, strings) · Code Beautifier & Minifier (HTML/CSS/JS/XML) · XML Formatter/Validator/XPath · Encrypt & Decrypt Text/Files (AES-256-GCM, PBKDF2) · Bcrypt · HTML Entities · String Escape · Regex Tester · Hash Generator (MD5, SHA-1/2/3, Keccak, BLAKE2/3, RIPEMD-160, CRC32, Adler-32, HMAC, checksum compare) · UUID · Unix Timestamp · Cron Explainer · Number Base · Chmod · *Text→Binary · *Binary→Text · *Text→Hex · *Hex→Text · *Gzip/Deflate Decoder · *MD5 · *SHA-256.

**Web & SEO (5):** Meta Tag Generator · UTM Builder · User-Agent Parser · IP Subnet/CIDR · HTTP Status Codes.

**Design (5):** Color Converter · CSS Gradient · Box Shadow · SVG Minifier · Aspect Ratio.

**QR Codes (9):** QR Code Generator (bulk lists → ZIP or A4 print sheet) · Wi-Fi · vCard · UPI Payment · WhatsApp · Email · Phone/SMS · QR Scanner (camera/image) · Barcode Generator (bulk + label sheet).

**Math & Science (9):** Scientific Calculator (keypad, 2nd/inverse, DEG/RAD, Ans, functions and science constants, history) · Graphing Calculator · Equation Solver (quadratic, cubic, 2–3 linear, any f(x)=0) · Matrix Calculator (fractions) · Statistics (+ regression) · Molar Mass · Ohm's Law & Circuits · Resistor Colour Code · CGPA⇄Percentage (CBSE, AICTE/VTU, Mumbai, ×10; SGPA→CGPA) · Significant Figures & Scientific Notation.

**Finance & India (13):** GST · EMI · SIP · Compound Interest · CTC to In-Hand · Salary Hike · Discount/Margin/Markup · Inflation · Lakh/Crore · Rupees to Words · Percentage · Tip & Bill Splitter · **Invoice & Bill Generator** (GST invoice/quotation/receipt PDFs, CGST+SGST vs IGST from state/GSTIN, HSN, UPI QR with amount, logo, signature, ₹ font, multi-page, opt-in "remember my business").

**Everyday (11):** Unit Converter · Time Zone Converter · Date Difference & Age · Stopwatch & Timer · Password Generator · BMI · Currency Converter (ExchangeRate-API open endpoint, daily rates cached, only the rate table is fetched) · World Clock · Excel⇄CSV · ZIP Creator & Extractor · *Age Calculator.

**Fun & Games (8):** Random Picker · Typing Speed Test · Spin the Wheel (fair, crypto random, remove winners) · Tic-Tac-Toe (easy → unbeatable) · 2048 · Snake · Memory Match · Minesweeper.

---

## 7. Cross-cutting features

1. **Bulk mode** — a shared `BatchRunner` (drop many files or a whole folder, up to 500; queue with per-file status, progress, notes, Stop/Retry, re-run when settings change, per-file download or ZIP, optional "combine" output). Every bulk-capable tool shows a **One file / Many files (bulk)** switch; tools carry a green **Bulk** tag and Explore has a Bulk filter. Heavy tools (OCR, video, qpdf, PDF render) run one file at a time.
2. **Sublime-style editor** (`CodeEditor`, CodeMirror 6) in all text/developer tools: multiple cursors (Ctrl/⌘+D, Alt+F3, Ctrl/⌘+click), column selection (Alt+drag), split into lines, move/duplicate/delete/join lines, toggle comment, find & replace with regex, go to line, word completion, folding, syntax colours for 10 languages (auto-detected), Monokai-style dark theme, minimap, whitespace view, word wrap, font size, full screen, status bar, shortcut sheet, and a **command palette** (Ctrl/⌘+Shift+P) with ~70 text transforms that act on each selection or the whole text. Display preferences saved; text never saved unless the user opts in ("Keep my tabs in this browser").
3. **Installable app (PWA)** — manifest (standalone, theme `#314535`, maskable icons, shortcuts), precache only the app shell, cache tool chunks on first use, network-first pages with offline fallback, "A new version is ready — Reload" toast (never auto-reload), install button/banner (Android/desktop) and Add-to-Home-Screen instructions (iPhone). `sw.js` served with `Cache-Control: no-cache`.
4. **Sharing** — Share button (native share sheet on phones) and a share row (WhatsApp first, Telegram, X, Facebook, LinkedIn, Email, Copy link) on every tool and guide; links tagged `utm_source=<app>&utm_medium=share`.
5. **How-to guides** — articles in `src/guides/data.ts` (title, description ≤155 chars, tool, CTA, steps, sections/tables, FAQ, related). Shown at `/guides`, on the home page and as "Step-by-step guide" links on tool pages. Content rules: plain friendly English, numbers taken only from the tools' own presets or verified calculations, "check official requirements", no affiliation claims.
6. **Accounts (optional)** — Log in / Join now, sign-out, password reset; bench and pockets stay in the browser (export/import JSON to move them).
7. **Feedback & ratings** — 1–5 stars per tool with an optional comment (one rating per browser, editable), public averages only; feedback form with tool requests and problem reports; offline outbox.
8. **Hindi** — every page mirrored at `/hi`, language switch in the header, one-time "available in Hindi" banner for Hindi browsers, Devanagari font, translated UI, tool names/descriptions/how-to/FAQ, Hindi meta tags and hreflang.

---

## 8. SEO and AI search

- Prerender every public page to static HTML (`/tool/x.html`, `/hi/tool/x.html`, `/guides/x.html`, categories, explore, home) with its own title, description, canonical, Open Graph/Twitter tags (`og-image.png` 1200×630), readable body content and JSON-LD: `WebApplication` + `FAQPage` + `BreadcrumbList` for tools; `Organization` + `WebSite` (SearchAction) on home; `Article` + `HowTo` + `FAQPage` for guides.
- `sitemap.xml` with hreflang alternates (en/hi/x-default; guides English-only), `robots.txt` allowing search engines and AI crawlers (GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, Claude-SearchBot, PerplexityBot, Google-Extended, Applebot-Extended, CCBot, Bingbot), `llms.txt` listing every tool and guide.
- `404.html` fallback (status 404) still boots the app. Clean URLs without trailing slashes; `www` and workers.dev 301 to the canonical domain.
- Google Search Console (domain property via Cloudflare DNS, sitemap submitted) and Bing Webmaster Tools (imported).

---

## 9. Deploy

1. Push to `main` on GitHub `anandrahul094/toolbox` → Cloudflare Workers Builds runs `npm run build` and deploys `dist/` with `wrangler.jsonc`.
2. Build variables in Cloudflare: `VITE_SITE_URL=https://thetoolbox.site`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
3. Domain `thetoolbox.site` (GoDaddy, nameservers on Cloudflare), Worker custom domain + `www`.
4. Supabase: run `supabase/schema.sql`; set Site URL and redirect URLs to the domain; email auth on.
5. `public/_headers`: no-cache for `sw.js` and the manifest; immutable for `/assets/*`.

---

## 10. Quality bar (check before every deploy)

- `npx tsc --noEmit -p .` clean; `npm run build` succeeds.
- Test each changed tool in a real browser with real sample files (images, multi-page and rotated PDFs, encrypted PDFs, short videos): single mode, bulk mode, mobile at 375 px, dark mode, keyboard use.
- No console errors; no horizontal scroll; results announced with `aria-live`.
- Offline: tools opened once keep working with the network off; never-opened tools show the offline message (no reload loops).
- Verify live after deploy: new pages return 200, canonical is the real domain, sitemap count increased.

---

## 11. Assistant working rules (for this project)

- Explain and ask before outward-facing actions (publishing, external services, accounts). Never use office/company credentials; never paste secrets into code or chat; never use the Supabase service-role key client-side.
- Keep replies short; guide setup steps one at a time when the owner is doing them.
- Match existing code style: sparse "why" comments, existing CSS classes, English UI text wrapped with `tr()` where it's shared UI.
- Commit with the owner's personal git identity; push only when asked or when the task is to deploy.

---

## 12. Backlog (not built yet)

- PGP/RSA, X.509/PEM certificate reader, image steganography.
- Extract images from PDF, AVIF/GIF/TIFF conversions, image upscaler.
- Hindi versions of guides and of tool internals (bulk screens, most tools); Hindi privacy/terms; Hindi text in invoice PDFs (needs complex-script shaping).
- Cookie-free visitor analytics (Cloudflare Web Analytics) + privacy page line.
- Personal email (hello@thetoolbox.site) via Cloudflare Email Routing + personal SMTP.
- More languages after Hindi; monetisation in this order: donations (UPI/Buy Me a Coffee) → relevant affiliate links → AdSense after ~1,000 daily visitors → optional Pro plan (Razorpay).
