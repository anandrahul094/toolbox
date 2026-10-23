import { useState } from 'react'
import { Field, Row, NumberInput } from '../components/ui'

const BANDS: [number, string, string][] = [[18.5, 'Underweight', '#3b82f6'], [25, 'Healthy weight', '#16a34a'], [30, 'Overweight', '#f59e0b'], [Infinity, 'Obesity', '#dc2626']]

export default function BmiCalculator() {
  const [metric, setMetric] = useState(true)
  const [height, setHeight] = useState(170)
  const [weight, setWeight] = useState(68)
  const [ft, setFt] = useState(5)
  const [inch, setInch] = useState(7)
  const [lb, setLb] = useState(150)

  const m = metric ? height / 100 : (ft * 12 + inch) * 0.0254
  const kg = metric ? weight : lb * 0.45359237
  const bmi = m > 0 ? kg / (m * m) : NaN
  const band = BANDS.find(([max]) => bmi < max)!
  const [lo, hi] = [18.5 * m * m, 24.9 * m * m]
  const show = (k: number) => (metric ? `${k.toFixed(1)} kg` : `${(k / 0.45359237).toFixed(0)} lb`)

  return (
    <>
      <Row>
        <button className={`btn ${metric ? 'primary' : ''}`} onClick={() => setMetric(true)}>Metric</button>
        <button className={`btn ${!metric ? 'primary' : ''}`} onClick={() => setMetric(false)}>Imperial</button>
      </Row>
      {metric ? (
        <Row>
          <Field label="Height (cm)"><NumberInput min={30} max={272} value={height} onValue={setHeight} /></Field>
          <Field label="Weight (kg)"><NumberInput min={1} max={650} value={weight} onValue={setWeight} /></Field>
        </Row>
      ) : (
        <Row>
          <Field label="Feet"><NumberInput min={1} max={8} step={1} value={ft} onValue={(v) => setFt(Math.round(v))} /></Field>
          <Field label="Inches"><NumberInput min={0} max={11.99} value={inch} onValue={setInch} /></Field>
          <Field label="Weight (lb)"><NumberInput min={2} max={1400} value={lb} onValue={setLb} /></Field>
        </Row>
      )}
      {Number.isFinite(bmi) && bmi > 0 && (
        <>
          <div className="stats">
            <div className="stat"><div className="stat-value" style={{ color: band[2] }}>{bmi.toFixed(1)}</div><div className="stat-label">BMI</div></div>
            <div className="stat"><div className="stat-value" style={{ color: band[2], fontSize: 18 }}>{band[1]}</div><div className="stat-label">Category (adult WHO ranges)</div></div>
            <div className="stat"><div className="stat-value" style={{ fontSize: 18 }}>{show(lo)} – {show(hi)}</div><div className="stat-label">Healthy weight for your height</div></div>
          </div>
          <div style={{ position: 'relative', display: 'flex', height: 12, borderRadius: 6, overflow: 'hidden' }}>
            {[[0, 18.5, '#3b82f6'], [18.5, 25, '#16a34a'], [25, 30, '#f59e0b'], [30, 40, '#dc2626']].map(([a, b, c]) => <div key={c} style={{ flex: (b as number) - (a as number), background: c as string }} />)}
            <div style={{ position: 'absolute', left: `${Math.min(100, Math.max(0, (bmi / 40) * 100))}%`, top: -2, width: 3, height: 16, background: 'var(--text)' }} />
          </div>
          <div className="muted" style={{ fontSize: 13 }}>BMI is a screening measure, not a diagnosis, and doesn't account for muscle mass, age or ethnicity.</div>
        </>
      )}
    </>
  )
}
