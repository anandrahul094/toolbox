import { useEffect, useState } from 'react'
import { Row } from '../components/ui'

const THEMES: Record<string, string[]> = {
  Animals: ['🐶', '🐱', '🐼', '🦊', '🐯', '🐸', '🐵', '🦁', '🐰', '🐨', '🐷', '🐙', '🦄', '🐢', '🦋'],
  Food: ['🍕', '🍔', '🍩', '🍎', '🍉', '🍇', '🥭', '🍌', '🍦', '🧁', '🍓', '🥥', '🌽', '🍿', '🥨'],
  India: ['🪔', '🛺', '🏏', '🍛', '🫖', '🐘', '🦚', '🪁', '🎆', '🕌', '🛕', '🥭', '🌶️', '🎶', '🪷'],
  Space: ['🚀', '🪐', '🌙', '⭐', '☄️', '🛰️', '👽', '🌍', '☀️', '🔭', '🌌', '🛸', '🌠', '👩‍🚀', '🌑'],
}
const SIZES = { Easy: [4, 3], Medium: [4, 4], Hard: [6, 5] } as const
type Size = keyof typeof SIZES
const bestKey = (s: Size) => `toolbox.memory.best.${s}`

function deal(theme: string, size: Size) {
  const [c, r] = SIZES[size]
  const pairs = THEMES[theme].slice(0, (c * r) / 2)
  const cards = [...pairs, ...pairs]
  for (let i = cards.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [cards[i], cards[j]] = [cards[j], cards[i]] }
  return cards
}

export default function MemoryGame() {
  const [theme, setTheme] = useState('Animals')
  const [size, setSize] = useState<Size>('Medium')
  const [cards, setCards] = useState(() => deal('Animals', 'Medium'))
  const [open, setOpen] = useState<number[]>([])
  const [matched, setMatched] = useState<Set<number>>(new Set())
  const [moves, setMoves] = useState(0)
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [now, setNow] = useState(Date.now())
  const [best, setBest] = useState<number | null>(null)
  const done = matched.size === cards.length

  useEffect(() => { try { const b = localStorage.getItem(bestKey(size)); setBest(b ? +b : null) } catch { setBest(null) } }, [size])
  useEffect(() => { if (!startedAt || done) return; const t = setInterval(() => setNow(Date.now()), 500); return () => clearInterval(t) }, [startedAt, done])
  useEffect(() => {
    if (!done || !moves) return
    if (best === null || moves < best) { setBest(moves); try { localStorage.setItem(bestKey(size), String(moves)) } catch { /* ignore */ } }
  }, [done]) // eslint-disable-line react-hooks/exhaustive-deps

  const newGame = (t = theme, s = size) => { setCards(deal(t, s)); setOpen([]); setMatched(new Set()); setMoves(0); setStartedAt(null) }

  const flip = (i: number) => {
    if (open.includes(i) || matched.has(i) || open.length === 2) return
    if (!startedAt) { setStartedAt(Date.now()); setNow(Date.now()) }
    const next = [...open, i]
    setOpen(next)
    if (next.length === 2) {
      setMoves((m) => m + 1)
      const [a, b] = next
      if (cards[a] === cards[b]) { setTimeout(() => { setMatched((m) => new Set([...m, a, b])); setOpen([]) }, 350) }
      else setTimeout(() => setOpen([]), 850)
    }
  }

  const secs = startedAt ? Math.floor((now - startedAt) / 1000) : 0
  const [cols] = SIZES[size]

  return (
    <>
      <Row>
        <div className="seg" role="group" aria-label="Difficulty">{(Object.keys(SIZES) as Size[]).map((s) => <button key={s} aria-pressed={size === s} onClick={() => { setSize(s); newGame(theme, s) }}>{s}</button>)}</div>
        <select value={theme} onChange={(e) => { setTheme(e.target.value); newGame(e.target.value, size) }} aria-label="Card theme">{Object.keys(THEMES).map((t) => <option key={t}>{t}</option>)}</select>
        <button className="btn primary" onClick={() => newGame()}>New game</button>
      </Row>
      <Row>
        <span className="muted">Moves: <b>{moves}</b></span>
        <span className="muted">Time: <b>{Math.floor(secs / 60)}:{String(secs % 60).padStart(2, '0')}</b></span>
        <span className="muted">Pairs: <b>{matched.size / 2}/{cards.length / 2}</b></span>
        {best !== null && <span className="muted">Best: <b>{best} moves</b></span>}
      </Row>
      {done && <div className="badge" aria-live="polite">🎉 All pairs found in {moves} moves and {secs} seconds!</div>}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 8, width: `min(100%, ${cols * 100}px)` }}>
        {cards.map((c, i) => {
          const shown = open.includes(i) || matched.has(i)
          return (
            <button key={i} onClick={() => flip(i)} aria-label={shown ? c : `Card ${i + 1}, face down`} disabled={matched.has(i)}
              style={{ aspectRatio: '1', borderRadius: 10, border: '2px solid var(--border)', fontSize: 'clamp(24px, 7vw, 44px)', cursor: shown ? 'default' : 'pointer', transition: 'transform .2s, background .2s',
                background: matched.has(i) ? 'var(--surface-2)' : shown ? 'var(--surface)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)', transform: shown ? 'rotateY(0)' : 'rotateY(180deg)', opacity: matched.has(i) ? 0.55 : 1 }}>
              {shown ? c : ''}
            </button>
          )
        })}
      </div>
      <p className="muted" style={{ margin: 0, fontSize: 13 }}>Flip two cards at a time and remember where everything is. Find all the pairs in as few moves as you can.</p>
    </>
  )
}
