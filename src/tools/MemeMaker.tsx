import { useEffect, useRef, useState } from 'react'
import { baseName, canvasToBlob, downloadBlob, ErrorBox, Field, FileDrop, imageSize, Row, useImageFile } from '../components/ui'

const FONT = 'Anton'
function loadFont() {
  if (document.getElementById('meme-font')) return
  const l = document.createElement('link')
  l.id = 'meme-font'; l.rel = 'stylesheet'
  l.href = 'https://fonts.googleapis.com/css2?family=Anton&family=Noto+Sans+Devanagari:wght@800&display=swap'
  document.head.appendChild(l)
}

// break text into lines that fit the width, shrinking the font if a single word is too long
function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number) {
  const lines: string[] = []
  for (const para of text.split('\n')) {
    let line = ''
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const test = line ? `${line} ${word}` : word
      if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = word } else line = test
    }
    lines.push(line)
  }
  return lines
}

export default function MemeMaker() {
  const { file, img, error, setFile } = useImageFile()
  const [top, setTop] = useState('')
  const [bottom, setBottom] = useState('')
  const [size, setSize] = useState(10)
  const [caps, setCaps] = useState(true)
  const [color, setColor] = useState('#ffffff')
  const [blank, setBlank] = useState(false)
  const [fontReady, setFontReady] = useState(0)
  const canvas = useRef<HTMLCanvasElement>(null)

  useEffect(() => { loadFont(); document.fonts?.load(`40px ${FONT}`).then(() => setFontReady((n) => n + 1)).catch(() => {}) }, [])

  useEffect(() => {
    const c = canvas.current
    if (!c || (!img && !blank)) return
    const nat = img && !blank ? imageSize(img) : { w: 1000, h: 1000 }
    const k = Math.min(1, 1600 / Math.max(nat.w, nat.h))
    const W = Math.round(nat.w * k), H = Math.round(nat.h * k)
    c.width = W; c.height = H
    const ctx = c.getContext('2d')!
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H)
    if (img && !blank) ctx.drawImage(img, 0, 0, W, H)
    const fs = Math.round((Math.min(W, H) * size) / 100)
    ctx.font = `${fs}px ${FONT}, 'Noto Sans Devanagari', Impact, 'Arial Black', sans-serif`
    ctx.textAlign = 'center'
    ctx.lineJoin = 'round'
    ctx.lineWidth = Math.max(2, fs / 8)
    ctx.strokeStyle = color === '#000000' ? '#fff' : '#000'
    ctx.fillStyle = color
    const pad = Math.round(fs * 0.3), maxW = W - pad * 2
    const draw = (raw: string, where: 'top' | 'bottom') => {
      const text = caps ? raw.toUpperCase() : raw
      if (!text.trim()) return
      const lines = wrap(ctx, text, maxW)
      const lh = fs * 1.1
      ctx.textBaseline = where === 'top' ? 'top' : 'bottom'
      lines.forEach((line, i) => {
        const y = where === 'top' ? pad + i * lh : H - pad - (lines.length - 1 - i) * lh
        ctx.strokeText(line, W / 2, y, maxW)
        ctx.fillText(line, W / 2, y, maxW)
      })
    }
    draw(top, 'top'); draw(bottom, 'bottom')
  }, [img, blank, top, bottom, size, caps, color, fontReady])

  const save = async (type: 'image/jpeg' | 'image/png') => {
    const name = file && !blank ? baseName(file.name) : 'meme'
    downloadBlob(`${name}-meme.${type === 'image/png' ? 'png' : 'jpg'}`, await canvasToBlob(canvas.current!, type, 0.92))
  }

  return (
    <>
      <FileDrop accept="image/*" onFiles={(f) => { setFile(f[0]); setBlank(false) }} label={file ? `${file.name} · drop or click to replace` : 'Drop a picture here, or click to choose'} hint="Your picture stays on your device." />
      <ErrorBox message={error} />
      {!img && !blank && <div><button className="btn" onClick={() => setBlank(true)}>Or start with a blank white square</button></div>}
      <Row>
        <Field label="Top text"><textarea style={{ minHeight: 60, fontFamily: 'inherit' }} value={top} onChange={(e) => setTop(e.target.value)} placeholder="When the code works on the first try" /></Field>
        <Field label="Bottom text"><textarea style={{ minHeight: 60, fontFamily: 'inherit' }} value={bottom} onChange={(e) => setBottom(e.target.value)} placeholder="But you don't know why" /></Field>
      </Row>
      <Row>
        <Field label={`Text size: ${size}`}><input type="range" min={4} max={20} value={size} onChange={(e) => setSize(+e.target.value)} /></Field>
        <Field label="Text colour"><input type="color" value={color} onChange={(e) => setColor(e.target.value)} /></Field>
      </Row>
      <label className="check"><input type="checkbox" checked={caps} onChange={(e) => setCaps(e.target.checked)} /> ALL CAPS</label>
      {(img || blank) && (
        <>
          <canvas ref={canvas} aria-label="Meme preview" style={{ maxWidth: '100%', maxHeight: 520, alignSelf: 'flex-start', border: '1px solid var(--border)', borderRadius: 6 }} />
          <Row>
            <button className="btn primary" onClick={() => save('image/jpeg')}>Download JPG</button>
            <button className="btn" onClick={() => save('image/png')}>Download PNG</button>
          </Row>
        </>
      )}
    </>
  )
}
