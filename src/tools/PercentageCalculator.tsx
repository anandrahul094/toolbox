import { useState } from 'react'

const fmt = (n: number) => (Number.isFinite(n) ? (+n.toFixed(6)).toLocaleString() : '—')

function Calc({ parts, compute, suffix = '' }: { parts: string[]; compute: (a: number, b: number) => number; suffix?: string }) {
  const [a, setA] = useState('')
  const [b, setB] = useState('')
  const r = a !== '' && b !== '' ? compute(+a, +b) : NaN
  return (
    <div className="row" style={{ alignItems: 'center', background: 'var(--surface-2)', padding: 14, borderRadius: 10 }}>
      <span>{parts[0]}</span>
      <input type="number" aria-label={`${parts.join(' … ')} — first value`} value={a} onChange={(e) => setA(e.target.value)} style={{ width: 120, background: 'var(--surface)' }} />
      <span>{parts[1]}</span>
      <input type="number" aria-label={`${parts.join(' … ')} — second value`} value={b} onChange={(e) => setB(e.target.value)} style={{ width: 120, background: 'var(--surface)' }} />
      <span>{parts[2]}</span>
      <b style={{ fontSize: 18, marginLeft: 'auto' }}>{Number.isNaN(r) ? '' : fmt(r) + suffix}</b>
    </div>
  )
}

export default function PercentageCalculator() {
  return (
    <>
      <Calc parts={['What is', '% of', '?']} compute={(a, b) => (a / 100) * b} />
      <Calc parts={['', 'is what % of', '?']} compute={(a, b) => (a / b) * 100} suffix="%" />
      <Calc parts={['% change from', 'to', '']} compute={(a, b) => ((b - a) / Math.abs(a)) * 100} suffix="%" />
      <Calc parts={['', 'increased by', '% is']} compute={(a, b) => a * (1 + b / 100)} />
      <Calc parts={['', 'decreased by (discount)', '% is']} compute={(a, b) => a * (1 - b / 100)} />
      <Calc parts={['', 'is', '% of what?']} compute={(a, b) => (a / b) * 100} />
    </>
  )
}
