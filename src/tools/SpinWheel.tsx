import { useEffect, useRef, useState } from 'react'
import { Shuffle } from 'lucide-react'
import { Field, Row } from '../components/ui'

const PALETTE = ['#e11d48', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#84cc16', '#6366f1', '#ef4444', '#0ea5e9']
const PRESETS: [string, string][] = [
  ['Names', 'Aarav\nDiya\nKabir\nMeera\nRohan\nSara\nVivaan\nZoya'],
  ['Yes / No', 'Yes\nNo'],
  ['What to eat', 'Biryani\nPizza\nDosa\nChole bhature\nMomos\nPaneer tikka\nNoodles\nThali'],
  ['Numbers 1–10', '1\n2\n3\n4\n5\n6\n7\n8\n9\n10'],
  ['Truth or dare', 'Truth\nDare\nTruth\nDare\nYour choice'],
]
const KEY = 'toolbox.wheel' // the wheel's entries, so it's still there next visit

const parse = (s: string) => s.split('\n').map((x) => x.trim()).filter(Boolean).slice(0, 100)
const easeOut = (t: number) => 1 - (1 - t) ** 4

export default function SpinWheel() {
  const [text, setText] = useState(() => { try { return localStorage.getItem(KEY) ?? PRESETS[0][1] } catch { return PRESETS[0][1] } })
  const [angle, setAngle] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [winner, setWinner] = useState<string | null>(null)
  const [removeWinner, setRemoveWinner] = useState(false)
  const [sound, setSound] = useState(true)
  const [history, setHistory] = useState<string[]>([])
  const canvas = useRef<HTMLCanvasElement>(null)
  const audio = useRef<AudioContext | null>(null)
  const items = parse(text)

  useEffect(() => { try { localStorage.setItem(KEY, text) } catch { /* ignore */ } }, [text])

  // pointer at the top (−90°); find which slice sits under it
  const indexAt = (a: number, n = items.length) => {
    const slice = (Math.PI * 2) / n
    const rel = (((-Math.PI / 2 - a) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)
    return Math.floor(rel / slice) % n
  }

  useEffect(() => {
    const c = canvas.current
    if (!c) return
    const S = 520, dpr = window.devicePixelRatio || 1
    c.width = S * dpr; c.height = S * dpr
    const ctx = c.getContext('2d')!
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, S, S)
    const r = S / 2 - 12, cx = S / 2, cy = S / 2
    if (!items.length) return
    const slice = (Math.PI * 2) / items.length
    items.forEach((label, i) => {
      const a0 = angle + i * slice
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r, a0, a0 + slice); ctx.closePath()
      // the last slice touches the first, so avoid giving them the same colour
      ctx.fillStyle = PALETTE[i > 0 && i === items.length - 1 && i % PALETTE.length === 0 ? 5 : i % PALETTE.length]
      ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 2; ctx.stroke()
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(a0 + slice / 2)
      ctx.fillStyle = '#fff'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle'
      const fs = Math.max(11, Math.min(26, 260 / items.length + 8))
      ctx.font = `600 ${fs}px Inter, 'Noto Sans Devanagari', system-ui, sans-serif`
      let t = label
      while (ctx.measureText(t).width > r - 50 && t.length > 2) t = t.slice(0, -2) + '…'
      ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 3
      ctx.fillText(t, r - 16, 0)
      ctx.restore()
    })
    ctx.beginPath(); ctx.arc(cx, cy, 34, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#d4d4d8'; ctx.lineWidth = 3; ctx.stroke()
    // pointer
    ctx.beginPath(); ctx.moveTo(cx - 16, 2); ctx.lineTo(cx + 16, 2); ctx.lineTo(cx, 38); ctx.closePath()
    ctx.fillStyle = '#18181b'; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke()
  }, [angle, text]) // eslint-disable-line react-hooks/exhaustive-deps

  const tick = () => {
    if (!sound) return
    try {
      audio.current ??= new AudioContext()
      const ac = audio.current, o = ac.createOscillator(), g = ac.createGain()
      o.frequency.value = 900; g.gain.setValueAtTime(0.06, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.04)
      o.connect(g).connect(ac.destination); o.start(); o.stop(ac.currentTime + 0.05)
    } catch { /* audio not available */ }
  }

  const spin = () => {
    // in "no repeats" mode the previous winner leaves the wheel before the next spin
    let list = items
    if (removeWinner && winner) { const i = items.indexOf(winner); list = items.filter((_, j) => j !== i); setText(list.join('\n')) }
    if (spinning || list.length < 2) return
    setWinner(null); setSpinning(true)
    // a fair random stop: uniform over the full circle, plus 5–8 extra turns for show
    const rnd = crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32
    const target = angle + Math.PI * 2 * (5 + Math.floor(rnd * 4)) + rnd * Math.PI * 2
    const start = angle, dur = 4200 + rnd * 1200, t0 = performance.now()
    let last = indexAt(start, list.length)
    const frame = (now: number) => {
      const t = Math.min(1, (now - t0) / dur), a = start + (target - start) * easeOut(t)
      setAngle(a)
      const idx = indexAt(a, list.length)
      if (idx !== last) { last = idx; tick() }
      if (t < 1) requestAnimationFrame(frame)
      else {
        const w = list[indexAt(target, list.length)]
        setSpinning(false); setWinner(w); setHistory((h) => [w, ...h].slice(0, 20))
        setAngle(target % (Math.PI * 2))
      }
    }
    requestAnimationFrame(frame)
  }

  const shuffle = () => { const a = [...items]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] } setText(a.join('\n')) }
  const dropWinner = () => { if (!winner) return; const i = items.indexOf(winner); setText(items.filter((_, j) => j !== i).join('\n')); setWinner(null) }

  return (
    <div className="cols">
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <canvas ref={canvas} onClick={spin} role="button" aria-label={spinning ? 'Wheel spinning' : 'Spin the wheel'} tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); spin() } }}
          style={{ width: '100%', maxWidth: 440, aspectRatio: '1', cursor: spinning ? 'default' : 'pointer' }} />
        <button className="btn primary" style={{ fontSize: 18, padding: '12px 32px' }} disabled={spinning || items.length < 2} onClick={spin}>{spinning ? 'Spinning…' : 'Spin'}</button>
        <div aria-live="polite" style={{ minHeight: 64, textAlign: 'center' }}>
          {winner && (
            <>
              <div className="muted" style={{ fontSize: 13 }}>The wheel says</div>
              <div style={{ fontSize: 30, fontWeight: 700 }}>🎉 {winner}</div>
              {!removeWinner && <button className="btn" onClick={dropWinner}>Remove “{winner}” from the wheel</button>}
            </>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Field label={`Entries (${items.length}) — one per line`}><textarea value={text} onChange={(e) => setText(e.target.value)} disabled={spinning} style={{ minHeight: 200, fontFamily: 'inherit', fontSize: 15 }} /></Field>
        <div className="filter-chips">{PRESETS.map(([l, v]) => <button key={l} className="chip" disabled={spinning} onClick={() => { setText(v); setWinner(null) }}>{l}</button>)}</div>
        <Row>
          <button className="btn" disabled={spinning} onClick={shuffle}><Shuffle size={15} aria-hidden="true" />Shuffle</button>
          <button className="btn" disabled={spinning} onClick={() => { setText(items.slice().sort((a, b) => a.localeCompare(b)).join('\n')) }}>Sort A–Z</button>
          <button className="btn" disabled={spinning} onClick={() => setText('')}>Clear</button>
        </Row>
        <label className="check"><input type="checkbox" checked={removeWinner} onChange={(e) => setRemoveWinner(e.target.checked)} /> Remove each winner automatically (for draws without repeats)</label>
        <label className="check"><input type="checkbox" checked={sound} onChange={(e) => setSound(e.target.checked)} /> Tick sound</label>
        {history.length > 0 && <div className="muted" style={{ fontSize: 14 }}>Results: {history.join(' · ')}</div>}
        <p className="muted" style={{ margin: 0, fontSize: 13 }}>Every entry has an equal chance — the stopping point uses your browser’s secure random generator. Repeat an entry to give it more slices.</p>
      </div>
    </div>
  )
}
