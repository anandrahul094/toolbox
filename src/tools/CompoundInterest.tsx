import { useMemo, useState } from 'react'
import { Field, Row, Stat, NumberInput } from '../components/ui'
import { inr } from '../lib/money'

const FREQ: [string, number][] = [['Yearly', 1], ['Half-yearly', 2], ['Quarterly', 4], ['Monthly', 12], ['Daily', 365]]

export default function CompoundInterest() {
  const [principal, setPrincipal] = useState(100000)
  const [rate, setRate] = useState(7.5)
  const [years, setYears] = useState(5)
  const [freq, setFreq] = useState(4)
  const [monthly, setMonthly] = useState(0)

  const r = useMemo(() => {
    const monthlyRate = (1 + rate / 100 / freq) ** (freq / 12) - 1 // effective rate per month
    let bal = principal, deposits = principal
    const rows: { year: number; deposits: number; interest: number; balance: number }[] = []
    for (let m = 1; m <= years * 12; m++) {
      bal = bal * (1 + monthlyRate) + monthly
      deposits += monthly
      if (m % 12 === 0) rows.push({ year: m / 12, deposits, interest: bal - deposits, balance: bal })
    }
    return { bal, deposits, interest: bal - deposits, rows, effective: ((1 + rate / 100 / freq) ** freq - 1) * 100 }
  }, [principal, rate, years, freq, monthly])

  return (
    <>
      <Row>
        <Field label="Principal (₹)"><NumberInput min={0} max={1e+12} value={principal} onValue={setPrincipal} /></Field>
        <Field label="Interest rate (% p.a.)"><NumberInput min={0} max={100} step={0.1} value={rate} onValue={setRate} /></Field>
        <Field label="Years"><NumberInput min={1} max={60} step={1} value={years} onValue={(v) => setYears(Math.round(v))} /></Field>
      </Row>
      <Row>
        <Field label="Compounding"><select value={freq} onChange={(e) => setFreq(+e.target.value)}>{FREQ.map(([l, v]) => <option key={v} value={v}>{l}</option>)}</select></Field>
        <Field label="Monthly addition (₹, optional)"><NumberInput min={0} max={1e+10} value={monthly} onValue={setMonthly} /></Field>
      </Row>
      <div className="stats">
        <Stat label="Total deposited" value={inr(r.deposits)} />
        <Stat label="Interest earned" value={inr(r.interest)} />
        <Stat label="Maturity value" value={inr(r.bal)} />
        <Stat label="Effective annual rate" value={`${r.effective.toFixed(2)}%`} />
      </div>
      <table>
        <thead><tr><th>Year</th><th>Deposited</th><th>Interest</th><th>Balance</th></tr></thead>
        <tbody>{r.rows.map((row) => <tr key={row.year}><td>{row.year}</td><td>{inr(row.deposits)}</td><td>{inr(row.interest)}</td><td>{inr(row.balance)}</td></tr>)}</tbody>
      </table>
      <div className="muted" style={{ fontSize: 13 }}>Before tax. Interest on fixed deposits is taxable at your slab rate.</div>
    </>
  )
}
