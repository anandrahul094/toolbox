import { SITE_NAME, SITE_URL } from '../site'

function tag(selector: string, create: () => HTMLElement) {
  let el = document.head.querySelector<HTMLElement>(selector)
  if (!el) { el = create(); document.head.appendChild(el) }
  return el
}
const meta = (attr: 'name' | 'property', key: string, content: string) =>
  tag(`meta[${attr}="${key}"]`, () => { const m = document.createElement('meta'); m.setAttribute(attr, key); return m }).setAttribute('content', content)

/** Keep title, description, canonical and social tags in step with the page being viewed. */
export function setMeta(title: string, description: string, opts: { noindex?: boolean } = {}) {
  document.title = title
  const url = SITE_URL + (window.location.pathname === '/' ? '/' : window.location.pathname.replace(/\/+$/, ''))
  const image = SITE_URL + '/og-image.png'
  meta('name', 'description', description)
  meta('property', 'og:type', 'website')
  meta('property', 'og:site_name', SITE_NAME)
  meta('property', 'og:title', title)
  meta('property', 'og:description', description)
  meta('property', 'og:url', url)
  meta('property', 'og:image', image)
  meta('name', 'twitter:card', 'summary_large_image')
  meta('name', 'twitter:title', title)
  meta('name', 'twitter:description', description)
  meta('name', 'twitter:image', image)
  meta('name', 'robots', opts.noindex ? 'noindex, follow' : 'index, follow')
  tag('link[rel="canonical"]', () => { const l = document.createElement('link'); l.rel = 'canonical'; return l }).setAttribute('href', url)
}
