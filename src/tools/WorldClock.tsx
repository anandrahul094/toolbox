import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Moon, Sun, X } from 'lucide-react'
import { Field, Row } from '../components/ui'

// City → time zone. Any IANA zone can also be added by name.
const CITIES: [string, string][] = [
  ['New Delhi', 'Asia/Kolkata'], ['Mumbai', 'Asia/Kolkata'], ['Bengaluru', 'Asia/Kolkata'], ['Kathmandu', 'Asia/Kathmandu'], ['Dhaka', 'Asia/Dhaka'],
  ['Colombo', 'Asia/Colombo'], ['Karachi', 'Asia/Karachi'], ['Dubai', 'Asia/Dubai'], ['Abu Dhabi', 'Asia/Dubai'], ['Riyadh', 'Asia/Riyadh'], ['Doha', 'Asia/Qatar'],
  ['Kuwait City', 'Asia/Kuwait'], ['Muscat', 'Asia/Muscat'], ['Singapore', 'Asia/Singapore'], ['Kuala Lumpur', 'Asia/Kuala_Lumpur'], ['Bangkok', 'Asia/Bangkok'],
  ['Jakarta', 'Asia/Jakarta'], ['Hong Kong', 'Asia/Hong_Kong'], ['Shanghai', 'Asia/Shanghai'], ['Beijing', 'Asia/Shanghai'], ['Tokyo', 'Asia/Tokyo'], ['Seoul', 'Asia/Seoul'],
  ['Manila', 'Asia/Manila'], ['Sydney', 'Australia/Sydney'], ['Melbourne', 'Australia/Melbourne'], ['Perth', 'Australia/Perth'], ['Auckland', 'Pacific/Auckland'],
  ['London', 'Europe/London'], ['Dublin', 'Europe/Dublin'], ['Paris', 'Europe/Paris'], ['Berlin', 'Europe/Berlin'], ['Amsterdam', 'Europe/Amsterdam'], ['Zurich', 'Europe/Zurich'],
  ['Madrid', 'Europe/Madrid'], ['Rome', 'Europe/Rome'], ['Stockholm', 'Europe/Stockholm'], ['Moscow', 'Europe/Moscow'], ['Istanbul', 'Europe/Istanbul'], ['Cairo', 'Africa/Cairo'],
  ['Nairobi', 'Africa/Nairobi'], ['Lagos', 'Africa/Lagos'], ['Johannesburg', 'Africa/Johannesburg'], ['New York', 'America/New_York'], ['Toronto', 'America/Toronto'],
  ['Chicago', 'America/Chicago'], ['Denver', 'America/Denver'], ['Los Angeles', 'America/Los_Angeles'], ['San Francisco', 'America/Los_Angeles'], ['Vancouver', 'America/Vancouver'],
  ['Mexico City', 'America/Mexico_City'], ['São Paulo', 'America/Sao_Paulo'], ['Buenos Aires', 'America/Argentina/Buenos_Aires'], ['Honolulu', 'Pacific/Honolulu'], ['UTC', 'UTC'],
]
const ZONES: string[] = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.('timeZone') ?? []
const LOCAL = Intl.DateTimeFormat().resolvedOptions().timeZone
const KEY = 'toolbox.worldclock' // which cities are shown (a preference, not tool input)
const DEFAULT = [['New York', 'America/New_York'], ['London', 'Europe/London'], ['Dubai', 'Asia/Dubai'], ['Singapore', 'Asia/Singapore'], ['Sydney', 'Australia/Sydney']]

// older zone names some systems still report
const RENAMED: Record<string, string> = { Calcutta: 'Kolkata', Saigon: 'Ho Chi Minh City', Kiev: 'Kyiv', Rangoon: 'Yangon', Katmandu: 'Kathmandu' }
const cityName = (tz: string) => { const c = tz.split('/').pop()!.replace(/_/g, ' '); return RENAMED[c] ?? c }
function offsetMin(tz: string, d: Date) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' }).formatToParts(d).map((x) => [x.type, x.value]))
  return Math.round((Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute) - Math.floor(d.getTime() / 60000) * 60000) / 60000)
}
const fmtDiff = (m: number) => {
  if (m === 0) return 'Same time as you'
  const a = Math.abs(m), h = Math.floor(a / 60), mm = a % 60
  return `${h ? `${h}h` : ''}${h && mm ? ' ' : ''}${mm ? `${mm}m` : ''} ${m > 0 ? 'ahead' : 'behind'}`
}

function load(): [string, string][] {
  try { const v = JSON.parse(localStorage.getItem(KEY) ?? 'null'); if (Array.isArray(v)) return v } catch { /* ignore */ }
  return DEFAULT as [string, string][]
}

export default function WorldClock() {
  const [clocks, setClocks] = useState<[string, string][]>(load)
  const [now, setNow] = useState(() => new Date())
  const [h24, setH24] = useState(false)
  const [q, setQ] = useState('')

  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t) }, [])
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(clocks)) } catch { /* ignore */ } }, [clocks])

  const matches = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return []
    const cities = CITIES.filter(([c, tz]) => c.toLowerCase().includes(s) || tz.toLowerCase().includes(s))
    const zones = ZONES.filter((z) => z.toLowerCase().replace(/_/g, ' ').includes(s) && !cities.some(([, tz]) => tz === z)).map((z): [string, string] => [cityName(z), z])
    return [...cities, ...zones].slice(0, 8)
  }, [q])
  const add = (c: [string, string]) => { if (!clocks.some(([n, z]) => n === c[0] && z === c[1])) setClocks([...clocks, c]); setQ('') }

  const local = offsetMin(LOCAL, now)
  const card = (label: string, tz: string, mine = false) => {
    const hour = +new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', hourCycle: 'h23' }).format(now)
    const day = hour >= 6 && hour < 18
    const diff = offsetMin(tz, now) - local
    return (
      <div key={label + tz} className="tile" style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: 14, position: 'relative', border: mine ? '1px solid var(--accent)' : undefined }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
          {day ? <Sun size={15} aria-label="Daytime" /> : <Moon size={15} aria-label="Night-time" />}{label}{mine && <span className="muted" style={{ fontWeight: 400 }}>· you</span>}
        </div>
        <div style={{ fontSize: 30, fontWeight: 600, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em' }}>
          {new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: !h24 }).format(now)}
        </div>
        <div className="muted" style={{ fontSize: 13 }}>
          {new Intl.DateTimeFormat('en-GB', { timeZone: tz, weekday: 'short', day: 'numeric', month: 'short' }).format(now)} · {mine ? tz : fmtDiff(diff)}
        </div>
        {!mine && <button className="icon-only" style={{ position: 'absolute', top: 8, right: 8 }} aria-label={`Remove ${label}`} onClick={() => setClocks(clocks.filter(([n, z]) => !(n === label && z === tz)))}><X size={14} /></button>}
      </div>
    )
  }

  return (
    <>
      <Row>
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <Field label="Add a city or time zone">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. Dubai, Toronto, Europe/Berlin" onKeyDown={(e) => { if (e.key === 'Enter' && matches[0]) add(matches[0]) }} />
          </Field>
          {matches.length > 0 && (
            <ul role="listbox" style={{ position: 'absolute', zIndex: 5, left: 0, right: 0, margin: 0, padding: 4, listStyle: 'none', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,.12)' }}>
              {matches.map((m) => (
                <li key={m.join()}><button className="m-item" style={{ width: '100%', textAlign: 'left' }} onClick={() => add(m)}>{m[0]} <span className="muted">· {m[1]}</span></button></li>
              ))}
            </ul>
          )}
        </div>
        <label className="check" style={{ alignSelf: 'flex-end' }}><input type="checkbox" checked={h24} onChange={(e) => setH24(e.target.checked)} /> 24-hour</label>
      </Row>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 10 }}>
        {card(cityName(LOCAL), LOCAL, true)}
        {clocks.map(([label, tz]) => card(label, tz))}
      </div>
      <p className="muted" style={{ margin: 0, fontSize: 13 }}>Daylight saving is handled automatically. Planning a call? Use the <Link to="/tool/timezone">Time Zone Converter</Link> to compare a specific time.</p>
    </>
  )
}
