import { useState } from 'react'
import { CopyButton, Field, Row } from '../components/ui'
import { wordsIndian, wordsInternational } from '../lib/money'

const UNITS: [string, number][] = [['Rupees / units', 1], ['Thousand', 1e3], ['Lakh', 1e5], ['Million', 1e6], ['Crore', 1e7], ['Billion', 1e9], ['Lakh crore', 1e12], ['Trillion', 1e12]]

const trim = (n: number) => (+n.toPrecision(12)).toLocaleString('en-US', { maximumFractionDigits: 6 })

export default function LakhCrore() {
  const [value, setValue] = useState('2.5')
  const [unitName, setUnitName] = useState('Crore')
  const n = parseFloat(value) * UNITS.find((u) => u[0] === unitName)![1]
  const ok = Number.isFinite(n) && n >= 0
  const whole = ok ? Math.round(n) : 0

  return (
    <>
      <Row>
        <Field label="Value"><input type="number" min={0} value={value} onChange={(e) => setValue(e.target.value)} style={{ fontSize: 18 }} /></Field>
        <Field label="Unit"><select value={unitName} onChange={(e) => setUnitName(e.target.value)}>{UNITS.map(([l]) => <option key={l} value={l}>{l}</option>)}</select></Field>
      </Row>
      {ok && (
        <>
          <table>
            <tbody>
              <tr><th style={{ width: 200 }}>Indian format</th><td className="mono" style={{ fontSize: 18 }}>{whole.toLocaleString('en-IN')}</td><td><CopyButton value={whole.toLocaleString('en-IN')} /></td></tr>
              <tr><th>International format</th><td className="mono" style={{ fontSize: 18 }}>{whole.toLocaleString('en-US')}</td><td><CopyButton value={whole.toLocaleString('en-US')} /></td></tr>
              <tr><th>In words (Indian)</th><td colSpan={2}>{whole < 1e15 ? wordsIndian(whole) : 'Too large to write in words'}</td></tr>
              <tr><th>In words (International)</th><td colSpan={2}>{whole < 1e15 ? wordsInternational(whole) : 'Too large to write in words'}</td></tr>
            </tbody>
          </table>
          <table>
            <thead><tr><th>Unit</th><th>Value</th></tr></thead>
            <tbody>
              {[['Thousand', 1e3], ['Lakh', 1e5], ['Million', 1e6], ['Crore', 1e7], ['Billion', 1e9], ['Trillion', 1e12]].map(([l, v]) => <tr key={l}><td>{l}</td><td className="mono">{trim(n / (v as number))}</td></tr>)}
            </tbody>
          </table>
          <div className="muted" style={{ fontSize: 13 }}>1 lakh = 100,000 · 10 lakh = 1 million · 1 crore = 10 million · 100 crore = 1 billion</div>
        </>
      )}
    </>
  )
}
