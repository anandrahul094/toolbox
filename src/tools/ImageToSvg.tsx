import { useEffect, useState } from 'react'
import { baseName, CopyButton, downloadBlob, ErrorBox, Field, FileDrop, fmtBytes, imageSize, loadImage, Row, useImageFile } from '../components/ui'
import BatchRunner, { BulkToggle, type BatchProcess } from '../components/Batch'

// imagetracerjs option presets, tuned for common jobs
const PRESETS: Record<string, { label: string; opts: Record<string, number | boolean> }> = {
  logo: { label: 'Logo / icon (few flat colours)', opts: { numberofcolors: 8, colorquantcycles: 3, ltres: 0.5, qtres: 0.5, pathomit: 8, blurradius: 0, strokewidth: 0 } },
  bw: { label: 'Black & white (signatures, line art)', opts: { numberofcolors: 2, colorsampling: 0, ltres: 0.5, qtres: 0.5, pathomit: 6, strokewidth: 0 } },
  poster: { label: 'Posterized photo', opts: { numberofcolors: 16, colorquantcycles: 3, ltres: 1, qtres: 1, pathomit: 12, blurradius: 2, blurdelta: 20, strokewidth: 0 } },
  detailed: { label: 'Detailed (more colours, bigger file)', opts: { numberofcolors: 32, colorquantcycles: 3, ltres: 0.5, qtres: 0.5, pathomit: 4, strokewidth: 0 } },
  smooth: { label: 'Smooth curves', opts: { numberofcolors: 8, ltres: 0.1, qtres: 4, pathomit: 10, rightangleenhance: false, strokewidth: 0 } },
}
const MAX_SIDE = 900 // tracing is slow on big images, so they are scaled down first

interface Tracer { imagedataToSVG: (d: ImageData, o: Record<string, number | boolean>) => string }

async function trace(img: HTMLImageElement, preset: string, colors: number) {
  const mod = await import('imagetracerjs')
  const tracer = ((mod as { default?: Tracer }).default ?? mod) as Tracer
  const nat = imageSize(img)
  const k = Math.min(1, MAX_SIDE / Math.max(nat.w, nat.h))
  const c = document.createElement('canvas'); c.width = Math.round(nat.w * k); c.height = Math.round(nat.h * k)
  const ctx = c.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(img, 0, 0, c.width, c.height)
  return tracer.imagedataToSVG(ctx.getImageData(0, 0, c.width, c.height), { ...PRESETS[preset].opts, numberofcolors: colors, viewbox: true })
}

/** Trace one file to SVG — used by bulk mode. */
async function traceOne(file: File, o: { preset: string; colors: number }) {
  const img = await loadImage(file).catch(() => { throw new Error('Not an image this browser can open.') })
  const svg = await trace(img, o.preset, o.colors)
  return { name: `${baseName(file.name)}.svg`, blob: new Blob([svg], { type: 'image/svg+xml' }) }
}

function StyleSettings({ preset, setPreset, colors, setColors }: { preset: string; setPreset: (p: string) => void; colors: number; setColors: (n: number) => void }) {
  return (
    <Row>
      <Field label="Style">
        <select value={preset} onChange={(e) => setPreset(e.target.value)}>{Object.entries(PRESETS).map(([id, p]) => <option key={id} value={id}>{p.label}</option>)}</select>
      </Field>
      <Field label={`Colours: ${colors}`}><input type="range" min={2} max={64} value={colors} onChange={(e) => setColors(+e.target.value)} /></Field>
    </Row>
  )
}

function BulkSvg({ onSingle }: { onSingle: () => void }) {
  const [preset, setPreset] = useState('logo')
  const [colors, setColors] = useState(8)
  const process: BatchProcess = (file) => traceOne(file, { preset, colors })
  return (
    <>
      <BulkToggle bulk onChange={(b) => { if (!b) onSingle() }} />
      <StyleSettings preset={preset} setPreset={(p) => { setPreset(p); setColors(PRESETS[p].opts.numberofcolors as number) }} colors={colors} setColors={setColors} />
      <BatchRunner compare={false} accept="image/png,image/jpeg,image/webp,image/gif,image/bmp" process={process} settingsKey={`${preset}|${colors}`} runLabel="Convert all to SVG" zipName="svg-images" hint="Works best on logos, icons and drawings. Traced on your device." />
    </>
  )
}

export default function ImageToSvg() {
  const [bulk, setBulk] = useState(false)
  const { file, img, error, setFile } = useImageFile()
  // loadImage frees its object URL once decoded, so the preview needs its own
  const [origUrl, setOrigUrl] = useState('')
  useEffect(() => { if (!file) return; const u = URL.createObjectURL(file); setOrigUrl(u); return () => URL.revokeObjectURL(u) }, [file])
  const [preset, setPreset] = useState('logo')
  const [colors, setColors] = useState(8)
  const [svg, setSvg] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => setColors(PRESETS[preset].opts.numberofcolors as number), [preset])

  useEffect(() => {
    if (!img) return
    let cancelled = false
    setBusy(true)
    const t = setTimeout(async () => {
      const out = await trace(img, preset, colors)
      if (!cancelled) { setSvg(out); setBusy(false) }
    }, 150)
    return () => { cancelled = true; clearTimeout(t) }
  }, [img, preset, colors])

  const url = svg ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}` : ''

  if (bulk) return <BulkSvg onSingle={() => setBulk(false)} />
  return (
    <>
      <BulkToggle bulk={false} onChange={setBulk} />
      <FileDrop accept="image/png,image/jpeg,image/webp,image/gif,image/bmp" onFiles={(f) => { setSvg(''); setFile(f[0]) }} label={file ? `${file.name} · drop or click to replace` : 'Drop a PNG or JPG here, or click to choose'} hint="Works best on logos, icons and drawings. Traced on your device." />
      <ErrorBox message={error} />
      <StyleSettings preset={preset} setPreset={setPreset} colors={colors} setColors={setColors} />
      {img && (
        <>
          {busy && <div className="muted" role="status">Tracing…</div>}
          <div className="cols">
            <figure style={{ margin: 0 }}><figcaption className="muted" style={{ fontSize: 13 }}>Original</figcaption><img src={origUrl} alt="Original" className="checker" style={{ maxWidth: '100%', maxHeight: 300, objectFit: 'contain' }} /></figure>
            <figure style={{ margin: 0 }}><figcaption className="muted" style={{ fontSize: 13 }}>SVG {svg && `· ${fmtBytes(new Blob([svg]).size)}`}</figcaption>{svg && <img src={url} alt="Traced SVG" className="checker" style={{ maxWidth: '100%', maxHeight: 300, objectFit: 'contain' }} />}</figure>
          </div>
          <Row>
            <button className="btn primary" disabled={!svg || busy} onClick={() => downloadBlob(`${baseName(file!.name)}.svg`, new Blob([svg], { type: 'image/svg+xml' }))}>Download SVG</button>
            <CopyButton value={svg} label="Copy SVG code" />
          </Row>
        </>
      )}
    </>
  )
}
