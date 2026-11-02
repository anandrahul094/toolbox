import { useMemo, useState } from 'react'
import { Document, HeadingLevel, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle } from 'docx'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { Field, FileDrop, Row } from '../components/ui'

const SAMPLE = `# Project notes

A clean Word document generated from **Markdown**.

## Highlights

- Keeps headings, lists and emphasis
- Supports links, tables, blockquotes and code
- Opens in Microsoft Word and compatible editors

| Format | Supported |
| --- | --- |
| Markdown | Yes |
| Tables | Yes |

> Your file stays in this browser. Nothing is uploaded.

\`\`\`ts
const answer = "Hello, world!"
\`\`\`
`

type RunOptions = { bold?: boolean; italics?: boolean; strike?: boolean; underline?: object; color?: string; font?: string; size?: number }

function inlineRuns(source: string, inherited: RunOptions = {}): TextRun[] {
  const html = DOMPurify.sanitize(marked.parseInline(source, { async: false, gfm: true }) as string)
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const runs: TextRun[] = []
  const visit = (node: Node, style: RunOptions) => {
    if (node.nodeType === Node.TEXT_NODE) {
      if (node.textContent) runs.push(new TextRun({ text: node.textContent, ...style }))
      return
    }
    if (!(node instanceof HTMLElement)) return
    const next = { ...style }
    const tag = node.tagName.toLowerCase()
    if (tag === 'strong' || tag === 'b') next.bold = true
    if (tag === 'em' || tag === 'i') next.italics = true
    if (tag === 'del' || tag === 's') next.strike = true
    if (tag === 'code') { next.font = 'Consolas'; next.color = '7C3AED' }
    if (tag === 'a') { next.color = '2563EB'; next.underline = {} }
    if (tag === 'br') { runs.push(new TextRun({ text: '', break: 1, ...next })); return }
    for (const child of Array.from(node.childNodes)) visit(child, next)
    if (tag === 'a') {
      const href = node.getAttribute('href')
      if (href && /^https?:\/\//i.test(href)) runs.push(new TextRun({ text: ` (${href})`, color: '2563EB', size: 18 }))
    }
  }
  for (const child of Array.from(doc.body.childNodes)) visit(child, inherited)
  return runs.length ? runs : [new TextRun('')]
}

function plainText(source: string): string {
  const doc = new DOMParser().parseFromString(DOMPurify.sanitize(marked.parseInline(source, { async: false }) as string), 'text/html')
  return doc.body.textContent || ''
}

function cell(text: string, header = false) {
  return new TableCell({
    children: [new Paragraph({ children: inlineRuns(text, header ? { bold: true } : {}), spacing: { before: 60, after: 60 } })],
    shading: header ? { fill: 'EEF2F7' } : undefined,
    margins: { top: 90, bottom: 90, left: 110, right: 110 },
  })
}

function renderBlocks(tokens: any[], depth = 0): (Paragraph | Table)[] {
  const output: (Paragraph | Table)[] = []
  for (const token of tokens) {
    if (token.type === 'space') continue
    if (token.type === 'heading') {
      const level = Math.min(Math.max(token.depth, 1), 3)
      const heading = level === 1 ? HeadingLevel.HEADING_1 : level === 2 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3
      output.push(new Paragraph({ heading, children: inlineRuns(token.text), spacing: { before: 240, after: 100 }, keepNext: true }))
    } else if (token.type === 'paragraph' || token.type === 'text') {
      output.push(new Paragraph({ children: inlineRuns(token.text), spacing: { after: 140 }, indent: depth ? { left: 360 * depth } : undefined }))
    } else if (token.type === 'blockquote') {
      output.push(new Paragraph({ children: inlineRuns(plainText(token.text), { italics: true, color: '475569' }), indent: { left: 420 }, border: { left: { style: BorderStyle.SINGLE, size: 18, color: '94A3B8', space: 8 } }, spacing: { before: 100, after: 140 } }))
    } else if (token.type === 'code') {
      output.push(new Paragraph({ children: [new TextRun({ text: token.text, font: 'Consolas', size: 18, color: '334155' })], shading: { fill: 'F1F5F9' }, spacing: { before: 80, after: 160 }, indent: { left: 180, right: 180 } }))
    } else if (token.type === 'list') {
      token.items.forEach((item: any, index: number) => {
        const itemText = item.tokens?.map((t: any) => t.text || t.raw || '').join(' ') || item.text || ''
        const prefix = token.ordered ? `${(token.start || 1) + index}.` : '•'
        output.push(new Paragraph({ children: [new TextRun({ text: `${prefix}  ` }), ...inlineRuns(plainText(itemText))], indent: { left: 360 + depth * 240, hanging: 220 }, spacing: { after: 70 } }))
      })
    } else if (token.type === 'table') {
      const rows = [
        new TableRow({ tableHeader: true, children: token.header.map((c: any) => cell(c.text, true)) }),
        ...token.rows.map((row: any[]) => new TableRow({ children: row.map((c: any) => cell(c.text)) })),
      ]
      output.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows, borders: { top: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' }, bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' }, left: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' }, right: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' }, insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' }, insideVertical: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' } } }))
      output.push(new Paragraph({ text: '', spacing: { after: 100 } }))
    } else if (token.type === 'hr') {
      output.push(new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'CBD5E1', space: 1 } }, spacing: { before: 100, after: 180 } }))
    } else if (token.type === 'list' && token.items) {
      output.push(...renderBlocks(token.items.flatMap((item: any) => item.tokens || []), depth + 1))
    } else if (token.type === 'html') {
      output.push(new Paragraph({ children: inlineRuns(plainText(token.text)), spacing: { after: 120 } }))
    }
  }
  return output
}

export default function MarkdownToDocx() {
  const [markdown, setMarkdown] = useState(SAMPLE)
  const [title, setTitle] = useState('Markdown document')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const preview = useMemo(() => {
    try { return DOMPurify.sanitize(marked.parse(markdown, { async: false, gfm: true }) as string) }
    catch { return '<p>Could not render this Markdown.</p>' }
  }, [markdown])

  const loadFile = async (files: File[]) => {
    const file = files[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { setError('Please choose a Markdown or text file smaller than 2 MB.'); return }
    try {
      setMarkdown(await file.text())
      setTitle(file.name.replace(/\.(md|markdown|txt)$/i, '') || 'Markdown document')
      setError('')
    } catch { setError('This file could not be read. Please try a UTF-8 Markdown or text file.') }
  }

  const downloadDocx = async () => {
    setError('')
    if (!markdown.trim()) { setError('Add some Markdown content before creating your Word document.'); return }
    setBusy(true)
    try {
      const safeTitle = title.trim().slice(0, 120) || 'Markdown document'
      const tokens = marked.lexer(markdown, { gfm: true })
      const children = [
        new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun({ text: safeTitle, bold: true })], spacing: { after: 260 } }),
        ...renderBlocks(tokens),
      ]
      const doc = new Document({
        creator: 'TheToolbox.site',
        title: safeTitle,
        description: 'Created locally from Markdown with TheToolbox.site',
        styles: { default: { document: { run: { font: 'Arial', size: 22, color: '202522' }, paragraph: { spacing: { line: 320 } } } } },
        sections: [{ properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, right: 1020, bottom: 1134, left: 1020 } } }, children }],
      })
      const blob = await Packer.toBlob(doc)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${safeTitle.replace(/[\\/:*?"<>|]/g, '-').slice(0, 100) || 'markdown-document'}.docx`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (e) {
      setError(e instanceof Error ? `Could not create the Word document: ${e.message}` : 'Could not create the Word document. Please try again.')
    } finally { setBusy(false) }
  }

  return (
    <>
      <p className="muted">Upload a .md file or paste Markdown below. Download a formatted Word (.docx) document.</p>
      <FileDrop onFiles={loadFile} accept=".md,.markdown,.txt,text/markdown,text/plain" label="Drop a Markdown or text file here, or click to choose" hint="Maximum 2 MB · Files stay on your device" />
      <Field label="Document title"><input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} /></Field>
      <div className="cols">
        <Field label="Markdown source">
          <textarea value={markdown} onChange={(e) => setMarkdown(e.target.value)} rows={18} spellCheck={false} style={{ width: '100%', minHeight: 360, fontFamily: 'ui-monospace, monospace', resize: 'vertical' }} />
        </Field>
        <div>
          <span className="field-label">Word document preview</span>
          <div className="markdown output" style={{ minHeight: 360, background: 'white', color: '#202522', fontSize: 14, whiteSpace: 'normal', overflowWrap: 'anywhere' }} dangerouslySetInnerHTML={{ __html: preview }} />
        </div>
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      <Row>
        <button className="btn primary" onClick={downloadDocx} disabled={!markdown.trim() || busy}>{busy ? 'Creating Word document…' : 'Download Word (.docx)'}</button>
        <button className="btn" onClick={() => { setMarkdown(''); setError('') }}>Clear</button>
      </Row>
      <p className="field-hint">Tip: The downloaded .docx file can be opened in Microsoft Word, Google Docs and LibreOffice. Conversion runs locally in your browser.</p>
    </>
  )
}
