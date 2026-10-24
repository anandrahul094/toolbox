import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, X } from 'lucide-react'
import { canvasToBlob, downloadBlob, ErrorBox, Field, FileDrop, loadImage, Row } from '../components/ui'

// A layout is a list of cells as fractions of the canvas: [x, y, w, h]
type Cell = [number, number, number, number]
const grid = (cols: number, rows: number): Cell[] => Array.from({ length: cols * rows }, (_, i) => [(i % cols) / cols, Math.floor(i / cols) / rows, 1 / cols, 1 / rows])
const LAYOUTS: { id: string; label: string; n: number; cells: Cell[] }[] = [
  { id: '2h', label: '2 side by side', n: 2, cells: grid(2, 1) },
  { id: '2v', label: '2 stacked', n: 2, cells: grid(1, 2) },
  { id: '3a', label: '1 big + 2', n: 3, cells: [[0, 0, 0.5, 1], [0.5, 0, 0.5, 0.5], [0.5, 0.5, 0.5, 0.5]] },
  { id: '3b', label: '1 wide + 2', n: 3, cells: [[0, 0, 1, 0.5], [0, 0.5, 0.5, 0.5], [0.5, 0.5, 0.5, 0.5]] },
  { id: '3h', label: '3 in a row', n: 3, cells: grid(3, 1) },
  { id: '4', label: '2 × 2 grid', n: 4, cells: grid(2, 2) },
  { id: '4b', label: '1 big + 3', n: 4, cells: [[0, 0, 1, 0.6], [0, 0.6, 1 / 3, 0.4], [1 / 3, 0.6, 1 / 3, 0.4], [2 / 3, 0.6, 1 / 3, 0.4]] },
  { id: '5', label: '2 + 3', n: 5, cells: [[0, 0, 0.5, 0.5], [0.5, 0, 0.5, 0.5], [0, 0.5, 1 / 3, 0.5], [1 / 3, 0.5, 1 / 3, 0.5], [2 / 3, 0.5, 1 / 3, 0.5]] },
  { id: '6', label: '3 × 2 grid', n: 6, cells: grid(3, 2) },
  { id: '9', label: '3 × 3 grid', n: 9, cells: grid(3, 3) },
]
const RATIOS = [['1:1', 1], ['4:5', 4 / 5], ['3:4', 3 / 4], ['16:9', 16 / 9], ['9:16', 9 / 16], ['4:3', 4 / 3]] as const

export default function CollageMaker() {
  const [imgs, setImgs] = useState<{ img: HTMLImageElement; name: string }[]>([])
  const [layoutId, setLayoutId] = useState('4')
  const [ratio, setRatio] = useState<number>(1)
  const [width, setWidth] = useState(2000)
  const [gap, setGap] = useState(12)
  const [radius, setRadius] = useState(0)
  const [bg, setBg] = useState('#ffffff')
  const [error, setError] = useState<string | null>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const layout = LAYOUTS.find((l) => l.id === layoutId)!

  const addFiles = async (files: File[]) => {
    setError(null)
    const loaded: { img: HTMLImageElement; name: string }[] = []
    for (const f of files) { try { loaded.push({ img: await loadImage(f), name: f.name }) } catch { setError(`Couldn’t open ${f.name}.`) } }
    setImgs((cur) => {
      const next = [...cur, ...loaded].slice(0, 9)
      // pick a layout that fits the number of photos
      if (!LAYOUTS.some((l) => l.id === layoutId && l.n === next.length)) { const fit = LAYOUTS.find((l) => l.n === next.length); if (fit) setLayoutId(fit.id) }
      return next
    })
  }

  useEffect(() => {
    const c = canvas.current
    if (!c) return
    const W = width, H = Math.round(width / ratio)
    c.width = W; c.height = H
    const ctx = c.getContext('2d')!
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H)
    const g = (gap / 1000) * W
    layout.cells.forEach(([fx, fy, fw, fh], i) => {
      // the same spacing between photos and around the edge
      const edge = (start: number, size: number) => [start < 0.001 ? g : g / 2, start + size > 0.999 ? g : g / 2]
      const [il, ir] = edge(fx, fw), [it0, ib] = edge(fy, fh)
      const x = fx * W + il, y = fy * H + it0, cw = fw * W - il - ir, ch = fh * H - it0 - ib
      ctx.save()
      ctx.beginPath()
      const r = Math.min(cw, ch) * (radius / 100)
      ctx.roundRect(x, y, cw, ch, r)
      ctx.clip()
      const it = imgs[i]
      if (it) {
        const iw = it.img.naturalWidth, ih = it.img.naturalHeight
        const s = Math.max(cw / iw, ch / ih)
        ctx.imageSmoothingQuality = 'high'
        ctx.drawImage(it.img, x + (cw - iw * s) / 2, y + (ch - ih * s) / 2, iw * s, ih * s)
      } else {
        ctx.fillStyle = 'rgba(128,128,128,.18)'; ctx.fillRect(x, y, cw, ch)
      }
      ctx.restore()
    })
  }, [imgs, layout, ratio, width, gap, radius, bg])

  const move = (i: number, d: number) => setImgs((cur) => { const n = [...cur]; const j = i + d; if (j < 0 || j >= n.length) return cur; [n[i], n[j]] = [n[j], n[i]]; return n })

  return (
    <>
      <FileDrop accept="image/*" multiple onFiles={addFiles} label={imgs.length ? `${imgs.length} photo(s) added — drop more (up to 9)` : 'Drop 2 to 9 photos here, or click to choose'} hint="Your photos stay on your device." />
      <ErrorBox message={error} />
      {imgs.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {imgs.map((it, i) => (
            <div key={i} style={{ position: 'relative', width: 84, border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden', background: 'var(--surface-2)' }}>
              <img src={it.img.src} alt={it.name} style={{ width: '100%', height: 64, objectFit: 'cover', display: 'block' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <button className="icon-only" aria-label={`Move ${it.name} earlier`} disabled={i === 0} onClick={() => move(i, -1)}><ArrowLeft size={14} /></button>
                <button className="icon-only" aria-label={`Remove ${it.name}`} onClick={() => setImgs(imgs.filter((_, j) => j !== i))}><X size={14} /></button>
                <button className="icon-only" aria-label={`Move ${it.name} later`} disabled={i === imgs.length - 1} onClick={() => move(i, 1)}><ArrowRight size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
      <Row>
        <Field label="Layout">
          <select value={layoutId} onChange={(e) => setLayoutId(e.target.value)}>
            {LAYOUTS.map((l) => <option key={l.id} value={l.id}>{l.label} ({l.n} photos)</option>)}
          </select>
        </Field>
        <Field label="Shape">
          <select value={ratio} onChange={(e) => setRatio(+e.target.value)}>
            {RATIOS.map(([l, v]) => <option key={l} value={v}>{l}</option>)}
          </select>
        </Field>
        <Field label="Width (px)">
          <select value={width} onChange={(e) => setWidth(+e.target.value)}>{[1080, 1600, 2000, 3000].map((w) => <option key={w} value={w}>{w}</option>)}</select>
        </Field>
      </Row>
      <Row>
        <Field label={`Spacing: ${gap}`}><input type="range" min={0} max={60} value={gap} onChange={(e) => setGap(+e.target.value)} /></Field>
        <Field label={`Rounded corners: ${radius}%`}><input type="range" min={0} max={30} value={radius} onChange={(e) => setRadius(+e.target.value)} /></Field>
        <Field label="Background"><input type="color" value={bg} onChange={(e) => setBg(e.target.value)} /></Field>
      </Row>
      {imgs.length > layout.n && <div className="muted" style={{ fontSize: 13 }}>This layout shows the first {layout.n} photos.</div>}
      <canvas ref={canvas} aria-label="Collage preview" style={{ maxWidth: '100%', maxHeight: 520, alignSelf: 'flex-start', border: '1px solid var(--border)', borderRadius: 6 }} />
      <Row>
        <button className="btn primary" disabled={!imgs.length} onClick={async () => downloadBlob('collage.jpg', await canvasToBlob(canvas.current!, 'image/jpeg', 0.92))}>Download JPG</button>
        <button className="btn" disabled={!imgs.length} onClick={async () => downloadBlob('collage.png', await canvasToBlob(canvas.current!, 'image/png'))}>Download PNG</button>
      </Row>
    </>
  )
}
