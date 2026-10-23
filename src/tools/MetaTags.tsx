import { useMemo, useState } from 'react'
import { CopyButton, Field, Row } from '../components/ui'

const escAttr = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

function Counter({ value, ideal }: { value: string; ideal: [number, number] }) {
  const n = value.length
  const color = n === 0 ? 'var(--muted)' : n < ideal[0] ? '#d97706' : n > ideal[1] ? 'var(--danger)' : '#16a34a'
  return <span style={{ color }}>{n} characters (aim for {ideal[0]}–{ideal[1]})</span>
}

export default function MetaTags() {
  const [title, setTitle] = useState('Free Online Tools — Toolbox')
  const [desc, setDesc] = useState('Resize images, merge PDFs, format JSON and calculate GST in your browser. Free, fast and private.')
  const [url, setUrl] = useState('https://example.com/')
  const [image, setImage] = useState('https://example.com/og-image.png')
  const [site, setSite] = useState('Toolbox')
  const [twitter, setTwitter] = useState('')
  const [robots, setRobots] = useState('index, follow')
  const [type, setType] = useState('website')

  const html = useMemo(() => {
    const t = escAttr(title), d = escAttr(desc)
    const lines = [
      `<title>${t}</title>`,
      `<meta name="description" content="${d}">`,
      `<meta name="robots" content="${robots}">`,
      url && `<link rel="canonical" href="${escAttr(url)}">`,
      '\n<!-- Open Graph -->',
      `<meta property="og:type" content="${type}">`,
      `<meta property="og:title" content="${t}">`,
      `<meta property="og:description" content="${d}">`,
      url && `<meta property="og:url" content="${escAttr(url)}">`,
      image && `<meta property="og:image" content="${escAttr(image)}">`,
      site && `<meta property="og:site_name" content="${escAttr(site)}">`,
      '\n<!-- Twitter / X -->',
      `<meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}">`,
      `<meta name="twitter:title" content="${t}">`,
      `<meta name="twitter:description" content="${d}">`,
      image && `<meta name="twitter:image" content="${escAttr(image)}">`,
      twitter && `<meta name="twitter:site" content="@${escAttr(twitter.replace(/^@/, ''))}">`,
    ]
    return lines.filter(Boolean).join('\n')
  }, [title, desc, url, image, site, twitter, robots, type])

  let host = ''
  try { host = new URL(url).host } catch { /* incomplete url */ }
  const cut = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + '…' : s)

  return (
    <>
      <Field label="Page title" hint={<Counter value={title} ideal={[30, 60]} />}><input value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
      <Field label="Meta description" hint={<Counter value={desc} ideal={[70, 160]} />}><textarea aria-label="Input text" value={desc} onChange={(e) => setDesc(e.target.value)} style={{ minHeight: 70, fontFamily: 'inherit' }} /></Field>
      <Row>
        <Field label="Page URL (canonical)"><input value={url} onChange={(e) => setUrl(e.target.value)} /></Field>
        <Field label="Share image URL" hint="1200×630 px recommended"><input value={image} onChange={(e) => setImage(e.target.value)} /></Field>
      </Row>
      <Row>
        <Field label="Site name"><input value={site} onChange={(e) => setSite(e.target.value)} /></Field>
        <Field label="X / Twitter handle"><input value={twitter} placeholder="@yourbrand" onChange={(e) => setTwitter(e.target.value)} /></Field>
        <Field label="Type"><select value={type} onChange={(e) => setType(e.target.value)}><option value="website">website</option><option value="article">article</option><option value="product">product</option></select></Field>
        <Field label="Robots"><select value={robots} onChange={(e) => setRobots(e.target.value)}><option>index, follow</option><option>noindex, follow</option><option>noindex, nofollow</option></select></Field>
      </Row>

      <div className="cols">
        <Field label="Search result preview (approximate)">
          <div style={{ background: '#fff', color: '#202124', padding: 14, borderRadius: 8, border: '1px solid var(--border)', fontFamily: 'Arial, sans-serif' }}>
            <div style={{ fontSize: 12, color: '#4d5156' }}>{host || 'example.com'}</div>
            <div style={{ fontSize: 19, color: '#1a0dab', margin: '2px 0' }}>{cut(title || 'Page title', 60)}</div>
            <div style={{ fontSize: 13, lineHeight: 1.5, color: '#4d5156' }}>{cut(desc || 'Description', 160)}</div>
          </div>
        </Field>
        <Field label="Social share preview (approximate)">
          <div style={{ background: '#fff', color: '#1c1e21', borderRadius: 8, border: '1px solid var(--border)', overflow: 'hidden', fontFamily: 'Arial, sans-serif' }}>
            <div style={{ aspectRatio: '1.91 / 1', background: image ? `#e4e6eb url("${encodeURI(image)}") center / cover` : '#e4e6eb', display: 'grid', placeItems: 'center', color: '#65676b', fontSize: 13 }}>{image ? '' : 'No image'}</div>
            <div style={{ padding: '8px 12px', background: '#f0f2f5' }}>
              <div style={{ fontSize: 12, color: '#65676b', textTransform: 'uppercase' }}>{host || 'example.com'}</div>
              <div style={{ fontWeight: 600, fontSize: 15 }}>{cut(title, 70)}</div>
              <div style={{ fontSize: 13, color: '#65676b' }}>{cut(desc, 100)}</div>
            </div>
          </div>
        </Field>
      </div>
      <Field label="HTML — paste inside <head>"><pre className="output">{html}</pre></Field>
      <div><CopyButton value={html} label="Copy tags" /></div>
    </>
  )
}
