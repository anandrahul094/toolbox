import { useEffect, useRef, useState } from 'react'
import { download, ErrorBox, Field, Row } from '../components/ui'

const FORMATS: [string, string, string][] = [
  ['CODE128', 'Code 128 (any text — most common)', 'Toolbox-2026'],
  ['EAN13', 'EAN-13 (retail products, 12–13 digits)', '890123456789'],
  ['EAN8', 'EAN-8 (small packages, 7–8 digits)', '9638507'],
  ['UPC', 'UPC-A (US retail, 11–12 digits)', '03600029145'],
  ['CODE39', 'Code 39 (A–Z, 0–9, - . $ / + %)', 'ITEM-42'],
  ['ITF14', 'ITF-14 (shipping cartons, 13–14 digits)', '1540014128876'],
]

export default function BarcodeGenerator() {
  const [format, setFormat] = useState('CODE128')
  const [value, setValue] = useState(FORMATS[0][2])
  const [height, setHeight] = useState(80)
  const [barWidth, setBarWidth] = useState(2)
  const [showText, setShowText] = useState(true)
  const [color, setColor] = useState('#000000')
  const [error, setError] = useState<string | null>(null)
  const svg = useRef<SVGSVGElement>(null)

  useEffect(() => {
    let cancelled = false
    import('jsbarcode').then(({ default: JsBarcode }) => {
      if (cancelled || !svg.current) return
      try {
        if (!value.trim()) throw new Error('Enter a value to encode.')
        let valid = true
        JsBarcode(svg.current, value, { format, height, width: barWidth, displayValue: showText, lineColor: color, background: '#ffffff', margin: 12, valid: (v: boolean) => { valid = v } })
        setError(valid ? null : `“${value}” isn’t valid for ${format}. ${FORMATS.find((f) => f[0] === format)![1].split('(')[1]?.replace(')', '') ?? ''}`)
      } catch (e) { setError((e as Error).message || 'Invalid value for this barcode type.') }
    })
    return () => { cancelled = true }
  }, [format, value, height, barWidth, showText, color])

  const svgText = () => new XMLSerializer().serializeToString(svg.current!)
  const png = () => {
    const s = svg.current!, w = s.width.baseVal.value, h = s.height.baseVal.value
    const img = new Image()
    img.onload = () => {
      const c = document.createElement('canvas'); c.width = w * 3; c.height = h * 3
      const ctx = c.getContext('2d')!; ctx.scale(3, 3); ctx.drawImage(img, 0, 0)
      download(`barcode-${value.replace(/[^\w-]+/g, '_')}.png`, c.toDataURL('image/png'))
    }
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgText())
  }

  return (
    <>
      <Row>
        <Field label="Barcode type">
          <select value={format} onChange={(e) => { const f = FORMATS.find((x) => x[0] === e.target.value)!; setFormat(f[0]); setValue(f[2]) }}>
            {FORMATS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </Field>
        <Field label="Value"><input className="mono" value={value} onChange={(e) => setValue(e.target.value)} maxLength={80} /></Field>
      </Row>
      <Row>
        <Field label={`Height: ${height}px`}><input type="range" min={30} max={200} value={height} onChange={(e) => setHeight(+e.target.value)} /></Field>
        <Field label={`Bar width: ${barWidth}`}><input type="range" min={1} max={4} step={0.5} value={barWidth} onChange={(e) => setBarWidth(+e.target.value)} /></Field>
        <Field label="Colour"><input type="color" value={color} onChange={(e) => setColor(e.target.value)} /></Field>
        <label className="check"><input type="checkbox" checked={showText} onChange={(e) => setShowText(e.target.checked)} /> Show text</label>
      </Row>
      <ErrorBox message={error} />
      <div style={{ display: error ? 'none' : 'grid', placeItems: 'center', background: '#fff', borderRadius: 8, padding: 12, overflowX: 'auto', border: '1px solid var(--border)' }}>
        <svg ref={svg} role="img" aria-label={`Barcode for ${value}`} />
      </div>
      <Row>
        <button className="btn primary" disabled={!!error} onClick={png}>Download PNG</button>
        <button className="btn" disabled={!!error} onClick={() => download(`barcode-${value.replace(/[^\w-]+/g, '_')}.svg`, 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgText()))}>Download SVG</button>
      </Row>
      <p className="muted" style={{ margin: 0, fontSize: 13 }}>For products sold in shops, EAN/UPC numbers must be registered with GS1 — generating a barcode doesn’t register it.</p>
    </>
  )
}
