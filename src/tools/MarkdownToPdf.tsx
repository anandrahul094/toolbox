import { useMemo, useState } from 'react'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { Field, FileDrop, Row } from '../components/ui'

const SAMPLE = `# Project notes

A clean, printable document generated from **Markdown**.

## Highlights

- Keeps headings, lists and emphasis
- Supports links, blockquotes and code
- Renders GitHub-style Markdown tables

| Format | Supported |
| --- | --- |
| Markdown | Yes |
| Tables | Yes |

> Your file stays in this browser. Nothing is uploaded.

\`\`\`ts
const answer = "Hello, world!"
\`\`\`
`

export default function MarkdownToPdf() {
  const [markdown, setMarkdown] = useState(SAMPLE)
  const [title, setTitle] = useState('Markdown document')
  const [error, setError] = useState('')

  const html = useMemo(() => {
    try {
      return DOMPurify.sanitize(marked.parse(markdown, { async: false, gfm: true }) as string)
    } catch {
      return '<p>Could not render this Markdown.</p>'
    }
  }, [markdown])

  const loadFile = async (files: File[]) => {
    const file = files[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      setError('Please choose a Markdown or text file smaller than 2 MB.')
      return
    }
    try {
      setMarkdown(await file.text())
      setTitle(file.name.replace(/\.(md|markdown|txt)$/i, '') || 'Markdown document')
      setError('')
    } catch {
      setError('This file could not be read. Please try a UTF-8 Markdown or text file.')
    }
  }

  const printPdf = () => {
    setError('')
    if (!markdown.trim()) {
      setError('Add some Markdown content before creating your PDF.')
      return
    }
    const win = window.open('', '_blank')
    if (!win) {
      setError('Your browser blocked the print window. Allow pop-ups for this site and try again.')
      return
    }
    const safeTitle = title.trim() || 'Markdown document'
    win.document.open()
    win.document.write(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${safeTitle.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))}</title>
<style>
@page { size: A4; margin: 20mm 18mm; }
* { box-sizing: border-box; }
body { color: #202522; font: 11pt/1.65 Arial, Helvetica, sans-serif; overflow-wrap: anywhere; }
h1,h2,h3,h4 { line-height: 1.25; margin: 1.4em 0 .55em; break-after: avoid; }
h1 { font-size: 25pt; margin-top: 0; } h2 { font-size: 18pt; } h3 { font-size: 14pt; }
p { margin: .65em 0; }
a { color: #245b43; text-decoration: underline; }
img { max-width: 100%; height: auto; }
table { width: 100%; border-collapse: collapse; margin: 1em 0; font-size: 9.5pt; break-inside: avoid; }
th,td { border: 1px solid #cbd2cc; padding: 7px 9px; text-align: left; vertical-align: top; }
th { background: #edf1ed; font-weight: 700; }
blockquote { margin: 1em 0; padding: .2em 1em; border-left: 3px solid #6c8c73; color: #46534a; background: #f5f7f5; }
pre { white-space: pre-wrap; overflow-wrap: anywhere; background: #f3f4f3; padding: 12px; border-radius: 4px; font: 9pt/1.5 ui-monospace, monospace; break-inside: avoid; }
code { font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: .92em; }
:not(pre)>code { background: #f0f1ef; padding: 1px 4px; border-radius: 3px; }
hr { border: 0; border-top: 1px solid #d9ded9; margin: 1.5em 0; }
ul,ol { padding-left: 1.5em; }
li { margin: .2em 0; }
@media screen { body { max-width: 850px; margin: 32px auto; padding: 0 28px; } }
</style>
</head>
<body><main>${html}</main>
<script>window.addEventListener('load', () => { setTimeout(() => window.print(), 250) })</script>
</body></html>`)
    win.document.close()
  }

  return (
    <>
      <p className="muted">Upload a .md file or paste Markdown below. Choose <strong>Save as PDF</strong> in your browser’s print dialog.</p>
      <FileDrop onFiles={loadFile} accept=".md,.markdown,.txt,text/markdown,text/plain" label="Drop a Markdown or text file here, or click to choose" hint="Maximum 2 MB · Files stay on your device" />
      <Field label="Document title"><input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} /></Field>
      <div className="cols">
        <Field label="Markdown source">
          <textarea value={markdown} onChange={(e) => setMarkdown(e.target.value)} rows={18} spellCheck={false} style={{ width: '100%', minHeight: 360, fontFamily: 'ui-monospace, monospace', resize: 'vertical' }} />
        </Field>
        <div>
          <span className="field-label">PDF preview</span>
          <div className="markdown output" style={{ minHeight: 360, background: 'white', color: '#202522', fontSize: 14, whiteSpace: 'normal', overflowWrap: 'anywhere' }} dangerouslySetInnerHTML={{ __html: html }} />
        </div>
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      <Row>
        <button className="btn primary" onClick={printPdf} disabled={!markdown.trim()}>Print / Save as PDF</button>
        <button className="btn" onClick={() => { setMarkdown(''); setError('') }}>Clear</button>
      </Row>
      <p className="field-hint">Tip: In the print dialog, select “Save as PDF” as the destination. Page size is A4 with print-friendly margins.</p>
    </>
  )
}
