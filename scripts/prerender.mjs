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
const { localizeTool, catLabel, catBlurb } = await vite.ssrLoadModule('/src/i18n/localize.ts')
const { GUIDES } = await vite.ssrLoadModule('/src/guides/data.ts')
await vite.close()

const template = await fs.readFile(path.join(dist, 'index.html'), 'utf8')
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const now = new Date()
const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
const catOf = (t) => CATEGORIES.find((c) => c.id === t.category)

const LANGS = ['en', 'hi']
const pre = (lang) => (lang === 'en' ? '' : `/${lang}`)
const abs = (lang, route) => SITE_URL + pre(lang) + (route === '/' ? (lang === 'en' ? '/' : '') : route)

function page({ route, lang, title, description, body, jsonLd = [], noindex = false, single = false }) {
  const url = abs(lang, route)
  // single = English-only page (guides), so no Hindi alternate is announced
  const alternates = noindex || single ? [] : [...LANGS.map((l) => `<link rel="alternate" hreflang="${l}" href="${esc(abs(l, route))}" />`), `<link rel="alternate" hreflang="x-default" href="${esc(abs('en', route))}" />`]
  const head = [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(description)}" />`,
    `<meta name="robots" content="${noindex ? 'noindex, follow' : 'index, follow'}" />`,
    `<link rel="canonical" href="${esc(url)}" />`,
    ...alternates,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${esc(SITE_NAME)}" />`,
    `<meta property="og:locale" content="${lang === 'hi' ? 'hi_IN' : 'en_IN'}" />`,
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
    .replace('<html lang="en">', `<html lang="${lang}">`)
    .replace(/<title>[\s\S]*?<\/title>/, head)
    .replace(/<meta name="description"[^>]*>\s*/, '')
    .replace('<div id="root"></div>', `<div id="root"><div class="prerender">${body}</div></div>`)
}

// page text per language; tool and category text comes from the app's own translations
const T = {
  en: {
    home: 'Home', all: 'All tools', explore: 'Explore all tools', howTo: 'How to use', questions: 'Questions', related: 'Related tools',
    toolsOf: (c) => `${c} tools`, h1: 'Everything in its place.',
    homeTitle: `${SITE_NAME} — free online tools for images, PDF, text and more`,
    homeDesc: (n) => `${n} free online tools in one place: resize images, merge PDFs, format JSON, calculate GST and EMI, make QR codes and more. No sign-up, and your files never leave your browser.`,
    exploreTitle: (n) => `All ${n} free online tools — ${SITE_NAME}`,
    exploreDesc: (n) => `Browse ${n} free online tools by category: images, PDF, video, text, developer, SEO, design, QR codes, math and science, finance, everyday calculators and games.`,
    catTitle: (c) => `Free online ${c} tools — ${SITE_NAME}`,
    catDesc: (b, n, c) => `${b}. ${n} free ${c.toLowerCase()} tools that run in your browser — no sign-up, no uploads.`,
    toolTitle: (n) => `${n} — free online tool · ${SITE_NAME}`,
    toolDesc: (d) => `${d} Free, no sign-up, and it runs in your browser — your files are never uploaded.`,
    faq: [['Do I need an account?', 'No. Every tool is free to use without signing up.'], ['Is my data uploaded?', 'No. This tool runs in your browser, so the text and files you use stay on your device.']],
    feedback: [`Feedback and tool requests — ${SITE_NAME}`, `Send feedback, request a new tool or report a problem with ${SITE_NAME}.`, 'Feedback', 'Tell us what you like, request a tool you need, or report a problem.'],
  },
  hi: {
    home: 'होम', all: 'सभी टूल्स', explore: 'सभी टूल्स देखें', howTo: 'कैसे इस्तेमाल करें', questions: 'सवाल-जवाब', related: 'मिलते-जुलते टूल्स',
    toolsOf: (c) => `${c} टूल्स`, h1: 'हर काम का टूल, एक जगह।',
    homeTitle: `${SITE_NAME} — फ़ोटो, PDF, टेक्स्ट और भी बहुत कुछ के मुफ़्त ऑनलाइन टूल्स`,
    homeDesc: (n) => `${n} मुफ़्त ऑनलाइन टूल्स एक जगह: फ़ोटो का साइज़ बदलें, परीक्षा फ़ॉर्म के लिए फ़ोटो और हस्ताक्षर तैयार करें, PDF जोड़ें, GST और EMI निकालें, QR कोड बनाएँ और भी बहुत कुछ। बिना साइन अप, और आपकी फ़ाइलें आपके ब्राउज़र से बाहर नहीं जातीं।`,
    exploreTitle: (n) => `सभी ${n} मुफ़्त ऑनलाइन टूल्स — ${SITE_NAME}`,
    exploreDesc: (n) => `श्रेणी के हिसाब से ${n} मुफ़्त ऑनलाइन टूल्स देखें: फ़ोटो, PDF, वीडियो, टेक्स्ट, डेवलपर, SEO, डिज़ाइन, QR कोड, गणित और विज्ञान, खेल, फ़ाइनेंस और रोज़ के कैलकुलेटर।`,
    catTitle: (c) => `मुफ़्त ऑनलाइन ${c} टूल्स — ${SITE_NAME}`,
    catDesc: (b, n, c) => `${b}। ${n} मुफ़्त ${c} टूल्स जो आपके ब्राउज़र में चलते हैं — बिना साइन अप, बिना अपलोड।`,
    toolTitle: (n) => `${n} — मुफ़्त ऑनलाइन टूल · ${SITE_NAME}`,
    toolDesc: (d) => `${d} मुफ़्त, बिना साइन अप, और आपके ब्राउज़र में चलता है — आपकी फ़ाइलें कभी अपलोड नहीं होतीं।`,
    faq: [['क्या अकाउंट ज़रूरी है?', 'नहीं। हर टूल बिना साइन अप किए मुफ़्त है।'], ['क्या मेरा डेटा अपलोड होता है?', 'नहीं। यह टूल आपके ब्राउज़र में चलता है, इसलिए आपका टेक्स्ट और फ़ाइलें आपके डिवाइस पर ही रहती हैं।']],
    feedback: [`फ़ीडबैक और टूल अनुरोध — ${SITE_NAME}`, `${SITE_NAME} के लिए फ़ीडबैक भेजें, नया टूल माँगें या समस्या बताएँ।`, 'फ़ीडबैक', 'बताइए आपको क्या पसंद आया, कौन-सा टूल चाहिए, या कोई समस्या।'],
  },
}

const pages = []
let homeDesc = ''
for (const lang of LANGS) {
  const L = T[lang], P = pre(lang)
  const loc = (t) => localizeTool(t, lang)
  const ltools = tools.map(loc)
  const cl = (id) => catLabel(id, lang)
  const nav = `<nav><a href="${P || '/'}">${esc(SITE_NAME)}</a> · <a href="${P}/explore">${esc(L.all)}</a> · ${CATEGORIES.map((c) => `<a href="${P}/category/${c.slug}">${esc(cl(c.id))}</a>`).join(' · ')} · <a href="${lang === 'en' ? '/hi' : '/'}" hreflang="${lang === 'en' ? 'hi' : 'en'}">${lang === 'en' ? 'हिंदी' : 'English'}</a></nav>`
  const toolLinks = (list) => `<ul>${list.map((t) => `<li><a href="${P}/tool/${t.id}">${esc(t.name)}</a> — ${esc(t.description)}</li>`).join('')}</ul>`
  const crumbs = (items) => ({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items.map(([name, route], i) => ({ '@type': 'ListItem', position: i + 1, name, item: abs(lang, route) })) })
  const add = (p) => pages.push({ lang, ...p })

  const hd = L.homeDesc(tools.length)
  if (lang === 'en') homeDesc = hd
  add({ route: '/', title: L.homeTitle, description: hd, changefreq: 'weekly', priority: '1.0',
    jsonLd: [{ '@context': 'https://schema.org', '@type': 'Organization', name: SITE_NAME, url: SITE_URL + '/', logo: `${SITE_URL}/logo-512.png` },
      { '@context': 'https://schema.org', '@type': 'WebSite', name: SITE_NAME, url: abs(lang, '/'), inLanguage: lang, potentialAction: { '@type': 'SearchAction', target: `${SITE_URL}${P}/explore?q={search_term_string}`, 'query-input': 'required name=search_term_string' } }],
    body: `${nav}<main><h1>${esc(L.h1)}</h1><p>${esc(hd)}</p>${CATEGORIES.map((c) => `<section><h2><a href="${P}/category/${c.slug}">${esc(L.toolsOf(cl(c.id)))}</a></h2><p>${esc(catBlurb(c.id, c.blurb, lang))}.</p>${toolLinks(ltools.filter((t) => t.category === c.id))}</section>`).join('')}</main>` })

  add({ route: '/explore', title: L.exploreTitle(tools.length), description: L.exploreDesc(tools.length), changefreq: 'weekly', priority: '0.8',
    body: `${nav}<main><h1>${esc(L.explore)}</h1>${toolLinks(ltools)}</main>` })

  for (const c of CATEGORIES) {
    const list = ltools.filter((t) => t.category === c.id)
    add({ route: `/category/${c.slug}`, title: L.catTitle(cl(c.id)), description: L.catDesc(catBlurb(c.id, c.blurb, lang), list.length, cl(c.id)), changefreq: 'weekly', priority: '0.8',
      jsonLd: [crumbs([[L.home, '/'], [cl(c.id), `/category/${c.slug}`]])],
      body: `${nav}<main><h1>${esc(L.toolsOf(cl(c.id)))}</h1><p>${esc(catBlurb(c.id, c.blurb, lang))}.</p>${toolLinks(list)}</main>` })
  }

  // every tool page, including landing pages for specific searches
  for (const raw of allTools) {
    const t = loc(raw), c = catOf(t)
    const faq = [...(t.faq ?? []), ...L.faq]
    const related = ltools.filter((x) => x.category === t.category && x.id !== t.id).slice(0, 6)
    const description = L.toolDesc(t.description)
    add({ route: `/tool/${t.id}`, title: L.toolTitle(t.name), description, changefreq: 'monthly', priority: '0.9',
      jsonLd: [
        { '@context': 'https://schema.org', '@type': 'WebApplication', name: t.name, description: t.description, url: abs(lang, `/tool/${t.id}`), inLanguage: lang, applicationCategory: `${raw.category}Application`, operatingSystem: 'Any (web browser)', isAccessibleForFree: true, offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' } },
        { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
        crumbs([[L.home, '/'], [cl(t.category), `/category/${c.slug}`], [t.name, `/tool/${t.id}`]]),
      ],
      body: `${nav}<main><p><a href="${P}/category/${c.slug}">${esc(cl(t.category))}</a></p><h1>${esc(t.name)}</h1><p>${esc(description)}</p>`
        + `<h2>${esc(L.howTo)}</h2><ol>${t.howTo.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>`
        + `<h2>${esc(L.questions)}</h2>${faq.map(([q, a]) => `<h3>${esc(q)}</h3><p>${esc(a)}</p>`).join('')}`
        + (related.length ? `<h2>${esc(L.related)}</h2>${toolLinks(related)}` : '') + `</main>` })
  }

  const simple = (route, title, description, h1, text, opts = {}) => add({ route, title, description, body: `${nav}<main><h1>${esc(h1)}</h1><p>${esc(text)}</p></main>`, changefreq: 'yearly', priority: '0.4', ...opts })
  simple('/feedback', ...L.feedback)
  // legal pages are English only; the Hindi addresses still work but point search engines to the English copy
  simple('/privacy', `Privacy policy — ${SITE_NAME}`, `How ${SITE_NAME} handles your data: tools run in your browser and your files are never uploaded.`, 'Privacy policy', 'Tools run in your browser; your files and text are never uploaded.', { noindex: lang !== 'en' })
  simple('/terms', `Terms of use — ${SITE_NAME}`, `The terms for using ${SITE_NAME}'s free online tools.`, 'Terms of use', 'The terms for using these free online tools.', { noindex: lang !== 'en' })
  for (const [route, label] of [['/login', 'Log in'], ['/join', 'Join'], ['/forgot-password', 'Forgot password'], ['/reset-password', 'Reset password'], ['/favourites', 'Pinned tools'], ['/pockets', 'My pockets'], ['/recent', 'Recently used'], ['/settings', 'Settings']]) {
    simple(route, `${label} — ${SITE_NAME}`, `${label} on ${SITE_NAME}.`, label, '', { noindex: true })
  }
}

// how-to guides (English only for now)
{
  const nav = `<nav><a href="/">${esc(SITE_NAME)}</a> · <a href="/explore">All tools</a> · <a href="/guides">Guides</a></nav>`
  const list = (gs) => `<ul>${gs.map((g) => `<li><a href="/guides/${g.slug}">${esc(g.title)}</a> — ${esc(g.description)}</li>`).join('')}</ul>`
  pages.push({ lang: 'en', single: true, route: '/guides', title: `How-to guides — ${SITE_NAME}`, description: 'Step-by-step guides for exam photo sizes, PDFs, GST invoices, CGPA, EMI and more — with free tools that work in your browser.', changefreq: 'weekly', priority: '0.7',
    body: `${nav}<main><h1>How-to guides</h1>${list(GUIDES)}</main>` })
  for (const g of GUIDES) {
    const tool = allTools.find((t) => t.id === g.toolId)
    const url = `${SITE_URL}/guides/${g.slug}`
    const text = (x) => esc(x)
    const sections = (g.sections ?? []).map((sec) => `<h2>${text(sec.heading)}</h2>${(sec.paragraphs ?? []).map((p) => `<p>${text(p)}</p>`).join('')}${sec.bullets ? `<ul>${sec.bullets.map((b) => `<li>${text(b)}</li>`).join('')}</ul>` : ''}${sec.table ? `<table><thead><tr>${sec.table.head.map((h) => `<th>${text(h)}</th>`).join('')}</tr></thead><tbody>${sec.table.rows.map((r) => `<tr>${r.map((c) => `<td>${text(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>` : ''}`).join('')
    pages.push({
      lang: 'en', single: true, route: `/guides/${g.slug}`, title: `${g.title} — ${SITE_NAME}`, description: g.description, changefreq: 'monthly', priority: '0.8',
      jsonLd: [
        { '@context': 'https://schema.org', '@type': 'Article', headline: g.title, description: g.description, dateModified: g.updated, datePublished: g.updated, mainEntityOfPage: url, author: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL + '/' }, publisher: { '@type': 'Organization', name: SITE_NAME, logo: { '@type': 'ImageObject', url: `${SITE_URL}/logo-512.png` } }, image: `${SITE_URL}/og-image.png` },
        { '@context': 'https://schema.org', '@type': 'HowTo', name: g.title, description: g.description, totalTime: `PT${Math.max(2, g.steps.length)}M`, tool: tool ? [{ '@type': 'HowToTool', name: tool.name }] : undefined, step: g.steps.map((st, i) => ({ '@type': 'HowToStep', position: i + 1, name: st.title, text: st.text, url: `${url}#step-${i + 1}` })) },
        { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: g.faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
        { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Guides', item: `${SITE_URL}/guides` }, { '@type': 'ListItem', position: 2, name: g.title, item: url }] },
      ],
      body: `${nav}<main><article><h1>${text(g.title)}</h1><p>Updated ${g.updated} · ${g.minutes} min read</p>${g.intro.map((p) => `<p>${text(p)}</p>`).join('')}`
        + (tool ? `<p><a href="/tool/${tool.id}">${text(g.cta)} — ${text(tool.name)}</a></p>` : '')
        + `<h2>Step by step</h2><ol>${g.steps.map((st, i) => `<li id="step-${i + 1}"><strong>${text(st.title)}</strong> ${text(st.text)}</li>`).join('')}</ol>${sections}`
        + `<h2>Questions</h2>${g.faq.map(([q, a]) => `<h3>${text(q)}</h3><p>${text(a)}</p>`).join('')}`
        + `<h2>Related guides</h2>${list(g.related.map((r) => GUIDES.find((x) => x.slug === r)).filter(Boolean))}</article></main>`,
    })
  }
}

// write files as /tool/x.html (served at /tool/x without a trailing slash by Cloudflare Pages, Netlify and Vercel)
for (const p of pages) {
  const dir = p.lang === 'en' ? dist : path.join(dist, p.lang)
  const file = p.route === '/' ? (p.lang === 'en' ? path.join(dist, 'index.html') : path.join(dist, `${p.lang}.html`)) : path.join(dir, `${p.route.slice(1)}.html`)
  await fs.mkdir(path.dirname(file), { recursive: true })
  await fs.writeFile(file, page(p))
}

// Fallback for addresses without a file (e.g. /pockets/abc123): hosts serve 404.html with a 404 status,
// so search engines skip them, while the app still loads and shows the right page to visitors.
await fs.writeFile(path.join(dist, '404.html'), template.replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(SITE_NAME)}</title>\n    <meta name="robots" content="noindex" />`))

const indexable = pages.filter((p) => !p.noindex)
await fs.writeFile(path.join(dist, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${indexable.map((p) => `  <url><loc>${esc(abs(p.lang, p.route))}</loc>${p.single ? '' : LANGS.map((l) => `<xhtml:link rel="alternate" hreflang="${l}" href="${esc(abs(l, p.route))}"/>`).join('')}<lastmod>${today}</lastmod><changefreq>${p.changefreq}</changefreq><priority>${p.priority}</priority></url>`).join('\n')}
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
  '## हिंदी (Hindi)',
  '',
  `Every page is also available in Hindi under ${SITE_URL}/hi — for example [${SITE_NAME} हिंदी](${SITE_URL}/hi).`,
  '',
  '## How-to guides',
  '',
  ...GUIDES.map((g) => `- [${g.title}](${SITE_URL}/guides/${g.slug}): ${g.description}`),
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
