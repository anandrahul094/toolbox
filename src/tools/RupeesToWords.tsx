import { useState } from 'react'
import { CopyButton, ErrorBox, Field, Row } from '../components/ui'
import { wordsIndian, wordsInternational } from '../lib/money'

export default function RupeesToWords() {
  const [value, setValue] = useState('125430.50')
  const [style, setStyle] = useState<'indian' | 'intl'>('indian')
  const [currency, setCurrency] = useState<'inr' | 'none'>('inr')
  const n = Number(value.replace(/,/g, ''))
  const valid = value.trim() !== '' && Number.isFinite(n) && n >= 0 && n < 1e15
  // round to whole paise first so 12.999 becomes ₹13.00, not "12 rupees and 100 paise"
  const totalPaise = valid ? Math.round(n * 100) : 0
  const rupees = Math.floor(totalPaise / 100)
  const paise = totalPaise % 100
  const words = style === 'indian' ? wordsIndian : wordsInternational

  const text = !valid ? '' : currency === 'inr'
    ? `Rupees ${words(rupees)}${paise ? ` and ${words(paise)} Paise` : ''} Only`
    : `${words(rupees)}${paise ? ` point ${String(paise).padStart(2, '0').replace(/0$/, '').split('').map((d) => words(+d)).join(' ')}` : ''}`

  return (
    <>
      <Field label="Amount"><input value={value} onChange={(e) => setValue(e.target.value)} inputMode="decimal" style={{ fontSize: 20 }} /></Field>
      <Row>
        <button className={`btn ${style === 'indian' ? 'primary' : ''}`} onClick={() => setStyle('indian')}>Lakh / crore</button>
        <button className={`btn ${style === 'intl' ? 'primary' : ''}`} onClick={() => setStyle('intl')}>Million / billion</button>
        <label className="check"><input type="checkbox" checked={currency === 'inr'} onChange={(e) => setCurrency(e.target.checked ? 'inr' : 'none')} /> Cheque style (Rupees … Only)</label>
      </Row>
      <ErrorBox message={value.trim() && !valid ? 'Enter a positive number below 1,000 trillion.' : null} />
      {text && (
        <>
          <div className="output" style={{ fontFamily: 'inherit', fontSize: 20, wordBreak: 'normal' }}>{text}</div>
          <Row>
            <CopyButton value={text} />
            <CopyButton value={text.toUpperCase()} label="Copy in CAPITALS" />
            <span className="muted mono">₹{n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </Row>
        </>
      )}
    </>
  )
}
