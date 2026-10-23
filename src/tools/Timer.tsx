import { useEffect, useRef, useState } from 'react'
import { Field, NumberInput, Row } from '../components/ui'

const fmt = (ms: number, cs = true) => {
  const t = Math.max(0, ms)
  const h = Math.floor(t / 3600000), m = Math.floor((t % 3600000) / 60000), s = Math.floor((t % 60000) / 1000)
  const base = `${h ? String(h).padStart(2, '0') + ':' : ''}${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return cs ? `${base}.${String(Math.floor((t % 1000) / 10)).padStart(2, '0')}` : base
}

function useTicker(running: boolean) {
  const [, force] = useState(0)
  useEffect(() => {
    if (!running) return
    let id = 0
    const loop = () => { force((n) => n + 1); id = requestAnimationFrame(loop) }
    id = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(id)
  }, [running])
}

function beep() {
  try {
    const ctx = new AudioContext()
    ;[0, 0.35, 0.7].forEach((t) => {
      const o = ctx.createOscillator(), g = ctx.createGain()
      o.frequency.value = 880; o.connect(g); g.connect(ctx.destination)
      g.gain.setValueAtTime(0.2, ctx.currentTime + t); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.3)
      o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.3)
    })
  } catch { /* audio unavailable */ }
}

function Stopwatch() {
  const [start, setStart] = useState<number | null>(null)
  const [acc, setAcc] = useState(0)
  const [laps, setLaps] = useState<number[]>([])
  useTicker(start !== null)
  const elapsed = acc + (start !== null ? performance.now() - start : 0)
  return (
    <>
      <div className="mono center timer-display" role="timer">{fmt(elapsed)}</div>
      <Row>
        {start === null
          ? <button className="btn primary" onClick={() => setStart(performance.now())}>{acc ? 'Resume' : 'Start'}</button>
          : <button className="btn primary" onClick={() => { setAcc(elapsed); setStart(null) }}>Pause</button>}
        <button className="btn" disabled={start === null} onClick={() => setLaps([elapsed, ...laps])}>Lap</button>
        <button className="btn" onClick={() => { setStart(null); setAcc(0); setLaps([]) }}>Reset</button>
      </Row>
      {laps.length > 0 && (
        <table><tbody>{laps.map((l, i) => <tr key={i}><td>Lap {laps.length - i}</td><td className="mono">{fmt(l - (laps[i + 1] ?? 0))}</td><td className="mono muted">{fmt(l)}</td></tr>)}</tbody></table>
      )}
    </>
  )
}

function Countdown() {
  const [mins, setMins] = useState(5)
  const [secs, setSecs] = useState(0)
  const [end, setEnd] = useState<number | null>(null)
  const [left, setLeft] = useState<number | null>(null)
  const [done, setDone] = useState(false)
  const title = useRef(document.title)
  useTicker(end !== null)
  const remaining = end !== null ? Math.max(0, end - Date.now()) : left ?? (mins * 60 + secs) * 1000

  // a real timeout (not animation frames) so the alarm still fires when the tab is in the background
  useEffect(() => {
    if (end === null) return
    const t = setTimeout(() => { setEnd(null); setLeft(0); setDone(true); beep(); document.title = "⏰ Time's up!" }, Math.max(0, end - Date.now()))
    return () => clearTimeout(t)
  }, [end])
  useEffect(() => () => { document.title = title.current }, [])

  const startIt = () => { setDone(false); setEnd(Date.now() + (left || (mins * 60 + secs) * 1000)); setLeft(null) }
  const reset = () => { setEnd(null); setLeft(null); setDone(false); document.title = title.current }
  return (
    <>
      <div className="mono center timer-display" role="timer" aria-live={done ? 'assertive' : 'off'} style={{ color: done ? 'var(--danger)' : undefined }}>{done ? "Time's up!" : fmt(remaining, false)}</div>
      {end === null && left === null && !done && (
        <Row>
          <Field label="Minutes"><NumberInput min={0} max={1440} step={1} value={mins} onValue={(v) => setMins(Math.floor(v))} /></Field>
          <Field label="Seconds"><NumberInput min={0} max={59} step={1} value={secs} onValue={(v) => setSecs(Math.floor(v))} /></Field>
          {[1, 5, 10, 25].map((m) => <button key={m} className="chip" onClick={() => { setMins(m); setSecs(0) }}>{m} min</button>)}
        </Row>
      )}
      <Row>
        {end === null
          ? <button className="btn primary" disabled={done || remaining <= 0} onClick={startIt}>{left ? 'Resume' : 'Start'}</button>
          : <button className="btn primary" onClick={() => { setLeft(remaining); setEnd(null) }}>Pause</button>}
        <button className="btn" onClick={reset}>Reset</button>
      </Row>
    </>
  )
}

export default function Timer() {
  const [tab, setTab] = useState<'stopwatch' | 'countdown'>('stopwatch')
  // keep both mounted so switching tabs doesn't lose a running timer
  return (
    <>
      <div className="seg" role="group" aria-label="Mode" style={{ alignSelf: 'flex-start' }}>
        <button aria-pressed={tab === 'stopwatch'} onClick={() => setTab('stopwatch')}>Stopwatch</button>
        <button aria-pressed={tab === 'countdown'} onClick={() => setTab('countdown')}>Countdown</button>
      </div>
      <div hidden={tab !== 'stopwatch'} style={{ display: tab === 'stopwatch' ? 'flex' : 'none', flexDirection: 'column', gap: 16 }}><Stopwatch /></div>
      <div hidden={tab !== 'countdown'} style={{ display: tab === 'countdown' ? 'flex' : 'none', flexDirection: 'column', gap: 16 }}><Countdown /></div>
    </>
  )
}
