import { useEffect, useRef, useState } from 'react'
import { baseName, canvasToBlob, downloadBlob, ErrorBox, Field, FileDrop, imageSize, Row, useImageFile } from '../components/ui'

const PRESETS: [string, string, number, number][] = [
  ['Instagram', 'Post (square)', 1080, 1080], ['Instagram', 'Post (portrait 4:5)', 1080, 1350], ['Instagram', 'Story / Reel', 1080, 1920],
  ['YouTube', 'Thumbnail', 1280, 720], ['YouTube', 'Channel banner', 2560, 1440],
  ['LinkedIn', 'Post', 1200, 627], ['LinkedIn', 'Banner', 1584, 396], ['LinkedIn', 'Profile photo', 400, 400],
  ['Facebook', 'Post', 1200, 630], ['Facebook', 'Cover', 820, 312], ['Facebook', 'Profile photo', 320, 320],
  ['X / Twitter', 'Post', 1600, 900], ['X / Twitter', 'Header', 1500, 500],
  ['WhatsApp', 'Profile photo', 500, 500], ['Pinterest', 'Pin', 1000, 1500], ['Open Graph', 'Link preview', 1200, 630],
]

export default function SocialImageResizer() {
  const { file, img, error, setFile } = useImageFile()
  const [preset, setPreset] = useState(0)
  const [fit, setFit] = useState<'cover' | 'contain'>('cover')
  const [focusX, setFocusX] = useState(50)
  const [focusY, setFocusY] = useState(50)
  const [bg, setBg] = useState('#ffffff')
  const canvas = useRef<HTMLCanvasElement>(null)
  const [, , W, H] = PRESETS[preset]


  useEffect(() => {
    const c = canvas.current
    if (!c || !img) return
    c.width = W; c.height = H
    const ctx = c.getContext('2d')!
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H)
    const nat = imageSize(img)
    const s = (fit === 'cover' ? Math.max : Math.min)(W / nat.w, H / nat.h)
    const w = nat.w * s, h = nat.h * s
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(img, (W - w) * (focusX / 100), (H - h) * (focusY / 100), w, h)
  }, [img, W, H, fit, focusX, focusY, bg])

  const save = async () => {
    const [p, n] = PRESETS[preset]
    const slug = `${p}-${n}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    downloadBlob(`${baseName(file!.name)}-${slug}.jpg`, await canvasToBlob(canvas.current!, 'image/jpeg', 0.92))
  }

  return (
    <>
      <FileDrop accept="image/*" onFiles={(f) => setFile(f[0])} label={file ? `🖼️ ${file.name} (click to change)` : 'Drop an image or click to choose'} />
      <ErrorBox message={error} />
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
