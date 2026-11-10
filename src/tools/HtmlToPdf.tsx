import { useState } from 'react'
import DOMPurify from 'dompurify'
import { ErrorBox, Field, FileDrop, Row } from '../components/ui'

const SAMPLE = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>Sample document</title></head>
<body>
  <h1>HTML to PDF</h1>
  <p>Convert structured HTML into a searchable PDF with clickable links.</p>
  <h2>Features</h2>
  <ul><li>Semantic headings and lists</li><li>Print-friendly CSS</li></ul>
  <p><a href="https://example.com">Example external link</a></p>
</body>
</html>`

const escapeAttr = (s: string) => s.replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]!))

export default function HtmlToPdf() {
  const [source, setSource] = useState(SAMPLE)
  const [title, setTitle] = useState('HTML document')
  const [author, setAuthor] = useState('')
  const [subject, setSubject] = useState('')
  const [keywords, setKeywords] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const load = async (files: File[]) => {
    const file = files[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { setError('Choose an HTML file smaller than 5 MB.'); return }
    try {
      const text = await file.text()
      if (!text.trim()) throw new Error('The file is empty.')
      setSource(text); setTitle(file.name.replace(/\.html?$/i, '') || 'HTML document'); setError('')
    } catch (e) { setError((e as Error).message || 'Could not read this file.') }
  }

  const print = () => {
    setError('')
    if (!source.trim()) { setError('Add HTML content first.'); return }
    if (source.length > 5 * 1024 * 1024) { setError('HTML is larger than 5 MB. Reduce the source size and try again.'); return }
    const win = window.open('', '_blank')
    if (!win) { setError('The print window was blocked. Allow pop-ups for this site and try again.'); return }
    setBusy(true)
    const safe = DOMPurify.sanitize(source, { USE_PROFILES: { html: true }, ADD_TAGS: ['style'], ADD_ATTR: ['target','rel'] })
    const parser = new DOMParser()
    const parsed = parser.parseFromString(safe, 'text/html')
    // Explicit metadata belongs in the PDF document info where the browser supports it;
    // title and metadata are also embedded in the printable HTML head.
    parsed.title = title.trim() || 'HTML document'
    const meta = (name: string, content: string) => {
      let el = parsed.head.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null
      if (!el) { el = parsed.createElement('meta'); el.name = name; parsed.head.appendChild(el) }
      el.content = content
    }
    meta('author', author); meta('description', subject); meta('keywords', keywords)
    if (!parsed.querySelector('meta[charset]')) { const charset = parsed.createElement('meta'); charset.setAttribute('charset','utf-8'); parsed.head.prepend(charset) }
    const css = parsed.createElement('style')
    css.textContent = `
      @page { size: A4; margin: 18mm; }
      html { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
      body { overflow-wrap: anywhere; }
      img,svg,table,pre,blockquote { max-width:100%; break-inside:avoid; }
      img { height:auto; }
      h1,h2,h3,h4,h5,h6 { break-after:avoid; }
      p,li { orphans:3; widows:3; }
      a { color:inherit; text-decoration:underline; }
      @media screen { body { max-width: 900px; margin: 24px auto; padding: 24px; } }
    `
    parsed.head.appendChild(css)
    // Remove active content and remote frames; hyperlinks remain real anchors in the print document.
    parsed.querySelectorAll('script,iframe,object,embed,form').forEach(el => el.remove())
    win.document.open()
    win.document.write('<!doctype html>' + parsed.documentElement.outerHTML)
    win.document.close()
    const finish = () => { try { win.focus(); win.print() } catch { setError('The browser could not open its print dialog.') } finally { setBusy(false) } }
    if (win.document.readyState === 'complete') setTimeout(finish, 300)
    else win.addEventListener('load', () => setTimeout(finish, 300), { once: true })
  }

  return <>
    <p className="muted">Paste HTML or upload an .html file. The browser renders it for printing; choose <strong>Save as PDF</strong>. Text remains searchable and links remain clickable.</p>
    <FileDrop accept=".html,.htm,text/html" onFiles={load} label="Drop an HTML file here, or click to choose" hint="Maximum 5 MB · Processed locally" />
    <div className="cols">
      <Field label="HTML source"><textarea value={source} onChange={e => setSource(e.target.value)} rows={18} spellCheck={false} style={{width:'100%',minHeight:350,fontFamily:'ui-monospace,monospace'}} /></Field>
      <div>
        <Field label="PDF document title"><input value={title} maxLength={160} onChange={e=>setTitle(e.target.value)} /></Field>
        <Field label="Author"><input value={author} maxLength={120} onChange={e=>setAuthor(e.target.value)} /></Field>
        <Field label="Description / subject"><input value={subject} maxLength={300} onChange={e=>setSubject(e.target.value)} /></Field>
        <Field label="Keywords"><input value={keywords} maxLength={300} onChange={e=>setKeywords(e.target.value)} /></Field>
        <p className="field-hint">These fields are embedded as HTML metadata. Browser print-to-PDF support for PDF document properties varies by browser.</p>
      </div>
    </div>
    <ErrorBox message={error} />
    <Row><button className="btn primary" onClick={print} disabled={!source.trim() || busy}>{busy ? 'Preparing print view…' : 'Print / Save as PDF'}</button></Row>
    <p className="field-hint">For best results, use semantic headings, meaningful link text, alt text on images, and CSS @page / break-inside rules. External assets must be reachable by your browser when printing.</p>
  </>
}
