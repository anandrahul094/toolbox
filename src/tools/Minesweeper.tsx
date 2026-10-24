import { useEffect, useRef, useState } from 'react'
import { Row } from '../components/ui'

const LEVELS = { Beginner: [9, 9, 10], Intermediate: [16, 16, 40], Expert: [24, 16, 70] } as const
type Level = keyof typeof LEVELS
interface Cell { mine: boolean; n: number; open: boolean; flag: boolean }
const NUM_COLORS = ['', '#2563eb', '#16a34a', '#dc2626', '#1e3a8a', '#7f1d1d', '#0f766e', '#111', '#6b7280']

const blank = (w: number, h: number): Cell[] => Array.from({ length: w * h }, () => ({ mine: false, n: 0, open: false, flag: false }))
const around = (i: number, w: number, h: number) => {
  const x = i % w, y = Math.floor(i / w), out: number[] = []
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const nx = x + dx, ny = y + dy; if ((dx || dy) && nx >= 0 && ny >= 0 && nx < w && ny < h) out.push(ny * w + nx) }
  return out
}
// mines are placed after the first click, never on or next to it
function layMines(cells: Cell[], w: number, h: number, count: number, safe: number) {
  const banned = new Set([safe, ...around(safe, w, h)])
  const spots = cells.map((_, i) => i).filter((i) => !banned.has(i))
  for (let k = 0; k < count; k++) { const j = k + Math.floor(Math.random() * (spots.length - k)); [spots[k], spots[j]] = [spots[j], spots[k]] }
  const next = cells.map((c) => ({ ...c }))
  spots.slice(0, count).forEach((i) => { next[i].mine = true })
  next.forEach((c, i) => { c.n = around(i, w, h).filter((j) => next[j].mine).length })
  return next
}
function reveal(cells: Cell[], start: number, w: number, h: number) {
  const next = cells.map((c) => ({ ...c })), stack = [start]
  while (stack.length) {
    const i = stack.pop()!
    if (next[i].open || next[i].flag) continue
    next[i].open = true
    if (next[i].n === 0 && !next[i].mine) stack.push(...around(i, w, h))
  }
  return next
}

export default function Minesweeper() {
  const [level, setLevel] = useState<Level>('Beginner')
  const [w, h, mines] = LEVELS[level]
  const [cells, setCells] = useState(() => blank(w, h))
  const [state, setState] = useState<'ready' | 'playing' | 'won' | 'lost'>('ready')
  const [flagMode, setFlagMode] = useState(false)
  const [secs, setSecs] = useState(0)
  const press = useRef<number | null>(null)

  useEffect(() => { if (state !== 'playing') return; const t = setInterval(() => setSecs((s) => s + 1), 1000); return () => clearInterval(t) }, [state])
  const reset = (l = level) => { const [nw, nh] = LEVELS[l]; setCells(blank(nw, nh)); setState('ready'); setSecs(0) }

  const finish = (next: Cell[]) => {
    if (next.some((c) => c.open && c.mine)) { setCells(next.map((c) => (c.mine ? { ...c, open: true } : c))); setState('lost'); return }
    if (next.every((c) => c.mine || c.open)) { setCells(next.map((c) => (c.mine ? { ...c, flag: true } : c))); setState('won'); return }
    setCells(next)
  }
  const open = (i: number) => {
    if (state === 'won' || state === 'lost') return
    let board = cells
    if (state === 'ready') { board = layMines(cells, w, h, mines, i); setState('playing') }
    const c = board[i]
    if (c.flag) return
    // clicking an opened number with the right flags around it opens its neighbours ("chording")
    if (c.open) {
      const nb = around(i, w, h)
      if (c.n && nb.filter((j) => board[j].flag).length === c.n) { let next = board; nb.forEach((j) => { if (!next[j].flag && !next[j].open) next = reveal(next, j, w, h) }); finish(next) }
      return
    }
    finish(reveal(board, i, w, h))
  }
  const flag = (i: number) => {
    if (state === 'won' || state === 'lost' || cells[i].open) return
    setCells(cells.map((c, j) => (j === i ? { ...c, flag: !c.flag } : c)))
  }
  const flags = cells.filter((c) => c.flag).length
  const face = state === 'won' ? '😎' : state === 'lost' ? '😵' : '🙂'
  const size = level === 'Beginner' ? 36 : 28

  return (
    <>
      <Row>
        <div className="seg" role="group" aria-label="Level">{(Object.keys(LEVELS) as Level[]).map((l) => <button key={l} aria-pressed={level === l} onClick={() => { setLevel(l); reset(l) }}>{l}</button>)}</div>
        <button className="btn" aria-pressed={flagMode} onClick={() => setFlagMode(!flagMode)} style={flagMode ? { borderColor: 'var(--accent)' } : undefined}>🚩 Flag mode {flagMode ? 'on' : 'off'}</button>
      </Row>
      <Row>
        <span className="mono" style={{ fontSize: 18 }}>💣 {mines - flags}</span>
        <button className="btn" onClick={() => reset()} aria-label="New game" style={{ fontSize: 22, padding: '4px 12px' }}>{face}</button>
        <span className="mono" style={{ fontSize: 18 }}>⏱ {secs}</span>
      </Row>
      {state === 'won' && <div className="badge" aria-live="polite">You cleared the field in {secs} seconds! 🎉</div>}
      {state === 'lost' && <div className="error" aria-live="polite">Boom! Press 🙂 to try again.</div>}
      <div style={{ overflowX: 'auto', maxWidth: '100%' }}>
        <div role="grid" aria-label="Minefield" style={{ display: 'grid', gridTemplateColumns: `repeat(${w}, ${size}px)`, gap: 2, width: 'max-content', userSelect: 'none', touchAction: 'manipulation' }}
          onContextMenu={(e) => e.preventDefault()}>
          {cells.map((c, i) => (
            <button key={i} aria-label={c.open ? (c.mine ? 'Mine' : c.n ? String(c.n) : 'Empty') : c.flag ? 'Flagged' : 'Hidden'}
              onClick={() => (flagMode ? flag(i) : open(i))}
              onContextMenu={(e) => { e.preventDefault(); flag(i) }}
              // long-press to flag on phones
              onTouchStart={() => { press.current = window.setTimeout(() => { flag(i); press.current = -1 }, 420) }}
              onTouchEnd={(e) => { if (press.current === -1) e.preventDefault(); if (press.current && press.current > 0) clearTimeout(press.current); press.current = null }}
              style={{ width: size, height: size, padding: 0, border: 'none', borderRadius: 4, fontWeight: 800, fontSize: size * 0.5, cursor: 'pointer',
                background: c.open ? (c.mine ? '#fecaca' : 'var(--surface-2)') : '#94a3b8', color: NUM_COLORS[c.n], boxShadow: c.open ? 'none' : 'inset -2px -2px 0 rgba(0,0,0,.2), inset 2px 2px 0 rgba(255,255,255,.4)' }}>
              {c.open ? (c.mine ? '💣' : c.n || '') : c.flag ? '🚩' : ''}
            </button>
          ))}
        </div>
      </div>
      <p className="muted" style={{ margin: 0, fontSize: 13 }}>Click to open a square; numbers tell you how many mines touch it. Right-click, long-press or use flag mode to mark mines. Click a number whose mines are all flagged to open the rest around it. Your first click is always safe.</p>
    </>
  )
}
