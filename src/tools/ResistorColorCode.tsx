import { useMemo, useState } from 'react'
import { ErrorBox, Field, Row } from '../components/ui'

const COLORS = [
  { name: 'Black', hex: '#111111', digit: 0, mult: 1, tol: null, tc: 250 },
  { name: 'Brown', hex: '#7b3f00', digit: 1, mult: 10, tol: 1, tc: 100 },
  { name: 'Red', hex: '#d32f2f', digit: 2, mult: 100, tol: 2, tc: 50 },
  { name: 'Orange', hex: '#f57c00', digit: 3, mult: 1e3, tol: 0.05, tc: 15 },
  { name: 'Yellow', hex: '#fbc02d', digit: 4, mult: 1e4, tol: 0.02, tc: 25 },
  { name: 'Green', hex: '#388e3c', digit: 5, mult: 1e5, tol: 0.5, tc: 20 },
  { name: 'Blue', hex: '#1976d2', digit: 6, mult: 1e6, tol: 0.25, tc: 10 },
  { name: 'Violet', hex: '#7b1fa2', digit: 7, mult: 1e7, tol: 0.1, tc: 5 },
  { name: 'Grey', hex: '#8d8d8d', digit: 8, mult: 1e8, tol: 0.01, tc: 1 },
  { name: 'White', hex: '#f5f5f5', digit: 9, mult: 1e9, tol: null, tc: null },
  { name: 'Gold', hex: '#c9a227', digit: null, mult: 0.1, tol: 5, tc: null },
  { name: 'Silver', hex: '#b0b0b0', digit: null, mult: 0.01, tol: 10, tc: null },
] as const
type C = (typeof COLORS)[number]
const by = (n: string) => COLORS.find((c) => c.name === n)!
const E12 = [10, 12, 15, 18, 22, 27, 33, 39, 47, 56, 68, 82]
const E24 = [10, 11, 12, 13, 15, 16, 18, 20, 22, 24, 27, 30, 33, 36, 39, 43, 47, 51, 56, 62, 68, 75, 82, 91]

export function fmtOhms(v: number) {
  if (v >= 1e9) return `${+(v / 1e9).toPrecision(4)} GΩ`
  if (v >= 1e6) return `${+(v / 1e6).toPrecision(4)} MΩ`
  if (v >= 1e3) return `${+(v / 1e3).toPrecision(4)} kΩ`
  return `${+v.toPrecision(4)} Ω`
}
// "4k7", "4.7k", "2M2", "470R", "10 kΩ" → ohms
export function parseOhms(s: string) {
  const t = s.trim().replace(/\s|ohms?|Ω/gi, '')
  const m = t.match(/^(\d*)\.?(\d*)([RKMG]?)(\d*)$/i)
  if (!m) return NaN
  const mul = { '': 1, R: 1, K: 1e3, M: 1e6, G: 1e9 }[m[3].toUpperCase() as '' | 'R' | 'K' | 'M' | 'G']
  // 4k7 style: the letter is the decimal point
  const str = m[3] && m[4] ? `${m[1]}.${m[4]}` : t.replace(/[RKMG]$/i, '')
  return parseFloat(str) * mul
}

function Resistor({ bands }: { bands: C[] }) {
  const gap = bands.length > 4 ? 15 : 18
  return (
    <svg viewBox="0 0 320 90" style={{ width: '100%', maxWidth: 420 }} role="img" aria-label={`Resistor with bands: ${bands.map((b) => b.name).join(', ')}`}>
      <line x1="0" y1="45" x2="320" y2="45" stroke="#9aa0a6" strokeWidth="5" />
      <rect x="60" y="15" width="200" height="60" rx="26" fill="#e8d3a8" stroke="#c9b48a" />
      {bands.map((b, i) => {
        const last = i === bands.length - 1 && bands.length > 3
        const x = last ? 228 : 82 + i * gap * 1.6
        return <rect key={i} x={x} y={i === 0 || last ? 18 : 15} width="11" height={i === 0 || last ? 54 : 60} fill={b.hex} stroke="rgba(0,0,0,.25)" />
      })}
    </svg>
  )
}

export default function ResistorColorCode() {
  const [count, setCount] = useState<4 | 5 | 6>(4)
  const [bands, setBands] = useState(['Yellow', 'Violet', 'Red', 'Gold', 'Brown', 'Brown'])
  const [want, setWant] = useState('4k7')

  const digitColors = COLORS.filter((c) => c.digit !== null)
  const nDigits = count === 4 ? 2 : 3
  const chosen = [...bands.slice(0, nDigits + 2), ...(count === 6 ? [bands[5]] : [])].map(by)
  const digits = chosen.slice(0, nDigits).map((c) => c.digit ?? 0)
  const mult = chosen[nDigits].mult
  const tol = chosen[nDigits + 1].tol
  const value = +digits.join('') * mult
  const tc = count === 6 ? chosen[5].tc : null

  const setBand = (i: number, name: string) => setBands(bands.map((b, j) => (j === i ? name : b)))
  const labels = ['1st digit', '2nd digit', ...(nDigits === 3 ? ['3rd digit'] : []), 'Multiplier', 'Tolerance', ...(count === 6 ? ['Temp. coefficient'] : [])]
  const options = (i: number) => (i < nDigits ? digitColors : i === nDigits ? COLORS : i === nDigits + 1 ? COLORS.filter((c) => c.tol !== null) : COLORS.filter((c) => c.tc !== null))

  // value → bands, with the nearest standard values
  const reverse = useMemo(() => {
    const v = parseOhms(want)
    if (!Number.isFinite(v) || v <= 0) return { error: 'Enter a value like 470, 4.7k, 4k7 or 2.2M.' }
    const sig = nDigits
    const exp = Math.floor(Math.log10(v)) - (sig - 1)
    const mant = Math.round(v / 10 ** exp)
    const ds = String(mant).padStart(sig, '0').slice(0, sig).split('').map(Number)
    const m = COLORS.find((c) => Math.abs(Math.log10(c.mult) - exp) < 1e-9)
    if (!m || exp < -2 || exp > 9) return { error: 'That value is outside what colour bands can show.' }
    const exact = Math.abs(mant * 10 ** exp - v) / v < 1e-6
    const decade = 10 ** Math.floor(Math.log10(v) - 1)
    const near = (series: number[]) => [...series.map((s) => s * decade), ...series.map((s) => s * decade * 10)].reduce((a, b) => (Math.abs(b - v) < Math.abs(a - v) ? b : a))
    return { colors: [...ds.map((d) => digitColors[d].name), m.name], exact, e12: near(E12), e24: near(E24) }
  }, [want, nDigits]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <div className="seg" role="group" aria-label="Number of bands" style={{ alignSelf: 'flex-start' }}>
        {([4, 5, 6] as const).map((n) => <button key={n} aria-pressed={count === n} onClick={() => setCount(n)}>{n} bands</button>)}
      </div>
      <Resistor bands={chosen} />
      <Row>
        {labels.map((l, i) => {
          const idx = i < nDigits + 2 ? i : 5
          return (
            <Field key={l} label={l}>
              <select value={bands[idx]} onChange={(e) => setBand(idx, e.target.value)} style={{ borderLeft: `10px solid ${by(bands[idx]).hex}` }}>
                {options(i).map((c) => <option key={c.name} value={c.name}>{c.name}{i < nDigits ? ` (${c.digit})` : i === nDigits ? ` (×${fmtOhms(c.mult).replace(' Ω', '')})` : i === nDigits + 1 ? ` (±${c.tol}%)` : ` (${c.tc} ppm/K)`}</option>)}
              </select>
            </Field>
          )
        })}
      </Row>
      <div className="output" style={{ fontSize: 24 }} aria-live="polite">{fmtOhms(value)} ±{tol}%{tc ? ` · ${tc} ppm/K` : ''}</div>
      <div className="muted" style={{ fontSize: 14 }}>Range: {fmtOhms(value * (1 - (tol ?? 0) / 100))} to {fmtOhms(value * (1 + (tol ?? 0) / 100))}</div>

      <h3 style={{ margin: '12px 0 0', fontSize: 16 }}>Find the colours for a value</h3>
      <Row><Field label="Resistance" hint="e.g. 220, 4.7k, 4k7, 1M"><input className="mono" value={want} onChange={(e) => setWant(e.target.value)} style={{ width: 140 }} /></Field></Row>
      <ErrorBox message={'error' in reverse ? reverse.error : null} />
      {'colors' in reverse && reverse.colors && (
        <>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            {reverse.colors.map((c, i) => <span key={i} className="chip" style={{ borderLeft: `14px solid ${by(c).hex}` }}>{c}</span>)}
            <span className="chip">+ tolerance band (Gold ±5%, Brown ±1%)</span>
            <button className="btn" onClick={() => { const next = [...bands]; reverse.colors!.forEach((c, i) => { next[i] = c }); next[nDigits + 1] = count === 4 ? 'Gold' : 'Brown'; setBands(next) }}>Show on resistor</button>
          </div>
          <div className="muted" style={{ fontSize: 13 }}>{reverse.exact ? '' : `Rounded to ${nDigits} significant digits. `}Nearest standard values: E12 {fmtOhms(reverse.e12!)}, E24 {fmtOhms(reverse.e24!)}.</div>
        </>
      )}
    </>
  )
}
