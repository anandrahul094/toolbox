# Toolbox

Free online tools (images, PDF, text, developer, finance and more) that run entirely in the browser.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build + pre-rendered pages, sitemap.xml, robots.txt in dist/
```

Copy `.env.example` to `.env.local` and set `VITE_SITE_URL` (and the Supabase keys for sign-in, feedback and ratings; database setup is in `supabase/schema.sql`).

Deploy `dist/` to any static host (Cloudflare Pages, Netlify or Vercel) with build command `npm run build`.
