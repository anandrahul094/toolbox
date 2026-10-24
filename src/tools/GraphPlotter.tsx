import { useEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from 'react'
import { Minus, Plus, RotateCcw, X } from 'lucide-react'
import { canvasToBlob, downloadBlob, Row } from '../components/ui'
import { compile } from '../lib/mathExpr'

const COLORS = ['#2563eb', '#dc2626', '#16a34a', '#9333ea', '#ea580c', '#0891b2']
interface View { cx: number; cy: number; scale: number } // scale = pixels per unit
const START: View = { cx: 0, cy: 0, scale: 50 }

// a "nice" grid step (1, 2 or 5 × 10ⁿ) for the current zoom
function niceStep(pxPerUnit: number) {
  const raw = 80 / pxPerUnit, p = 10 ** Math.floor(Math.log10(raw)), m = raw / p
  return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p
}
const label = (v: number) => String(+v.toPrecision(6))

export default function GraphPlotter() {
  const [exprs, setExprs] = useState(['sin(x)', 'x^2/4 - 1', ''])
  const [view, setView] = useState<View>(START)
  const [degrees, setDegrees] = useState(false)
  const [hover, setHover] = useState<{ x: number; px: number; py: number } | null>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const drag = useRef<{ x: number; y: number; v: View } | null>(null)
  const [size, setSize] = useState({ w: 800, h: 500 })

  const fns = useMemo(() => exprs.map((src) => {
    const s = src.replace(/^\s*y\s*=/i, '').trim()
    if (!s) return { f: null, error: null }
    try { const f = compile(s, ['x']); f({ x: 1 }, degrees); return { f, error: null } } catch (e) { return { f: null, error: (e as Error).message } }
  }), [exprs, degrees])

  useEffect(() => {
    const c = canvas.current
    if (!c) return
    const ro = new ResizeObserver(([e]) => setSize({ w: Math.round(e.contentRect.width), h: Math.round(Math.min(560, Math.max(300, e.contentRect.width * 0.62))) }))
    ro.observe(c.parentElement!)
    return () => ro.disconnect()
  }, [])

  const toPx = (x: number, y: number) => [size.w / 2 + (x - view.cx) * view.scale, size.h / 2 - (y - view.cy) * view.scale]
  const toX = (px: number) => view.cx + (px - size.w / 2) / view.scale

  useEffect(() => {
    const c = canvas.current
    if (!c) return
    const dpr = window.devicePixelRatio || 1
    c.width = size.w * dpr; c.height = size.h * dpr
    const ctx = c.getContext('2d')!
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    const dark = document.documentElement.dataset.theme === 'dark' || (!document.documentElement.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches)
    ctx.fillStyle = dark ? '#16181d' : '#ffffff'; ctx.fillRect(0, 0, size.w, size.h)
    const step = niceStep(view.scale)
    const x0 = view.cx - size.w / 2 / view.scale, x1 = view.cx + size.w / 2 / view.scale
    const y0 = view.cy - size.h / 2 / view.scale, y1 = view.cy + size.h / 2 / view.scale
    ctx.font = '11px Inter, system-ui, sans-serif'
    // grid
    ctx.strokeStyle = dark ? '#2a2e36' : '#eceef1'; ctx.lineWidth = 1
    for (let x = Math.ceil(x0 / step) * step; x <= x1; x += step) { const [px] = toPx(x, 0); ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, size.h); ctx.stroke() }
    for (let y = Math.ceil(y0 / step) * step; y <= y1; y += step) { const [, py] = toPx(0, y); ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(size.w, py); ctx.stroke() }
    // axes and labels
    const [ax, ay] = toPx(0, 0)
    ctx.strokeStyle = dark ? '#8b919c' : '#5b6170'; ctx.lineWidth = 1.2
    ctx.beginPath(); ctx.moveTo(0, ay); ctx.lineTo(size.w, ay); ctx.moveTo(ax, 0); ctx.lineTo(ax, size.h); ctx.stroke()
    ctx.fillStyle = dark ? '#9aa0ab' : '#6b7280'
    const ly = Math.min(size.h - 4, Math.max(12, ay + 13)), lx = Math.min(size.w - 4, Math.max(4, ax - 4))
    ctx.textAlign = 'center'
    for (let x = Math.ceil(x0 / step) * step; x <= x1; x += step) if (Math.abs(x) > step / 2) ctx.fillText(label(x), toPx(x, 0)[0], ly)
    ctx.textAlign = ax - 4 < 30 ? 'left' : 'right'
    for (let y = Math.ceil(y0 / step) * step; y <= y1; y += step) if (Math.abs(y) > step / 2) ctx.fillText(label(y), ax - 4 < 30 ? lx + 8 : lx, toPx(0, y)[1] + 4)
    // curves: sample every pixel, break the line at gaps and vertical asymptotes
    fns.forEach(({ f }, i) => {
      if (!f) return
      ctx.strokeStyle = COLORS[i % COLORS.length]; ctx.lineWidth = 2.2
      ctx.beginPath()
      let pen = false, prevY = NaN
      for (let px = 0; px <= size.w; px += 0.5) {
        let y: number
        try { y = f({ x: toX(px) }, degrees) } catch { y = NaN }
        const py = toPx(0, y)[1]
        const ok = Number.isFinite(y) && Math.abs(py) < 1e5
        if (ok && pen && Math.abs(py - prevY) < size.h * 2) ctx.lineTo(px, py)
        else if (ok) ctx.moveTo(px, py)
        pen = ok; prevY = py
      }
      ctx.stroke()
    })
    // hover readout
    if (hover) {
      ctx.strokeStyle = dark ? '#555' : '#c8ccd2'; ctx.setLineDash([4, 4]); ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(hover.px, 0); ctx.lineTo(hover.px, size.h); ctx.stroke(); ctx.setLineDash([])
      fns.forEach(({ f }, i) => {
        if (!f) return
        let y: number
        try { y = f({ x: hover.x }, degrees) } catch { return }
        if (!Number.isFinite(y)) return
        const [, py] = toPx(0, y)
        ctx.fillStyle = COLORS[i % COLORS.length]
        ctx.beginPath(); ctx.arc(hover.px, py, 4, 0, Math.PI * 2); ctx.fill()
      })
    }
  }, [fns, view, size, hover, degrees]) // eslint-disable-line react-hooks/exhaustive-deps

  const zoom = (k: number, at?: [number, number]) => setView((v) => {
    const scale = Math.min(1e6, Math.max(1e-4, v.scale * k))
    if (!at) return { ...v, scale }
    // keep the point under the cursor in place
    const wx = v.cx + (at[0] - size.w / 2) / v.scale, wy = v.cy - (at[1] - size.h / 2) / v.scale
    return { scale, cx: wx - (at[0] - size.w / 2) / scale, cy: wy + (at[1] - size.h / 2) / scale }
  })
  useEffect(() => {
    const c = canvas.current
    if (!c) return
    const onWheel = (e: WheelEvent) => { e.preventDefault(); const r = c.getBoundingClientRect(); zoom(e.deltaY < 0 ? 1.15 : 1 / 1.15, [e.clientX - r.left, e.clientY - r.top]) }
    c.addEventListener('wheel', onWheel, { passive: false })
    return () => c.removeEventListener('wheel', onWheel)
  }) // re-bind so zoom sees the current size

  const down = (e: RPointerEvent<HTMLCanvasElement>) => { e.currentTarget.setPointerCapture(e.pointerId); drag.current = { x: e.clientX, y: e.clientY, v: view } }
  const move = (e: RPointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect(), px = e.clientX - r.left
    setHover({ x: toX(px), px, py: e.clientY - r.top })
    const d = drag.current
    if (d) setView({ ...d.v, cx: d.v.cx - (e.clientX - d.x) / d.v.scale, cy: d.v.cy + (e.clientY - d.y) / d.v.scale })
  }

  const readout = hover ? fns.map(({ f }, i) => { if (!f) return null; try { const y = f({ x: hover.x }, degrees); return Number.isFinite(y) ? [i, y] as const : null } catch { return null } }).filter(Boolean) as (readonly [number, number])[] : []

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {exprs.map((src, i) => (
          <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ width: 12, height: 12, borderRadius: 6, background: COLORS[i % COLORS.length], flex: 'none' }} aria-hidden="true" />
            <span className="mono muted">y =</span>
            <input className="mono" value={src} onChange={(e) => setExprs(exprs.map((x, j) => (j === i ? e.target.value : x)))} placeholder="e.g. 2x + 1, sin(x), e^(-x^2)" aria-label={`Function ${i + 1}`} spellCheck={false} style={{ flex: 1 }} aria-invalid={!!fns[i].error} />
            <button className="icon-only" aria-label={`Remove function ${i + 1}`} onClick={() => setExprs(exprs.length > 1 ? exprs.filter((_, j) => j !== i) : [''])}><X size={14} /></button>
          </div>
        ))}
        {fns.map((f, i) => f.error && <div key={i} className="muted" style={{ fontSize: 13, color: 'var(--danger)' }}>Function {i + 1}: {f.error}</div>)}
      </div>
      <Row>
        {exprs.length < COLORS.length && <button className="btn" onClick={() => setExprs([...exprs, ''])}><Plus size={15} aria-hidden="true" />Add function</button>}
        <button className="btn" onClick={() => zoom(1.5)} aria-label="Zoom in"><Plus size={15} /></button>
        <button className="btn" onClick={() => zoom(1 / 1.5)} aria-label="Zoom out"><Minus size={15} /></button>
        <button className="btn" onClick={() => setView(START)}><RotateCcw size={15} aria-hidden="true" />Reset view</button>
        <label className="check"><input type="checkbox" checked={degrees} onChange={(e) => setDegrees(e.target.checked)} /> Trig in degrees</label>
      </Row>
      <div style={{ position: 'relative', width: '100%' }}>
        <canvas ref={canvas} onPointerDown={down} onPointerMove={move} onPointerUp={() => { drag.current = null }} onPointerLeave={() => { drag.current = null; setHover(null) }}
          aria-label="Graph — drag to move, scroll or use the buttons to zoom" style={{ width: size.w, height: size.h, display: 'block', border: '1px solid var(--border)', borderRadius: 8, touchAction: 'none', cursor: 'crosshair' }} />
        {hover && readout.length > 0 && (
          <div className="mono" style={{ position: 'absolute', top: 8, left: 8, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', fontSize: 12, pointerEvents: 'none' }}>
            <div>x = {label(hover.x)}</div>
            {readout.map(([i, y]) => <div key={i} style={{ color: COLORS[i % COLORS.length] }}>y{i + 1} = {label(y)}</div>)}
          </div>
        )}
      </div>
      <Row>
        <button className="btn" onClick={async () => downloadBlob('graph.png', await canvasToBlob(canvas.current!, 'image/png'))}>Download PNG</button>
      </Row>
      <p className="muted" style={{ margin: 0, fontSize: 13 }}>Use x as the variable. Write powers with ^ (x^2), multiply by writing next to each other (2x, 3sin(x)) and use any calculator function: sqrt, abs, ln, log, exp, sin… Drag to move, scroll or pinch-zoom buttons to zoom, hover to read values.</p>
    </>
  )
}
