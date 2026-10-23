import { useEffect, useMemo, useRef, useState } from 'react'
import { CopyButton, Field, Row } from '../components/ui'

const CODE: Record<string, string> = {
  A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', H: '....', I: '..', J: '.---', K: '-.-', L: '.-..', M: '--',
  N: '-.', O: '---', P: '.--.', Q: '--.-', R: '.-.', S: '...', T: '-', U: '..-', V: '...-', W: '.--', X: '-..-', Y: '-.--', Z: '--..',
  0: '-----', 1: '.----', 2: '..---', 3: '...--', 4: '....-', 5: '.....', 6: '-....', 7: '--...', 8: '---..', 9: '----.',
  '.': '.-.-.-', ',': '--..--', '?': '..--..', "'": '.----.', '!': '-.-.--', '/': '-..-.', '(': '-.--.', ')': '-.--.-', '&': '.-...',
  ':': '---...', ';': '-.-.-.', '=': '-...-', '+': '.-.-.', '-': '-....-', '"': '.-..-.', '@': '.--.-.',
}
const REVERSE = Object.fromEntries(Object.entries(CODE).map(([k, v]) => [v, k]))

const toMorse = (s: string) => s.toUpperCase().split(/\s+/).filter(Boolean).map((w) => [...w].map((c) => CODE[c] ?? '').filter(Boolean).join(' ')).join(' / ')
const fromMorse = (s: string) => s.trim().split(/\s*\/\s*|\s{3,}/).map((w) => w.split(/\s+/).map((c) => REVERSE[c] ?? (c ? '?' : '')).join('')).join(' ')

export default function MorseCode() {
  const [input, setInput] = useState('Hello World')
  const [wpm, setWpm] = useState(18)
  const [playing, setPlaying] = useState(false)
  const ctxRef = useRef<AudioContext | null>(null)
  const isMorse = /^[\s.\-/]+$/.test(input.trim()) && input.trim().length > 0
  const output = useMemo(() => (isMorse ? fromMorse(input) : toMorse(input)), [input, isMorse])
  const morse = isMorse ? input : output

  const play = () => {
    closeCtx(ctxRef.current)
    const ctx = new AudioContext(); ctxRef.current = ctx
    const unit = 1.2 / wpm
    let t = ctx.currentTime + 0.1
    const osc = ctx.createOscillator(), gain = ctx.createGain()
    osc.frequency.value = 650; gain.gain.value = 0
    osc.connect(gain); gain.connect(ctx.destination); osc.start()
    for (const ch of morse.trim()) {
      if (ch === '.' || ch === '-') {
        const len = ch === '.' ? unit : unit * 3
        gain.gain.setValueAtTime(0.3, t); gain.gain.setValueAtTime(0, t + len); t += len + unit
      } else if (ch === ' ') t += unit * 2
      else if (ch === '/') t += unit * 2
    }
    osc.stop(t + 0.1)
    setPlaying(true)
    osc.onended = () => { if (ctxRef.current === ctx) setPlaying(false); closeCtx(ctx) }
  }
  const closeCtx = (ctx: AudioContext | null) => { if (ctx && ctx.state !== 'closed') ctx.close().catch(() => {}) }
  const stop = () => { closeCtx(ctxRef.current); setPlaying(false) }
  useEffect(() => () => closeCtx(ctxRef.current), []) // stop sound when leaving the tool

  return (
    <>
      <Field label={isMorse ? 'Morse code detected — translating to text' : 'Text — translating to Morse code'} hint="Use spaces between letters and / between words when typing Morse.">
        <textarea aria-label="Input text" value={input} onChange={(e) => setInput(e.target.value)} style={{ minHeight: 100 }} />
      </Field>
      <pre className="output" style={{ fontSize: 18, letterSpacing: isMorse ? 0 : 2 }}>{output || ' '}</pre>
      <Row>
        <CopyButton value={output} />
        <button className="btn" onClick={() => setInput(output)} disabled={!output}>⇄ Swap</button>
        {playing ? <button className="btn primary" onClick={stop}>■ Stop</button> : <button className="btn primary" onClick={play} disabled={!morse.trim()}>▶ Play sound</button>}
        <Field label={`Speed: ${wpm} WPM`}><input type="range" min={5} max={40} value={wpm} onChange={(e) => setWpm(+e.target.value)} /></Field>
      </Row>
    </>
  )
}
