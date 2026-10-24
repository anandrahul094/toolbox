import { useEffect, useRef, useState, type PointerEvent as RPointerEvent } from 'react'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import { degrees, PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { ChevronLeft, ChevronRight, Eraser, Trash2 } from 'lucide-react'
import { baseName, downloadBlob, ErrorBox, Field, FileDrop, loadImage, Row } from '../components/ui'
import { isEncryptedError, openPdf, PASSWORD_MESSAGE, pdfBlob, renderPage, visualFrame } from '../lib/pdf'

// Positions are in PDF points of the page as displayed, origin top-left.
interface Item { id: number; page: number; kind: 'image' | 'text'; x: number; y: number; w: number; h: number; src?: string; text?: string; size?: number; color: string }

const INK = [['#111827', 'Black'], ['#1d3a8a', 'Blue'], ['#7f1d1d', 'Red']]
const hexToRgb = (h: string) => { const n = parseInt(h.slice(1), 16); return rgb((n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255) }
const today = () => new Date().toLocaleDateString('en-GB')
let nextId = 1
// width of Helvetica text in points (Arial has the same metrics)
const measure = (text: string, size: number) => { const c = document.createElement('canvas').getContext('2d')!; c.font = `${size}px Helvetica, Arial, sans-serif`; return c.measureText(text).width }

// crop a drawn or uploaded signature to its ink so it can be placed neatly
function trimToInk(src: HTMLCanvasElement) {
  const ctx = src.getContext('2d', { willReadFrequently: true })!
  const d = ctx.getImageData(0, 0, src.width, src.height).data
  let x0 = src.width, y0 = src.height, x1 = -1, y1 = -1
  for (let y = 0; y < src.height; y++) for (let x = 0; x < src.width; x++) if (d[(y * src.width + x) * 4 + 3] > 10) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y }
  if (x1 < 0) return null
  const w = x1 - x0 + 1, h = y1 - y0 + 1
  const out = document.createElement('canvas'); out.width = w; out.height = h
  out.getContext('2d')!.drawImage(src, x0, y0, w, h, 0, 0, w, h)
  return out
}

// photos of a signature on paper: make the paper transparent and keep the ink
async function signatureFromPhoto(file: File, color: string) {
  const img = await loadImage(file)
  const k = Math.min(1, 1200 / Math.max(img.naturalWidth, img.naturalHeight))
  const c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k)
  const ctx = c.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(img, 0, 0, c.width, c.height)
  const data = ctx.getImageData(0, 0, c.width, c.height), p = data.data
  const n = parseInt(color.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255
  for (let i = 0; i < p.length; i += 4) {
    const lum = 0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2]
    const a = p[i + 3] === 0 ? 0 : Math.max(0, Math.min(255, (200 - lum) * 2.2))
    p[i] = r; p[i + 1] = g; p[i + 2] = b; p[i + 3] = a
  }
  ctx.putImageData(data, 0, 0)
  return trimToInk(c)
}

function SignaturePad({ color, onDone }: { color: string; onDone: (c: HTMLCanvasElement) => void }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const [dirty, setDirty] = useState(false)
  const pos = (e: RPointerEvent<HTMLCanvasElement>) => { const r = e.currentTarget.getBoundingClientRect(); return [((e.clientX - r.left) / r.width) * 600, ((e.clientY - r.top) / r.height) * 200] }
  const down = (e: RPointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    const ctx = ref.current!.getContext('2d')!
    ctx.strokeStyle = color; ctx.lineWidth = 3.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
    const [x, y] = pos(e); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 0.1, y); ctx.stroke()
    drawing.current = true; setDirty(true)
  }
  const move = (e: RPointerEvent<HTMLCanvasElement>) => { if (!drawing.current) return; const ctx = ref.current!.getContext('2d')!; const [x, y] = pos(e); ctx.lineTo(x, y); ctx.stroke() }
  const clear = () => { ref.current!.getContext('2d')!.clearRect(0, 0, 600, 200); setDirty(false) }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <canvas ref={ref} width={600} height={200} onPointerDown={down} onPointerMove={move} onPointerUp={() => { drawing.current = false }} onPointerCancel={() => { drawing.current = false }}
        aria-label="Signature pad — draw your signature here"
        style={{ width: '100%', maxWidth: 480, aspectRatio: '3 / 1', background: '#fff', border: '1px dashed var(--input-border)', borderRadius: 8, touchAction: 'none', cursor: 'crosshair' }} />
      <Row>
        <button className="btn" disabled={!dirty} onClick={clear}><Eraser size={15} aria-hidden="true" />Clear</button>
        <button className="btn primary" disabled={!dirty} onClick={() => { const t = trimToInk(ref.current!); if (t) { onDone(t); clear() } }}>Use this signature</button>
      </Row>
    </div>
  )
}

export default function PdfSign() {
  const [file, setFile] = useState<File | null>(null)
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null)
  const [pageNo, setPageNo] = useState(1)
  const [view, setView] = useState({ w: 595, h: 842 })
  const [items, setItems] = useState<Item[]>([])
  const [selected, setSelected] = useState<number | null>(null)
  const [mode, setMode] = useState<'draw' | 'upload' | 'text'>('draw')
  const [color, setColor] = useState(INK[0][0])
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const drag = useRef<{ id: number; dx: number; dy: number } | null>(null)

  useEffect(() => {
    if (!file) return
    let cancelled = false
    setDoc(null); setItems([]); setPageNo(1); setError(null)
    openPdf(file).then((d) => { if (!cancelled) setDoc(d) }).catch((e) => { if (!cancelled) setError(isEncryptedError(e) ? PASSWORD_MESSAGE : 'This file could not be opened as a PDF.') })
    return () => { cancelled = true }
  }, [file])

  useEffect(() => {
    if (!doc || !canvas.current) return
    let cancelled = false
    doc.getPage(pageNo).then((p) => { const v = p.getViewport({ scale: 1 }); if (!cancelled) setView({ w: v.width, h: v.height }) })
    renderPage(doc, pageNo, 1.6, canvas.current).catch(() => {})
    return () => { cancelled = true }
  }, [doc, pageNo])

  const add = (it: Omit<Item, 'id' | 'page' | 'x' | 'y'>) => {
    const id = nextId++
    setItems((list) => [...list, { ...it, id, page: pageNo, x: (view.w - it.w) / 2, y: view.h * 0.7 }])
    setSelected(id)
  }
  const addImage = (c: HTMLCanvasElement) => {
    const w = Math.min(180, view.w * 0.4), h = (w * c.height) / c.width
    add({ kind: 'image', src: c.toDataURL('image/png'), w, h, color })
  }
  const addText = (value: string) => {
    if (!value.trim()) return
    const size = 14
    add({ kind: 'text', text: value, size, w: measure(value, size), h: size * 1.2, color })
  }
  const update = (id: number, patch: Partial<Item>) => setItems((list) => list.map((i) => (i.id === id ? { ...i, ...patch } : i)))
  const sel = items.find((i) => i.id === selected) ?? null

  // dragging: convert screen pixels to page points
  const scale = () => (stage.current ? stage.current.getBoundingClientRect().width / view.w : 1)
  const startDrag = (e: RPointerEvent<HTMLDivElement>, it: Item) => {
    e.stopPropagation(); e.currentTarget.setPointerCapture(e.pointerId)
    const r = stage.current!.getBoundingClientRect(), s = scale()
    drag.current = { id: it.id, dx: (e.clientX - r.left) / s - it.x, dy: (e.clientY - r.top) / s - it.y }
    setSelected(it.id)
  }
  const onDrag = (e: RPointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d) return
    const r = stage.current!.getBoundingClientRect(), s = scale()
    const it = items.find((i) => i.id === d.id)!
    update(d.id, { x: Math.max(0, Math.min(view.w - it.w, (e.clientX - r.left) / s - d.dx)), y: Math.max(0, Math.min(view.h - it.h, (e.clientY - r.top) / s - d.dy)) })
  }

  const resize = (it: Item, w: number) => {
    if (it.kind === 'image') update(it.id, { w, h: (w * it.h) / it.w })
    else { const size = (w / it.w) * it.size!; update(it.id, { w, h: size * 1.2, size }) }
  }

  const save = async () => {
    if (!file || !items.length) return
    setBusy(true); setError(null)
    try {
      const pdf = await PDFDocument.load(await file.arrayBuffer())
      const font = await pdf.embedFont(StandardFonts.Helvetica)
      const pages = pdf.getPages()
      for (const it of items) {
        const page = pages[it.page - 1]
        const f = visualFrame(page)
        const rotate = degrees(f.rotation)
        if (it.kind === 'image') {
          const png = await pdf.embedPng(it.src!)
          page.drawImage(png, { ...f.toPage(it.x, f.height - it.y - it.h), width: it.w, height: it.h, rotate })
        } else {
          const size = it.size!
          page.drawText(it.text!, { ...f.toPage(it.x, f.height - it.y - size * 0.9), size, font, color: hexToRgb(it.color), rotate })
        }
      }
      downloadBlob(`${baseName(file.name)}-signed.pdf`, pdfBlob(await pdf.save()))
    } catch (e) {
      const msg = String(e)
      setError(isEncryptedError(msg) ? PASSWORD_MESSAGE : /WinAnsi|cannot encode/i.test(msg) ? 'Typed text supports Latin letters, numbers and common symbols only. For other scripts, draw it instead.' : (e as Error).message)
    } finally { setBusy(false) }
  }

  const onPage = items.filter((i) => i.page === pageNo)
  const s = 100 / view.w, sy = 100 / view.h

  return (
    <>
      <FileDrop accept="application/pdf,.pdf" disabled={busy} onFiles={(f) => setFile(f[0])} label={file ? `📄 ${file.name} (click to change)` : 'Drop a PDF here, or click to choose'} hint="The PDF is signed on your device — it is never uploaded." />
      <ErrorBox message={error} />
      {doc && (
        <>
          <div className="seg" role="group" aria-label="What to add" style={{ alignSelf: 'flex-start' }}>
            <button aria-pressed={mode === 'draw'} onClick={() => setMode('draw')}>Draw signature</button>
            <button aria-pressed={mode === 'upload'} onClick={() => setMode('upload')}>Upload signature</button>
            <button aria-pressed={mode === 'text'} onClick={() => setMode('text')}>Text or date</button>
          </div>
          <div className="filter-chips" role="group" aria-label="Ink colour">
            {INK.map(([c, l]) => <button key={c} className={`chip ${color === c ? 'active' : ''}`} aria-pressed={color === c} onClick={() => setColor(c)}><span style={{ width: 12, height: 12, borderRadius: 6, background: c, display: 'inline-block' }} />{l}</button>)}
          </div>
          {mode === 'draw' && <SignaturePad color={color} onDone={addImage} />}
          {mode === 'upload' && (
            <FileDrop accept="image/*" onFiles={async (f) => { try { const c = await signatureFromPhoto(f[0], color); if (c) addImage(c); else setError('No ink was found in that image.') } catch { setError('That image could not be opened.') } }}
              label="Drop a photo or scan of your signature" hint="Sign on white paper and take a clear photo. The paper is made transparent." />
          )}
          {mode === 'text' && (
            <Row>
              <Field label="Text" hint="Name, date, initials or a form answer"><input value={text} maxLength={120} onChange={(e) => setText(e.target.value)} placeholder="e.g. Rahul Sharma" onKeyDown={(e) => { if (e.key === 'Enter') { addText(text); setText('') } }} /></Field>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                <button className="btn primary" disabled={!text.trim()} onClick={() => { addText(text); setText('') }}>Add text</button>
                <button className="btn" onClick={() => addText(today())}>Add today’s date</button>
                <button className="btn" onClick={() => addText('X')}>Add X mark</button>
              </div>
            </Row>
          )}

          <Row>
            <button className="btn" disabled={pageNo <= 1} onClick={() => setPageNo(pageNo - 1)} aria-label="Previous page"><ChevronLeft size={16} /></button>
            <span className="muted">Page {pageNo} of {doc.numPages}</span>
            <button className="btn" disabled={pageNo >= doc.numPages} onClick={() => setPageNo(pageNo + 1)} aria-label="Next page"><ChevronRight size={16} /></button>
          </Row>
          <p className="muted" style={{ margin: 0, fontSize: 13 }}>Drag items to place them. Select one to resize or delete it.</p>

          <div ref={stage} style={{ position: 'relative', width: '100%', maxWidth: 760, aspectRatio: `${view.w} / ${view.h}`, border: '1px solid var(--border)', background: '#fff', touchAction: 'none', userSelect: 'none' }}
            onPointerDown={() => setSelected(null)}>
            <canvas ref={canvas} style={{ width: '100%', height: '100%', display: 'block' }} aria-label={`Page ${pageNo}`} />
            {onPage.map((it) => (
              <div key={it.id} role="button" tabIndex={0} aria-label={it.kind === 'image' ? 'Signature' : `Text: ${it.text}`}
                onPointerDown={(e) => startDrag(e, it)} onPointerMove={onDrag} onPointerUp={() => { drag.current = null }}
                onKeyDown={(e) => { if (e.key === 'Delete' || e.key === 'Backspace') { setItems(items.filter((i) => i.id !== it.id)); setSelected(null) } }}
                style={{ position: 'absolute', left: `${it.x * s}%`, top: `${it.y * sy}%`, width: `${it.w * s}%`, height: `${it.h * sy}%`, cursor: 'move',
                  outline: selected === it.id ? '2px dashed var(--accent)' : '1px dashed rgba(0,0,0,.15)', containerType: 'size' }}>
                {it.kind === 'image'
                  ? <img src={it.src} alt="" draggable={false} style={{ width: '100%', height: '100%', display: 'block', pointerEvents: 'none' }} />
                  : <span style={{ display: 'block', color: it.color, fontFamily: 'Helvetica, Arial, sans-serif', fontSize: `${100 / 1.2}cqh`, lineHeight: 1.2, whiteSpace: 'nowrap', pointerEvents: 'none' }}>{it.text}</span>}
              </div>
            ))}
          </div>

          {sel && (
            <Row>
              <Field label="Size"><input type="range" min={sel.kind === 'image' ? 30 : sel.w * (6 / sel.size!)} max={sel.kind === 'image' ? view.w * 0.9 : sel.w * (48 / sel.size!)} step={1} value={sel.w} onChange={(e) => resize(sel, +e.target.value)} /></Field>
              <button className="btn" onClick={() => { setItems(items.filter((i) => i.id !== sel.id)); setSelected(null) }}><Trash2 size={15} aria-hidden="true" />Delete</button>
            </Row>
          )}

          <Row>
            <button className="btn primary" disabled={!items.length || busy} onClick={save}>{busy ? 'Working…' : 'Download signed PDF'}</button>
            {items.length > 0 && <span className="muted">{items.length} item{items.length === 1 ? '' : 's'} on {new Set(items.map((i) => i.page)).size} page(s)</span>}
          </Row>
        </>
      )}
    </>
  )
}

