import { useState } from 'react'
import { Field, Row, Stat, NumberInput } from '../components/ui'

const money = (n: number) => (Number.isFinite(n) ? n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—')

export default function TipSplit() {
  const [bill, setBill] = useState(1200)
  const [tip, setTip] = useState(10)
  const [people, setPeople] = useState(4)
  const [roundUp, setRoundUp] = useState(false)

  const tipAmt = (bill * tip) / 100
  const total = bill + tipAmt
  let each = total / Math.max(1, people)
  if (roundUp) each = Math.ceil(each)

  return (
    <>
      <Row>
        <Field label="Bill amount"><NumberInput min={0} max={1e+09} value={bill} onValue={setBill} /></Field>
        <Field label="People"><NumberInput min={1} max={1000} step={1} value={people} onValue={(v) => setPeople(Math.round(v))} /></Field>
      </Row>
      <Field label={`Tip: ${tip}%`}><input type="range" min={0} max={30} value={tip} onChange={(e) => setTip(+e.target.value)} /></Field>
      <Row>
        {[0, 5, 10, 15, 18, 20].map((t) => <button key={t} className={`chip ${t === tip ? 'active' : ''}`} onClick={() => setTip(t)}>{t}%</button>)}
        <label className="check"><input type="checkbox" checked={roundUp} onChange={(e) => setRoundUp(e.target.checked)} /> Round up per person</label>
      </Row>
      <div className="stats">
        <Stat label="Tip" value={money(tipAmt)} />
        <Stat label="Total" value={money(total)} />
        <Stat label="Each person pays" value={money(each)} />
        {roundUp && <Stat label="Extra from rounding" value={money(each * people - total)} />}
      </div>
    </>
  )
}
