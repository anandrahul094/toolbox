import { useEffect, useMemo, useRef, useState } from 'react'
import { TriangleAlert } from 'lucide-react'
import { baseName, canvasToBlob, downloadBlob, ErrorBox, Field, FileDrop, fmtBytes, imageSize, Row, useImageFile } from '../components/ui'

// Common photo sizes. Head height is the share of the photo from chin to top of head.
interface Size { id: string; label: string; wmm: number; hmm: number; head: [number, number] }
const SIZES: Size[] = [
  { id: '35x45', label: '35 × 45 mm — India visa & forms, UK, Europe, Australia', wmm: 35, hmm: 45, head: [0.7, 0.8] },
  { id: '51x51', label: '2 × 2 in (51 × 51 mm) — India passport, USA', wmm: 50.8, hmm: 50.8, head: [0.5, 0.69] },
  { id: '50x70', label: '50 × 70 mm — Canada', wmm: 50, hmm: 70, head: [0.44, 0.51] },
  { id: '33x48', label: '33 × 48 mm — China', wmm: 33, hmm: 48, head: [0.58, 0.69] },
  { id: '35x35', label: '35 × 35 mm', wmm: 35, hmm: 35, head: [0.6, 0.75] },
  { id: '25x35', label: '25 × 35 mm (stamp size)', wmm: 25, hmm: 35, head: [0.65, 0.78] },
]
const SHEETS = [
  { id: '4x6', label: '4 × 6 in photo paper', wmm: 152.4, hmm: 101.6 },
  { id: 'a4', label: 'A4 paper', wmm: 210, hmm: 297 },
  { id: '5x7', label: '5 × 7 in photo paper', wmm: 177.8, hmm: 127 },
]
const DPI = 300
const mm = (v: number) => Math.round((v / 25.4) * DPI)

export default function PassportPhoto() {
  const { file, img, error, setFile } = useImageFile()
  const [sizeId, setSizeId] = useState('35x45')
  const [sheetId, setSheetId] = useState('4x6')
  const [zoom, setZoom] = useState(1.3)
  const [posX, setPosX] = useState(50)
  const [posY, setPosY] = useState(30)
  const [bright, setBright] = useState(100)
  const [border, setBorder] = useState(true)
  const preview = useRef<HTMLCanvasElement>(null)
  const size = SIZES.find((s) => s.id === sizeId)!
  const sheet = SHEETS.find((s) => s.id === sheetId)!

  const photo = useMemo(() => {
    if (!img) return null
    const w = mm(size.wmm), h = mm(size.hmm)
    const c = document.createElement('canvas'); c.width = w; c.height = h
    const ctx = c.getContext('2d')!
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h)
    const nat = imageSize(img)
    const s = Math.max(w / nat.w, h / nat.h) * zoom
    const dw = nat.w * s, dh = nat.h * s
    ctx.filter = `brightness(${bright}%)`
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(img, (w - dw) * (posX / 100), (h - dh) * (posY / 100), dw, dh)
    ctx.filter = 'none'
    return c
  }, [img, size, zoom, posX, posY, bright])

  // preview with head-size guides drawn on top
  useEffect(() => {
    const p = preview.current
    if (!p || !photo) return
    p.width = photo.width; p.height = photo.height
    const ctx = p.getContext('2d')!
    ctx.drawImage(photo, 0, 0)
    const H = photo.height, W = photo.width
    const top = H * 0.1, chinMin = top + H * size.head[0], chinMax = top + H * size.head[1]
    ctx.strokeStyle = 'rgba(37,99,235,.9)'; ctx.lineWidth = Math.max(2, W / 200); ctx.setLineDash([W / 40, W / 60])
    ctx.beginPath(); ctx.moveTo(0, top); ctx.lineTo(W, top); ctx.stroke()
    ctx.strokeStyle = 'rgba(22,163,74,.9)'
    ctx.beginPath(); ctx.moveTo(0, chinMin); ctx.lineTo(W, chinMin); ctx.moveTo(0, chinMax); ctx.lineTo(W, chinMax); ctx.stroke()
    ctx.setLineDash([]); ctx.strokeStyle = 'rgba(255,255,255,.7)'
    ctx.beginPath(); ctx.ellipse(W / 2, (top + (chinMin + chinMax) / 2) / 2, W * 0.27, ((chinMin + chinMax) / 2 - top) / 2, 0, 0, Math.PI * 2); ctx.stroke()
  }, [photo, size])

  // how many photos fit on the sheet, with a small gap and margin
  const layout = () => {
    const long = mm(Math.max(sheet.wmm, sheet.hmm)), short = mm(Math.min(sheet.wmm, sheet.hmm))
    const W = sheet.id === 'a4' ? short : long, H = sheet.id === 'a4' ? long : short
    const pw = mm(size.wmm), ph = mm(size.hmm), gap = mm(3), margin = mm(4)
    const cols = Math.max(1, Math.floor((W - 2 * margin + gap) / (pw + gap)))
    const rows = Math.max(1, Math.floor((H - 2 * margin + gap) / (ph + gap)))
    return { W, H, pw, ph, gap, cols, rows }
  }
  const sheetCount = (() => { const l = layout(); return l.cols * l.rows })()

  const buildSheet = () => {
    if (!photo) return null
    const { W, H, gap, cols, rows } = layout()
    const c = document.createElement('canvas'); c.width = W; c.height = H
    const ctx = c.getContext('2d')!
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H)
    const ox = (W - (cols * photo.width + (cols - 1) * gap)) / 2, oy = (H - (rows * photo.height + (rows - 1) * gap)) / 2
    for (let r = 0; r < rows; r++) for (let k = 0; k < cols; k++) {
      const x = ox + k * (photo.width + gap), y = oy + r * (photo.height + gap)
      ctx.drawImage(photo, x, y)
      if (border) { ctx.strokeStyle = '#bbb'; ctx.lineWidth = 2; ctx.strokeRect(x, y, photo.width, photo.height) }
    }
    return c
  }

  const save = async (kind: 'single' | 'sheet') => {
    const name = baseName(file!.name)
    if (kind === 'single') downloadBlob(`${name}-${size.id}mm.jpg`, await canvasToBlob(photo!, 'image/jpeg', 0.95))
    else { const c = buildSheet(); if (c) downloadBlob(`${name}-${sheet.id}-sheet.jpg`, await canvasToBlob(c, 'image/jpeg', 0.95)) }
  }

  return (
    <>
      <Field label="Photo size">
        <select value={sizeId} onChange={(e) => setSizeId(e.target.value)}>{SIZES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select>
      </Field>
      <div className="notice"><TriangleAlert size={16} aria-hidden="true" /><span>Use a recent, front-facing photo against a plain white or light background, with even lighting and no glasses glare. Check the official rules for your application before printing.</span></div>
      <FileDrop accept="image/*" onFiles={(f) => setFile(f[0])} label={file ? `${file.name} — ${fmtBytes(file.size)} · drop or click to replace` : 'Drop your photo here, or click to choose'} hint="Processed on your device — your photo is never uploaded." />
      <ErrorBox message={error} />
      {photo && (
        <>
          <div className="cols">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Field label={`Zoom: ${Math.round(zoom * 100)}%`}><input type="range" min={1} max={4} step={0.02} value={zoom} onChange={(e) => setZoom(+e.target.value)} /></Field>
              <Field label="Move left / right"><input type="range" min={0} max={100} step={0.5} value={posX} onChange={(e) => setPosX(+e.target.value)} /></Field>
              <Field label="Move up / down"><input type="range" min={0} max={100} step={0.5} value={posY} onChange={(e) => setPosY(+e.target.value)} /></Field>
              <Field label={`Brightness: ${bright}%`}><input type="range" min={70} max={140} value={bright} onChange={(e) => setBright(+e.target.value)} /></Field>
              <p className="muted" style={{ margin: 0, fontSize: 13 }}>Line up the top of the head with the blue line and the chin between the green lines. Guides are not saved.</p>
            </div>
            <div style={{ display: 'grid', placeItems: 'center', background: 'var(--surface-2)', borderRadius: 8, padding: 12 }}>
              <canvas ref={preview} aria-label="Passport photo preview with guides" style={{ maxWidth: '100%', maxHeight: 340, border: '1px solid var(--border)' }} />
            </div>
          </div>
          <Row>
            <Field label="Print sheet">
              <select value={sheetId} onChange={(e) => setSheetId(e.target.value)}>{SHEETS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select>
            </Field>
          </Row>
          <label className="check"><input type="checkbox" checked={border} onChange={(e) => setBorder(e.target.checked)} /> Thin cutting lines around each photo</label>
          <Row>
            <button className="btn primary" onClick={() => save('sheet')}>Download print sheet ({sheetCount} photos)</button>
            <button className="btn" onClick={() => save('single')}>Download single photo</button>
          </Row>
          <p className="muted" style={{ margin: 0, fontSize: 13 }}>Saved at {DPI} DPI. Print at 100% / “actual size” so the photos come out at {size.wmm} × {size.hmm} mm.</p>
        </>
      )}
    </>
  )
}
