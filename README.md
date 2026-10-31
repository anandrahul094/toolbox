# The Toolbox

A free, browser-based collection of everyday utilities for working with files, text, documents, developer data, calculations, and more.

**Website:** https://thetoolbox.site  
**Repository:** https://github.com/anandrahul094/toolbox

## Overview

The Toolbox brings commonly used online utilities into one searchable workspace. The product is designed around a simple principle: make useful tools accessible without forcing users to install separate applications or create an account for everyday tasks.

The project brief describes a catalogue of 150+ tools across image, PDF, video/audio, text, developer, web/SEO, design, QR/barcode, maths/science, finance, everyday productivity, and games.

## Product principles

- **Browser-first processing:** file and text workflows are designed to run on the user's device using JavaScript and WebAssembly where appropriate.
- **Low-friction access:** core tools are available without mandatory sign-up.
- **Privacy-conscious design:** the product is designed to avoid uploading user files for local processing.
- **India-first, globally useful:** includes India-oriented utilities such as GST, UPI QR, salary calculations, exam photo sizing, and lakh/crore formatting, alongside general-purpose tools.
- **Performance:** tool modules are loaded on demand so heavier libraries are not required on every page.
- **Accessibility:** keyboard support, visible focus states, responsive layouts, and accessible result messaging are part of the product brief.

## Tool categories

| Category | Examples |
|---|---|
| Images | Resize, compress, crop, convert, EXIF, OCR |
| PDF & documents | Merge, split, organize, compress, sign, convert |
| Video & audio | Compress video, extract audio, create GIFs |
| Text | Word count, cleanup, case conversion, diff, Markdown |
| Developer | JSON, YAML, SQL, Base64, JWT, hashes, encoders |
| Web & SEO | Meta tags, UTM builder, user-agent parser |
| Design | Color tools, gradients, shadows, SVG utilities |
| QR & barcode | QR generation, scanning, UPI, Wi-Fi, barcode |
| Maths & science | Calculator, graphs, equations, statistics |
| Finance | GST, EMI, SIP, salary hike, CTC, invoice generation |
| Everyday | Unit/time conversion, age, currency, ZIP utilities |
| Fun | Typing test, random picker, puzzles and games |

See the application itself for the current available catalogue.

## Technology

| Area | Technology |
|---|---|
| UI | React 18 |
| Language | TypeScript |
| Build tooling | Vite 5 |
| Routing | React Router 6 |
| Styling / icons | CSS, Lucide React |
| Optional account and feedback services | Supabase |
| Progressive web app | Workbox / vite-plugin-pwa |
| Document and media processing | Browser APIs, JavaScript and WebAssembly libraries |
| Static rendering | Custom prerender script |

The codebase also uses libraries for PDF processing, image metadata, OCR, spreadsheets, QR codes, code editing, compression, and data transformation.

## Run locally

### Requirements

- Node.js (compatible with the project's Vite and TypeScript dependencies)
- npm

### Setup

```bash
git clone https://github.com/anandrahul094/toolbox.git
cd toolbox
npm install
```

Create a local environment file:

```bash
cp .env.example .env.local
```

Set the variables required for your environment. The canonical site URL is configured through `VITE_SITE_URL`. Supabase values are needed only for the optional account, feedback, and ratings functionality.

Start the development server:

```bash
npm run dev
```

Build the production site:

```bash
npm run build
npm run preview
```

The build runs TypeScript checks, Vite production bundling, and the project's prerender script. The generated static output is written to `dist/`.

## Project structure

```text
src/
  components/    Shared layout, navigation, dialogs and UI components
  guides/        Help articles and guide metadata
  i18n/          Language and localization resources
  lib/           Shared processing and utility functions
  pages/         Application routes and page-level views
  tools/         Individual tool implementations
  registry.ts    Tool catalogue and metadata
  search.ts      Tool search logic
  store.ts       Local-first user preferences and collections

public/          Static assets, icons and web app resources
scripts/         Build-time prerendering
supabase/        Optional backend schema
```

## Build and deployment

The project is configured to generate a production-ready static output in `dist/`. The repository includes Netlify configuration and the project brief documents a Cloudflare static-assets deployment setup.

Choose a host that supports the routing and redirect configuration used by the deployed build. Configure environment variables in the hosting provider rather than committing secrets.

## Privacy and security notes

- Never commit real API keys, service-role credentials, passwords, or private user data.
- Keep Supabase service-role credentials on trusted server infrastructure; never expose them in browser code.
- Review each tool's processing path before making privacy claims about it.
- Users should verify official requirements when using tools related to government forms, financial calculations, or regulated workflows.

## Roadmap

- Continue improving the breadth and quality of the tool catalogue.
- Maintain consistent interaction patterns, validation, and error handling across tools.
- Improve automated checks for build output, accessibility, and responsive behavior.
- Keep documentation aligned with the actual shipped feature set.
- Continue reviewing privacy, security, and performance as new tools are added.

## Author

**Rahul Anand Kalita**  
[GitHub](https://github.com/anandrahul094) · [LinkedIn](https://www.linkedin.com/in/rahul-anand-kalita-572774113)

---

If you find an issue or have a useful improvement, feel free to open a GitHub issue with steps to reproduce and the expected behavior.
