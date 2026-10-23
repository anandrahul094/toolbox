import { useMemo, useState } from 'react'
import { ErrorBox, Field, Row } from '../components/ui'

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

const FIELDS = [
  { name: 'minute', min: 0, max: 59 },
  { name: 'hour', min: 0, max: 23 },
  { name: 'day of month', min: 1, max: 31 },
  { name: 'month', min: 1, max: 12, names: MONTHS, offset: 1 },
  { name: 'day of week', min: 0, max: 7, names: DAYS, offset: 0 },
]

const PRESETS: Record<string, string> = {
  '@yearly': '0 0 1 1 *', '@annually': '0 0 1 1 *', '@monthly': '0 0 1 * *',
  '@weekly': '0 0 * * 0', '@daily': '0 0 * * *', '@midnight': '0 0 * * *', '@hourly': '0 * * * *',
}

interface Parsed { sets: Set<number>[]; wild: boolean[]; star: boolean[]; raw: string[] }

function parseField(raw: string, f: (typeof FIELDS)[number]): Set<number> {
  const out = new Set<number>()
  const toNum = (s: string) => {
    const idx = f.names?.indexOf(s.toUpperCase()) ?? -1
    const n = idx >= 0 ? idx + (f.offset ?? 0) : Number(s)
    if (!Number.isInteger(n) || n < f.min || n > f.max) throw new Error(`"${s}" is out of range for ${f.name} (${f.min}-${f.max})`)
    return n
  }
  for (const part of raw.split(',')) {
    if (part === '') throw new Error(`Empty value in ${f.name} (check for a stray comma)`)
    const [range, stepStr] = part.split('/')
    const step = stepStr === undefined ? 1 : Number(stepStr)
    if (!Number.isInteger(step) || step < 1) throw new Error(`Invalid step "${stepStr}" in ${f.name}`)
    let lo: number, hi: number
    if (range === '*') [lo, hi] = [f.min, f.max]
    else if (range.includes('-')) [lo, hi] = range.split('-').map(toNum) as [number, number]
    else { lo = toNum(range); hi = stepStr ? f.max : lo }
    if (lo > hi) throw new Error(`Invalid range "${range}" in ${f.name}`)
    for (let v = lo; v <= hi; v += step) out.add(v)
  }
  if (f.name === 'day of week' && out.has(7)) { out.delete(7); out.add(0) }
  return out
}

function parse(expr: string): Parsed {
  const e = PRESETS[expr.trim().toLowerCase()] ?? expr.trim()
  const raw = e.split(/\s+/)
  if (raw.length !== 5) throw new Error('Expected 5 fields: minute hour day-of-month month day-of-week')
  // star: field starts with * (e.g. */2) — standard cron then ANDs day-of-month with day-of-week
  return { raw, sets: raw.map((r, i) => parseField(r, FIELDS[i])), wild: raw.map((r) => r === '*'), star: raw.map((r) => r.startsWith('*')) }
}


// walk day by day (fast even for schedules that never or rarely run), then through that day's times
function nextRuns(p: Parsed, count: number) {
  const runs: Date[] = []
  const now = Date.now()
  const hours = [...p.sets[1]].sort((a, b) => a - b), minutes = [...p.sets[0]].sort((a, b) => a - b)
  const day = new Date(); day.setHours(0, 0, 0, 0)
  for (let i = 0; i < 366 * 5 && runs.length < count; i++, day.setDate(day.getDate() + 1)) {
    if (!dayMatches(p, day)) continue
    for (const h of hours) for (const m of minutes) {
      const t = new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, m)
      if (t.getTime() > now && runs.length < count) runs.push(t)
    }
  }
  return runs
}

function dayMatches(p: Parsed, d: Date) {
  const [, , dom, mon, dow] = p.sets
  if (!mon.has(d.getMonth() + 1)) return false
  const domOk = dom.has(d.getDate()), dowOk = dow.has(d.getDay())
  return !p.star[2] && !p.star[4] ? domOk || dowOk : domOk && dowOk
}

// collapse consecutive runs: [1,2,3,5] → "1 through 3 and 5"
const list = (vals: number[], fmt: (n: number) => string = String) => {
  const runs: string[] = []
  for (let i = 0; i < vals.length; i++) {
    let j = i
    while (j + 1 < vals.length && vals[j + 1] === vals[j] + 1) j++
    runs.push(j - i >= 2 ? `${fmt(vals[i])} through ${fmt(vals[j])}` : vals.slice(i, j + 1).map(fmt).join(', '))
    i = j
  }
  return runs.length <= 1 ? runs.join('') : `${runs.slice(0, -1).join(', ')} and ${runs[runs.length - 1]}`
}

function describe(p: Parsed) {
  const [min, hr, dom, mon, dow] = p.sets.map((s) => [...s].sort((a, b) => a - b))
  const step = (raw: string) => raw.match(/^\*\/(\d+)$/)?.[1]
  const parts: string[] = []
  const pad = (n: number) => String(n).padStart(2, '0')

  if (min.length === 1 && hr.length === 1) parts.push(`At ${pad(hr[0])}:${pad(min[0])}`)
  else {
    const ms = step(p.raw[0])
    parts.push(p.wild[0] ? 'Every minute' : ms ? `Every ${ms} minutes` : `At minute ${list(min)}`)
    const hs = step(p.raw[1])
    if (!p.wild[1]) parts.push(hs ? `every ${hs} hours` : `past hour ${list(hr)}`)
  }
  if (!p.wild[2]) parts.push(`on day ${list(dom)} of the month`)
  if (!p.wild[4]) parts.push(`${p.wild[2] ? 'on' : 'or on'} ${list(dow, (d) => DAY_NAMES[d])}`)
  if (!p.wild[3]) parts.push(`in ${list(mon, (m) => MONTH_NAMES[m - 1])}`)
  return parts.join(', ') + '.'
}

export default function CronExplainer() {
  const [expr, setExpr] = useState('*/15 9-17 * * MON-FRI')
  const result = useMemo(() => {
    try {
      const p = parse(expr)
      return { p, text: describe(p), runs: nextRuns(p, 8) }
    } catch (e) {
      return { error: (e as Error).message }
    }
  }, [expr])

  return (
    <>
      <Field label="Cron expression" hint="minute · hour · day-of-month · month · day-of-week. Also supports @daily, @weekly, etc.">
        <input className="mono" style={{ fontSize: 18 }} value={expr} onChange={(e) => setExpr(e.target.value)} />
      </Field>
      <Row>
        {['* * * * *', '0 * * * *', '0 0 * * *', '0 9 * * MON-FRI', '*/5 * * * *', '0 0 1 * *', '@weekly'].map((x) => (
          <button key={x} className="chip" onClick={() => setExpr(x)}><span className="mono">{x}</span></button>
        ))}
      </Row>
      <ErrorBox message={result.error} />
      {result.text && (
        <>
          <div className="output" style={{ fontFamily: 'inherit', fontSize: 18 }}>{result.text}</div>
          {result.runs!.length === 0 && <div className="error">This schedule never runs in the next 5 years — check the day and month (for example, February has no 30th).</div>}
          <Field label="Next runs (local time)">
            <ol style={{ margin: 0 }}>{result.runs!.map((r, i) => <li key={i}>{r.toLocaleString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</li>)}</ol>
          </Field>
        </>
      )}
    </>
  )
}
