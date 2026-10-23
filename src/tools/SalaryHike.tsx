import { useState } from 'react'
import { Field, Row, Stat, NumberInput } from '../components/ui'
import { inr } from '../lib/money'

export default function SalaryHike() {
  const [current, setCurrent] = useState(800000)
  const [period, setPeriod] = useState<'year' | 'month'>('year')
  const [mode, setMode] = useState<'percent' | 'new'>('percent')
  const [hike, setHike] = useState(10)
  const [newSal, setNewSal] = useState(900000)

  const annual = period === 'year' ? current : current * 12
  const nextAnnual = mode === 'percent' ? annual * (1 + hike / 100) : period === 'year' ? newSal : newSal * 12
  const pct = annual ? ((nextAnnual - annual) / annual) * 100 : 0
  const diff = nextAnnual - annual

  return (
    <>
      <Row>
        <Field label="Current salary (₹)"><NumberInput min={0} max={1e+10} value={current} onValue={setCurrent} /></Field>
        <Field label="Per"><select value={period} onChange={(e) => { const p = e.target.value as typeof period; if (p !== period) { const k = p === 'month' ? 1 / 12 : 12; setCurrent(Math.round(current * k)); setNewSal(Math.round(newSal * k)) } setPeriod(p) }}><option value="year">Year</option><option value="month">Month</option></select></Field>
      </Row>
      <Row>
        <button className={`btn ${mode === 'percent' ? 'primary' : ''}`} onClick={() => setMode('percent')}>I know the hike %</button>
        <button className={`btn ${mode === 'new' ? 'primary' : ''}`} onClick={() => setMode('new')}>I know the new salary</button>
      </Row>
      {mode === 'percent'
        ? <Field label={`Hike: ${hike}%`}><input type="range" min={0} max={100} step={0.5} value={hike} onChange={(e) => setHike(+e.target.value)} /></Field>
        : <Field label={`New salary (₹ per ${period})`}><NumberInput min={0} max={1e+10} value={newSal} onValue={setNewSal} /></Field>}
      <div className="stats">
        <Stat label="Hike" value={`${pct.toFixed(2)}%`} />
        <Stat label="New annual salary" value={inr(nextAnnual)} />
        <Stat label="New monthly salary" value={inr(nextAnnual / 12)} />
        <Stat label="Increase per year" value={inr(diff)} />
        <Stat label="Increase per month" value={inr(diff / 12)} />
      </div>
    </>
  )
}
