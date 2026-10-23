import { useMemo, useState } from 'react'
import { Field, Row, Stat, NumberInput } from '../components/ui'

// local date, not UTC (toISOString would show yesterday early in the morning in India)
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
const parse = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d) }

// add whole months, clamping to the month's last day (Jan 31 + 1 month = Feb 28/29)
function addMonths(d: Date, n: number) {
  const t = new Date(d.getFullYear(), d.getMonth() + n, 1)
  t.setDate(Math.min(d.getDate(), new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate()))
  return t
}
const utcDays = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5

function ymd(a: Date, b: Date) {
  let months = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth())
  if (addMonths(a, months) > b) months--
  const d = Math.round(utcDays(b) - utcDays(addMonths(a, months)))
  return { y: Math.floor(months / 12), m: months % 12, d }
}

export default function DateDiff() {
  const [from, setFrom] = useState('1995-06-15')
  const [to, setTo] = useState(today)
  const [addDays, setAddDays] = useState(30)

  const r = useMemo(() => {
    if (!from || !to) return null
    let a = parse(from), b = parse(to)
    const neg = a > b
    if (neg) [a, b] = [b, a]
    const days = Math.round((Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) - Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) / 864e5)
    let weekdays = 0
    for (let i = 0, d = new Date(a); i < days && i < 100000; i++, d.setDate(d.getDate() + 1)) if (d.getDay() % 6) weekdays++
    const next = new Date(b.getFullYear(), a.getMonth(), a.getDate())
    if (next <= b) next.setFullYear(next.getFullYear() + 1)
    return { ...ymd(a, b), days, weekdays, neg, untilAnniv: Math.round((next.getTime() - b.getTime()) / 864e5) }
  }, [from, to])

  // setDate keeps the calendar day correct across daylight-saving changes
  const plus = from ? (() => { const d = parse(from); d.setDate(d.getDate() + addDays); return d })() : null

  return (
    <>
      <Row>
        <Field label="Start date / date of birth"><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
        <Field label="End date"><input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
        <button className="btn" onClick={() => setTo(today())}>Today</button>
      </Row>
      {r && (
        <>
          <div className="output" style={{ fontSize: 20, fontFamily: 'inherit' }}>
            {r.neg && '− '}{r.y} years, {r.m} months, {r.d} days
          </div>
          <div className="stats">
            <Stat label="Total days" value={r.days.toLocaleString()} />
            <Stat label="Weekdays (Mon–Fri)" value={r.weekdays.toLocaleString()} />
            <Stat label="Weeks" value={(r.days / 7).toFixed(1)} />
            <Stat label="Total months" value={r.y * 12 + r.m} />
            <Stat label="Hours" value={(r.days * 24).toLocaleString()} />
            <Stat label="Days to next anniversary" value={r.untilAnniv} />
          </div>
        </>
      )}
      <h3 style={{ margin: 0 }}>Add / subtract days</h3>
      <Row>
        <Field label="Days to add to the start date (negative to subtract)"><NumberInput min={-100000} max={100000} step={1} value={addDays} onValue={(v) => setAddDays(Math.round(v))} /></Field>
        <div className="output" style={{ fontFamily: 'inherit' }}>{plus && !Number.isNaN(plus.getTime()) ? plus.toDateString() : '—'}</div>
      </Row>
    </>
  )
}
