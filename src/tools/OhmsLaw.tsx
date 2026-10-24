import { useMemo, useState } from 'react'
import { ErrorBox, Field, Row, Stat } from '../components/ui'
import { formatNumber } from '../lib/mathExpr'

// SI prefixes, so people can type 4.7k, 20m, 3.3u
const PREFIX: Record<string, number> = { p: 1e-12, n: 1e-9, u: 1e-6, 'µ': 1e-6, m: 1e-3, '': 1, k: 1e3, K: 1e3, M: 1e6, G: 1e9 }
function parseSI(s: string) {
  // drop spaces and unit names (V, A, Ω, W, F, H), keep the prefix letter
  const m = s.trim().replace(/\s|ohms?|volts?|amps?|watts?|farads?|henr(?:y|ies)|[VAΩWFH]/gi, '').match(/^(-?\d*\.?\d+(?:e[+-]?\d+)?)([pnuµmkKMG]?)$/)
  return m ? parseFloat(m[1]) * PREFIX[m[2]] : NaN
}
function si(v: number, unit: string) {
  if (!Number.isFinite(v)) return '—'
  const a = Math.abs(v)
  const [k, p] = a >= 1e9 ? [1e9, 'G'] : a >= 1e6 ? [1e6, 'M'] : a >= 1e3 ? [1e3, 'k'] : a >= 1 || a === 0 ? [1, ''] : a >= 1e-3 ? [1e-3, 'm'] : a >= 1e-6 ? [1e-6, 'µ'] : a >= 1e-9 ? [1e-9, 'n'] : [1e-12, 'p']
  return `${formatNumber(v / (k as number), 5)} ${p}${unit}`
}

type Key = 'V' | 'I' | 'R' | 'P'
const UNIT: Record<Key, string> = { V: 'V', I: 'A', R: 'Ω', P: 'W' }
const NAME: Record<Key, string> = { V: 'Voltage (V)', I: 'Current (I)', R: 'Resistance (R)', P: 'Power (P)' }

// solve V = IR and P = VI from any two known values
function solve(k: Partial<Record<Key, number>>): Record<Key, number> | string {
  const { V, I, R, P } = k
  if (V !== undefined && I !== undefined) return { V, I, R: V / I, P: V * I }
  if (V !== undefined && R !== undefined) return { V, R, I: V / R, P: (V * V) / R }
  if (V !== undefined && P !== undefined) return { V, P, I: P / V, R: (V * V) / P }
  if (I !== undefined && R !== undefined) return { I, R, V: I * R, P: I * I * R }
  if (I !== undefined && P !== undefined) return { I, P, V: P / I, R: P / (I * I) }
  if (R !== undefined && P !== undefined) return { R, P, V: Math.sqrt(P * R), I: Math.sqrt(P / R) }
  return 'Fill in any two values.'
}

export default function OhmsLaw() {
  const [tab, setTab] = useState<'ohm' | 'combo' | 'divider' | 'led'>('ohm')
  const [vals, setVals] = useState<Record<Key, string>>({ V: '12', I: '', R: '470', P: '' })
  const [list, setList] = useState('100, 220, 330')
  const [comboKind, setComboKind] = useState<'R' | 'C' | 'L'>('R')
  const [div, setDiv] = useState({ vin: '12', r1: '10k', r2: '4.7k' })
  const [led, setLed] = useState({ vs: '5', vf: '2', i: '20m' })

  const filled = (Object.keys(vals) as Key[]).filter((k) => vals[k].trim())
  const ohm = useMemo(() => {
    if (filled.length !== 2) return filled.length > 2 ? 'Fill in exactly two values — clear the others.' : 'Fill in any two values.'
    const known: Partial<Record<Key, number>> = {}
    for (const k of filled) { const v = parseSI(vals[k]); if (!Number.isFinite(v)) return `“${vals[k]}” isn’t a number. Use values like 12, 0.5, 4.7k or 20m.`; known[k] = v }
    return solve(known)
  }, [vals]) // eslint-disable-line react-hooks/exhaustive-deps

  const nums = list.split(/[,\s;]+/).filter(Boolean).map(parseSI)
  const okList = nums.length > 0 && nums.every((n) => Number.isFinite(n) && n > 0)
  const series = nums.reduce((a, b) => a + b, 0), parallel = 1 / nums.reduce((a, b) => a + 1 / b, 0)
  // capacitors add in parallel and combine like resistors in parallel when in series
  const [sum, recip] = comboKind === 'C' ? [parallel, series] : [series, parallel]
  const unit = { R: 'Ω', C: 'F', L: 'H' }[comboKind]

  const vin = parseSI(div.vin), r1 = parseSI(div.r1), r2 = parseSI(div.r2)
  const vout = (vin * r2) / (r1 + r2)
  const vs = parseSI(led.vs), vf = parseSI(led.vf), il = parseSI(led.i)
  const rLed = (vs - vf) / il

  return (
    <>
      <div className="seg" role="group" aria-label="Calculator" style={{ alignSelf: 'flex-start', flexWrap: 'wrap' }}>
        {([['ohm', "Ohm's law"], ['combo', 'Series & parallel'], ['divider', 'Voltage divider'], ['led', 'LED resistor']] as const).map(([id, l]) => <button key={id} aria-pressed={tab === id} onClick={() => setTab(id)}>{l}</button>)}
      </div>
      {tab === 'ohm' && (
        <>
          <Row>
            {(Object.keys(vals) as Key[]).map((k) => (
              <Field key={k} label={`${NAME[k]}, ${UNIT[k]}`}>
                <input className="mono" value={vals[k]} onChange={(e) => setVals({ ...vals, [k]: e.target.value })} placeholder="?" style={{ width: 110 }} />
              </Field>
            ))}
            <button className="btn" style={{ alignSelf: 'flex-end' }} onClick={() => setVals({ V: '', I: '', R: '', P: '' })}>Clear</button>
          </Row>
          <p className="muted" style={{ margin: 0, fontSize: 13 }}>Type any two. Prefixes work: 4.7k = 4700, 20m = 0.02, 3.3u = 0.0000033.</p>
          {typeof ohm === 'string' ? <div className="muted">{ohm}</div> : (
            <div className="stats" aria-live="polite">{(Object.keys(ohm) as Key[]).sort().map((k) => <Stat key={k} label={NAME[k]} value={si(ohm[k], UNIT[k])} />)}</div>
          )}
          <p className="muted mono" style={{ margin: 0, fontSize: 13 }}>V = I × R · P = V × I = I²R = V²/R</p>
        </>
      )}
      {tab === 'combo' && (
        <>
          <Row>
            <Field label="Component"><select value={comboKind} onChange={(e) => setComboKind(e.target.value as typeof comboKind)}><option value="R">Resistors (Ω)</option><option value="C">Capacitors (F)</option><option value="L">Inductors (H)</option></select></Field>
            <Field label="Values" hint="e.g. 100, 220, 4.7k — or 10u, 22u for capacitors"><input className="mono" value={list} onChange={(e) => setList(e.target.value)} style={{ minWidth: 240 }} /></Field>
          </Row>
          {!okList ? <ErrorBox message="Enter positive values separated by commas." /> : (
            <div className="stats"><Stat label="In series" value={si(sum, unit)} /><Stat label="In parallel" value={si(recip, unit)} /></div>
          )}
        </>
      )}
      {tab === 'divider' && (
        <>
          <Row>
            <Field label="Vin (V)"><input className="mono" value={div.vin} onChange={(e) => setDiv({ ...div, vin: e.target.value })} style={{ width: 100 }} /></Field>
            <Field label="R1 (top, Ω)"><input className="mono" value={div.r1} onChange={(e) => setDiv({ ...div, r1: e.target.value })} style={{ width: 100 }} /></Field>
            <Field label="R2 (bottom, Ω)"><input className="mono" value={div.r2} onChange={(e) => setDiv({ ...div, r2: e.target.value })} style={{ width: 100 }} /></Field>
          </Row>
          <div className="stats"><Stat label="Vout" value={si(vout, 'V')} /><Stat label="Current" value={si(vin / (r1 + r2), 'A')} /><Stat label="Ratio" value={formatNumber(r2 / (r1 + r2), 5)} /></div>
          <p className="muted mono" style={{ margin: 0, fontSize: 13 }}>Vout = Vin × R2 / (R1 + R2), with no load on the output.</p>
        </>
      )}
      {tab === 'led' && (
        <>
          <Row>
            <Field label="Supply voltage (V)"><input className="mono" value={led.vs} onChange={(e) => setLed({ ...led, vs: e.target.value })} style={{ width: 100 }} /></Field>
            <Field label="LED forward voltage (V)" hint="Red ≈ 2, green/blue/white ≈ 3"><input className="mono" value={led.vf} onChange={(e) => setLed({ ...led, vf: e.target.value })} style={{ width: 100 }} /></Field>
            <Field label="LED current (A)" hint="Typical 20m (20 mA)"><input className="mono" value={led.i} onChange={(e) => setLed({ ...led, i: e.target.value })} style={{ width: 100 }} /></Field>
          </Row>
          {rLed > 0 ? <div className="stats"><Stat label="Resistor" value={si(rLed, 'Ω')} /><Stat label="Resistor power" value={si((vs - vf) * il, 'W')} /></div> : <ErrorBox message="The supply voltage must be higher than the LED forward voltage." />}
          <p className="muted" style={{ margin: 0, fontSize: 13 }}>Pick the next standard resistor value above the result, and a resistor rated for at least twice the power.</p>
        </>
      )}
    </>
  )
}
