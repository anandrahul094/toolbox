import { useMemo, useState } from 'react'
import { Field, NumberInput, Row, Stat } from '../components/ui'

const money = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 0 })

export default function EmiCalculator() {
  const [principal, setPrincipal] = useState(1_000_000)
  const [rate, setRate] = useState(8.5)
  const [years, setYears] = useState(10)
  const [showAll, setShowAll] = useState(false)

  const r = useMemo(() => {
    const n = Math.round(years * 12)
    const m = rate / 12 / 100
    const emi = m === 0 ? principal / n : (principal * m * (1 + m) ** n) / ((1 + m) ** n - 1)
    const schedule: { year: number; interest: number; principal: number; balance: number }[] = []
    let bal = principal, yi = 0, yp = 0
    for (let k = 1; k <= n; k++) {
      const int = bal * m, pr = emi - int
      bal = Math.max(0, bal - pr); yi += int; yp += pr
      if (k % 12 === 0 || k === n) { schedule.push({ year: Math.ceil(k / 12), interest: yi, principal: yp, balance: bal }); yi = yp = 0 }
    }
    return { emi, total: emi * n, interest: emi * n - principal, schedule }
  }, [principal, rate, years])

  const pct = (r.interest / r.total) * 100

  return (
    <>
      <Row>
        <Field label="Loan amount"><NumberInput min={0} max={1e12} value={principal} onValue={setPrincipal} /></Field>
        <Field label="Interest rate (% per year)"><NumberInput min={0} max={100} step={0.1} value={rate} onValue={setRate} /></Field>
        <Field label="Tenure (years)"><NumberInput min={0.5} max={40} step={0.5} value={years} onValue={setYears} /></Field>
      </Row>
      {principal > 0 && Number.isFinite(r.emi) && (
        <>
          <div className="stats">
            <Stat label="Monthly EMI" value={money(r.emi)} />
            <Stat label="Total interest" value={money(r.interest)} />
            <Stat label="Total payment" value={money(r.total)} />
          </div>
          <div>
            <div style={{ display: 'flex', height: 14, borderRadius: 7, overflow: 'hidden' }}>
              <div style={{ width: `${100 - pct}%`, background: 'var(--accent)' }} />
              <div style={{ width: `${pct}%`, background: '#f59e0b' }} />
            </div>
            <div className="muted" style={{ fontSize: 13, marginTop: 6 }}>■ Principal {(100 - pct).toFixed(1)}% · <span style={{ color: '#f59e0b' }}>■</span> Interest {pct.toFixed(1)}%</div>
          </div>
          <table>
            <thead><tr><th>Year</th><th>Principal paid</th><th>Interest paid</th><th>Balance</th></tr></thead>
            <tbody>{(showAll ? r.schedule : r.schedule.slice(0, 5)).map((s) => (
              <tr key={s.year}><td>{s.year}</td><td>{money(s.principal)}</td><td>{money(s.interest)}</td><td>{money(s.balance)}</td></tr>
            ))}</tbody>
          </table>
          {r.schedule.length > 5 && <div><button className="btn" onClick={() => setShowAll(!showAll)}>{showAll ? 'Show less' : `Show all ${r.schedule.length} years`}</button></div>}
        </>
      )}
    </>
  )
}
