import { useEffect, useRef, useState } from 'react'
import { Row, Stat } from '../components/ui'

const WORDS = 'the of and to in is you that it he was for on are as with his they at be this have from or one had by word but not what all were we when your can said there use an each which she do how their if will up other about out many then them these so some her would make like him into time has look two more write go see number no way could people my than first water been call who oil its now find long down day did get come made may part'.split(' ')
const sample = (n: number) => Array.from({ length: n }, () => WORDS[Math.floor(Math.random() * WORDS.length)]).join(' ')

export default function TypingTest() {
  const [duration, setDuration] = useState(30)
  const [target, setTarget] = useState(() => sample(120))
  const [typed, setTyped] = useState('')
  const [start, setStart] = useState<number | null>(null)
  const [now, setNow] = useState(Date.now())
  const [done, setDone] = useState(false)
  const input = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!start || done) return
    const t = setInterval(() => {
      setNow(Date.now())
      if (Date.now() - start >= duration * 1000) setDone(true)
    }, 200)
    return () => clearInterval(t)
  }, [start, done, duration])

  const reset = (d = duration) => { setDuration(d); setTarget(sample(120)); setTyped(''); setStart(null); setDone(false); setTimeout(() => input.current?.focus()) }

  const elapsed = start ? Math.min(duration, (now - start) / 1000) : 0
  let correct = 0
  for (let i = 0; i < typed.length; i++) if (typed[i] === target[i]) correct++
  const wpm = elapsed > 0 ? Math.round(correct / 5 / (elapsed / 60)) : 0
  const accuracy = typed.length ? Math.round((correct / typed.length) * 100) : 100

  return (
    <>
      <Row>
        {[15, 30, 60, 120].map((d) => <button key={d} className={`chip ${duration === d ? 'active' : ''}`} onClick={() => reset(d)}>{d}s</button>)}
        <button className="btn" onClick={() => reset()}>↻ New text</button>
      </Row>
      <div className="stats">
        <Stat label="Words per minute" value={wpm} />
        <Stat label="Accuracy" value={`${accuracy}%`} />
        <Stat label="Time left" value={`${Math.ceil(duration - elapsed)}s`} />
      </div>
      <div className="output" style={{ fontSize: 20, lineHeight: 1.7, wordBreak: 'normal', maxHeight: 180, overflow: 'hidden', fontFamily: 'var(--mono)' }} onClick={() => input.current?.focus()}>
        {[...target.slice(0, Math.max(typed.length + 160, 200))].map((ch, i) => (
          <span key={i} style={i < typed.length ? { color: typed[i] === ch ? 'var(--muted)' : 'var(--danger)', background: typed[i] === ch ? undefined : 'var(--danger-soft)' } : i === typed.length ? { borderLeft: '2px solid var(--accent)' } : undefined}>{ch}</span>
        ))}
      </div>
      <textarea ref={input} value={typed} disabled={done} autoFocus spellCheck={false} autoCapitalize="off" autoComplete="off"
        placeholder="Start typing here — the timer starts with your first key"
        onChange={(e) => { if (!start) setStart(Date.now()); setTyped(e.target.value.slice(0, target.length)) }}
        style={{ minHeight: 80 }} aria-label="Typing area" />
      {done && <div className="badge" role="status">Finished: {wpm} WPM at {accuracy}% accuracy. Press “New text” to try again.</div>}
    </>
  )
}
