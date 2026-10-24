import { useState } from 'react'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import type { TextItem } from 'pdfjs-dist/types/src/display/api'
import { baseName, canvasToBlob, downloadBlob, ErrorBox, Field, FileDrop, Progress, Row } from '../components/ui'
import { isEncryptedError, openPdf, PASSWORD_MESSAGE, renderPage } from '../lib/pdf'

interface Line { y: number; x: number; size: number; text: string; right: number }
interface Para { text: string; size: number; heading: boolean }

// Rebuild lines and paragraphs from positioned text. PDFs store text as scattered pieces, so this is an approximation.
async function pageParagraphs(doc: PDFDocumentProxy, n: number) {
  const page = await doc.getPage(n)
  const vp = page.getViewport({ scale: 1 })
  const content = await page.getTextContent()
  const items = content.items.filter((i): i is TextItem => 'str' in i && i.str !== '')
  const pieces = items.map((i) => {
    // position in the page as displayed (handles rotated pages)
    const [x, y] = vp.convertToViewportPoint(i.transform[4], i.transform[5])
    const size = Math.hypot(i.transform[2], i.transform[3]) || i.height || 10
    return { x, y, size, w: i.width, str: i.str }
  })
  pieces.sort((a, b) => a.y - b.y || a.x - b.x)
  const lines: Line[] = []
  for (const p of pieces) {
    const line = lines.find((l) => Math.abs(l.y - p.y) < Math.max(2, p.size * 0.35))
    if (!line) { lines.push({ y: p.y, x: p.x, size: p.size, text: p.str, right: p.x + p.w }); continue }
    const gap = p.x - line.right
    const sep = gap > p.size * 0.18 && !line.text.endsWith(' ') && !p.str.startsWith(' ') ? (gap > p.size * 2.5 ? '\t' : ' ') : ''
    if (p.x >= line.x) { line.text += sep + p.str; line.right = Math.max(line.right, p.x + p.w) } else { line.text = p.str + ' ' + line.text; line.x = p.x }
    line.size = Math.max(line.size, p.size)
  }
  lines.sort((a, b) => a.y - b.y)
  const sizes = lines.map((l) => l.size).sort((a, b) => a - b)
  const body = sizes[Math.floor(sizes.length / 2)] || 11
  const paras: Para[] = []
  let prev: Line | null = null
  for (const l of lines) {
    const text = l.text.replace(/\s+$/, '')
    if (!text.trim()) continue
    const heading = l.size > body * 1.2
    const last = paras[paras.length - 1]
    const joins = prev && last && !last.heading && !heading
      && l.y - prev.y < Math.max(l.size, prev.size) * 1.6 // close to the line above
      && Math.abs(l.size - prev.size) < 1
      && prev.right > vp.width * 0.6 // the line above ran to the margin, so this continues it
      && !/^([•\-–*]|\d+[.)])\s/.test(text.trim())
    if (joins) last.text = last.text.endsWith('-') ? last.text.slice(0, -1) + text.trim() : `${last.text} ${text.trim()}`
    else paras.push({ text, size: l.size, heading })
    prev = l
  }
  page.cleanup()
  return { paras, width: vp.width, height: vp.height }
}

export default function PdfToWord() {
  const [file, setFile] = useState<File | null>(null)
  const [mode, setMode] = useState<'text' | 'image'>('text')
  const [progress, setProgress] = useState<[number, number] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)

  const run = async () => {
    if (!file) return
    setError(null); setNote(null)
    let doc: PDFDocumentProxy
    try { doc = await openPdf(file) } catch (e) { setError(isEncryptedError(e) ? PASSWORD_MESSAGE : 'This file could not be opened as a PDF.'); return }
    try {
      const D = await import('docx')
      const sections: import('docx').ISectionOptions[] = []
      let chars = 0
      for (let n = 1; n <= doc.numPages; n++) {
        setProgress([n, doc.numPages])
        if (mode === 'text') {
          const { paras, width, height } = await pageParagraphs(doc, n)
          chars += paras.reduce((s, p) => s + p.text.length, 0)
          sections.push({
            properties: { page: { size: { width: width * 20, height: height * 20 }, margin: { top: 1000, bottom: 1000, left: 1100, right: 1100 } } },
            children: paras.length ? paras.map((p) => new D.Paragraph({
              heading: p.heading ? D.HeadingLevel.HEADING_2 : undefined,
              spacing: { after: 120 },
              children: p.text.split('\t').flatMap((t, i) => [...(i ? [new D.TextRun({ text: '\t' })] : []), new D.TextRun({ text: t, size: Math.round(Math.min(40, Math.max(8, p.size)) * 2), bold: p.heading || undefined })]),
            })) : [new D.Paragraph('')],
          })
        } else {
          const canvas = await renderPage(doc, n, 2)
          const data = await (await canvasToBlob(canvas, 'image/jpeg', 0.88)).arrayBuffer()
          const base = (await doc.getPage(n)).getViewport({ scale: 1 })
          sections.push({
            properties: { page: { size: { width: base.width * 20, height: base.height * 20 }, margin: { top: 0, bottom: 0, left: 0, right: 0, header: 0, footer: 0 } } },
            // 96 px per inch in Word = 4/3 px per point; a hair smaller so Word doesn't push it to a new page
            children: [new D.Paragraph({ spacing: { before: 0, after: 0 }, children: [new D.ImageRun({ type: 'jpg', data, transformation: { width: base.width * (4 / 3) - 2, height: base.height * (4 / 3) - 2 } })] })],
          })
        }
        await new Promise((r) => setTimeout(r, 0))
      }
      if (mode === 'text' && chars < 20 * doc.numPages) setNote('Very little text was found — this looks like a scanned PDF. Try “Exact look” mode, or Image to Text (OCR) on the pages.')
      const out = await D.Packer.toBlob(new D.Document({ creator: 'The Toolbox', styles: { default: { document: { run: { font: 'Calibri' } } } }, sections }))
      downloadBlob(`${baseName(file.name)}.docx`, out)
    } catch (e) {
      setError(`Couldn’t convert this PDF: ${(e as Error).message}`)
    } finally { setProgress(null); doc.destroy() }
  }

  return (
    <>
      <FileDrop accept="application/pdf,.pdf" disabled={!!progress} onFiles={(f) => { setFile(f[0]); setError(null); setNote(null) }} label={file ? `📄 ${file.name} (click to change)` : 'Drop a PDF here, or click to choose'} hint="Converted on your device — nothing is uploaded." />
      <Row>
        <Field label="Conversion">
          <select value={mode} onChange={(e) => setMode(e.target.value as typeof mode)}>
            <option value="text">Editable text (layout is simplified)</option>
            <option value="image">Exact look (pages as pictures, not editable)</option>
          </select>
        </Field>
      </Row>
      <p className="muted" style={{ margin: 0, fontSize: 13 }}>
        {mode === 'text'
          ? 'Keeps the text, paragraphs and headings so you can edit them in Word or Google Docs. Columns, tables and images are not rebuilt.'
          : 'Each page is placed as a picture, so it looks identical but the text can’t be edited.'}
      </p>
      {progress && <Progress value={progress[0]} max={progress[1]} label="Converting pages" />}
      <ErrorBox message={error} />
      {note && <div className="notice"><span>{note}</span></div>}
      <div><button className="btn primary" disabled={!file || !!progress} onClick={run}>{progress ? `Converting page ${progress[0]} of ${progress[1]}…` : 'Convert to Word'}</button></div>
    </>
  )
}
