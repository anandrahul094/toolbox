import { useState } from 'react'
import { Field, Row, Stat, NumberInput } from '../components/ui'
import { inr } from '../lib/money'

export default function InflationCalculator() {
  const [amount, setAmount] = useState(100000)
  const [rate, setRate] = useState(6)
  const [years, setYears] = useState(10)
  const f = (n: number) => (1 + rate / 100) ** n

  return (
    <>
      <Row>
        <Field label="Amount today (₹)"><NumberInput min={0} max={1e+12} value={amount} onValue={setAmount} /></Field>
        <Field label="Inflation rate (% per year)"><NumberInput min={0} max={100} step={0.1} value={rate} onValue={setRate} /></Field>
        <Field label="Years"><NumberInput min={1} max={60} step={1} value={years} onValue={(v) => setYears(Math.round(v))} /></Field>
      </Row>
      <div className="stats">
        <Stat label={`Cost of the same things in ${years} years`} value={inr(amount * f(years))} />
        <Stat label={`What ${inr(amount)} will be worth then, in today's money`} value={inr(amount / f(years))} />
        <Stat label="Loss of purchasing power" value={`${((1 - 1 / f(years)) * 100).toFixed(1)}%`} />
      </div>
      <table>
        <thead><tr><th>After</th><th>Future cost</th><th>Value in today's money</th></tr></thead>
        <tbody>{Array.from({ length: years }, (_, i) => i + 1).filter((y) => y <= 5 || y % 5 === 0 || y === years).map((y) => <tr key={y}><td>{y} yr</td><td>{inr(amount * f(y))}</td><td>{inr(amount / f(y))}</td></tr>)}</tbody>
      </table>
      <div className="muted" style={{ fontSize: 13 }}>India's CPI inflation has averaged roughly 5–6% over the long run; use your own assumption for planning.</div>
    </>
  )
}
