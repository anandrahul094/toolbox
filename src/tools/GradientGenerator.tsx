import { useState } from 'react'
import { CopyButton, Field, Row } from '../components/ui'

interface Stop { color: string; pos: number }

export default function GradientGenerator() {
  const [type, setType] = useState<'linear' | 'radial'>('linear')
  const [angle, setAngle] = useState(135)
  const [stops, setStops] = useState<Stop[]>([{ color: '#4f46e5', pos: 0 }, { color: '#ec4899', pos: 100 }])

  const list = [...stops].sort((a, b) => a.pos - b.pos).map((s) => `${s.color} ${s.pos}%`).join(', ')
  const css = type === 'linear' ? `linear-gradient(${angle}deg, ${list})` : `radial-gradient(circle, ${list})`
  const update = (i: number, patch: Partial<Stop>) => setStops(stops.map((s, j) => (i === j ? { ...s, ...patch } : s)))

  return (
    <>
      <div className="swatch" style={{ background: css, height: 200 }} />
      <Row>
        <Field label="Type">
          <select value={type} onChange={(e) => setType(e.target.value as typeof type)} style={{ width: 140 }}>
            <option value="linear">Linear</option><option value="radial">Radial</option>
          </select>
        </Field>
        {type === 'linear' && <Field label={`Angle: ${angle}°`}><input type="range" min={0} max={360} value={angle} onChange={(e) => setAngle(+e.target.value)} /></Field>}
      </Row>
      {stops.map((s, i) => (
        <Row key={i}>
          <input type="color" value={s.color} onChange={(e) => update(i, { color: e.target.value })} />
          <Field label={`Stop ${i + 1}: ${s.pos}%`}><input type="range" min={0} max={100} value={s.pos} onChange={(e) => update(i, { pos: +e.target.value })} /></Field>
          <button className="btn" disabled={stops.length <= 2} onClick={() => setStops(stops.filter((_, j) => j !== i))}>Remove</button>
        </Row>
      ))}
      <Row>
        <button className="btn" onClick={() => setStops([...stops, { color: '#22c55e', pos: 50 }])}>+ Add color stop</button>
        <button className="btn" onClick={() => setStops(stops.map((s) => ({ ...s, color: '#' + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0') })))}>🎲 Random colors</button>
      </Row>
      <Row><pre className="output" style={{ flex: 1 }}>background: {css};</pre><CopyButton value={`background: ${css};`} label="Copy CSS" /></Row>
    </>
  )
}
