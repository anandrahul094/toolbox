import { useMemo, useState } from 'react'
import { Field, Row } from '../components/ui'

const SUPPORTED: string[] = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.('timeZone') ?? ['UTC', 'America/New_York', 'Europe/London', 'Asia/Kolkata', 'Asia/Tokyo']
const LOCAL_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone
// some browsers omit UTC or list the local zone under another name; make sure both are selectable
const ALL_ZONES = [...new Set(['UTC', LOCAL_ZONE, ...SUPPORTED])].sort((a, b) => (a === 'UTC' ? -1 : b === 'UTC' ? 1 : a.localeCompare(b)))
const LOCAL = Intl.DateTimeFormat().resolvedOptions().timeZone

// offset (ms) of a zone at a given instant
function offsetOf(tz: string, date: Date) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).formatToParts(date).map((p) => [p.type, p.value]))
  const asUTC = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second)
  return asUTC - Math.floor(date.getTime() / 1000) * 1000
}

// interpret a wall-clock "YYYY-MM-DDTHH:mm" as being in tz
function zonedToInstant(wall: string, tz: string) {
  const [d, t] = wall.split('T')
  const [y, mo, da] = d.split('-').map(Number)
  const [h, mi] = t.split(':').map(Number)
  const guess = Date.UTC(y, mo - 1, da, h, mi)
  const first = guess - offsetOf(tz, new Date(guess))
  return new Date(guess - offsetOf(tz, new Date(first)))
}

const nowWall = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16) }

export default function TimezoneConverter() {
  const [wall, setWall] = useState(nowWall)
  const [source, setSource] = useState(LOCAL)
  const [targets, setTargets] = useState(['UTC', 'America/New_York', 'Europe/London', 'Asia/Kolkata', 'Asia/Tokyo', 'Australia/Sydney'].filter((z) => z !== LOCAL))
  const [add, setAdd] = useState('')

  const instant = useMemo(() => (wall ? zonedToInstant(wall, source) : null), [wall, source])

  return (
    <>
      <Row>
        <Field label="Date & time"><input type="datetime-local" value={wall} onChange={(e) => setWall(e.target.value)} /></Field>
        <Field label="In time zone"><select value={source} onChange={(e) => setSource(e.target.value)}>{ALL_ZONES.map((z) => <option key={z}>{z}</option>)}</select></Field>
        <button className="btn" onClick={() => { setWall(nowWall()); setSource(LOCAL) }}>Now</button>
      </Row>
      {instant && (
        <table>
          <thead><tr><th>Zone</th><th>Time</th><th>UTC offset</th><th /></tr></thead>
          <tbody>
            {[source, ...targets.filter((t) => t !== source)].map((tz) => {
              const off = offsetOf(tz, instant) / 60000
              return (
                <tr key={tz}>
                  <td><b>{tz.replace(/_/g, ' ')}</b>{tz === LOCAL && <span className="muted"> (you)</span>}</td>
                  <td>{instant.toLocaleString(undefined, { timeZone: tz, weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                  <td className="mono">UTC{off >= 0 ? '+' : '−'}{String(Math.floor(Math.abs(off) / 60)).padStart(2, '0')}:{String(Math.abs(off) % 60).padStart(2, '0')}</td>
                  <td>{tz !== source && <button className="btn" onClick={() => setTargets(targets.filter((t) => t !== tz))} aria-label={`Remove ${tz}`}>✕</button>}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
      <Row>
        <Field label="Add a time zone">
          <input list="tz-list" value={add} onChange={(e) => setAdd(e.target.value)} placeholder="Type a city, e.g. Berlin" />
          <datalist id="tz-list">{ALL_ZONES.map((z) => <option key={z} value={z} />)}</datalist>
        </Field>
        <button className="btn primary" disabled={!ALL_ZONES.includes(add)} onClick={() => { setTargets([...new Set([...targets, add])]); setAdd('') }}>Add</button>
      </Row>
    </>
  )
}
