import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { Link } from 'react-router-dom'
import { Eraser, Undo2 } from 'lucide-react'
import { canvasToBlob, downloadBlob, Field, Row } from '../components/ui'

type Point = { x: number; y: number }
const FONTS = ['Dancing Script', 'Great Vibes', 'Caveat', 'Sacramento', 'Allura']
const W = 900, H = 300

function loadFonts() {
  if (document.getElementById('sig-fonts')) return
  const l = document.createElement('link')
  l.id = 'sig-fonts'; l.rel = 'stylesheet'
  l.href = `https://fonts.googleapis.com/css2?${FONTS.map((f) => `family=${f.replace(/ /g, '+')}`).join('&')}&display=swap`
  document.head.appendChild(l)
}

// crop to the ink with some padding, so the signature isn't lost in empty space
function trimmed(src: HTMLCanvasElement, background: string | null) {
  const ctx = src.getContext('2d', { willReadFrequently: true })!
  const d = ctx.getImageData(0, 0, src.width, src.height).data
  let x0 = src.width, y0 = src.height, x1 = -1, y1 = -1
  for (let y = 0; y < src.height; y++) for (let x = 0; x < src.width; x++) if (d[(y * src.width + x) * 4 + 3] > 10) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y }
  if (x1 < 0) return null
  const pad = 16, w = x1 - x0 + 1 + pad * 2, h = y1 - y0 + 1 + pad * 2
  const out = document.createElement('canvas'); out.width = w; out.height = h
  const o = out.getContext('2d')!
  if (background) { o.fillStyle = background; o.fillRect(0, 0, w, h) }
  o.drawImage(src, x0 - pad, y0 - pad, w, h, 0, 0, w, h)
  return out
}

export default function SignatureMaker() {
  const [mode, setMode] = useState<'draw' | 'type'>('draw')
  const [color, setColor] = useState('#111827')
  const [size, setSize] = useState(4)
  const [strokes, setStrokes] = useState<{ pts: Point[]; color: string; size: number }[]>([])
  const [name, setName] = useState('')
  const [font, setFont] = useState(FONTS[0])
  const canvas = useRef<HTMLCanvasElement>(null)
  const current = useRef<Point[] | null>(null)

  useEffect(() => { if (mode === 'type') loadFonts() }, [mode])

  // redraw everything (keeps lines smooth with quadratic curves between points)
  const render = (extra?: Point[]) => {
    const c = canvas.current
    if (!c) return
    const ctx = c.getContext('2d')!
    ctx.clearRect(0, 0, W, H)
    if (mode === 'type') {
      if (!name.trim()) return
      ctx.fillStyle = color
      let fs = 120
      ctx.font = `${fs}px "${font}", cursive`
      while (ctx.measureText(name).width > W - 60 && fs > 30) { fs -= 4; ctx.font = `${fs}px "${font}", cursive` }
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText(name, W / 2, H / 2)
      return
    }
    const all = extra ? [...strokes, { pts: extra, color, size }] : strokes
    for (const s of all) {
      ctx.strokeStyle = s.color; ctx.lineWidth = s.size; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
      ctx.beginPath()
      const p = s.pts
      ctx.moveTo(p[0].x, p[0].y)
      if (p.length === 1) ctx.lineTo(p[0].x + 0.1, p[0].y)
      for (let i = 1; i < p.length - 1; i++) ctx.quadraticCurveTo(p[i].x, p[i].y, (p[i].x + p[i + 1].x) / 2, (p[i].y + p[i + 1].y) / 2)
      if (p.length > 1) ctx.lineTo(p[p.length - 1].x, p[p.length - 1].y)
      ctx.stroke()
    }
  }
  useEffect(() => { render() }) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (mode !== 'type') return; const t = setTimeout(() => render(), 600); return () => clearTimeout(t) }, [font, mode]) // fonts finish loading

  const pos = (e: PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H }
  }
  const down = (e: PointerEvent<HTMLCanvasElement>) => { if (mode !== 'draw') return; e.currentTarget.setPointerCapture(e.pointerId); current.current = [pos(e)]; render(current.current) }
  const move = (e: PointerEvent<HTMLCanvasElement>) => { if (!current.current) return; current.current.push(pos(e)); render(current.current) }
  const up = () => { if (current.current) setStrokes([...strokes, { pts: current.current, color, size }]); current.current = null }

  const empty = mode === 'draw' ? strokes.length === 0 : !name.trim()
  const save = async (transparent: boolean) => {
    const t = trimmed(canvas.current!, transparent ? null : '#ffffff')
    if (!t) return
    downloadBlob(`signature.${transparent ? 'png' : 'jpg'}`, await canvasToBlob(t, transparent ? 'image/png' : 'image/jpeg', 0.95))
  }

  return (
    <>
      <div className="seg" role="group" aria-label="How to create the signature" style={{ alignSelf: 'flex-start' }}>
        <button aria-pressed={mode === 'draw'} onClick={() => setMode('draw')}>Draw</button>
        <button aria-pressed={mode === 'type'} onClick={() => setMode('type')}>Type</button>
      </div>
      {mode === 'type' && (
        <Row>
          <Field label="Your name"><input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="Type your name" autoFocus /></Field>
          <Field label="Style"><select value={font} onChange={(e) => setFont(e.target.value)}>{FONTS.map((f) => <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>)}</select></Field>
        </Row>
      )}
      <Row>
        <div className="filter-chips" role="group" aria-label="Ink colour">
          {[['#111827', 'Black'], ['#1d3a8a', 'Blue'], ['#7f1d1d', 'Red']].map(([c, l]) => <button key={c} className={`chip ${color === c ? 'active' : ''}`} aria-pressed={color === c} onClick={() => setColor(c)}><span style={{ width: 12, height: 12, borderRadius: 6, background: c, display: 'inline-block' }} />{l}</button>)}
        </div>
        {mode === 'draw' && <Field label={`Pen size: ${size}`}><input type="range" min={1.5} max={10} step={0.5} value={size} onChange={(e) => setSize(+e.target.value)} /></Field>}
      </Row>
      <canvas ref={canvas} width={W} height={H} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
        aria-label={mode === 'draw' ? 'Signature pad — draw your signature here' : 'Signature preview'}
        style={{ width: '100%', aspectRatio: `${W} / ${H}`, background: '#fff', border: '1px dashed var(--input-border)', borderRadius: 8, touchAction: 'none', cursor: mode === 'draw' ? 'crosshair' : 'default' }} />
      {mode === 'draw' && <p className="muted" style={{ margin: 0, fontSize: 13 }}>Sign with your mouse, trackpad or finger. On a phone, turning it sideways gives more room.</p>}
      <Row>
        {mode === 'draw' && <button className="btn" disabled={!strokes.length} onClick={() => setStrokes(strokes.slice(0, -1))}><Undo2 size={15} aria-hidden="true" />Undo</button>}
        <button className="btn" disabled={empty} onClick={() => { setStrokes([]); setName('') }}><Eraser size={15} aria-hidden="true" />Clear</button>
        <button className="btn primary" disabled={empty} onClick={() => save(true)}>Download PNG (transparent)</button>
        <button className="btn" disabled={empty} onClick={() => save(false)}>Download JPG (white)</button>
      </Row>
      <p className="muted" style={{ margin: 0, fontSize: 13 }}>Need it in a specific size for an exam form? Use the <Link to="/tool/exam-photo-resizer">Exam Photo &amp; Signature Resizer</Link>.</p>
    </>
  )
}
