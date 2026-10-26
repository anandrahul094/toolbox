import { useEffect, useRef, useState } from 'react'
import { baseName, canvasToBlob, downloadBlob, ErrorBox, Field, FileDrop, imageSize, loadImage, Row, useImageFile } from '../components/ui'
import BatchRunner, { BulkToggle, type BatchProcess } from '../components/Batch'

const PRESETS: [string, string, number, number][] = [
  ['Instagram', 'Post (square)', 1080, 1080], ['Instagram', 'Post (portrait 4:5)', 1080, 1350], ['Instagram', 'Story / Reel', 1080, 1920],
  ['YouTube', 'Thumbnail', 1280, 720], ['YouTube', 'Channel banner', 2560, 1440],
  ['LinkedIn', 'Post', 1200, 627], ['LinkedIn', 'Banner', 1584, 396], ['LinkedIn', 'Profile photo', 400, 400],
  ['Facebook', 'Post', 1200, 630], ['Facebook', 'Cover', 820, 312], ['Facebook', 'Profile photo', 320, 320],
  ['X / Twitter', 'Post', 1600, 900], ['X / Twitter', 'Header', 1500, 500],
  ['WhatsApp', 'Profile photo', 500, 500], ['Pinterest', 'Pin', 1000, 1500], ['Open Graph', 'Link preview', 1200, 630],
]

type Fit = 'cover' | 'contain'

function drawSocial(c: HTMLCanvasElement, img: HTMLImageElement, o: { W: number; H: number; fit: Fit; focusX: number; focusY: number; bg: string }) {
  const { W, H, fit, focusX, focusY, bg } = o
  c.width = W; c.height = H
  const ctx = c.getContext('2d')!
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H)
  const nat = imageSize(img)
  const s = (fit === 'cover' ? Math.max : Math.min)(W / nat.w, H / nat.h)
  const w = nat.w * s, h = nat.h * s
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, (W - w) * (focusX / 100), (H - h) * (focusY / 100), w, h)
}

const slugOf = (preset: number) => {
  const [p, n] = PRESETS[preset]
  return `${p}-${n}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

/** Resize one file to a preset, centred — used by bulk mode. */
async function socialOne(file: File, o: { preset: number; fit: Fit; bg: string }) {
  const img = await loadImage(file).catch(() => { throw new Error('Not an image this browser can open (HEIC/RAW: convert to JPG first).') })
  const [, , W, H] = PRESETS[o.preset]
  const c = document.createElement('canvas')
  drawSocial(c, img, { W, H, fit: o.fit, focusX: 50, focusY: 50, bg: o.bg })
  return { name: `${baseName(file.name)}-${slugOf(o.preset)}.jpg`, blob: await canvasToBlob(c, 'image/jpeg', 0.92) }
}

function PresetSettings({ preset, setPreset, fit, setFit, bg, setBg }: { preset: number; setPreset: (p: number) => void; fit: Fit; setFit: (f: Fit) => void; bg: string; setBg: (b: string) => void }) {
  return (
    <>
      <Field label="Size">
        <select value={preset} onChange={(e) => setPreset(+e.target.value)}>
          {PRESETS.map(([p, n, w, h], i) => <option key={i} value={i}>{p} — {n} ({w}×{h})</option>)}
        </select>
      </Field>
      <Row>
        <button className={`btn ${fit === 'cover' ? 'primary' : ''}`} onClick={() => setFit('cover')}>Fill (crop edges)</button>
        <button className={`btn ${fit === 'contain' ? 'primary' : ''}`} onClick={() => setFit('contain')}>Fit (add background)</button>
        {fit === 'contain' && <Field label="Background"><input type="color" value={bg} onChange={(e) => setBg(e.target.value)} /></Field>}
      </Row>
    </>
  )
}

function BulkSocial({ onSingle }: { onSingle: () => void }) {
  const [preset, setPreset] = useState(0)
  const [fit, setFit] = useState<Fit>('cover')
  const [bg, setBg] = useState('#ffffff')
  const [, , W, H] = PRESETS[preset]
  const process: BatchProcess = (file) => socialOne(file, { preset, fit, bg })
  return (
    <>
      <BulkToggle bulk onChange={(b) => { if (!b) onSingle() }} />
      <PresetSettings preset={preset} setPreset={setPreset} fit={fit} setFit={setFit} bg={bg} setBg={setBg} />
      <p className="muted" style={{ margin: 0, fontSize: 13 }}>Every image becomes a {W}×{H} JPG, centred. To choose which part of a photo is kept, use single mode.</p>
      <BatchRunner accept="image/*" process={process} settingsKey={`${preset}|${fit}|${fit === 'contain' ? bg : ''}`} runLabel="Resize all" zipName={slugOf(preset)} />
    </>
  )
}

export default function SocialImageResizer() {
  const [bulk, setBulk] = useState(false)
  const { file, img, error, setFile } = useImageFile()
  const [preset, setPreset] = useState(0)
  const [fit, setFit] = useState<Fit>('cover')
  const [focusX, setFocusX] = useState(50)
  const [focusY, setFocusY] = useState(50)
  const [bg, setBg] = useState('#ffffff')
  const canvas = useRef<HTMLCanvasElement>(null)
  const [, , W, H] = PRESETS[preset]


  useEffect(() => {
    const c = canvas.current
    if (!c || !img) return
    drawSocial(c, img, { W, H, fit, focusX, focusY, bg })
  }, [img, W, H, fit, focusX, focusY, bg, bulk]) // bulk: the canvas is remounted when coming back from bulk mode

  const save = async () => {
    downloadBlob(`${baseName(file!.name)}-${slugOf(preset)}.jpg`, await canvasToBlob(canvas.current!, 'image/jpeg', 0.92))
  }

  if (bulk) return <BulkSocial onSingle={() => setBulk(false)} />
  return (
    <>
      <BulkToggle bulk={false} onChange={setBulk} />
      <FileDrop accept="image/*" onFiles={(f) => setFile(f[0])} label={file ? `🖼️ ${file.name} (click to change)` : 'Drop an image or click to choose'} />
      <ErrorBox message={error} />
      <PresetSettings preset={preset} setPreset={setPreset} fit={fit} setFit={setFit} bg={bg} setBg={setBg} />
      <Row>
        <Field label={`Horizontal position: ${focusX}%`}><input type="range" min={0} max={100} value={focusX} onChange={(e) => setFocusX(+e.target.value)} /></Field>
        <Field label={`Vertical position: ${focusY}%`}><input type="range" min={0} max={100} value={focusY} onChange={(e) => setFocusY(+e.target.value)} /></Field>
      </Row>
      {img && (
        <>
          <canvas ref={canvas} style={{ maxWidth: '100%', maxHeight: 420, alignSelf: 'center', border: '1px solid var(--border)', borderRadius: 6 }} />
          <div><button className="btn primary" onClick={save}>Download {W}×{H} JPG</button></div>
        </>
      )}
    </>
  )
}
