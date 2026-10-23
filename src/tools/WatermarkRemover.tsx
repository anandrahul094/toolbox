import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { Brush, Eraser, RectangleHorizontal, RotateCcw, Undo2 } from 'lucide-react'
import { baseName, canvasToBlob, downloadBlob, ErrorBox, Field, FileDrop, fmtBytes, loadImage, Row } from '../components/ui'

const MAX_PIXELS = 12_000_000

// Fill masked pixels from the outside in, averaging known neighbours, then smooth the filled area.
// Works well on plain, gradient or softly textured areas; detailed textures come out blurred.
function inpaint(img: ImageData, mask: Uint8Array) {
  const { width: w, height: h, data } = img
  const unknown = new Uint8Array(mask)
  const R = 2
  let remaining = unknown.reduce((n, v) => n + v, 0)
  const filled: number[] = []
  while (remaining > 0) {
    const layer: number[] = []
    for (let p = 0; p < w * h; p++) {
      if (!unknown[p]) continue
      const x = p % w, y = (p / w) | 0
      if ((x > 0 && !unknown[p - 1]) || (x < w - 1 && !unknown[p + 1]) || (y > 0 && !unknown[p - w]) || (y < h - 1 && !unknown[p + w])) layer.push(p)
    }
    if (!layer.length) break // masked region with no known pixels around it (whole image masked)
    const values: number[] = []
    for (const p of layer) {
      const x = p % w, y = (p / w) | 0
      let r = 0, g = 0, b = 0, wt = 0
      for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
        const nx = x + dx, ny = y + dy
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue
        const q = ny * w + nx
        if (unknown[q]) continue
        const k = 1 / (dx * dx + dy * dy || 1)
        r += data[q * 4] * k; g += data[q * 4 + 1] * k; b += data[q * 4 + 2] * k; wt += k
      }
      values.push(r / wt, g / wt, b / wt)
    }
    layer.forEach((p, i) => { data[p * 4] = values[i * 3]; data[p * 4 + 1] = values[i * 3 + 1]; data[p * 4 + 2] = values[i * 3 + 2]; data[p * 4 + 3] = 255; unknown[p] = 0 })
    filled.push(...layer)
    remaining -= layer.length
  }
  for (let it = 0; it < 12; it++) {
    for (const p of filled) {
      const x = p % w, y = (p / w) | 0
      for (let c = 0; c < 3; c++) {
        let s = 0, n = 0
        if (x > 0) { s += data[(p - 1) * 4 + c]; n++ }
        if (x < w - 1) { s += data[(p + 1) * 4 + c]; n++ }
        if (y > 0) { s += data[(p - w) * 4 + c]; n++ }
        if (y < h - 1) { s += data[(p + w) * 4 + c]; n++ }
        data[p * 4 + c] = s / n
      }
    }
  }
}

export default function WatermarkRemover() {
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [size, setSize] = useState<{ w: number; h: number } | null>(null)
  const [mode, setMode] = useState<'brush' | 'rect'>('brush')
  const [brush, setBrush] = useState(24)
  const [history, setHistory] = useState<ImageData[]>([])
  const [hasMask, setHasMask] = useState(false)
  const [busy, setBusy] = useState(false)
  const imgCanvas = useRef<HTMLCanvasElement>(null)
  const maskCanvas = useRef<HTMLCanvasElement>(null)
  const drawing = useRef<{ x: number; y: number; snapshot?: ImageData } | null>(null)
  const original = useRef<ImageData | null>(null)
  const loaded = useRef<HTMLImageElement | null>(null)

  useEffect(() => {
    if (!file) return
    let cancelled = false
    setError(null); setSize(null); setHistory([]); setHasMask(false)
    loadImage(file).then((img) => {
      if (cancelled) return
      let w = img.naturalWidth || 1024, h = img.naturalHeight || 1024
      if (w * h > MAX_PIXELS) { const s = Math.sqrt(MAX_PIXELS / (w * h)); w = Math.round(w * s); h = Math.round(h * s) }
      loaded.current = img
      setSize({ w, h })
      setBrush(Math.max(6, Math.round(Math.max(w, h) / 40)))
    }).catch(() => { if (!cancelled) setError('This file could not be opened as an image.') })
    return () => { cancelled = true }
  }, [file])

  // draw once the canvases exist (after the render that shows them)
  useEffect(() => {
    const c = imgCanvas.current, m = maskCanvas.current, img = loaded.current
    if (!size || !c || !m || !img) return
    c.width = m.width = size.w; c.height = m.height = size.h
    const ctx = c.getContext('2d', { willReadFrequently: true })!
    ctx.drawImage(img, 0, 0, size.w, size.h)
    original.current = ctx.getImageData(0, 0, size.w, size.h)
  }, [size])

  const pos = (e: PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    return { x: ((e.clientX - r.left) / r.width) * e.currentTarget.width, y: ((e.clientY - r.top) / r.height) * e.currentTarget.height }
  }
  const mctx = () => maskCanvas.current!.getContext('2d', { willReadFrequently: true })!

  const onDown = (e: PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    const p = pos(e), ctx = mctx()
    drawing.current = { ...p, snapshot: mode === 'rect' ? ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height) : undefined }
    if (mode === 'brush') { ctx.fillStyle = 'rgba(220,38,38,.55)'; ctx.beginPath(); ctx.arc(p.x, p.y, brush / 2, 0, Math.PI * 2); ctx.fill(); setHasMask(true) }
  }
  const onMove = (e: PointerEvent<HTMLCanvasElement>) => {
    const d = drawing.current
    if (!d) return
    const p = pos(e), ctx = mctx()
    if (mode === 'brush') {
      ctx.strokeStyle = 'rgba(220,38,38,.55)'; ctx.lineWidth = brush; ctx.lineCap = 'round'
      ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(p.x, p.y); ctx.stroke()
      d.x = p.x; d.y = p.y
    } else {
      ctx.putImageData(d.snapshot!, 0, 0)
      ctx.fillStyle = 'rgba(220,38,38,.55)'
      ctx.fillRect(Math.min(d.x, p.x), Math.min(d.y, p.y), Math.abs(p.x - d.x), Math.abs(p.y - d.y))
    }
    setHasMask(true)
  }
  const onUp = () => { drawing.current = null }
  const clearMask = () => { const ctx = mctx(); ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height); setHasMask(false) }

  const erase = () => {
    const c = imgCanvas.current!, ctx = c.getContext('2d', { willReadFrequently: true })!
    const m = mctx().getImageData(0, 0, c.width, c.height).data
    const mask = new Uint8Array(c.width * c.height)
    let count = 0
    for (let p = 0; p < mask.length; p++) if (m[p * 4 + 3] > 0) { mask[p] = 1; count++ }
    if (!count) return
    if (count === mask.length) { setError('The whole image is selected — paint only over the watermark or object.'); return }
    setBusy(true); setError(null)
    // let the "Working…" state paint before the heavy loop
    setTimeout(() => {
      const before = ctx.getImageData(0, 0, c.width, c.height)
      const work = new ImageData(new Uint8ClampedArray(before.data), c.width, c.height)
      inpaint(work, mask)
      ctx.putImageData(work, 0, 0)
      setHistory((hst) => [...hst.slice(-9), before])
      clearMask(); setBusy(false)
    }, 30)
  }

  const undo = () => {
    const last = history[history.length - 1]
    if (!last) return
    imgCanvas.current!.getContext('2d')!.putImageData(last, 0, 0)
    setHistory(history.slice(0, -1))
  }

  const save = async () => {
    const type = file!.type === 'image/png' ? 'image/png' : 'image/jpeg'
    downloadBlob(`${baseName(file!.name)}-cleaned.${type === 'image/png' ? 'png' : 'jpg'}`, await canvasToBlob(imgCanvas.current!, type, 0.95))
  }

  const small = size && Math.max(size.w, size.h) < 360
  const displayW = size ? (small ? 360 * (size.w / Math.max(size.w, size.h)) : undefined) : undefined

  return (
    <>
      <div className="notice"><span>Only remove watermarks, logos or stamps from images you own or have permission to edit. This tool is meant for your own photos — date stamps, blemishes, stray objects, or your own watermark.</span></div>
      <FileDrop accept="image/*" onFiles={(f) => setFile(f[0])} label={file && size ? `${file.name} — ${size.w}×${size.h}px, ${fmtBytes(file.size)} · drop or click to replace` : 'Drop an image here, or click to choose'} />
      <ErrorBox message={error} />
      {size && (
        <>
          <Row>
            <div className="seg" role="group" aria-label="Selection tool">
              <button aria-pressed={mode === 'brush'} onClick={() => setMode('brush')}><Brush size={15} aria-hidden="true" />Brush</button>
              <button aria-pressed={mode === 'rect'} onClick={() => setMode('rect')}><RectangleHorizontal size={15} aria-hidden="true" />Box</button>
            </div>
            {mode === 'brush' && <Field label={`Brush size: ${brush}px`}><input type="range" min={2} max={Math.max(40, Math.round(Math.max(size.w, size.h) / 6))} value={brush} onChange={(e) => setBrush(+e.target.value)} /></Field>}
          </Row>
          <p className="muted" style={{ margin: 0, fontSize: 13 }}>{mode === 'brush' ? 'Paint over the watermark or object, slightly beyond its edges.' : 'Drag boxes around the watermark text. You can draw several.'} Then press <b>Remove</b>. Repeat for stubborn spots.</p>
          <div style={{ display: 'grid', placeItems: 'center', background: 'var(--surface-2)', borderRadius: 8, padding: 12 }}>
            <div style={{ position: 'relative', lineHeight: 0, maxWidth: '100%', width: displayW }}>
              <canvas ref={imgCanvas} style={{ display: 'block', maxWidth: '100%', maxHeight: 480, width: displayW ? '100%' : undefined, imageRendering: small ? 'pixelated' : 'auto' }} />
              <canvas ref={maskCanvas} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} aria-label="Paint over the area to remove"
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', cursor: 'crosshair', touchAction: 'none' }} />
            </div>
          </div>
          <Row>
            <button className="btn primary" disabled={!hasMask || busy} onClick={erase}><Eraser size={15} aria-hidden="true" />{busy ? 'Working…' : 'Remove'}</button>
            <button className="btn" disabled={!hasMask || busy} onClick={clearMask}>Clear selection</button>
            <button className="btn" disabled={!history.length || busy} onClick={undo}><Undo2 size={15} aria-hidden="true" />Undo</button>
            <button className="btn" disabled={!history.length || busy} onClick={() => { imgCanvas.current!.getContext('2d')!.putImageData(original.current!, 0, 0); setHistory([]); clearMask() }}><RotateCcw size={15} aria-hidden="true" />Start over</button>
            <button className="btn" disabled={busy} onClick={save}>Download</button>
          </Row>
          <p className="muted" style={{ margin: 0, fontSize: 13 }}>Best on plain, sky, wall or gradient areas. On detailed textures the filled area can look smudged.</p>
        </>
      )}
    </>
  )
}
