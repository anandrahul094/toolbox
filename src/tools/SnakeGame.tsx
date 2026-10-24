import { useCallback, useEffect, useRef, useState } from 'react'
import { Row } from '../components/ui'

const N = 20 // cells per side
const BEST = 'toolbox.snake.best'
type P = [number, number]
const SPEEDS = { slow: 160, normal: 110, fast: 75 }
type Dir = 'up' | 'down' | 'left' | 'right'
const D: Record<Dir, P> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }
const OPP: Record<Dir, Dir> = { up: 'down', down: 'up', left: 'right', right: 'left' }

function food(snake: P[]): P {
  for (;;) { const f: P = [Math.floor(Math.random() * N), Math.floor(Math.random() * N)]; if (!snake.some(([x, y]) => x === f[0] && y === f[1])) return f }
}

export default function SnakeGame() {
  const canvas = useRef<HTMLCanvasElement>(null)
  const state = useRef({ snake: [[8, 10], [7, 10], [6, 10]] as P[], dir: 'right' as Dir, queue: [] as Dir[], food: [14, 10] as P, alive: true })
  const [status, setStatus] = useState<'ready' | 'playing' | 'paused' | 'over'>('ready')
  const [score, setScore] = useState(0)
  const [best, setBest] = useState(() => { try { return +(localStorage.getItem(BEST) ?? 0) } catch { return 0 } })
  const [speed, setSpeed] = useState<keyof typeof SPEEDS>('normal')
  const [walls, setWalls] = useState(false)
  const touch = useRef<P | null>(null)

  const draw = useCallback(() => {
    const c = canvas.current
    if (!c) return
    const S = c.width, cell = S / N, ctx = c.getContext('2d')!
    const dark = matchMedia('(prefers-color-scheme: dark)').matches && document.documentElement.dataset.theme !== 'light' || document.documentElement.dataset.theme === 'dark'
    ctx.fillStyle = dark ? '#1b1e24' : '#f4f6ef'; ctx.fillRect(0, 0, S, S)
    ctx.fillStyle = dark ? '#20242b' : '#eaeee2'
    for (let x = 0; x < N; x++) for (let y = 0; y < N; y++) if ((x + y) % 2) ctx.fillRect(x * cell, y * cell, cell, cell)
    const s = state.current
    ctx.font = `${cell * 0.85}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText('🍎', s.food[0] * cell + cell / 2, s.food[1] * cell + cell / 2 + 1)
    s.snake.forEach(([x, y], i) => {
      ctx.fillStyle = i === 0 ? '#15803d' : i % 2 ? '#22c55e' : '#16a34a'
      ctx.beginPath(); ctx.roundRect(x * cell + 1, y * cell + 1, cell - 2, cell - 2, i === 0 ? cell * 0.35 : cell * 0.2); ctx.fill()
    })
    if (walls) { ctx.strokeStyle = '#b91c1c'; ctx.lineWidth = 4; ctx.strokeRect(2, 2, S - 4, S - 4) }
  }, [walls])

  const reset = () => {
    state.current = { snake: [[8, 10], [7, 10], [6, 10]], dir: 'right', queue: [], food: [14, 10], alive: true }
    setScore(0); draw()
  }

  useEffect(() => { draw() }, [draw])

  useEffect(() => {
    if (status !== 'playing') return
    const t = setInterval(() => {
      const s = state.current
      if (s.queue.length) s.dir = s.queue.shift()!
      const [dx, dy] = D[s.dir]
      let hx = s.snake[0][0] + dx, hy = s.snake[0][1] + dy
      if (walls && (hx < 0 || hy < 0 || hx >= N || hy >= N)) return end()
      hx = (hx + N) % N; hy = (hy + N) % N
      const eats = hx === s.food[0] && hy === s.food[1]
      const body = eats ? s.snake : s.snake.slice(0, -1)
      if (body.some(([x, y]) => x === hx && y === hy)) return end()
      s.snake = [[hx, hy], ...body]
      if (eats) {
        s.food = food(s.snake)
        setScore((v) => v + 1)
        try { navigator.vibrate?.(15) } catch { /* not supported */ }
      }
      draw()
    }, SPEEDS[speed])
    const end = () => { clearInterval(t); setStatus('over') }
    return () => clearInterval(t)
  }, [status, speed, walls, draw])

  useEffect(() => {
    if (status === 'over' && score > best) { setBest(score); try { localStorage.setItem(BEST, String(score)) } catch { /* ignore */ } }
  }, [status]) // eslint-disable-line react-hooks/exhaustive-deps

  const turn = useCallback((d: Dir) => {
    const s = state.current
    const last = s.queue.at(-1) ?? s.dir
    if (d !== last && d !== OPP[last] && s.queue.length < 3) s.queue.push(d)
    setStatus((st) => (st === 'ready' ? 'playing' : st))
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement | null)?.closest?.('input, textarea, select')) return
      const d = ({ ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right' } as Record<string, Dir>)[e.key]
      if (d) { e.preventDefault(); turn(d) }
      if (e.key === ' ') { e.preventDefault(); setStatus((st) => (st === 'playing' ? 'paused' : st === 'paused' || st === 'ready' ? 'playing' : st)) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [turn])

  const startOver = () => { reset(); setStatus('playing') }

  return (
    <>
      <Row>
        <div className="stat" style={{ minWidth: 80 }}><div className="stat-value">{score}</div><div className="stat-label">Score</div></div>
        <div className="stat" style={{ minWidth: 80 }}><div className="stat-value">{best}</div><div className="stat-label">Best</div></div>
        <div className="seg" role="group" aria-label="Speed">
          {(Object.keys(SPEEDS) as (keyof typeof SPEEDS)[]).map((k) => <button key={k} aria-pressed={speed === k} onClick={() => setSpeed(k)}>{k[0].toUpperCase() + k.slice(1)}</button>)}
        </div>
        <label className="check"><input type="checkbox" checked={walls} disabled={status === 'playing'} onChange={(e) => setWalls(e.target.checked)} /> Solid walls</label>
      </Row>
      <div style={{ position: 'relative', width: 'min(100%, 440px)' }}
        onTouchStart={(e) => { touch.current = [e.touches[0].clientX, e.touches[0].clientY] }}
        onTouchEnd={(e) => {
          if (!touch.current) return
          const dx = e.changedTouches[0].clientX - touch.current[0], dy = e.changedTouches[0].clientY - touch.current[1]
          touch.current = null
          if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return
          turn(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up')
        }}>
        <canvas ref={canvas} width={600} height={600} aria-label={`Snake game, score ${score}`} style={{ width: '100%', display: 'block', borderRadius: 10, border: '1px solid var(--border)', touchAction: 'none' }} />
        {status !== 'playing' && (
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: 'rgba(0,0,0,.35)', borderRadius: 10, textAlign: 'center', color: '#fff' }}>
            <div>
              <div style={{ fontSize: 30, fontWeight: 800 }}>{status === 'over' ? `Game over — ${score}` : status === 'paused' ? 'Paused' : '🐍 Snake'}</div>
              <div style={{ margin: '6px 0 12px', fontSize: 14 }}>{status === 'over' && score >= best && score > 0 ? 'New best score!' : 'Arrow keys / WASD or swipe to steer · Space to pause'}</div>
              <button className="btn primary" onClick={() => (status === 'paused' ? setStatus('playing') : startOver())}>{status === 'paused' ? 'Resume' : status === 'over' ? 'Play again' : 'Start'}</button>
            </div>
          </div>
        )}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 56px)', gap: 6 }} aria-label="Direction buttons">
        <span /><button className="btn" onClick={() => turn('up')} aria-label="Up">↑</button><span />
        <button className="btn" onClick={() => turn('left')} aria-label="Left">←</button>
        <button className="btn" onClick={() => setStatus(status === 'playing' ? 'paused' : status === 'over' ? (startOver(), 'playing') : 'playing')} aria-label="Pause or play">{status === 'playing' ? '❚❚' : '▶'}</button>
        <button className="btn" onClick={() => turn('right')} aria-label="Right">→</button>
        <span /><button className="btn" onClick={() => turn('down')} aria-label="Down">↓</button><span />
      </div>
    </>
  )
}
