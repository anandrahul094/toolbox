import { useState } from 'react'
import { degrees, PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { baseName, downloadBlob, ErrorBox, Field, FileDrop, NumberInput, Row } from '../components/ui'
import { isEncryptedError, PASSWORD_MESSAGE, pdfBlob, visualFrame } from '../lib/pdf'

const POSITIONS = ['bottom-center', 'bottom-right', 'bottom-left', 'top-center', 'top-right', 'top-left'] as const
const FORMATS = ['{n}', 'Page {n}', 'Page {n} of {total}', '{n} / {total}', '- {n} -']

export default function PdfPageNumbers() {
  const [file, setFile] = useState<File | null>(null)
  const [pos, setPos] = useState<(typeof POSITIONS)[number]>('bottom-center')
  const [format, setFormat] = useState(FORMATS[2])
  const [start, setStart] = useState(1)
  const [size, setSize] = useState(11)
  const [margin, setMargin] = useState(28)
  const [skipFirst, setSkipFirst] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = async () => {
    if (!file) return
    setBusy(true); setError(null)
    try {
      const pdf = await PDFDocument.load(await file.arrayBuffer())
      const font = await pdf.embedFont(StandardFonts.Helvetica)
      const pages = pdf.getPages()
      if (skipFirst && pages.length === 1) throw new Error('This PDF has only one page, and it is set to be skipped. Untick “Don’t number the first page”.')
      const numbered = skipFirst ? pages.length - 1 : pages.length
      pages.forEach((page, i) => {
        if (skipFirst && i === 0) return
        const n = start + i - (skipFirst ? 1 : 0)
        const text = format.replace('{n}', String(n)).replace('{total}', String(numbered + start - 1))
        // position in the page as displayed, so rotated (e.g. scanned) pages get upright numbers
        const f = visualFrame(page)
        const tw = font.widthOfTextAtSize(text, size)
        const [v, h] = pos.split('-')
        const vx = h === 'left' ? margin : h === 'right' ? f.width - margin - tw : (f.width - tw) / 2
        const vy = v === 'bottom' ? margin : f.height - margin - size
        page.drawText(text, { ...f.toPage(vx, vy), size, font, color: rgb(0.2, 0.2, 0.2), rotate: degrees(f.rotation) })
      })
      downloadBlob(`${baseName(file.name)}-numbered.pdf`, pdfBlob(await pdf.save()))
    } catch (e) { setError(isEncryptedError(e) ? PASSWORD_MESSAGE : (e as Error).message) } finally { setBusy(false) }
  }

  return (
    <>
      <FileDrop accept="application/pdf,.pdf" disabled={busy} onFiles={(f) => { setFile(f[0]); setError(null) }} label={file ? `📄 ${file.name} (click to change)` : undefined} />
      <Row>
        <Field label="Position"><select value={pos} onChange={(e) => setPos(e.target.value as typeof pos)}>{POSITIONS.map((p) => <option key={p} value={p}>{p.replace('-', ' ')}</option>)}</select></Field>
        <Field label="Format"><select value={format} onChange={(e) => setFormat(e.target.value)}>{FORMATS.map((f) => <option key={f} value={f}>{f.replace('{n}', '3').replace('{total}', '10')}</option>)}</select></Field>
      </Row>
      <Row>
        <Field label="Start at"><NumberInput min={0} max={100000} step={1} value={start} onValue={(v) => setStart(Math.round(v))} /></Field>
        <Field label={`Font size: ${size}pt`}><input type="range" min={6} max={24} value={size} onChange={(e) => setSize(+e.target.value)} /></Field>
        <Field label={`Margin: ${margin}pt`}><input type="range" min={8} max={72} value={margin} onChange={(e) => setMargin(+e.target.value)} /></Field>
      </Row>
      <label className="check"><input type="checkbox" checked={skipFirst} onChange={(e) => setSkipFirst(e.target.checked)} /> Don't number the first page (cover)</label>
      <ErrorBox message={error} />
      <div><button className="btn primary" disabled={!file || busy} onClick={run}>{busy ? 'Working…' : 'Add page numbers'}</button></div>
    </>
  )
}
