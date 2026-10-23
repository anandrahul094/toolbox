import { useState } from 'react'
import { CopyButton, ErrorBox, Field, Row } from '../components/ui'

type RGB = [number, number, number]

const toHex = ([r, g, b]: RGB) => '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('')

function rgbToHsl([r, g, b]: RGB): RGB {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2
  if (max === min) return [0, 0, Math.round(l * 100)]
  const d = max - min, s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return [Math.round(h * 60), Math.round(s * 100), Math.round(l * 100)]
}

function hslToRgb([h, s, l]: RGB): RGB {
  s /= 100; l /= 100
  const k = (n: number) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  return [f(0), f(8), f(4)].map((x) => Math.round(x * 255)) as RGB
}

function parseColor(s: string): RGB | null {
  s = s.trim().toLowerCase()
  let m = s.match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/)
  if (m) {
    const h = m[1].length === 3 ? [...m[1]].map((c) => c + c).join('') : m[1]
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as RGB
  }
  m = s.match(/^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/)
  if (m) return m.slice(1, 4).map((x) => Math.min(255, +x)) as RGB
  m = s.match(/^hsla?\(\s*(\d+)[\s,]+(\d+)%?[\s,]+(\d+)%?/)
  if (m) return hslToRgb(m.slice(1, 4).map(Number) as RGB)
  return null
}

const luminance = ([r, g, b]: RGB) => {
  const c = [r, g, b].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 })
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
}
const contrast = (a: RGB, b: RGB) => { const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05) }

export default function ColorConverter() {
  const [rgb, setRgb] = useState<RGB>([79, 70, 229])
  const [text, setText] = useState('#4f46e5')
  const [err, setErr] = useState<string | null>(null)
  const hsl = rgbToHsl(rgb)
  const hex = toHex(rgb)
  const formats = [['HEX', hex], ['RGB', `rgb(${rgb.join(', ')})`], ['HSL', `hsl(${hsl[0]}, ${hsl[1]}%, ${hsl[2]}%)`]]
  const shades = [90, 75, 60, 45, 30, 15].map((l) => toHex(hslToRgb([hsl[0], hsl[1], l])))

  const set = (c: RGB) => { setRgb(c); setText(toHex(c)); setErr(null) }

  return (
    <>
      <div className="swatch" style={{ background: hex }} />
      <Row>
        <input type="color" value={hex} onChange={(e) => set(parseColor(e.target.value)!)} />
        <Field label="Enter any color (HEX, rgb(), hsl())">
          <input className="mono" value={text} onChange={(e) => { setText(e.target.value); const c = parseColor(e.target.value); if (c) { setRgb(c); setErr(null) } else setErr('Unrecognized color format') }} />
        </Field>
      </Row>
      <ErrorBox message={err} />
      <table><tbody>
        {formats.map(([k, v]) => <tr key={k}><th style={{ width: 70 }}>{k}</th><td className="mono">{v}</td><td style={{ width: 80 }}><CopyButton value={v} /></td></tr>)}
      </tbody></table>
      <Field label="Shades">
        <div style={{ display: 'flex', gap: 6 }}>
          {shades.map((s) => <button key={s} title={s} onClick={() => set(parseColor(s)!)} style={{ flex: 1, height: 44, background: s, border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer' }} />)}
        </div>
      </Field>
      <Row>
        <span>Contrast vs white: <b>{contrast(rgb, [255, 255, 255]).toFixed(2)}:1</b></span>
        <span>Contrast vs black: <b>{contrast(rgb, [0, 0, 0]).toFixed(2)}:1</b></span>
        <span className="muted">(WCAG AA needs 4.5:1 for body text)</span>
      </Row>
    </>
  )
}
