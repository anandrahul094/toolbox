import { useState } from 'react'
import { degrees, PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { baseName, downloadBlob, ErrorBox, Field, FileDrop, NumberInput, Row } from '../components/ui'
import BatchRunner, { BulkToggle, type BatchProcess } from '../components/Batch'
import { isEncryptedError, PASSWORD_MESSAGE, pdfBlob, visualFrame } from '../lib/pdf'

const POSITIONS = ['bottom-center', 'bottom-right', 'bottom-left', 'top-center', 'top-right', 'top-left'] as const
const FORMATS = ['{n}', 'Page {n}', 'Page {n} of {total}', '{n} / {total}', '- {n} -']

interface Opts { pos: (typeof POSITIONS)[number]; format: string; start: number; size: number; margin: number; skipFirst: boolean }
const DEFAULTS: Opts = { pos: 'bottom-center', format: FORMATS[2], start: 1, size: 11, margin: 28, skipFirst: false }

async function numberPdf(file: File, { pos, format, start, size, margin, skipFirst }: Opts) {
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
  return pdfBlob(await pdf.save())
}

function Settings({ o, set }: { o: Opts; set: (patch: Partial<Opts>) => void }) {
  return (
    <>
      <Row>
        <Field label="Position"><select value={o.pos} onChange={(e) => set({ pos: e.target.value as Opts['pos'] })}>{POSITIONS.map((p) => <option key={p} value={p}>{p.replace('-', ' ')}</option>)}</select></Field>
        <Field label="Format"><select value={o.format} onChange={(e) => set({ format: e.target.value })}>{FORMATS.map((f) => <option key={f} value={f}>{f.replace('{n}', '3').replace('{total}', '10')}</option>)}</select></Field>
      </Row>
      <Row>
        <Field label="Start at"><NumberInput min={0} max={100000} step={1} value={o.start} onValue={(v) => set({ start: Math.round(v) })} /></Field>
        <Field label={`Font size: ${o.size}pt`}><input type="range" min={6} max={24} value={o.size} onChange={(e) => set({ size: +e.target.value })} /></Field>
        <Field label={`Margin: ${o.margin}pt`}><input type="range" min={8} max={72} value={o.margin} onChange={(e) => set({ margin: +e.target.value })} /></Field>
      </Row>
      <label className="check"><input type="checkbox" checked={o.skipFirst} onChange={(e) => set({ skipFirst: e.target.checked })} /> Don't number the first page (cover)</label>
    </>
  )
}

function BulkPageNumbers({ onSingle }: { onSingle: () => void }) {
  const [o, setO] = useState<Opts>(DEFAULTS)
  const process: BatchProcess = async (file) => {
    try {
      return { name: `${baseName(file.name)}-numbered.pdf`, blob: await numberPdf(file, o) }
    } catch (e) { throw isEncryptedError(e) ? new Error(PASSWORD_MESSAGE) : e }
  }
  return (
    <>
      <BulkToggle bulk onChange={(b) => { if (!b) onSingle() }} />
      <Settings o={o} set={(p) => setO((c) => ({ ...c, ...p }))} />
      <p className="muted" style={{ margin: 0, fontSize: 13 }}>Each file is numbered on its own, starting from the same number.</p>
      <BatchRunner accept="application/pdf,.pdf" process={process} settingsKey={JSON.stringify(o)} runLabel="Number all" zipName="numbered-pdfs" />
    </>
  )
}

export default function PdfPageNumbers() {
  const [bulk, setBulk] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [o, setO] = useState<Opts>(DEFAULTS)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = async () => {
    if (!file) return
    setBusy(true); setError(null)
    try {
      downloadBlob(`${baseName(file.name)}-numbered.pdf`, await numberPdf(file, o))
    } catch (e) { setError(isEncryptedError(e) ? PASSWORD_MESSAGE : (e as Error).message) } finally { setBusy(false) }
  }

  if (bulk) return <BulkPageNumbers onSingle={() => setBulk(false)} />
  return (
    <>
      <BulkToggle bulk={false} onChange={setBulk} />
      <FileDrop accept="application/pdf,.pdf" disabled={busy} onFiles={(f) => { setFile(f[0]); setError(null) }} label={file ? `📄 ${file.name} (click to change)` : undefined} />
      <Settings o={o} set={(p) => setO((c) => ({ ...c, ...p }))} />
      <ErrorBox message={error} />
      <div><button className="btn primary" disabled={!file || busy} onClick={run}>{busy ? 'Working…' : 'Add page numbers'}</button></div>
    </>
  )
}
