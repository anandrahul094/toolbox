import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react'
import { FlipHorizontal2, FlipVertical2, Link2, Link2Off, RotateCcw, RotateCw } from 'lucide-react'
import { baseName, canvasToBlob, downloadBlob, ErrorBox, Field, FileDrop, fmtBytes, loadImage, NumberInput, Row } from '../components/ui'

type Rect = { x: number; y: number; w: number; h: number } // in pixels of the rotated/flipped image
const RATIOS: [string, number | null][] = [['Free', null], ['1:1', 1], ['4:3', 4 / 3], ['3:2', 3 / 2], ['16:9', 16 / 9], ['9:16', 9 / 16], ['4:5', 4 / 5], ['Passport 35×45', 35 / 45]]
const MAX_SIDE = 8192 // stay well inside browser canvas limits
const MIN_STAGE = 360 // small images are shown enlarged so they can be cropped comfortably

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

export default function ImageEditor() {
  const [file, setFile] = useState<File | null>(null)
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [rot, setRot] = useState(0)
  const [flipH, setFlipH] = useState(false)
  const [flipV, setFlipV] = useState(false)
  const [crop, setCrop] = useState<Rect>({ x: 0, y: 0, w: 1, h: 1 })
  const [ratio, setRatio] = useState<number | null>(null)
  const [out, setOut] = useState({ w: 0, h: 0 })
  const [lockOut, setLockOut] = useState(true)
  const [format, setFormat] = useState('image/png')
  const [quality, setQuality] = useState(92)
  const [busy, setBusy] = useState(false)
  const drag = useRef<{ mode: 'draw' | 'move'; sx: number; sy: number; start: Rect } | null>(null)
  const stage = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!file) return
    let cancelled = false
    setError(null); setImg(null)
    loadImage(file)
      .then((i) => { if (!cancelled) { setImg(i); setRot(0); setFlipH(false); setFlipV(false); setRatio(null); setFormat(file.type === 'image/jpeg' ? 'image/jpeg' : file.type === 'image/webp' ? 'image/webp' : 'image/png') } })
      .catch(() => { if (!cancelled) setError('This file could not be opened as an image. HEIC and RAW photos are not supported by browsers — convert them to JPG first.') })
    return () => { cancelled = true }
  }, [file])

  // full-size image after rotate/flip; crop is applied on top of this
  const base = useMemo(() => {
    if (!img) return null
    const nw = img.naturalWidth || 1024, nh = img.naturalHeight || 1024 // SVGs without a size
    const swap = rot % 180 !== 0
    const c = document.createElement('canvas')
    c.width = swap ? nh : nw
    c.height = swap ? nw : nh
    const ctx = c.getContext('2d')!
    ctx.translate(c.width / 2, c.height / 2)
    ctx.rotate((rot * Math.PI) / 180)
    ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1)
    ctx.drawImage(img, -nw / 2, -nh / 2, nw, nh)
    return c
  }, [img, rot, flipH, flipV])
  const baseUrl = useMemo(() => base?.toDataURL('image/png'), [base])

  // reset the crop to the full image whenever the oriented image changes
  useEffect(() => { if (base) setCrop({ x: 0, y: 0, w: base.width, h: base.height }) }, [base])
  // keep the output size in step with the crop
  useEffect(() => { setOut({ w: Math.round(crop.w), h: Math.round(crop.h) }) }, [crop.w, crop.h])

  if (!file || error || !img || !base || !baseUrl) {
    return (
      <>
        <FileDrop accept="image/*" onFiles={(f) => setFile(f[0])} label={file && !error ? 'Loading…' : 'Drop an image here, or click to choose'} hint="JPG, PNG, WebP, GIF, BMP or SVG. Your image never leaves this device." />
        <ErrorBox message={error} />
      </>
    )
  }

  const BW = base.width, BH = base.height
  const fitRatio = (r: number | null, around: Rect = { x: 0, y: 0, w: BW, h: BH }) => {
    if (!r) return around
    let w = around.w, h = w / r
    if (h > around.h) { h = around.h; w = h * r }
    return { x: around.x + (around.w - w) / 2, y: around.y + (around.h - h) / 2, w, h }
  }
  const applyRatio = (r: number | null) => { setRatio(r); setCrop(fitRatio(r)) }

  const toImg = (e: PointerEvent) => {
    const r = stage.current!.getBoundingClientRect()
    return { x: clamp(((e.clientX - r.left) / r.width) * BW, 0, BW), y: clamp(((e.clientY - r.top) / r.height) * BH, 0, BH) }
  }
  const inside = (p: { x: number; y: number }) => p.x > crop.x && p.x < crop.x + crop.w && p.y > crop.y && p.y < crop.y + crop.h
  const isFull = crop.x === 0 && crop.y === 0 && Math.round(crop.w) === BW && Math.round(crop.h) === BH

  const onDown = (e: PointerEvent) => {
    e.preventDefault()
    ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
    const p = toImg(e)
    drag.current = { mode: inside(p) && !isFull ? 'move' : 'draw', sx: p.x, sy: p.y, start: crop }
  }
  const onMove = (e: PointerEvent) => {
    const d = drag.current
    if (!d) return
    const p = toImg(e)
    if (d.mode === 'move') {
      setCrop({ ...d.start, x: clamp(d.start.x + p.x - d.sx, 0, BW - d.start.w), y: clamp(d.start.y + p.y - d.sy, 0, BH - d.start.h) })
      return
    }
    let w = Math.abs(p.x - d.sx), h = Math.abs(p.y - d.sy)
    if (ratio) {
      h = w / ratio
      const maxH = p.y >= d.sy ? BH - d.sy : d.sy
      if (h > maxH) { h = maxH; w = h * ratio }
    }
    const x = p.x >= d.sx ? d.sx : d.sx - w, y = p.y >= d.sy ? d.sy : d.sy - h
    if (w >= 2 && h >= 2) setCrop({ x: clamp(x, 0, BW), y: clamp(y, 0, BH), w: Math.min(w, BW), h: Math.min(h, BH) })
  }

  // manual crop entry, kept inside the image and the chosen ratio
  const setCropField = (key: keyof Rect, v: number) => {
    const next = { ...crop, [key]: Math.round(v) }
    next.w = clamp(next.w, 1, BW); next.h = clamp(next.h, 1, BH)
    if (ratio && key === 'w') next.h = Math.min(BH, next.w / ratio)
    if (ratio && key === 'h') next.w = Math.min(BW, next.h * ratio)
    next.x = clamp(next.x, 0, BW - next.w); next.y = clamp(next.y, 0, BH - next.h)
    setCrop(next)
  }

  const cw = Math.max(1, Math.round(crop.w)), ch = Math.max(1, Math.round(crop.h))
  const setOutW = (w: number) => { w = Math.round(w); setOut({ w, h: lockOut ? Math.max(1, Math.round((w * ch) / cw)) : out.h }) }
  const setOutH = (h: number) => { h = Math.round(h); setOut({ h, w: lockOut ? Math.max(1, Math.round((h * cw) / ch)) : out.w }) }
  const outError = out.w < 1 || out.h < 1 ? 'Width and height must be at least 1px.' : Math.max(out.w, out.h) > MAX_SIDE ? `Maximum output size is ${MAX_SIDE}px per side.` : null

  const save = async () => {
    if (outError) return
    setBusy(true)
    try {
      const c = document.createElement('canvas')
      c.width = out.w; c.height = out.h
      const ctx = c.getContext('2d')!
      if (format === 'image/jpeg') { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height) }
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(base, crop.x, crop.y, crop.w, crop.h, 0, 0, c.width, c.height)
      const blob = await canvasToBlob(c, format, quality / 100)
      downloadBlob(`${baseName(file.name)}-${out.w}x${out.h}.${format.split('/')[1].replace('jpeg', 'jpg')}`, blob)
    } catch { setError('Could not create the image — try a smaller output size.') }
    setBusy(false)
  }

  const pct = (v: number, total: number) => `${(v / total) * 100}%`
  const enlarge = Math.max(BW, BH) < MIN_STAGE

  return (
    <>
      <FileDrop accept="image/*" onFiles={(f) => setFile(f[0])} label={`${file.name} — ${BW}×${BH}px, ${fmtBytes(file.size)} · drop or click to replace`} />
      <Row>
        <button className="btn" onClick={() => setRot((rot + 270) % 360)}><RotateCcw size={15} aria-hidden="true" />Rotate left</button>
        <button className="btn" onClick={() => setRot((rot + 90) % 360)}><RotateCw size={15} aria-hidden="true" />Rotate right</button>
        <button className="btn" aria-pressed={flipH} onClick={() => setFlipH(!flipH)}><FlipHorizontal2 size={15} aria-hidden="true" />Flip horizontal</button>
        <button className="btn" aria-pressed={flipV} onClick={() => setFlipV(!flipV)}><FlipVertical2 size={15} aria-hidden="true" />Flip vertical</button>
      </Row>
      <div className="filter-chips" role="group" aria-label="Crop aspect ratio">
        {RATIOS.map(([l, r]) => <button key={l} className={`chip ${ratio === r ? 'active' : ''}`} aria-pressed={ratio === r} onClick={() => applyRatio(r)}>{l}</button>)}
      </div>
      <p className="muted" style={{ margin: 0, fontSize: 13 }}>Drag on the image to draw the area to keep, drag inside the box to move it, or type exact values below.{enlarge && ' This image is small, so the preview is enlarged.'}</p>

      <div style={{ display: 'grid', placeItems: 'center', background: 'var(--surface-2)', borderRadius: 8, padding: 12 }}>
        <div ref={stage} className="checker"
          style={{ position: 'relative', overflow: 'hidden', touchAction: 'none', userSelect: 'none', cursor: drag.current?.mode === 'move' ? 'grabbing' : 'crosshair',
            width: enlarge ? `min(100%, ${MIN_STAGE * (BW / Math.max(BW, BH))}px)` : 'auto', maxWidth: '100%', lineHeight: 0 }}
          onPointerDown={onDown} onPointerMove={onMove} onPointerUp={() => (drag.current = null)} onPointerCancel={() => (drag.current = null)}>
          <img src={baseUrl} alt="Image to crop" draggable={false} style={{ display: 'block', width: enlarge ? '100%' : 'auto', maxWidth: '100%', maxHeight: 460, imageRendering: enlarge ? 'pixelated' : 'auto' }} />
          <div aria-hidden="true" style={{ position: 'absolute', left: pct(crop.x, BW), top: pct(crop.y, BH), width: pct(crop.w, BW), height: pct(crop.h, BH),
            boxShadow: '0 0 0 9999px rgb(0 0 0 / .5)', outline: '2px solid #fff', outlineOffset: -1, cursor: isFull ? 'crosshair' : 'move' }} />
        </div>
      </div>

      <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="field-label" style={{ marginBottom: 6 }}>Crop area (px)</legend>
        <Row>
          <Field label="X"><NumberInput min={0} max={BW - 1} value={Math.round(crop.x)} onValue={(v) => setCropField('x', v)} /></Field>
          <Field label="Y"><NumberInput min={0} max={BH - 1} value={Math.round(crop.y)} onValue={(v) => setCropField('y', v)} /></Field>
          <Field label="Width"><NumberInput min={1} max={BW} value={cw} onValue={(v) => setCropField('w', v)} /></Field>
          <Field label="Height"><NumberInput min={1} max={BH} value={ch} onValue={(v) => setCropField('h', v)} /></Field>
          <button className="btn" onClick={() => applyRatio(null)} disabled={isFull && !ratio}>Reset crop</button>
        </Row>
      </fieldset>

      <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="field-label" style={{ marginBottom: 6 }}>Output size (px)</legend>
        <Row>
          <Field label="Width"><NumberInput min={1} max={MAX_SIDE * 4} value={out.w} onValue={setOutW} /></Field>
          <button className={`icon-only ${lockOut ? 'on' : ''}`} style={{ marginBottom: 3 }} onClick={() => setLockOut(!lockOut)} aria-pressed={lockOut} aria-label={lockOut ? 'Unlock aspect ratio' : 'Lock aspect ratio'} title={lockOut ? 'Aspect ratio locked' : 'Aspect ratio unlocked'}>
            {lockOut ? <Link2 size={17} /> : <Link2Off size={17} />}
          </button>
          <Field label="Height"><NumberInput min={1} max={MAX_SIDE * 4} value={out.h} onValue={setOutH} /></Field>
          <Field label="Format">
            <select value={format} onChange={(e) => setFormat(e.target.value)}>
              <option value="image/png">PNG (keeps transparency)</option><option value="image/jpeg">JPG</option><option value="image/webp">WebP</option>
            </select>
          </Field>
        </Row>
        <div className="filter-chips" style={{ marginTop: 8 }}>
          {[0.25, 0.5, 1, 2].map((s) => <button key={s} className="chip" onClick={() => setOut({ w: Math.max(1, Math.round(cw * s)), h: Math.max(1, Math.round(ch * s)) })}>{s * 100}%</button>)}
        </div>
      </fieldset>
      {format !== 'image/png' && <Field label={`Quality: ${quality}%`}><input type="range" min={10} max={100} value={quality} onChange={(e) => setQuality(+e.target.value)} /></Field>}
      {out.w > cw * 1.01 && !outError && <div className="muted" style={{ fontSize: 13 }}>Enlarging beyond the original size can look soft or blurry.</div>}
      <ErrorBox message={outError} />
      <Row>
        <button className="btn primary" disabled={busy || !!outError} onClick={save}>{busy ? 'Saving…' : `Download ${out.w}×${out.h}`}</button>
        <button className="btn" onClick={() => { setRot(0); setFlipH(false); setFlipV(false); setRatio(null) }}>Reset all</button>
      </Row>
    </>
  )
}
