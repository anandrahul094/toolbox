import { useEffect, useMemo, useRef, useState } from 'react'
import { CheckCircle2, TriangleAlert } from 'lucide-react'
import { baseName, downloadBlob, ErrorBox, Field, FileDrop, fmtBytes, imageSize, NumberInput, Row, Stat, useImageFile } from '../components/ui'
import { tr } from '../i18n'
import { encodeToSize, type SizedResult } from '../lib/compressToSize'

// Typical requirements from recent notifications. They change, so the page asks people to check.
interface Preset { id: string; label: string; kind: 'photo' | 'signature'; w: number; h: number; unit: 'px' | 'cm'; minKB: number; maxKB: number }
const PRESETS: Preset[] = [
  { id: 'ssc-photo', label: 'SSC (CGL, CHSL, MTS, GD) — Photo', kind: 'photo', w: 3.5, h: 4.5, unit: 'cm', minKB: 20, maxKB: 50 },
  { id: 'ssc-sign', label: 'SSC — Signature', kind: 'signature', w: 4, h: 2, unit: 'cm', minKB: 10, maxKB: 20 },
  { id: 'ibps-photo', label: 'IBPS / SBI / RBI bank exams — Photo', kind: 'photo', w: 200, h: 230, unit: 'px', minKB: 20, maxKB: 50 },
  { id: 'ibps-sign', label: 'IBPS / SBI / RBI — Signature', kind: 'signature', w: 140, h: 60, unit: 'px', minKB: 10, maxKB: 20 },
  { id: 'upsc-photo', label: 'UPSC — Photo', kind: 'photo', w: 550, h: 550, unit: 'px', minKB: 20, maxKB: 300 },
  { id: 'upsc-sign', label: 'UPSC — Signature', kind: 'signature', w: 550, h: 350, unit: 'px', minKB: 20, maxKB: 300 },
  { id: 'nta-photo', label: 'NTA (NEET, JEE Main, CUET) — Photo', kind: 'photo', w: 3.5, h: 4.5, unit: 'cm', minKB: 10, maxKB: 200 },
  { id: 'nta-sign', label: 'NTA (NEET, JEE Main, CUET) — Signature', kind: 'signature', w: 4, h: 2, unit: 'cm', minKB: 4, maxKB: 30 },
  { id: 'custom', label: 'Custom size', kind: 'photo', w: 300, h: 400, unit: 'px', minKB: 20, maxKB: 50 },
]
const DPI = 200 // cm sizes are converted to pixels at this resolution

export default function ExamPhotoResizer({ preset: initial = 'ssc-photo' }: { preset?: string }) {
  const { file, img, error, setFile } = useImageFile()
  const [presetId, setPresetId] = useState(PRESETS.some((p) => p.id === initial) ? initial : 'ssc-photo')
  const preset = PRESETS.find((p) => p.id === presetId)!
  const toPx = (v: number, unit: 'px' | 'cm') => Math.round(unit === 'cm' ? (v / 2.54) * DPI : v)
  const [w, setW] = useState(toPx(preset.w, preset.unit))
  const [h, setH] = useState(toPx(preset.h, preset.unit))
  const [minKB, setMinKB] = useState(preset.minKB)
  const [maxKB, setMaxKB] = useState(preset.maxKB)
  const [zoom, setZoom] = useState(1)
  const [posX, setPosX] = useState(50)
  const [posY, setPosY] = useState(preset.kind === 'photo' ? 35 : 50)
  const [whiten, setWhiten] = useState(preset.kind === 'signature')
  const [result, setResult] = useState<(SizedResult & { url: string }) | null>(null)
  const [busy, setBusy] = useState(false)
  const preview = useRef<HTMLCanvasElement>(null)

  // switching exam applies its requirements
  useEffect(() => {
    setW(toPx(preset.w, preset.unit)); setH(toPx(preset.h, preset.unit))
    setMinKB(preset.minKB); setMaxKB(preset.maxKB)
    setWhiten(preset.kind === 'signature'); setPosY(preset.kind === 'photo' ? 35 : 50); setZoom(1)
  }, [presetId]) // eslint-disable-line react-hooks/exhaustive-deps

  // crop the image to the required shape (cover), with zoom and position controls
  const cropped = useMemo(() => {
    if (!img || w < 1 || h < 1) return null
    const nat = imageSize(img)
    const c = document.createElement('canvas')
    c.width = w; c.height = h
    const ctx = c.getContext('2d', { willReadFrequently: true })!
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h)
    const s = Math.max(w / nat.w, h / nat.h) * zoom
    const dw = nat.w * s, dh = nat.h * s
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(img, (w - dw) * (posX / 100), (h - dh) * (posY / 100), dw, dh)
    if (whiten) {
      // signatures on paper: push light greys to white and darken the ink
      const d = ctx.getImageData(0, 0, w, h)
      for (let i = 0; i < d.data.length; i += 4) {
        const lum = 0.299 * d.data[i] + 0.587 * d.data[i + 1] + 0.114 * d.data[i + 2]
        if (lum > 170) d.data[i] = d.data[i + 1] = d.data[i + 2] = 255
        else { const k = Math.max(0, (lum - 40) / 130); d.data[i] *= k; d.data[i + 1] *= k; d.data[i + 2] *= k }
      }
      ctx.putImageData(d, 0, 0)
    }
    return c
  }, [img, w, h, zoom, posX, posY, whiten])

  useEffect(() => {
    const p = preview.current
    if (!p || !cropped) return
    p.width = cropped.width; p.height = cropped.height
    p.getContext('2d')!.drawImage(cropped, 0, 0)
  }, [cropped])

  // re-encode to the size range whenever the crop or limits change
  useEffect(() => {
    if (!cropped || maxKB <= 0 || minKB > maxKB) { setResult(null); return }
    let cancelled = false, url = ''
    setBusy(true)
    const t = setTimeout(async () => {
      const r = await encodeToSize(cropped, cropped.width, cropped.height, { minKB, maxKB, type: 'image/jpeg', allowDownscale: false })
      if (cancelled) return
      url = URL.createObjectURL(r.blob)
      setResult({ ...r, url }); setBusy(false)
    }, 250)
    return () => { cancelled = true; clearTimeout(t); if (url) URL.revokeObjectURL(url) }
  }, [cropped, minKB, maxKB])

  const rangeError = minKB > maxKB ? tr('Minimum size can’t be larger than the maximum.') : null
  const kb = result ? result.blob.size / 1024 : 0

  return (
    <>
      <Field label={tr("Exam and document type")}>
        <select value={presetId} onChange={(e) => setPresetId(e.target.value)}>
          {PRESETS.map((p) => <option key={p.id} value={p.id}>{tr(p.label)}{p.id !== 'custom' ? ` · ${p.minKB}–${p.maxKB} KB` : ''}</option>)}
        </select>
      </Field>
      <div className="notice"><TriangleAlert size={16} aria-hidden="true" /><span>{tr('These are typical requirements. Rules change between years and posts — always check the size limits in your exam’s latest official notification and adjust below if needed.')}</span></div>
      <FileDrop accept="image/*" onFiles={(f) => setFile(f[0])} label={file ? tr('{name} — {size} · drop or click to replace', { name: file.name, size: fmtBytes(file.size) }) : tr(preset.kind === 'photo' ? 'Drop your photo here, or click to choose' : 'Drop your signature here, or click to choose')} hint={tr('Use a clear, recent photo with a plain light background. It never leaves your device.')} />
      <ErrorBox message={error} />

      <Row>
        <Field label={tr("Width (px)")}><NumberInput min={20} max={2000} step={1} value={w} onValue={(v) => { setW(Math.round(v)); setPresetId('custom') }} /></Field>
        <Field label={tr("Height (px)")}><NumberInput min={20} max={2000} step={1} value={h} onValue={(v) => { setH(Math.round(v)); setPresetId('custom') }} /></Field>
        <Field label={tr("Min size (KB)")}><NumberInput min={0} max={2000} step={1} value={minKB} onValue={(v) => { setMinKB(Math.round(v)); setPresetId('custom') }} /></Field>
        <Field label={tr("Max size (KB)")}><NumberInput min={1} max={5000} step={1} value={maxKB} onValue={(v) => { setMaxKB(Math.round(v)); setPresetId('custom') }} /></Field>
      </Row>
      {preset.unit === 'cm' && presetId !== 'custom' && <p className="muted" style={{ margin: 0, fontSize: 13 }}>{tr('{a} × {b} cm, converted to {w} × {h} px at {dpi} DPI.', { a: preset.w, b: preset.h, w, h, dpi: DPI })}</p>}
      <ErrorBox message={rangeError} />

      {img && cropped && (
        <>
          <div className="cols">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Field label={tr('Zoom: {n}%', { n: Math.round(zoom * 100) })}><input type="range" min={1} max={3} step={0.05} value={zoom} onChange={(e) => setZoom(+e.target.value)} /></Field>
              <Field label={tr("Move left / right")}><input type="range" min={0} max={100} value={posX} onChange={(e) => setPosX(+e.target.value)} /></Field>
              <Field label={tr("Move up / down")}><input type="range" min={0} max={100} value={posY} onChange={(e) => setPosY(+e.target.value)} /></Field>
              <label className="check"><input type="checkbox" checked={whiten} onChange={(e) => setWhiten(e.target.checked)} /> {tr('Clean background (makes paper white, ink darker — best for signatures)')}</label>
            </div>
            <div style={{ display: 'grid', placeItems: 'center', background: 'var(--surface-2)', borderRadius: 8, padding: 12 }}>
              <canvas ref={preview} aria-label={tr("Preview of the resized image")} style={{ maxWidth: '100%', maxHeight: 280, border: '1px solid var(--border)', background: '#fff' }} />
            </div>
          </div>

          {result && (
            <>
              <div className="stats" aria-live="polite">
                <Stat label={tr("File size")} value={<span style={{ color: result.hitTarget ? 'var(--ok)' : 'var(--danger)' }}>{kb.toFixed(1)} KB</span>} />
                <Stat label={tr("Required")} value={<span style={{ fontSize: 16 }}>{minKB}–{maxKB} KB</span>} />
                <Stat label={tr("Dimensions")} value={<span style={{ fontSize: 16 }}>{result.width}×{result.height}</span>} />
                <Stat label={tr("Format")} value={<span style={{ fontSize: 16 }}>JPG</span>} />
              </div>
              {result.hitTarget
                ? <div className="badge"><CheckCircle2 size={14} aria-hidden="true" />{tr('Ready to upload — within {a}–{b} KB', { a: minKB, b: maxKB })}{result.padded ? tr(' (padded to reach the minimum size)') : ''}</div>
                : <div className="error" role="alert">{tr('Couldn’t fit {b} KB at these dimensions. Reduce the width and height, or check the limits.', { b: maxKB })}</div>}
              <Row>
                <button className="btn primary" disabled={busy || !result.hitTarget} onClick={() => downloadBlob(`${baseName(file!.name)}-${presetId}.jpg`, result.blob)}>{busy ? tr('Working…') : tr('Download JPG')}</button>
              </Row>
            </>
          )}
        </>
      )}
    </>
  )
}
