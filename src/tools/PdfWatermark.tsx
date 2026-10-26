import { useState } from 'react'
import { degrees, PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { baseName, downloadBlob, ErrorBox, Field, FileDrop, Row } from '../components/ui'
import BatchRunner, { BulkToggle, type BatchProcess } from '../components/Batch'
import { isEncryptedError, PASSWORD_MESSAGE, pdfBlob, visualFrame } from '../lib/pdf'

const hexToRgb = (h: string) => { const n = parseInt(h.slice(1), 16); return rgb((n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255) }

interface Mark { text: string; size: number; angle: number; opacity: number; color: string; tile: boolean }

async function watermarkPdf(file: File, { text, size, angle, opacity, color, tile }: Mark) {
  const pdf = await PDFDocument.load(await file.arrayBuffer())
  const font = await pdf.embedFont(StandardFonts.HelveticaBold)
  const tw = font.widthOfTextAtSize(text, size)
  const th = font.heightAtSize(size)
  const rad = (angle * Math.PI) / 180
  for (const page of pdf.getPages()) {
    // work in the page as displayed so rotated pages get the same look
    const f = visualFrame(page)
    const opts = { size, font, color: hexToRgb(color), opacity: opacity / 100, rotate: degrees(angle + f.rotation) }
    // drawText rotates around its origin, so offset the origin to keep the text centred on (cx, cy)
    const at = (cx: number, cy: number) => f.toPage(cx - (tw / 2) * Math.cos(rad) + (th / 2) * Math.sin(rad), cy - (tw / 2) * Math.sin(rad) - (th / 2) * Math.cos(rad))
    if (!tile) page.drawText(text, { ...opts, ...at(f.width / 2, f.height / 2) })
    else {
      const step = Math.max(tw, th) * 0.9 + 40
      for (let y = 0; y < f.height + step; y += step) for (let x = 0; x < f.width + step; x += step) page.drawText(text, { ...opts, ...at(x, y) })
    }
  }
  return pdfBlob(await pdf.save())
}

const watermarkError = (e: unknown) => {
  const msg = String(e)
  return isEncryptedError(msg) ? PASSWORD_MESSAGE : /WinAnsi|cannot encode/i.test(msg) ? 'The built-in PDF font supports Latin characters only. Remove other characters (e.g. emoji, Hindi) from the watermark.' : (e as Error).message
}

function MarkSettings({ m, set }: { m: Mark; set: (patch: Partial<Mark>) => void }) {
  return (
    <>
      <Row>
        <Field label="Watermark text" hint="Latin letters, numbers and common symbols"><input value={m.text} maxLength={60} onChange={(e) => set({ text: e.target.value })} /></Field>
        <Field label="Color"><input type="color" value={m.color} onChange={(e) => set({ color: e.target.value })} /></Field>
      </Row>
      <Row>
        <Field label={`Size: ${m.size}pt`}><input type="range" min={12} max={150} value={m.size} onChange={(e) => set({ size: +e.target.value })} /></Field>
        <Field label={`Angle: ${m.angle}°`}><input type="range" min={-90} max={90} value={m.angle} onChange={(e) => set({ angle: +e.target.value })} /></Field>
        <Field label={`Opacity: ${m.opacity}%`}><input type="range" min={5} max={100} value={m.opacity} onChange={(e) => set({ opacity: +e.target.value })} /></Field>
      </Row>
      <label className="check"><input type="checkbox" checked={m.tile} onChange={(e) => set({ tile: e.target.checked })} /> Repeat across the whole page</label>
      <div className="swatch" style={{ height: 140, display: 'grid', placeItems: 'center', overflow: 'hidden', background: '#fff' }}>
        <span style={{ color: m.color, opacity: m.opacity / 100, fontWeight: 700, fontSize: m.size / 2, transform: `rotate(${-m.angle}deg)`, fontFamily: 'Helvetica, Arial, sans-serif', whiteSpace: 'nowrap' }}>{m.text}</span>
      </div>
    </>
  )
}

const DEFAULT_MARK: Mark = { text: 'CONFIDENTIAL', size: 60, angle: 45, opacity: 20, color: '#dc2626', tile: false }

function BulkWatermark({ onSingle }: { onSingle: () => void }) {
  const [m, setM] = useState<Mark>(DEFAULT_MARK)
  const process: BatchProcess = async (file) => {
    try {
      return { name: `${baseName(file.name)}-watermarked.pdf`, blob: await watermarkPdf(file, m) }
    } catch (e) { throw new Error(watermarkError(e)) }
  }
  return (
    <>
      <BulkToggle bulk onChange={(b) => { if (!b) onSingle() }} />
      <MarkSettings m={m} set={(p) => setM((c) => ({ ...c, ...p }))} />
      <BatchRunner accept="application/pdf,.pdf" process={process} settingsKey={JSON.stringify(m)} runLabel="Watermark all" zipName="watermarked-pdfs" blocked={m.text ? null : 'Enter the watermark text.'} />
    </>
  )
}

export default function PdfWatermark() {
  const [bulk, setBulk] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [m, setM] = useState<Mark>(DEFAULT_MARK)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = async () => {
    if (!file) return
    setBusy(true); setError(null)
    try {
      downloadBlob(`${baseName(file.name)}-watermarked.pdf`, await watermarkPdf(file, m))
    } catch (e) {
      setError(watermarkError(e))
    } finally { setBusy(false) }
  }

  if (bulk) return <BulkWatermark onSingle={() => setBulk(false)} />
  return (
    <>
      <BulkToggle bulk={false} onChange={setBulk} />
      <FileDrop accept="application/pdf,.pdf" disabled={busy} onFiles={(f) => { setFile(f[0]); setError(null) }} label={file ? `📄 ${file.name} (click to change)` : undefined} />
      <MarkSettings m={m} set={(p) => setM((c) => ({ ...c, ...p }))} />
      <ErrorBox message={error} />
      <div><button className="btn primary" disabled={!file || !m.text || busy} onClick={run}>{busy ? 'Working…' : 'Add watermark'}</button></div>
    </>
  )
}
