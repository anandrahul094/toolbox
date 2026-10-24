import { useEffect, useRef, useState, type PointerEvent as RPointerEvent } from 'react'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import { PDFDocument } from 'pdf-lib'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { baseName, downloadBlob, ErrorBox, Field, FileDrop, Row } from '../components/ui'
import { isEncryptedError, openPdf, PASSWORD_MESSAGE, parseRanges, pdfBlob, renderPage, visualFrame } from '../lib/pdf'

// The crop is kept as fractions of the displayed page, so it fits pages of different sizes.
interface Box { l: number; t: number; r: number; b: number }
const FULL: Box = { l: 0, t: 0, r: 1, b: 1 }
const clamp = (v: number) => Math.max(0, Math.min(1, v))

export default function PdfCrop() {
  const [file, setFile] = useState<File | null>(null)
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null)
  const [pageNo, setPageNo] = useState(1)
  const [ratio, setRatio] = useState(595 / 842)
  const [box, setBox] = useState<Box>({ l: 0.08, t: 0.08, r: 0.92, b: 0.92 })
  const [scope, setScope] = useState<'all' | 'this' | 'range'>('all')
  const [range, setRange] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const drag = useRef<{ start: [number, number]; edge: 'new' | 'move'; from: Box } | null>(null)

  useEffect(() => {
    if (!file) return
    let cancelled = false
    setDoc(null); setPageNo(1); setError(null)
    openPdf(file).then((d) => { if (!cancelled) setDoc(d) }).catch((e) => { if (!cancelled) setError(isEncryptedError(e) ? PASSWORD_MESSAGE : 'This file could not be opened as a PDF.') })
    return () => { cancelled = true }
  }, [file])

  useEffect(() => {
    if (!doc || !canvas.current) return
    let cancelled = false
    doc.getPage(pageNo).then((p) => { const v = p.getViewport({ scale: 1 }); if (!cancelled) setRatio(v.width / v.height) })
    renderPage(doc, pageNo, 1.4, canvas.current).catch(() => {})
    return () => { cancelled = true }
  }, [doc, pageNo])

  const at = (e: RPointerEvent): [number, number] => { const r = stage.current!.getBoundingClientRect(); return [clamp((e.clientX - r.left) / r.width), clamp((e.clientY - r.top) / r.height)] }
  const down = (e: RPointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    const [x, y] = at(e)
    const inside = x > box.l && x < box.r && y > box.t && y < box.b
    drag.current = { start: [x, y], edge: inside ? 'move' : 'new', from: box }
  }
  const move = (e: RPointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d) return
    const [x, y] = at(e)
    if (d.edge === 'new') setBox({ l: Math.min(d.start[0], x), r: Math.max(d.start[0], x), t: Math.min(d.start[1], y), b: Math.max(d.start[1], y) })
    else {
      const w = d.from.r - d.from.l, h = d.from.b - d.from.t
      const l = Math.max(0, Math.min(1 - w, d.from.l + x - d.start[0])), t = Math.max(0, Math.min(1 - h, d.from.t + y - d.start[1]))
      setBox({ l, t, r: l + w, b: t + h })
    }
  }
  const up = () => { drag.current = null; setBox((b) => (b.r - b.l < 0.02 || b.b - b.t < 0.02 ? FULL : b)) }

  const pct = (v: number) => Math.round(v * 1000) / 10
  const setMargin = (k: keyof Box, v: number) => setBox((b) => {
    const f = clamp(v / 100), n = { ...b }
    if (k === 'l') n.l = Math.min(f, b.r - 0.02); if (k === 't') n.t = Math.min(f, b.b - 0.02)
    if (k === 'r') n.r = Math.max(1 - f, b.l + 0.02); if (k === 'b') n.b = Math.max(1 - f, b.t + 0.02)
    return n
  })

  const run = async () => {
    if (!file || !doc) return
    setBusy(true); setError(null)
    try {
      const pdf = await PDFDocument.load(await file.arrayBuffer())
      const pages = pdf.getPages()
      let targets: number[]
      if (scope === 'this') targets = [pageNo]
      else if (scope === 'range') targets = parseRanges(range, pages.length).flatMap(([a, b]) => Array.from({ length: b - a + 1 }, (_, i) => a + i))
      else targets = pages.map((_, i) => i + 1)
      for (const n of targets) {
        const page = pages[n - 1]
        const f = visualFrame(page)
        // the box as seen (origin top-left) → two corners in PDF coordinates
        const a = f.toPage(box.l * f.width, (1 - box.b) * f.height), c = f.toPage(box.r * f.width, (1 - box.t) * f.height)
        const x = Math.min(a.x, c.x), y = Math.min(a.y, c.y), w = Math.abs(c.x - a.x), h = Math.abs(c.y - a.y)
        page.setCropBox(x, y, w, h)
        page.setMediaBox(x, y, w, h) // some viewers ignore the crop box
      }
      downloadBlob(`${baseName(file.name)}-cropped.pdf`, pdfBlob(await pdf.save()))
    } catch (e) {
      setError(isEncryptedError(e) ? PASSWORD_MESSAGE : (e as Error).message)
    } finally { setBusy(false) }
  }

  return (
    <>
      <FileDrop accept="application/pdf,.pdf" disabled={busy} onFiles={(f) => setFile(f[0])} label={file ? `📄 ${file.name} (click to change)` : 'Drop a PDF here, or click to choose'} hint="Cropped on your device — nothing is uploaded." />
      <ErrorBox message={error} />
      {doc && (
        <>
          <p className="muted" style={{ margin: 0, fontSize: 13 }}>Drag on the page to draw the area to keep; drag inside it to move it. Or type the margins to cut.</p>
          <Row>
            <button className="btn" disabled={pageNo <= 1} onClick={() => setPageNo(pageNo - 1)} aria-label="Previous page"><ChevronLeft size={16} /></button>
            <span className="muted">Page {pageNo} of {doc.numPages}</span>
            <button className="btn" disabled={pageNo >= doc.numPages} onClick={() => setPageNo(pageNo + 1)} aria-label="Next page"><ChevronRight size={16} /></button>
            <button className="btn" onClick={() => setBox(FULL)}>Reset</button>
          </Row>
          <div ref={stage} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
            style={{ position: 'relative', width: '100%', maxWidth: 560, aspectRatio: `${ratio}`, border: '1px solid var(--border)', background: '#fff', touchAction: 'none', cursor: 'crosshair', overflow: 'hidden' }}>
            <canvas ref={canvas} style={{ width: '100%', height: '100%', display: 'block' }} aria-label={`Page ${pageNo}`} />
            <div style={{ position: 'absolute', left: `${box.l * 100}%`, top: `${box.t * 100}%`, width: `${(box.r - box.l) * 100}%`, height: `${(box.b - box.t) * 100}%`,
              border: '2px solid var(--accent)', boxShadow: '0 0 0 9999px rgba(0,0,0,.45)', cursor: 'move', pointerEvents: 'none' }} />
          </div>
          <Row>
            <Field label="Cut left (%)"><input type="number" min={0} max={98} step={0.5} value={pct(box.l)} onChange={(e) => setMargin('l', +e.target.value)} /></Field>
            <Field label="Cut top (%)"><input type="number" min={0} max={98} step={0.5} value={pct(box.t)} onChange={(e) => setMargin('t', +e.target.value)} /></Field>
            <Field label="Cut right (%)"><input type="number" min={0} max={98} step={0.5} value={pct(1 - box.r)} onChange={(e) => setMargin('r', +e.target.value)} /></Field>
            <Field label="Cut bottom (%)"><input type="number" min={0} max={98} step={0.5} value={pct(1 - box.b)} onChange={(e) => setMargin('b', +e.target.value)} /></Field>
          </Row>
          <Row>
            <Field label="Apply to">
              <select value={scope} onChange={(e) => setScope(e.target.value as typeof scope)}>
                <option value="all">All pages</option><option value="this">This page only</option><option value="range">Some pages…</option>
              </select>
            </Field>
            {scope === 'range' && <Field label="Pages" hint="e.g. 1-3, 5"><input value={range} onChange={(e) => setRange(e.target.value)} placeholder="1-3, 5" /></Field>}
          </Row>
          <div><button className="btn primary" disabled={busy || (scope === 'range' && !range.trim())} onClick={run}>{busy ? 'Working…' : 'Crop and download'}</button></div>
        </>
      )}
    </>
  )
}
