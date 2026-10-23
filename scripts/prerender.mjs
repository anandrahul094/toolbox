// Runs after `vite build`: writes a real HTML file for every public page (own title, description,
// canonical URL, structured data and readable content) so search engines can index each tool,
// plus sitemap.xml and robots.txt. The app still takes over in the browser as usual.
import { createServer, loadEnv } from 'vite'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dist = path.join(root, 'dist')
const env = { ...loadEnv('production', root, ''), ...process.env }
const SITE_URL = (env.VITE_SITE_URL || 'https://example.com').replace(/\/+$/, '')
if (!env.VITE_SITE_URL) console.warn('⚠ VITE_SITE_URL is not set — using https://example.com in canonical links and the sitemap.')

const vite = await createServer({ root, logLevel: 'error', server: { middlewareMode: true }, appType: 'custom' })
const { tools, allTools, CATEGORIES } = await vite.ssrLoadModule('/src/registry.ts')
const { SITE_NAME } = await vite.ssrLoadModule('/src/site.ts')
await vite.close()

const template = await fs.readFile(path.join(dist, 'index.html'), 'utf8')
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const now = new Date()
const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
const catOf = (t) => CATEGORIES.find((c) => c.id === t.category)

function page({ route, title, description, body, jsonLd = [], noindex = false }) {
  const url = SITE_URL + (route === '/' ? '/' : route)
  const head = [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(description)}" />`,
    `<meta name="robots" content="${noindex ? 'noindex, follow' : 'index, follow'}" />`,
    `<link rel="canonical" href="${esc(url)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${esc(SITE_NAME)}" />`,
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(description)}" />`,
    `<meta property="og:url" content="${esc(url)}" />`,
    `<meta property="og:image" content="${SITE_URL}/og-image.png" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:image:alt" content="${esc(SITE_NAME)} — free online tools that run in your browser" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:image" content="${SITE_URL}/og-image.png" />`,
    ...jsonLd.map((d) => `<script type="application/ld+json">${JSON.stringify(d).replace(/</g, '\\u003c')}</script>`),
  ].join('\n    ')
  return template
    .replace(/<title>[\s\S]*?<\/title>/, head)
    .replace(/<meta name="description"[^>]*>\s*/, '')
    .replace('<div id="root"></div>', `<div id="root"><div class="prerender">${body}</div></div>`)
}

const nav = `<nav><a href="/">${esc(SITE_NAME)}</a> · <a href="/explore">All tools</a> · ${CATEGORIES.map((c) => `<a href="/category/${c.slug}">${esc(c.id)}</a>`).join(' · ')}</nav>`
const toolLinks = (list) => `<ul>${list.map((t) => `<li><a href="/tool/${t.id}">${esc(t.name)}</a> — ${esc(t.description)}</li>`).join('')}</ul>`
const crumbs = (items) => ({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items.map(([name, route], i) => ({ '@type': 'ListItem', position: i + 1, name, item: SITE_URL + route })) })

const pages = []
const homeDesc = `${tools.length} free online tools in one place: resize images, merge PDFs, format JSON, calculate GST and EMI, make QR codes and more. No sign-up, and your files never leave your browser.`
pages.push({ route: '/', title: `${SITE_NAME} — free online tools for images, PDF, text and more`, description: homeDesc, changefreq: 'weekly', priority: '1.0',
  jsonLd: [{ '@context': 'https://schema.org', '@type': 'Organization', name: SITE_NAME, url: SITE_URL + '/', logo: `${SITE_URL}/logo-512.png` },
    { '@context': 'https://schema.org', '@type': 'WebSite', name: SITE_NAME, url: SITE_URL + '/', potentialAction: { '@type': 'SearchAction', target: `${SITE_URL}/explore?q={search_term_string}`, 'query-input': 'required name=search_term_string' } }],
  body: `${nav}<main><h1>Everything in its place.</h1><p>${esc(homeDesc)}</p>${CATEGORIES.map((c) => `<section><h2><a href="/category/${c.slug}">${esc(c.id)} tools</a></h2><p>${esc(c.blurb)}.</p>${toolLinks(tools.filter((t) => t.category === c.id))}</section>`).join('')}</main>` })

pages.push({ route: '/explore', title: `All ${tools.length} free online tools — ${SITE_NAME}`, description: `Browse ${tools.length} free online tools by category: images, PDF, text, developer, SEO, design, QR codes, finance and everyday calculators.`, changefreq: 'weekly', priority: '0.8',
  body: `${nav}<main><h1>Explore all tools</h1>${toolLinks(tools)}</main>` })

for (const c of CATEGORIES) {
  const list = tools.filter((t) => t.category === c.id)
  pages.push({ route: `/category/${c.slug}`, title: `Free online ${c.id} tools — ${SITE_NAME}`, description: `${c.blurb}. ${list.length} free ${c.id.toLowerCase()} tools that run in your browser — no sign-up, no uploads.`, changefreq: 'weekly', priority: '0.8',
    jsonLd: [crumbs([['Home', '/'], [c.id, `/category/${c.slug}`]])],
    body: `${nav}<main><h1>${esc(c.id)} tools</h1><p>${esc(c.blurb)}.</p>${toolLinks(list)}</main>` })
}

// every tool page, including landing pages for specific searches
for (const t of allTools) {
  const c = catOf(t)
  const faq = [...(t.faq ?? []), ['Do I need an account?', 'No. Every tool is free to use without signing up.'], ['Is my data uploaded?', 'No. This tool runs in your browser, so the text and files you use stay on your device.']]
  const related = tools.filter((x) => x.category === t.category && x.id !== t.id).slice(0, 6)
  const description = `${t.description} Free, no sign-up, and it runs in your browser — your files are never uploaded.`
  pages.push({ route: `/tool/${t.id}`, title: `${t.name} — free online tool · ${SITE_NAME}`, description, changefreq: 'monthly', priority: '0.9',
    jsonLd: [
      { '@context': 'https://schema.org', '@type': 'WebApplication', name: t.name, description: t.description, url: `${SITE_URL}/tool/${t.id}`, applicationCategory: `${t.category}Application`, operatingSystem: 'Any (web browser)', isAccessibleForFree: true, offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' } },
      { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
      crumbs([['Home', '/'], [t.category, `/category/${c.slug}`], [t.name, `/tool/${t.id}`]]),
    ],
    body: `${nav}<main><p><a href="/category/${c.slug}">${esc(t.category)}</a></p><h1>${esc(t.name)}</h1><p>${esc(description)}</p>`
      + `<h2>How to use</h2><ol>${t.howTo.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>`
      + `<h2>Questions</h2>${faq.map(([q, a]) => `<h3>${esc(q)}</h3><p>${esc(a)}</p>`).join('')}`
      + (related.length ? `<h2>Related tools</h2>${toolLinks(related)}` : '') + `</main>` })
}

const simple = (route, title, description, h1, text, opts = {}) => pages.push({ route, title, description, body: `${nav}<main><h1>${esc(h1)}</h1><p>${esc(text)}</p></main>`, changefreq: 'yearly', priority: '0.4', ...opts })
simple('/feedback', `Feedback and tool requests — ${SITE_NAME}`, `Send feedback, request a new tool or report a problem with ${SITE_NAME}.`, 'Feedback', 'Tell us what you like, request a tool you need, or report a problem.')
simple('/privacy', `Privacy policy — ${SITE_NAME}`, `How ${SITE_NAME} handles your data: tools run in your browser and your files are never uploaded.`, 'Privacy policy', 'Tools run in your browser; your files and text are never uploaded.')
simple('/terms', `Terms of use — ${SITE_NAME}`, `The terms for using ${SITE_NAME}'s free online tools.`, 'Terms of use', 'The terms for using these free online tools.')
for (const [route, label] of [['/login', 'Log in'], ['/join', 'Join'], ['/forgot-password', 'Forgot password'], ['/reset-password', 'Reset password'], ['/favourites', 'Pinned tools'], ['/pockets', 'My pockets'], ['/recent', 'Recently used'], ['/settings', 'Settings']]) {
  simple(route, `${label} — ${SITE_NAME}`, `${label} on ${SITE_NAME}.`, label, '', { noindex: true })
}

// write files as /tool/x.html (served at /tool/x without a trailing slash by Cloudflare Pages, Netlify and Vercel)
for (const p of pages) {
  const file = p.route === '/' ? path.join(dist, 'index.html') : path.join(dist, `${p.route.slice(1)}.html`)
  await fs.mkdir(path.dirname(file), { recursive: true })
  await fs.writeFile(file, page(p))
}

// Fallback for addresses without a file (e.g. /pockets/abc123): hosts serve 404.html with a 404 status,
// so search engines skip them, while the app still loads and shows the right page to visitors.
await fs.writeFile(path.join(dist, '404.html'), template.replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(SITE_NAME)}</title>\n    <meta name="robots" content="noindex" />`))

const indexable = pages.filter((p) => !p.noindex)
await fs.writeFile(path.join(dist, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${indexable.map((p) => `  <url><loc>${esc(SITE_URL + (p.route === '/' ? '/' : p.route))}</loc><lastmod>${today}</lastmod><changefreq>${p.changefreq}</changefreq><priority>${p.priority}</priority></url>`).join('\n')}
</urlset>
`)
// AI assistants and AI search engines (ChatGPT, Claude, Perplexity, Gemini) are welcome to read and cite the site
const aiBots = ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-SearchBot', 'Claude-User', 'PerplexityBot', 'Perplexity-User', 'Google-Extended', 'Applebot-Extended', 'CCBot', 'Bingbot']
await fs.writeFile(path.join(dist, 'robots.txt'), `User-agent: *
Allow: /

${aiBots.map((b) => `User-agent: ${b}`).join('\n')}
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
`)
const llms = [
  `# ${SITE_NAME}`,
  '',
  `> ${homeDesc}`,
  '',
  'Every tool runs entirely in the web browser: files and text are processed on the visitor’s device and are never uploaded. No account is needed. Answers below link to the tool pages.',
  '',
  ...CATEGORIES.flatMap((c) => [`## ${c.id}`, '', ...tools.filter((t) => t.category === c.id).map((t) => `- [${t.name}](${SITE_URL}/tool/${t.id}): ${t.description}`), '']),
  '## Popular task pages',
  '',
  ...allTools.filter((t) => t.alias).map((t) => `- [${t.name}](${SITE_URL}/tool/${t.id}): ${t.description}`),
  '',
  '## About',
  '',
  `- [Privacy policy](${SITE_URL}/privacy)`,
  `- [Terms of use](${SITE_URL}/terms)`,
  `- [Feedback and tool requests](${SITE_URL}/feedback)`,
  '',
].join('\n')
await fs.writeFile(path.join(dist, 'llms.txt'), llms)

console.log(`✓ Pre-rendered ${pages.length} pages (${indexable.length} in sitemap) for ${SITE_URL}`)
