import { useState } from 'react'
import { CopyButton, Field, Row, NumberInput } from '../components/ui'

// crypto.randomUUID only exists on HTTPS/localhost; build a v4 UUID from random bytes otherwise
function uuid() {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  const b = crypto.getRandomValues(new Uint8Array(16))
  b[6] = (b[6] & 0x0f) | 0x40
  b[8] = (b[8] & 0x3f) | 0x80
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}

export default function UuidGenerator() {
  const [count, setCount] = useState(5)
  const [upper, setUpper] = useState(false)
  const [hyphens, setHyphens] = useState(true)
  const make = () =>
    Array.from({ length: count }, () => {
      let id: string = uuid()
      if (!hyphens) id = id.replace(/-/g, '')
      return upper ? id.toUpperCase() : id
    })
  const [ids, setIds] = useState<string[]>(make)
  const text = ids.join('\n')

  return (
    <>
      <Row>
        <Field label="How many"><NumberInput min={1} max={1000} step={1} value={count} onValue={(v) => setCount(Math.round(v))} style={{ width: 120 }} /></Field>
        <label className="check"><input type="checkbox" checked={upper} onChange={(e) => setUpper(e.target.checked)} /> Uppercase</label>
        <label className="check"><input type="checkbox" checked={hyphens} onChange={(e) => setHyphens(e.target.checked)} /> Hyphens</label>
        <button className="btn primary" onClick={() => setIds(make())}>Generate</button>
        <CopyButton value={text} label="Copy all" />
      </Row>
      <textarea aria-label="Output" value={text} readOnly style={{ minHeight: 220 }} />
    </>
  )
}
