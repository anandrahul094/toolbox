import { useEffect, useMemo, useState } from 'react'
import { CopyButton, Field, Row } from '../components/ui'

export default function TimestampConverter() {
  const [now, setNow] = useState(Date.now())
  const [ts, setTs] = useState(String(Math.floor(Date.now() / 1000)))
  const [dateStr, setDateStr] = useState(() => toLocalInput(new Date()))

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const fromTs = useMemo(() => {
    const n = Number(ts.trim())
    if (!ts.trim() || Number.isNaN(n)) return null
    // decide by size, not string length: 1.7e9 is seconds, 1.7e12 is milliseconds
    const ms = Math.abs(n) >= 1e11 ? n : n * 1000
    const d = new Date(ms)
    return Number.isNaN(d.getTime()) ? null : d
  }, [ts])

  const fromDate = useMemo(() => {
    const d = new Date(dateStr)
    return Number.isNaN(d.getTime()) ? null : d
  }, [dateStr])

  return (
    <>
      <div className="stats">
        <div className="stat"><div className="stat-value mono">{Math.floor(now / 1000)}</div><div className="stat-label">Current Unix time (s)</div></div>
        <div className="stat"><div className="stat-value mono" style={{ fontSize: 16 }}>{new Date(now).toISOString()}</div><div className="stat-label">Current ISO 8601 (UTC)</div></div>
      </div>
      <h3>Timestamp → Date</h3>
      <Row>
        <Field label="Unix timestamp (seconds or milliseconds)"><input className="mono" value={ts} onChange={(e) => setTs(e.target.value)} /></Field>
        <button className="btn" onClick={() => setTs(String(Math.floor(Date.now() / 1000)))}>Now</button>
      </Row>
      {fromTs ? (
        <table><tbody>
          <tr><th>Local</th><td>{fromTs.toString()}</td></tr>
          <tr><th>UTC</th><td>{fromTs.toUTCString()}</td></tr>
          <tr><th>ISO 8601</th><td className="mono">{fromTs.toISOString()}</td></tr>
          <tr><th>Relative</th><td>{relative(fromTs.getTime() - now)}</td></tr>
        </tbody></table>
      ) : <div className="muted">Enter a numeric timestamp.</div>}
      <h3>Date → Timestamp</h3>
      <Field label="Date & time (local)"><input type="datetime-local" step="1" value={dateStr} onChange={(e) => setDateStr(e.target.value)} /></Field>
      {fromDate && (
        <Row>
          <span className="mono">Seconds: {Math.floor(fromDate.getTime() / 1000)}</span>
          <CopyButton value={String(Math.floor(fromDate.getTime() / 1000))} />
          <span className="mono">Milliseconds: {fromDate.getTime()}</span>
          <CopyButton value={String(fromDate.getTime())} />
        </Row>
      )}
    </>
  )
}

function toLocalInput(d: Date) {
  const off = d.getTimezoneOffset() * 60000
  return new Date(d.getTime() - off).toISOString().slice(0, 19)
}

function relative(diffMs: number) {
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })
  const units: [Intl.RelativeTimeFormatUnit, number][] = [['year', 31536e6], ['month', 2592e6], ['day', 864e5], ['hour', 36e5], ['minute', 6e4], ['second', 1e3]]
  for (const [u, ms] of units) if (Math.abs(diffMs) >= ms || u === 'second') return rtf.format(Math.round(diffMs / ms), u)
  return ''
}
