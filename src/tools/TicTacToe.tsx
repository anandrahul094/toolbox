import { useEffect, useState } from 'react'
import { Row } from '../components/ui'

type Cell = 'X' | 'O' | null
const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]]
const winnerOf = (b: Cell[]) => { for (const l of LINES) if (b[l[0]] && b[l[0]] === b[l[1]] && b[l[0]] === b[l[2]]) return { who: b[l[0]]!, line: l }; return null }

// perfect play: score each move by looking ahead to the end of the game
function minimax(b: Cell[], me: 'X' | 'O', turn: 'X' | 'O', depth = 0): number {
  const w = winnerOf(b)
  if (w) return w.who === me ? 10 - depth : depth - 10
  if (b.every(Boolean)) return 0
  const scores = b.map((c, i) => { if (c) return null; const n = [...b]; n[i] = turn; return minimax(n, me, turn === 'X' ? 'O' : 'X', depth + 1) }).filter((x): x is number => x !== null)
  return turn === me ? Math.max(...scores) : Math.min(...scores)
}
function aiMove(b: Cell[], me: 'X' | 'O', level: 'easy' | 'medium' | 'hard') {
  const free = b.map((c, i) => (c ? -1 : i)).filter((i) => i >= 0)
  const random = () => free[Math.floor(Math.random() * free.length)]
  if (level === 'easy' || (level === 'medium' && Math.random() < 0.35)) return random()
  let best = -Infinity, moves: number[] = []
  for (const i of free) {
    const n = [...b]; n[i] = me
    const s = minimax(n, me, me === 'X' ? 'O' : 'X', 1)
    if (s > best) { best = s; moves = [i] } else if (s === best) moves.push(i)
  }
  return moves[Math.floor(Math.random() * moves.length)]
}

export default function TicTacToe() {
  const [board, setBoard] = useState<Cell[]>(Array(9).fill(null))
  const [mode, setMode] = useState<'ai' | 'friend'>('ai')
  const [level, setLevel] = useState<'easy' | 'medium' | 'hard'>('medium')
  const [youFirst, setYouFirst] = useState(true)
  const [score, setScore] = useState({ X: 0, O: 0, draw: 0 })
  const xs = board.filter((c) => c === 'X').length, os = board.filter((c) => c === 'O').length
  const turn: 'X' | 'O' = xs === os ? 'X' : 'O'
  const human: 'X' | 'O' = youFirst ? 'X' : 'O', ai = human === 'X' ? 'O' : 'X'
  const win = winnerOf(board), full = board.every(Boolean)
  const over = !!win || full

  // the computer plays after a short pause
  useEffect(() => {
    if (mode !== 'ai' || over || turn !== ai) return
    const t = setTimeout(() => setBoard((b) => { const n = [...b]; n[aiMove(b, ai, level)] = ai; return n }), 380)
    return () => clearTimeout(t)
  }, [board, mode, over, turn, ai, level])

  useEffect(() => {
    if (win) setScore((s) => ({ ...s, [win.who]: s[win.who] + 1 }))
    else if (full) setScore((s) => ({ ...s, draw: s.draw + 1 }))
  }, [win?.who, full]) // eslint-disable-line react-hooks/exhaustive-deps

  const play = (i: number) => {
    if (board[i] || over || (mode === 'ai' && turn !== human)) return
    const n = [...board]; n[i] = turn; setBoard(n)
  }
  const reset = () => setBoard(Array(9).fill(null))
  const name = (p: 'X' | 'O') => (mode === 'ai' ? (p === human ? 'You' : 'Computer') : `Player ${p}`)
  const status = win ? (mode === 'ai' ? (win.who === human ? 'You win! 🎉' : 'The computer wins.') : `Player ${win.who} wins! 🎉`) : full ? 'It’s a draw.' : mode === 'ai' ? (turn === human ? `Your turn (${turn})` : 'Computer is thinking…') : `Player ${turn}’s turn`

  return (
    <>
      <Row>
        <div className="seg" role="group" aria-label="Opponent">
          <button aria-pressed={mode === 'ai'} onClick={() => { setMode('ai'); reset() }}>vs Computer</button>
          <button aria-pressed={mode === 'friend'} onClick={() => { setMode('friend'); reset() }}>2 players</button>
        </div>
        {mode === 'ai' && (
          <>
            <div className="seg" role="group" aria-label="Difficulty">
              {(['easy', 'medium', 'hard'] as const).map((l) => <button key={l} aria-pressed={level === l} onClick={() => setLevel(l)}>{l === 'hard' ? 'Unbeatable' : l[0].toUpperCase() + l.slice(1)}</button>)}
            </div>
            <label className="check"><input type="checkbox" checked={youFirst} onChange={(e) => { setYouFirst(e.target.checked); reset() }} /> I go first (X)</label>
          </>
        )}
      </Row>
      <div aria-live="polite" style={{ fontSize: 20, fontWeight: 600 }}>{status}</div>
      <div role="grid" aria-label="Tic-tac-toe board" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, width: 'min(100%, 340px)' }}>
        {board.map((c, i) => (
          <button key={i} onClick={() => play(i)} aria-label={`Square ${i + 1}${c ? `, ${c}` : ''}`} disabled={!!c || over}
            style={{ aspectRatio: '1', fontSize: 48, fontWeight: 800, borderRadius: 12, border: '2px solid var(--border)', cursor: c || over ? 'default' : 'pointer',
              background: win?.line.includes(i) ? 'var(--accent-soft, #dcfce7)' : 'var(--surface)', color: c === 'X' ? '#2563eb' : '#e11d48' }}>
            {c}
          </button>
        ))}
      </div>
      <Row>
        <button className="btn primary" onClick={reset}>{over ? 'Play again' : 'Restart'}</button>
        <span className="muted">{name('X')} {score.X} · {name('O')} {score.O} · Draws {score.draw}</span>
        <button className="btn" onClick={() => setScore({ X: 0, O: 0, draw: 0 })}>Reset score</button>
      </Row>
    </>
  )
}
