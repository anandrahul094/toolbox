import { useEffect, useState } from 'react'
import { Link2, Link2Off, RotateCcw } from 'lucide-react'
import { baseName, canvasFits, canvasToBlob, downloadBlob, extOf, Field, FileDrop, fmtBytes, imageSize, loadImage, NumberInput, prepareCanvas, Row, Stat } from '../components/ui'

export default function ImageCompressor() {
  const [file, setFile] = useState<File | null>(null)
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  const [origUrl, setOrigUrl] = useState('')
  const [width, setWidth] = useState(0)
  const [height, setHeight] = useState(0)
  const [lock, setLock] = useState(true)
  const [quality, setQuality] = useState(80)
  const [format, setFormat] = useState('image/webp')
  const [out, setOut] = useState<{ blob: Blob; url: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!file) return
    const url = URL.createObjectURL(file)
    let cancelled = false
    setOrigUrl(url); setError(null); setImg(null); setOut(null)
    loadImage(url).then((i) => { if (cancelled) return; const s = imageSize(i); setImg(i); setWidth(s.w); setHeight(s.h) })
      .catch(() => { if (!cancelled) setError('This file could not be opened as an image. HEIC and RAW photos are not supported by browsers — convert them to JPG first.') })
    return () => { cancelled = true; URL.revokeObjectURL(url) }
  }, [file])

  useEffect(() => {
    if (!img) return
    const w = Math.round(width), h = Math.round(height)
    if (!canvasFits(w, h)) { setOut(null); return }
    let url = ''
    let cancelled = false
    // debounce so typing a size doesn't re-encode on every keystroke
    const t = setTimeout(() => {
      const { c, ctx } = prepareCanvas(w, h, format)
      ctx.drawImage(img, 0, 0, w, h)
      canvasToBlob(c, format, quality / 100).then((blob) => {
        if (cancelled) return
        url = URL.createObjectURL(blob)
        setOut({ blob, url }); setError(null)
      }).catch((e) => { if (!cancelled) { setOut(null); setError((e as Error).message) } })
    }, 150)
    return () => { cancelled = true; clearTimeout(t); if (url) URL.revokeObjectURL(url) }
  }, [img, width, height, quality, format])

  const nat = img ? imageSize(img) : { w: 1, h: 1 }
  const ratio = nat.h / nat.w
  const setW = (w: number) => { setWidth(w); if (lock) setHeight(Math.max(1, Math.round(w * ratio))) }
  const setH = (h: number) => { setHeight(h); if (lock) setWidth(Math.max(1, Math.round(h / ratio))) }
  const reset = () => { setWidth(nat.w); setHeight(nat.h); setQuality(80); setLock(true) }
  const ext = out ? extOf(out.blob.type) : extOf(format)
  const sizeError = img && !canvasFits(Math.round(width), Math.round(height)) ? 'That size is too large for the browser to process. Keep each side under 16,384px.' : null
  const saved = file && out ? Math.round((1 - out.blob.size / file.size) * 100) : 0

  return (
    <>
      <FileDrop accept="image/*" onFiles={(f) => setFile(f[0])} label={file ? `${file.name} — ${fmtBytes(file.size)} · drop or click to replace` : 'Drop an image here, or click to choose'} hint="JPG, PNG, WebP, GIF or BMP. Your image never leaves this device." />
      {error && <div className="error" role="alert">{error}</div>}
      {img && file && (
        <>
          <Row>
            <Field label="Width (px)"><NumberInput min={1} max={16384} value={width} onValue={(v) => setW(Math.round(v))} /></Field>
            <button className={`icon-only ${lock ? 'on' : ''}`} onClick={() => setLock(!lock)} aria-pressed={lock} aria-label={lock ? 'Unlock aspect ratio' : 'Lock aspect ratio'} title={lock ? 'Aspect ratio locked' : 'Aspect ratio unlocked'} style={{ marginBottom: 3 }}>
              {lock ? <Link2 size={17} /> : <Link2Off size={17} />}
            </button>
            <Field label="Height (px)"><NumberInput min={1} max={16384} value={height} onValue={(v) => setH(Math.round(v))} /></Field>
            <Field label="Format">
              <select value={format} onChange={(e) => setFormat(e.target.value)}>
                <option value="image/webp">WebP (smallest)</option><option value="image/jpeg">JPG</option><option value="image/png">PNG (lossless)</option>
              </select>
            </Field>
          </Row>
          <Row>
            {[100, 75, 50, 25].map((p) => <button key={p} className="chip" onClick={() => setW(Math.max(1, Math.round((nat.w * p) / 100)))}>{p}%</button>)}
            {[1920, 1280, 800].filter((w) => w < nat.w).map((w) => <button key={w} className="chip" onClick={() => setW(w)}>{w}px wide</button>)}
          </Row>
          {format !== 'image/png' && <Field label={`Quality: ${quality}%`} hint="Around 70–85% is usually indistinguishable from the original."><input type="range" min={10} max={100} value={quality} onChange={(e) => setQuality(+e.target.value)} /></Field>}

          {sizeError && <div className="error" role="alert">{sizeError}</div>}
          {out && !sizeError && (
            <>
              {out.blob.type !== format && <div className="notice">This browser can’t create {format === 'image/webp' ? 'WebP' : 'that format'} files, so the result is {ext.toUpperCase()} instead.</div>}
              <div className="stats" aria-live="polite">
                <Stat label="Original" value={fmtBytes(file.size)} />
                <Stat label="Result" value={fmtBytes(out.blob.size)} />
                <Stat label={saved >= 0 ? 'Smaller by' : 'Larger by'} value={<span style={{ color: saved >= 0 ? 'var(--ok)' : 'var(--danger)' }}>{Math.abs(saved)}%</span>} />
                <Stat label="Dimensions" value={<span style={{ fontSize: 16 }}>{Math.round(width)}×{Math.round(height)}</span>} />
              </div>
              {saved < 0 && <div className="muted" style={{ fontSize: 13 }}>The result is bigger than the original — try WebP, a lower quality, or a smaller size.</div>}
              <div className="cols">
                <figure style={{ margin: 0 }}><figcaption className="field-label" style={{ marginBottom: 6 }}>Before · {nat.w}×{nat.h}</figcaption><img src={origUrl} alt="Original" className="checker" style={{ width: '100%', maxHeight: 320, objectFit: 'contain', borderRadius: 6, border: '1px solid var(--border)' }} /></figure>
                <figure style={{ margin: 0 }}><figcaption className="field-label" style={{ marginBottom: 6 }}>After · {Math.round(width)}×{Math.round(height)}</figcaption><img src={out.url} alt="Result" className="checker" style={{ width: '100%', maxHeight: 320, objectFit: 'contain', borderRadius: 6, border: '1px solid var(--border)' }} /></figure>
              </div>
              <Row>
                <button className="btn primary" onClick={() => downloadBlob(`${baseName(file.name)}-${Math.round(width)}w.${ext}`, out.blob)}>Download {ext.toUpperCase()}</button>
                <button className="btn" onClick={reset}><RotateCcw size={15} aria-hidden="true" />Reset</button>
                <span className="muted" style={{ fontSize: 13 }}>Need many images at once? Use the Image Format Converter.</span>
              </Row>
            </>
          )}
        </>
      )}
    </>
  )
}
