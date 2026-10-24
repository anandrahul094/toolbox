import { useCallback, useEffect, useRef, useState } from 'react'
import { Row } from '../components/ui'

type Grid = number[][]
const N = 4
const BEST = 'toolbox.2048.best'
const COLORS: Record<number, [string, string]> = {
  2: ['#eee4da', '#776e65'], 4: ['#ede0c8', '#776e65'], 8: ['#f2b179', '#fff'], 16: ['#f59563', '#fff'], 32: ['#f67c5f', '#fff'], 64: ['#f65e3b', '#fff'],
  128: ['#edcf72', '#fff'], 256: ['#edcc61', '#fff'], 512: ['#edc850', '#fff'], 1024: ['#edc53f', '#fff'], 2048: ['#edc22e', '#fff'],
}

const empty = (): Grid => Array.from({ length: N }, () => Array(N).fill(0))
function addTile(g: Grid) {
  const free: [number, number][] = []
  g.forEach((r, i) => r.forEach((v, j) => { if (!v) free.push([i, j]) }))
  if (!free.length) return g
  const [i, j] = free[Math.floor(Math.random() * free.length)]
  const n = g.map((r) => [...r]); n[i][j] = Math.random() < 0.9 ? 2 : 4
  return n
}
// slide one row to the left, merging equal neighbours once
function slideRow(row: number[]) {
  const vals = row.filter(Boolean), out: number[] = []
  let gained = 0
  for (let i = 0; i < vals.length; i++) {
    if (vals[i] === vals[i + 1]) { out.push(vals[i] * 2); gained += vals[i] * 2; i++ } else out.push(vals[i])
  }
  while (out.length < N) out.push(0)
  return { row: out, gained }
}
const rotate = (g: Grid) => g[0].map((_, j) => g.map((r) => r[j]).reverse()) // clockwise
function move(g: Grid, dir: 'left' | 'right' | 'up' | 'down') {
  // rotate so every move is a left slide, then rotate back
  const turns = { left: 0, down: 1, right: 2, up: 3 }[dir]
  let m = g
  for (let k = 0; k < turns; k++) m = rotate(m)
  let gained = 0
  m = m.map((r) => { const s = slideRow(r); gained += s.gained; return s.row })
  for (let k = 0; k < (4 - turns) % 4; k++) m = rotate(m)
  const changed = m.some((r, i) => r.some((v, j) => v !== g[i][j]))
  return { grid: m, gained, changed }
}
const canMove = (g: Grid) => (['left', 'right', 'up', 'down'] as const).some((d) => move(g, d).changed)
const start = () => addTile(addTile(empty()))

export default function Game2048() {
  const [grid, setGrid] = useState<Grid>(start)
  const [score, setScore] = useState(0)
  const [best, setBest] = useState(() => { try { return +(localStorage.getItem(BEST) ?? 0) } catch { return 0 } })
  const [won, setWon] = useState(false)
  const [keepGoing, setKeepGoing] = useState(false)
  const touch = useRef<[number, number] | null>(null)
  const over = !canMove(grid)

  // keep the latest grid in a ref so key handlers never work on a stale board
  const gridRef = useRef(grid); gridRef.current = grid
  const scoreRef = useRef(score); scoreRef.current = score
  const go = useCallback((dir: 'left' | 'right' | 'up' | 'down') => {
    const r = move(gridRef.current, dir)
    if (!r.changed) return
    const next = addTile(r.grid)
    gridRef.current = next
    setGrid(next)
    const ns = scoreRef.current + r.gained
    scoreRef.current = ns
    setScore(ns)
    setBest((b) => { if (ns > b) { try { localStorage.setItem(BEST, String(ns)) } catch { /* ignore */ } return ns } return b })
    if (r.grid.some((row) => row.includes(2048))) setWon(true)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement | null)?.closest?.('input, textarea, select')) return
      const dir = ({ ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', a: 'left', d: 'right', w: 'up', s: 'down' } as const)[e.key as 'a']
      if (dir) { e.preventDefault(); go(dir) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go])

  const restart = () => { setGrid(start()); setScore(0); setWon(false); setKeepGoing(false) }
  const showWin = won && !keepGoing

  return (
    <>
      <Row>
        <div className="stat" style={{ minWidth: 90 }}><div className="stat-value">{score}</div><div className="stat-label">Score</div></div>
        <div className="stat" style={{ minWidth: 90 }}><div className="stat-value">{best}</div><div className="stat-label">Best</div></div>
        <button className="btn primary" onClick={restart}>New game</button>
      </Row>
      <div style={{ position: 'relative', width: 'min(100%, 420px)', aspectRatio: '1', background: '#bbada0', borderRadius: 10, padding: 10, display: 'grid', gridTemplateColumns: `repeat(${N}, 1fr)`, gap: 10, touchAction: 'none', userSelect: 'none' }}
        onTouchStart={(e) => { touch.current = [e.touches[0].clientX, e.touches[0].clientY] }}
        onTouchEnd={(e) => {
          if (!touch.current) return
          const dx = e.changedTouches[0].clientX - touch.current[0], dy = e.changedTouches[0].clientY - touch.current[1]
          touch.current = null
          if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return
          go(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up')
        }}
        role="grid" aria-label={`2048 board, score ${score}`}>
        {grid.flat().map((v, i) => {
          const [bg, fg] = COLORS[v] ?? ['#3c3a32', '#fff']
          return <div key={i} style={{ borderRadius: 6, display: 'grid', placeItems: 'center', background: v ? bg : 'rgba(238,228,218,.35)', color: fg, fontWeight: 800, fontSize: v >= 1024 ? 'clamp(16px, 5vw, 30px)' : v >= 128 ? 'clamp(18px, 6vw, 36px)' : 'clamp(20px, 7vw, 42px)', transition: 'background .1s' }}>{v || ''}</div>
        })}
        {(over || showWin) && (
          <div style={{ position: 'absolute', inset: 0, borderRadius: 10, background: 'rgba(238,228,218,.78)', display: 'grid', placeItems: 'center', textAlign: 'center' }}>
            <div>
              <div style={{ fontSize: 34, fontWeight: 800, color: '#776e65' }}>{showWin ? 'You made 2048! 🎉' : 'Game over'}</div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 10 }}>
                {showWin && <button className="btn" onClick={() => setKeepGoing(true)}>Keep going</button>}
                <button className="btn primary" onClick={restart}>Try again</button>
              </div>
            </div>
          </div>
        )}
      </div>
      <Row>
        {(['up', 'left', 'down', 'right'] as const).map((d) => <button key={d} className="btn" onClick={() => go(d)} aria-label={`Move ${d}`}>{{ up: '↑', left: '←', down: '↓', right: '→' }[d]}</button>)}
      </Row>
      <p className="muted" style={{ margin: 0, fontSize: 13 }}>Use the arrow keys (or W A S D), swipe on a phone, or tap the buttons. Equal tiles merge when they touch — reach 2048!</p>
    </>
  )
}
