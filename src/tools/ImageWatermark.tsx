import { useEffect, useRef, useState } from 'react'
import { baseName, canvasToBlob, downloadBlob, ErrorBox, extOf, Field, FileDrop, imageSize, Row, useImageFile } from '../components/ui'

const POS = ['top-left', 'top-center', 'top-right', 'middle-left', 'center', 'middle-right', 'bottom-left', 'bottom-center', 'bottom-right']

export default function ImageWatermark() {
  const { file, img, error, setFile } = useImageFile()
  const [text, setText] = useState('© Your Name')
  const [pos, setPos] = useState('bottom-right')
  const [size, setSize] = useState(5)
  const [opacity, setOpacity] = useState(60)
  const [color, setColor] = useState('#ffffff')
  const [angle, setAngle] = useState(0)
  const [tile, setTile] = useState(false)
  const [shadow, setShadow] = useState(true)
  const canvas = useRef<HTMLCanvasElement>(null)


  useEffect(() => {
    const c = canvas.current
    if (!c || !img) return
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
  }, [img, text, pos, size, opacity, color, angle, tile, shadow])

  const save = async () => {
    // keep PNG for anything that may have transparency; JPEG would turn it black
    const type = file!.type === 'image/jpeg' ? 'image/jpeg' : 'image/png'
    const blob = await canvasToBlob(canvas.current!, type, 0.92)
    downloadBlob(`${baseName(file!.name)}-watermarked.${extOf(blob.type)}`, blob)
  }

  return (
    <>
      <FileDrop accept="image/*" onFiles={(f) => setFile(f[0])} label={file ? `🖼️ ${file.name} (click to change)` : 'Drop an image or click to choose'} />
      <ErrorBox message={error} />
      <Row>
        <Field label="Watermark text"><input value={text} onChange={(e) => setText(e.target.value)} /></Field>
        <Field label="Color"><input type="color" value={color} onChange={(e) => setColor(e.target.value)} /></Field>
      </Row>
      <Row>
        <Field label={`Size: ${size}% of width`}><input type="range" min={1} max={20} step={0.5} value={size} onChange={(e) => setSize(+e.target.value)} /></Field>
        <Field label={`Opacity: ${opacity}%`}><input type="range" min={5} max={100} value={opacity} onChange={(e) => setOpacity(+e.target.value)} /></Field>
        <Field label={`Angle: ${angle}°`}><input type="range" min={-90} max={90} value={angle} onChange={(e) => setAngle(+e.target.value)} /></Field>
      </Row>
      <Row>
        <label className="check"><input type="checkbox" checked={tile} onChange={(e) => setTile(e.target.checked)} /> Repeat across image</label>
        <label className="check"><input type="checkbox" checked={shadow} onChange={(e) => setShadow(e.target.checked)} /> Shadow</label>
      </Row>
      {!tile && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 36px)', gap: 4 }} role="group" aria-label="Watermark position">
          {POS.map((p) => <button key={p} title={p.replace('-', ' ')} aria-label={p.replace('-', ' ')} aria-pressed={pos === p} className={`icon-btn ${pos === p ? 'chip active' : ''}`} style={{ height: 30 }} onClick={() => setPos(p)}>•</button>)}
        </div>
      )}
      {img && (
        <>
          <canvas ref={canvas} style={{ maxWidth: '100%', maxHeight: 480, alignSelf: 'center', borderRadius: 8 }} />
          <div><button className="btn primary" onClick={save}>Download</button></div>
        </>
      )}
    </>
  )
}
