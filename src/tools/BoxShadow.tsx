import { useState } from 'react'
import { CopyButton, Field, Row } from '../components/ui'

interface Layer { x: number; y: number; blur: number; spread: number; color: string; opacity: number; inset: boolean }
const DEFAULT: Layer = { x: 0, y: 10, blur: 30, spread: -5, color: '#000000', opacity: 25, inset: false }

const rgba = (hex: string, a: number) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16}, ${(n >> 8) & 255}, ${n & 255}, ${a / 100})` }

export default function BoxShadow() {
  const [layers, setLayers] = useState<Layer[]>([DEFAULT])
  const [radius, setRadius] = useState(16)
  const css = layers.map((l) => `${l.inset ? 'inset ' : ''}${l.x}px ${l.y}px ${l.blur}px ${l.spread}px ${rgba(l.color, l.opacity)}`).join(',\n    ')
  const set = (i: number, p: Partial<Layer>) => setLayers(layers.map((l, j) => (i === j ? { ...l, ...p } : l)))

  const slider = (i: number, key: 'x' | 'y' | 'blur' | 'spread' | 'opacity', min: number, max: number) => (
    <Field label={`${key[0].toUpperCase() + key.slice(1)}: ${layers[i][key]}${key === 'opacity' ? '%' : 'px'}`}>
      <input type="range" min={min} max={max} value={layers[i][key]} onChange={(e) => set(i, { [key]: +e.target.value })} />
    </Field>
  )

  return (
    <>
      <div style={{ display: 'grid', placeItems: 'center', padding: 48, background: 'var(--surface-2)', borderRadius: 10 }}>
        <div style={{ width: 180, height: 120, background: '#fff', borderRadius: radius, boxShadow: css }} />
      </div>
      {layers.map((l, i) => (
        <div key={i} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Row>
            <b>Layer {i + 1}</b>
            <input type="color" value={l.color} onChange={(e) => set(i, { color: e.target.value })} />
            <label className="check"><input type="checkbox" checked={l.inset} onChange={(e) => set(i, { inset: e.target.checked })} /> Inset</label>
            <button className="btn" disabled={layers.length === 1} onClick={() => setLayers(layers.filter((_, j) => j !== i))}>Remove</button>
          </Row>
          <Row>{slider(i, 'x', -50, 50)}{slider(i, 'y', -50, 50)}{slider(i, 'blur', 0, 100)}</Row>
          <Row>{slider(i, 'spread', -50, 50)}{slider(i, 'opacity', 0, 100)}</Row>
        </div>
      ))}
      <Row>
        <button className="btn" onClick={() => setLayers([...layers, { ...DEFAULT, y: 2, blur: 4, spread: 0, opacity: 10 }])}>+ Add layer</button>
        <Field label={`Preview corner radius: ${radius}px`}><input type="range" min={0} max={60} value={radius} onChange={(e) => setRadius(+e.target.value)} /></Field>
      </Row>
      <Row><pre className="output" style={{ flex: 1 }}>box-shadow: {css};</pre><CopyButton value={`box-shadow: ${css.replace(/\n\s+/g, ' ')};`} label="Copy CSS" /></Row>
    </>
  )
}
