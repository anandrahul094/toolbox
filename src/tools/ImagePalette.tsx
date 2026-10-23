import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import { CopyButton, ErrorBox, Field, FileDrop, imageSize, Row, useImageFile } from '../components/ui'

type RGB = [number, number, number]
const hex = (c: RGB) => '#' + c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')

// k-means on a downsampled copy of the image
function palette(img: HTMLImageElement, k: number): { color: RGB; share: number }[] {
  const c = document.createElement('canvas')
  const nat = imageSize(img)
  const s = Math.min(1, 120 / Math.max(nat.w, nat.h))
  c.width = Math.max(1, Math.round(nat.w * s)); c.height = Math.max(1, Math.round(nat.h * s))
  const ctx = c.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(img, 0, 0, c.width, c.height)
  const d = ctx.getImageData(0, 0, c.width, c.height).data
  const px: RGB[] = []
  for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 125) px.push([d[i], d[i + 1], d[i + 2]])
  if (!px.length) return []
  let centers: RGB[] = Array.from({ length: k }, (_, i) => px[Math.floor(((i + 0.5) / k) * px.length)])
  let assign = new Uint16Array(px.length)
  for (let iter = 0; iter < 12; iter++) {
    assign = new Uint16Array(px.length)
    px.forEach((p, i) => {
      let best = 0, bd = Infinity
      centers.forEach((cc, j) => { const dd = (p[0] - cc[0]) ** 2 + (p[1] - cc[1]) ** 2 + (p[2] - cc[2]) ** 2; if (dd < bd) { bd = dd; best = j } })
      assign[i] = best
    })
    const sums = centers.map(() => [0, 0, 0, 0])
    px.forEach((p, i) => { const s2 = sums[assign[i]]; s2[0] += p[0]; s2[1] += p[1]; s2[2] += p[2]; s2[3]++ })
    centers = sums.map((s2, j) => (s2[3] ? [s2[0] / s2[3], s2[1] / s2[3], s2[2] / s2[3]] : centers[j])) as RGB[]
  }
  const counts = centers.map((_, j) => assign.filter((a) => a === j).length)
  return centers.map((color, j) => ({ color, share: counts[j] / px.length })).filter((c2) => c2.share > 0).sort((a, b) => b.share - a.share)
}

export default function ImagePalette() {
  const { img, error, setFile } = useImageFile()
  const [k, setK] = useState(6)
  const [picked, setPicked] = useState<string | null>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const colors = useMemo(() => (img ? palette(img, k) : []), [img, k])

  useEffect(() => {
    const c = canvas.current
    if (!c || !img) return
    const nat = imageSize(img)
    // cap the pick canvas so huge photos don't exhaust memory
    const k = Math.min(1, 4096 / Math.max(nat.w, nat.h))
    c.width = Math.round(nat.w * k); c.height = Math.round(nat.h * k)
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
  }, [img])

  const pick = (e: MouseEvent<HTMLCanvasElement>) => {
    const c = canvas.current!, r = c.getBoundingClientRect()
    const x = Math.floor(((e.clientX - r.left) / r.width) * c.width), y = Math.floor(((e.clientY - r.top) / r.height) * c.height)
    const d = c.getContext('2d')!.getImageData(x, y, 1, 1).data
    setPicked(hex([d[0], d[1], d[2]]))
  }

  const css = colors.map((c, i) => `  --color-${i + 1}: ${hex(c.color)};`).join('\n')

  return (
    <>
      <FileDrop accept="image/*" onFiles={(f) => setFile(f[0])} label={img ? 'Click or drop to choose another image' : 'Drop an image or click to choose'} />
      <ErrorBox message={error} />
      {img && (
        <>
          <Field label={`Number of colors: ${k}`}><input type="range" min={2} max={12} value={k} onChange={(e) => setK(+e.target.value)} /></Field>
          <div style={{ display: 'flex', height: 90, borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)' }}>
            {colors.map((c) => <div key={hex(c.color)} title={hex(c.color)} style={{ flex: Math.max(c.share, 0.04), background: hex(c.color) }} />)}
          </div>
          <div className="file-list">
            {colors.map((c) => (
              <div key={hex(c.color)} className="file-item">
                <span style={{ width: 28, height: 28, borderRadius: 6, background: hex(c.color), border: '1px solid var(--border)' }} />
                <span className="name mono">{hex(c.color)} · rgb({c.color.map(Math.round).join(', ')})</span>
                <span className="muted">{(c.share * 100).toFixed(1)}%</span>
                <CopyButton value={hex(c.color)} />
              </div>
            ))}
          </div>
          <Row><CopyButton value={`:root {\n${css}\n}`} label="Copy as CSS variables" /><CopyButton value={JSON.stringify(colors.map((c) => hex(c.color)))} label="Copy as JSON" /></Row>
          <div className="field-label">Click the image to pick an exact color {picked && <>— <span className="mono" style={{ color: 'var(--text)' }}>{picked}</span> <span style={{ display: 'inline-block', width: 14, height: 14, background: picked, verticalAlign: 'middle', borderRadius: 3 }} /> <CopyButton value={picked} /></>}</div>
          <canvas ref={canvas} onClick={pick} style={{ maxWidth: '100%', maxHeight: 420, alignSelf: 'center', cursor: 'crosshair', borderRadius: 8 }} />
        </>
      )}
    </>
  )
}
