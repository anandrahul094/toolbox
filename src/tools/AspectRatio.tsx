import { useState } from 'react'
import { Field, Row, NumberInput } from '../components/ui'

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a)
const PRESETS: [string, number, number][] = [['16:9', 16, 9], ['4:3', 4, 3], ['1:1', 1, 1], ['21:9', 21, 9], ['3:2', 3, 2], ['9:16', 9, 16], ['4:5', 4, 5]]

export default function AspectRatio() {
  const [w, setW] = useState(1920)
  const [h, setH] = useState(1080)
  const [newW, setNewW] = useState(1280)
  const g = w && h ? gcd(Math.round(w), Math.round(h)) : 1
  const ratio = w && h ? `${Math.round(w) / g}:${Math.round(h) / g}` : '—'
  const newH = w ? Math.round((newW * h) / w) : 0

  return (
    <>
      <Row>
        <Field label="Width"><NumberInput min={1} max={100000} value={w} onValue={setW} /></Field>
        <Field label="Height"><NumberInput min={1} max={100000} value={h} onValue={setH} /></Field>
      </Row>
      <Row>{PRESETS.map(([l, a, b]) => <button key={l} className="chip" onClick={() => { setW(a * 120); setH(b * 120) }}>{l}</button>)}</Row>
      <div className="stats">
        <div className="stat"><div className="stat-value">{ratio}</div><div className="stat-label">Aspect ratio</div></div>
        <div className="stat"><div className="stat-value">{h ? (w / h).toFixed(4) : '—'}</div><div className="stat-label">Decimal</div></div>
      </div>
      <h3 style={{ margin: 0 }}>Resize keeping the ratio</h3>
      <Row>
        <Field label="New width"><NumberInput min={1} max={100000} value={newW} onValue={setNewW} /></Field>
        <div className="output" style={{ fontSize: 18 }}>{newW} × {newH}</div>
      </Row>
      {w > 0 && h > 0 && (
        <div style={{ maxWidth: 360, aspectRatio: `${w} / ${h}`, maxHeight: 300, background: 'var(--accent-soft)', border: '2px dashed var(--accent)', borderRadius: 8, display: 'grid', placeItems: 'center', color: 'var(--accent)', fontWeight: 600 }}>{ratio}</div>
      )}
    </>
  )
}
