import { useMemo, useState } from 'react'
import { Field, Row, Stat, NumberInput } from '../components/ui'
import { inr } from '../lib/money'

export default function SipCalculator() {
  const [monthly, setMonthly] = useState(10000)
  const [rate, setRate] = useState(12)
  const [years, setYears] = useState(15)
  const [stepUp, setStepUp] = useState(0)
  const [lumpsum, setLumpsum] = useState(0)

  const r = useMemo(() => {
    const i = rate / 12 / 100
    let value = lumpsum, invested = lumpsum, sip = monthly
    const rows: { year: number; invested: number; value: number }[] = []
    for (let m = 1; m <= years * 12; m++) {
      value = (value + sip) * (1 + i) // invested at the start of each month
      invested += sip
      if (m % 12 === 0) { rows.push({ year: m / 12, invested, value }); sip *= 1 + stepUp / 100 }
    }
    return { value, invested, gains: value - invested, rows }
  }, [monthly, rate, years, stepUp, lumpsum])

  const pct = r.value ? (r.invested / r.value) * 100 : 0
  return (
    <>
      <Row>
        <Field label="Monthly SIP (₹)"><NumberInput min={0} max={1e+09} step={500} value={monthly} onValue={setMonthly} /></Field>
        <Field label="Expected return (% p.a.)"><NumberInput min={0} max={50} step={0.5} value={rate} onValue={setRate} /></Field>
        <Field label="Time period (years)"><NumberInput min={1} max={50} step={1} value={years} onValue={(v) => setYears(Math.round(v))} /></Field>
      </Row>
      <Row>
        <Field label="Annual step-up (%)" hint="Increase your SIP by this much every year"><NumberInput min={0} max={50} value={stepUp} onValue={setStepUp} /></Field>
        <Field label="Initial lump sum (₹, optional)"><NumberInput min={0} max={1e+11} value={lumpsum} onValue={setLumpsum} /></Field>
      </Row>
      <div className="stats">
        <Stat label="Total invested" value={inr(r.invested)} />
        <Stat label="Estimated returns" value={inr(r.gains)} />
        <Stat label="Estimated value" value={inr(r.value)} />
      </div>
      <div>
        <div style={{ display: 'flex', height: 14, borderRadius: 7, overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, background: 'var(--accent)' }} /><div style={{ flex: 1, background: '#16a34a' }} />
        </div>
        <div className="muted" style={{ fontSize: 13, marginTop: 6 }}>■ Invested {pct.toFixed(0)}% · <span style={{ color: '#16a34a' }}>■</span> Returns {(100 - pct).toFixed(0)}%</div>
      </div>
      <table>
        <thead><tr><th>Year</th><th>Invested</th><th>Value</th></tr></thead>
        <tbody>{r.rows.filter((row) => row.year <= 5 || row.year % 5 === 0 || row.year === years).map((row) => <tr key={row.year}><td>{row.year}</td><td>{inr(row.invested)}</td><td>{inr(row.value)}</td></tr>)}</tbody>
      </table>
      <div className="muted" style={{ fontSize: 13 }}>Assumes a constant annual return compounded monthly. Actual mutual fund returns vary and are not guaranteed.</div>
    </>
  )
}
