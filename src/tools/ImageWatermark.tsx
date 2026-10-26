import { useEffect, useRef, useState } from 'react'
import { baseName, canvasFits, canvasToBlob, downloadBlob, ErrorBox, extOf, Field, FileDrop, imageSize, loadImage, Row, useImageFile } from '../components/ui'
import BatchRunner, { BulkToggle, type BatchProcess } from '../components/Batch'

const POS = ['top-left', 'top-center', 'top-right', 'middle-left', 'center', 'middle-right', 'bottom-left', 'bottom-center', 'bottom-right']

interface Mark { text: string; pos: string; size: number; opacity: number; color: string; angle: number; tile: boolean; shadow: boolean }

/** Draw the image plus watermark onto `c`. Font size is a % of the image width, so it looks alike at any resolution. */
function drawWatermark(c: HTMLCanvasElement, img: HTMLImageElement, m: Mark) {
  const { text, pos, size, opacity, color, angle, tile, shadow } = m
  const sz = imageSize(img); c.width = sz.w; c.height = sz.h
  const ctx = c.getContext('2d')!
  ctx.drawImage(img, 0, 0, c.width, c.height)
  const fs = Math.max(8, (c.width * size) / 100)
  ctx.font = `600 ${fs}px system-ui, -apple-system, Segoe UI, sans-serif`
  ctx.fillStyle = color
  ctx.globalAlpha = opacity / 100
  if (shadow) { ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = fs / 8 }
  const tw = ctx.measureText(text).width
  const pad = fs * 0.8
  const stamp = (x: number, y: number) => {
    ctx.save(); ctx.translate(x, y); ctx.rotate((-angle * Math.PI) / 180)
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 0, 0); ctx.restore()
  }
  if (tile) {
    const sx = tw + fs * 3, sy = fs * 4
    for (let y = 0, row = 0; y < c.height + sy; y += sy, row++) for (let x = (row % 2) * (sx / 2); x < c.width + sx; x += sx) stamp(x, y)
  } else {
    const [v, h] = pos === 'center' ? ['middle', 'center'] : pos.split('-')
    const x = h === 'left' ? pad + tw / 2 : h === 'right' ? c.width - pad - tw / 2 : c.width / 2
    const y = v === 'top' ? pad + fs / 2 : v === 'bottom' ? c.height - pad - fs / 2 : c.height / 2
    stamp(x, y)
  }
  ctx.globalAlpha = 1
}

// keep PNG for anything that may have transparency; JPEG would turn it black
const outType = (file: File) => (file.type === 'image/jpeg' ? 'image/jpeg' : 'image/png')

/** Watermark one file — used by bulk mode. */
async function watermarkOne(file: File, m: Mark) {
  const img = await loadImage(file).catch(() => { throw new Error('Not an image this browser can open (HEIC/RAW: convert to JPG first).') })
  const { w, h } = imageSize(img)
  if (!canvasFits(w, h)) throw new Error('Too large for the browser to process.')
  const c = document.createElement('canvas')
  drawWatermark(c, img, m)
  const blob = await canvasToBlob(c, outType(file), 0.92)
  return { name: `${baseName(file.name)}-watermarked.${extOf(blob.type)}`, blob }
}

const DEFAULT_MARK: Mark = { text: '© Your Name', pos: 'bottom-right', size: 5, opacity: 60, color: '#ffffff', angle: 0, tile: false, shadow: true }

function MarkSettings({ m, set }: { m: Mark; set: (patch: Partial<Mark>) => void }) {
  return (
    <>
      <Row>
        <Field label="Watermark text"><input value={m.text} onChange={(e) => set({ text: e.target.value })} /></Field>
        <Field label="Color"><input type="color" value={m.color} onChange={(e) => set({ color: e.target.value })} /></Field>
      </Row>
      <Row>
        <Field label={`Size: ${m.size}% of width`}><input type="range" min={1} max={20} step={0.5} value={m.size} onChange={(e) => set({ size: +e.target.value })} /></Field>
        <Field label={`Opacity: ${m.opacity}%`}><input type="range" min={5} max={100} value={m.opacity} onChange={(e) => set({ opacity: +e.target.value })} /></Field>
        <Field label={`Angle: ${m.angle}°`}><input type="range" min={-90} max={90} value={m.angle} onChange={(e) => set({ angle: +e.target.value })} /></Field>
      </Row>
      <Row>
        <label className="check"><input type="checkbox" checked={m.tile} onChange={(e) => set({ tile: e.target.checked })} /> Repeat across image</label>
        <label className="check"><input type="checkbox" checked={m.shadow} onChange={(e) => set({ shadow: e.target.checked })} /> Shadow</label>
      </Row>
      {!m.tile && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 36px)', gap: 4 }} role="group" aria-label="Watermark position">
          {POS.map((p) => <button key={p} title={p.replace('-', ' ')} aria-label={p.replace('-', ' ')} aria-pressed={m.pos === p} className={`icon-btn ${m.pos === p ? 'chip active' : ''}`} style={{ height: 30 }} onClick={() => set({ pos: p })}>•</button>)}
        </div>
      )}
    </>
  )
}

function BulkWatermark({ m, setM, onSingle }: { m: Mark; setM: (m: Mark) => void; onSingle: () => void }) {
  const process: BatchProcess = (file) => watermarkOne(file, m)
  return (
    <>
      <BulkToggle bulk onChange={(b) => { if (!b) onSingle() }} />
      <MarkSettings m={m} set={(patch) => setM({ ...m, ...patch })} />
      <p className="muted" style={{ margin: 0, fontSize: 13 }}>The size is relative to each image’s width, so the watermark looks the same on small and large photos. JPGs stay JPG; everything else is saved as PNG.</p>
      <BatchRunner accept="image/*" process={process} settingsKey={JSON.stringify(m)} runLabel="Watermark all" zipName="watermarked-images" />
    </>
  )
}

export default function ImageWatermark() {
  const [bulk, setBulk] = useState(false)
  const { file, img, error, setFile } = useImageFile()
  const [m, setM] = useState<Mark>(DEFAULT_MARK)
  const canvas = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const c = canvas.current
    if (!c || !img) return
    drawWatermark(c, img, m)
  }, [img, m, bulk]) // bulk: the canvas is remounted when coming back from bulk mode

  const save = async () => {
    const blob = await canvasToBlob(canvas.current!, outType(file!), 0.92)
    downloadBlob(`${baseName(file!.name)}-watermarked.${extOf(blob.type)}`, blob)
  }

  // settings are shared, so switching modes keeps the watermark you set up
  if (bulk) return <BulkWatermark m={m} setM={setM} onSingle={() => setBulk(false)} />
  return (
    <>
      <BulkToggle bulk={false} onChange={setBulk} />
      <FileDrop accept="image/*" onFiles={(f) => setFile(f[0])} label={file ? `🖼️ ${file.name} (click to change)` : 'Drop an image or click to choose'} />
      <ErrorBox message={error} />
      <MarkSettings m={m} set={(patch) => setM({ ...m, ...patch })} />
      {img && (
        <>
          <canvas ref={canvas} style={{ maxWidth: '100%', maxHeight: 480, alignSelf: 'center', borderRadius: 8 }} />
          <div><button className="btn primary" onClick={save}>Download</button></div>
        </>
      )}
    </>
  )
}
