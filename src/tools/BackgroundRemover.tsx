import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import { Pipette, RotateCcw } from 'lucide-react'
import { baseName, canvasToBlob, downloadBlob, ErrorBox, Field, FileDrop, fmtBytes, loadImage, Row } from '../components/ui'

type RGB = [number, number, number]
const MAX_PIXELS = 16_000_000
const hex = (c: RGB) => '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('')
const fromHex = (h: string): RGB => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255] }

// most common colour along the image border, bucketed so slight noise doesn't split it
function borderColour(d: Uint8ClampedArray, w: number, h: number): RGB {
  const counts = new Map<number, { n: number; sum: [number, number, number] }>()
  const add = (i: number) => {
    if (d[i + 3] < 128) return
    const key = ((d[i] >> 4) << 8) | ((d[i + 1] >> 4) << 4) | (d[i + 2] >> 4)
    const e = counts.get(key) ?? { n: 0, sum: [0, 0, 0] }
    e.n++; e.sum[0] += d[i]; e.sum[1] += d[i + 1]; e.sum[2] += d[i + 2]
    counts.set(key, e)
  }
  for (let x = 0; x < w; x++) { add(x * 4); add(((h - 1) * w + x) * 4) }
  for (let y = 0; y < h; y++) { add(y * w * 4); add((y * w + w - 1) * 4) }
  let best = { n: 0, sum: [255, 255, 255] as [number, number, number] }
  counts.forEach((e) => { if (e.n > best.n) best = e })
  return best.n ? (best.sum.map((s) => Math.round(s / best.n)) as RGB) : [255, 255, 255]
}

function removeBackground(src: ImageData, bg: RGB, tolerance: number, feather: number, connected: boolean, seeds: number[]): ImageData {
  const { width: w, height: h, data } = src
  const out = new ImageData(new Uint8ClampedArray(data), w, h)
  const o = out.data
  const tol = (tolerance / 100) * 441.7 // 441.7 = max RGB distance
  const soft = Math.max(1, (feather / 100) * 441.7)
  const dist = (p: number) => { const i = p * 4; return Math.hypot(data[i] - bg[0], data[i + 1] - bg[1], data[i + 2] - bg[2]) }
  const removed = new Uint8Array(w * h)

  if (!connected) {
    for (let p = 0; p < w * h; p++) if (dist(p) <= tol) removed[p] = 1
  } else {
    // flood fill from every border pixel (and clicked points) through background-coloured pixels
    const queue = new Int32Array(w * h)
    let head = 0, tail = 0
    const push = (p: number) => { if (!removed[p] && dist(p) <= tol) { removed[p] = 1; queue[tail++] = p } }
    for (let x = 0; x < w; x++) { push(x); push((h - 1) * w + x) }
    for (let y = 0; y < h; y++) { push(y * w); push(y * w + w - 1) }
    seeds.forEach(push)
    while (head < tail) {
      const p = queue[head++], x = p % w
      if (x > 0) push(p - 1)
      if (x < w - 1) push(p + 1)
      if (p >= w) push(p - w)
      if (p < w * (h - 1)) push(p + w)
    }
  }
  for (let p = 0; p < w * h; p++) {
    if (removed[p]) { o[p * 4 + 3] = 0; continue }
    if (!feather) continue
    // soften pixels on the edge of the removed area
    const x = p % w
    const edge = (x > 0 && removed[p - 1]) || (x < w - 1 && removed[p + 1]) || (p >= w && removed[p - w]) || (p < w * (h - 1) && removed[p + w])
    if (edge) o[p * 4 + 3] = Math.round(o[p * 4 + 3] * Math.min(1, (dist(p) - tol) / soft))
  }
  return out
}

export default function BackgroundRemover() {
  const [file, setFile] = useState<File | null>(null)
  const [src, setSrc] = useState<ImageData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [bg, setBg] = useState<RGB>([255, 255, 255])
  const [tolerance, setTolerance] = useState(12)
  const [feather, setFeather] = useState(8)
  const [connected, setConnected] = useState(true)
  const [seeds, setSeeds] = useState<number[]>([])
  const [picking, setPicking] = useState(false)
  const [fill, setFill] = useState<'transparent' | 'colour'>('transparent')
  const [fillColour, setFillColour] = useState('#ffffff')
  const [busy, setBusy] = useState(false)
  const view = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!file) return
    let cancelled = false
    setError(null); setSrc(null); setSeeds([])
    loadImage(file).then((img) => {
      if (cancelled) return
      let w = img.naturalWidth || 1024, h = img.naturalHeight || 1024
      if (w * h > MAX_PIXELS) { const s = Math.sqrt(MAX_PIXELS / (w * h)); w = Math.round(w * s); h = Math.round(h * s) }
      const c = document.createElement('canvas'); c.width = w; c.height = h
      const ctx = c.getContext('2d', { willReadFrequently: true })!
      ctx.drawImage(img, 0, 0, w, h)
      const data = ctx.getImageData(0, 0, w, h)
      setSrc(data); setBg(borderColour(data.data, w, h))
    }).catch(() => { if (!cancelled) setError('This file could not be opened as an image.') })
    return () => { cancelled = true }
  }, [file])

  const result = useMemo(() => (src ? removeBackground(src, bg, tolerance, feather, connected, seeds) : null), [src, bg, tolerance, feather, connected, seeds])
  const removedPct = useMemo(() => {
    if (!result) return 0
    let n = 0
    for (let i = 3; i < result.data.length; i += 4) if (result.data[i] === 0) n++
    return Math.round((n / (result.data.length / 4)) * 100)
  }, [result])

  useEffect(() => {
    const c = view.current
    if (!c || !result) return
    c.width = result.width; c.height = result.height
    const ctx = c.getContext('2d')!
    ctx.putImageData(result, 0, 0)
    if (fill === 'colour') { ctx.globalCompositeOperation = 'destination-over'; ctx.fillStyle = fillColour; ctx.fillRect(0, 0, c.width, c.height); ctx.globalCompositeOperation = 'source-over' }
  }, [result, fill, fillColour])

  const onClick = (e: MouseEvent<HTMLCanvasElement>) => {
    if (!src) return
    const r = e.currentTarget.getBoundingClientRect()
    const x = Math.min(src.width - 1, Math.floor(((e.clientX - r.left) / r.width) * src.width))
    const y = Math.min(src.height - 1, Math.floor(((e.clientY - r.top) / r.height) * src.height))
    const p = y * src.width + x
    if (picking) { const i = p * 4; setBg([src.data[i], src.data[i + 1], src.data[i + 2]]); setPicking(false); setSeeds([p]) }
    else setSeeds([...seeds, p])
  }

  const save = async () => {
    setBusy(true)
    const type = fill === 'transparent' ? 'image/png' : 'image/jpeg'
    downloadBlob(`${baseName(file!.name)}-no-bg.${type === 'image/png' ? 'png' : 'jpg'}`, await canvasToBlob(view.current!, type, 0.95))
    setBusy(false)
  }

  return (
    <>
      <div className="notice" style={{ background: 'var(--sage-soft)' }}>Works best for logos, signatures, product shots and graphics on a plain or near-plain background. Busy photo backgrounds (people outdoors, rooms) need AI-based removal, which this tool doesn't do.</div>
      <FileDrop accept="image/*" onFiles={(f) => setFile(f[0])} label={file && src ? `${file.name} — ${src.width}×${src.height}px, ${fmtBytes(file.size)} · drop or click to replace` : 'Drop an image here, or click to choose'} />
      <ErrorBox message={error} />
      {src && result && (
        <>
          <Row>
            <Field label="Background colour" hint="Detected from the image edges">
              <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="color" value={hex(bg)} onChange={(e) => { setBg(fromHex(e.target.value)); setSeeds([]) }} aria-label="Background colour to remove" />
                <span className="mono">{hex(bg)}</span>
                <button className={`btn sm ${picking ? 'primary' : ''}`} onClick={() => setPicking(!picking)} aria-pressed={picking}><Pipette size={14} aria-hidden="true" />{picking ? 'Click the image…' : 'Pick from image'}</button>
              </span>
            </Field>
          </Row>
          <Row>
            <Field label={`Tolerance: ${tolerance}%`} hint="Higher removes more similar shades"><input type="range" min={0} max={60} value={tolerance} onChange={(e) => setTolerance(+e.target.value)} /></Field>
            <Field label={`Edge softness: ${feather}%`}><input type="range" min={0} max={30} value={feather} onChange={(e) => setFeather(+e.target.value)} /></Field>
          </Row>
          <Row>
            <label className="check"><input type="radio" checked={connected} onChange={() => setConnected(true)} /> Only background connected to the edges</label>
            <label className="check"><input type="radio" checked={!connected} onChange={() => setConnected(false)} /> This colour everywhere (e.g. inside letters)</label>
          </Row>
          <Row>
            <label className="check"><input type="radio" checked={fill === 'transparent'} onChange={() => setFill('transparent')} /> Transparent (PNG)</label>
            <label className="check"><input type="radio" checked={fill === 'colour'} onChange={() => setFill('colour')} /> New background colour</label>
            {fill === 'colour' && <input type="color" value={fillColour} onChange={(e) => setFillColour(e.target.value)} aria-label="New background colour" />}
          </Row>
          <div style={{ display: 'grid', placeItems: 'center', background: 'var(--surface-2)', borderRadius: 8, padding: 12 }}>
            <canvas ref={view} onClick={onClick} className="checker" role="img" aria-label="Preview with background removed"
              style={{ maxWidth: '100%', maxHeight: 460, width: Math.max(src.width, src.height) < 360 ? 360 * (src.width / Math.max(src.width, src.height)) : undefined, cursor: picking ? 'crosshair' : 'copy', imageRendering: Math.max(src.width, src.height) < 360 ? 'pixelated' : 'auto' }} />
          </div>
          <p className="muted" style={{ margin: 0, fontSize: 13 }}>{removedPct}% of the image removed. {picking ? 'Click a background pixel to use its colour.' : 'Click any leftover background area to remove it too.'}{seeds.length > 0 && ` (${seeds.length} extra area${seeds.length > 1 ? 's' : ''} selected)`}</p>
          {removedPct === 0 && <div className="muted" style={{ fontSize: 13 }}>Nothing matched — raise the tolerance or pick the background colour from the image.</div>}
          {removedPct > 95 && <div className="error">Almost everything was removed — lower the tolerance.</div>}
          <Row>
            <button className="btn primary" disabled={busy} onClick={save}>Download {fill === 'transparent' ? 'PNG' : 'JPG'}</button>
            <button className="btn" onClick={() => { setSeeds([]); setTolerance(12); setFeather(8); setConnected(true); setBg(borderColour(src.data, src.width, src.height)) }}><RotateCcw size={15} aria-hidden="true" />Reset</button>
          </Row>
        </>
      )}
    </>
  )
}
