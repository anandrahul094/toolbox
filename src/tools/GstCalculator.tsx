import { useState } from 'react'
import { CopyButton, Field, Row, Stat, NumberInput } from '../components/ui'
import { inr } from '../lib/money'

const RATES = [5, 18, 40, 0.25, 3]
const LEGACY = [12, 28]

export default function GstCalculator() {
  const [amount, setAmount] = useState(10000)
  const [rate, setRate] = useState(18)
  const [inclusive, setInclusive] = useState(false)
  const [interstate, setInterstate] = useState(false)

  const base = inclusive ? amount / (1 + rate / 100) : amount
  const gst = base * (rate / 100)
  const total = base + gst
  const summary = `Net: ${inr(base, 2)} | GST @${rate}%: ${inr(gst, 2)}${interstate ? ` (IGST)` : ` (CGST ${inr(gst / 2, 2)} + SGST ${inr(gst / 2, 2)})`} | Total: ${inr(total, 2)}`

  return (
    <>
      <Row>
        <Field label="Amount (₹)"><NumberInput min={0} max={1e+12} value={amount} onValue={setAmount} style={{ fontSize: 18 }} /></Field>
        <Field label="GST rate (%)"><NumberInput min={0} max={100} step={0.25} value={rate} onValue={setRate} /></Field>
      </Row>
      <Row>
        {RATES.map((r) => <button key={r} className={`chip ${rate === r ? 'active' : ''}`} onClick={() => setRate(r)}>{r}%</button>)}
        <span className="muted" style={{ fontSize: 13 }}>Older slabs:</span>
        {LEGACY.map((r) => <button key={r} className={`chip ${rate === r ? 'active' : ''}`} onClick={() => setRate(r)}>{r}%</button>)}
      </Row>
      <Row>
        <button className={`btn ${!inclusive ? 'primary' : ''}`} onClick={() => setInclusive(false)}>Add GST (amount excludes GST)</button>
        <button className={`btn ${inclusive ? 'primary' : ''}`} onClick={() => setInclusive(true)}>Remove GST (amount includes GST)</button>
      </Row>
      <Row>
        <label className="check"><input type="radio" checked={!interstate} onChange={() => setInterstate(false)} /> Within state (CGST + SGST)</label>
        <label className="check"><input type="radio" checked={interstate} onChange={() => setInterstate(true)} /> Between states (IGST)</label>
      </Row>
      <div className="stats">
        <Stat label="Net amount (before GST)" value={inr(base, 2)} />
        {interstate ? <Stat label={`IGST @ ${rate}%`} value={inr(gst, 2)} /> : <>
          <Stat label={`CGST @ ${rate / 2}%`} value={inr(gst / 2, 2)} />
          <Stat label={`SGST @ ${rate / 2}%`} value={inr(gst / 2, 2)} />
        </>}
        <Stat label="Total GST" value={inr(gst, 2)} />
        <Stat label="Total amount" value={inr(total, 2)} />
      </div>
      <div><CopyButton value={summary} label="Copy breakup" /></div>
      <div className="muted" style={{ fontSize: 13 }}>From 22 September 2025 most goods and services moved to 5% or 18%, with 40% for select luxury and sin goods; the 12% and 28% slabs remain here for older invoices. Check the applicable rate for your HSN/SAC code on the official GST portal.</div>
    </>
  )
}
