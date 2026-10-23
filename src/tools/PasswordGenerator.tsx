import { useCallback, useEffect, useState } from 'react'
import { CopyButton, Field, Row } from '../components/ui'

const SETS = {
  upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lower: 'abcdefghijklmnopqrstuvwxyz',
  digits: '0123456789',
  symbols: '!@#$%^&*()-_=+[]{};:,.<>?/~',
}
const AMBIGUOUS = /[Il1O0o]/g

const randInt = (n: number) => {
  // rejection sampling avoids modulo bias
  const limit = Math.floor(0x100000000 / n) * n
  const buf = new Uint32Array(1)
  do crypto.getRandomValues(buf); while (buf[0] >= limit)
  return buf[0] % n
}

export default function PasswordGenerator() {
  const [length, setLength] = useState(20)
  const [opts, setOpts] = useState({ upper: true, lower: true, digits: true, symbols: true, noAmbiguous: false })
  const [pw, setPw] = useState('')

  const generate = useCallback(() => {
    const pools = (Object.keys(SETS) as (keyof typeof SETS)[])
      .filter((k) => opts[k])
      .map((k) => (opts.noAmbiguous ? SETS[k].replace(AMBIGUOUS, '') : SETS[k]))
    if (!pools.length) return setPw('')
    const all = pools.join('')
    // guarantee one char from each selected set, then fill and shuffle
    const chars = pools.map((p) => p[randInt(p.length)])
    while (chars.length < length) chars.push(all[randInt(all.length)])
    for (let i = chars.length - 1; i > 0; i--) { const j = randInt(i + 1); [chars[i], chars[j]] = [chars[j], chars[i]] }
    setPw(chars.slice(0, length).join(''))
  }, [length, opts])

  useEffect(generate, [generate])

  const poolSize = (Object.keys(SETS) as (keyof typeof SETS)[]).filter((k) => opts[k]).reduce((n, k) => n + SETS[k].length, 0)
  const bits = Math.round(length * Math.log2(Math.max(poolSize, 1)))
  const strength = bits >= 100 ? ['Very strong', '#16a34a'] : bits >= 70 ? ['Strong', '#22c55e'] : bits >= 50 ? ['Fair', '#f59e0b'] : ['Weak', '#dc2626']

  return (
    <>
      <Row>
        <input className="mono" readOnly value={pw} style={{ flex: 1, fontSize: 20, padding: 14 }} />
        <button className="btn primary" onClick={generate}>↻ New</button>
        <CopyButton value={pw} />
      </Row>
      <div style={{ height: 6, borderRadius: 3, background: 'var(--surface-2)' }}>
        <div style={{ height: '100%', width: `${Math.min(100, bits / 1.28)}%`, background: strength[1], borderRadius: 3 }} />
      </div>
      <div className="muted">{strength[0]} · ~{bits} bits of entropy</div>
      <Field label={`Length: ${length}`}><input type="range" min={4} max={128} value={length} onChange={(e) => setLength(+e.target.value)} /></Field>
      <Row>
        {([['upper', 'A-Z'], ['lower', 'a-z'], ['digits', '0-9'], ['symbols', '!@#'], ['noAmbiguous', 'Exclude look-alikes (Il1O0)']] as const).map(([k, label]) => (
          <label key={k} className="check"><input type="checkbox" checked={opts[k]} onChange={(e) => setOpts({ ...opts, [k]: e.target.checked })} /> {label}</label>
        ))}
      </Row>
    </>
  )
}
