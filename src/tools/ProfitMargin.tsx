import { useState } from 'react'
import { ErrorBox, Field, NumberInput, Row, Stat } from '../components/ui'
import { inr } from '../lib/money'

type Mode = 'margin' | 'price' | 'markup' | 'discount'

export default function ProfitMargin() {
  const [mode, setMode] = useState<Mode>('margin')
  const [cost, setCost] = useState(700)
  const [price, setPrice] = useState(1000)
  const [pct, setPct] = useState(30)
  const [extra, setExtra] = useState(0)

  const tabs: [Mode, string][] = [['margin', 'Margin from prices'], ['price', 'Price from target margin'], ['markup', 'Price from markup'], ['discount', 'Discount']]
  return (
    <>
      <Row>{tabs.map(([m, l]) => <button key={m} className={`btn ${mode === m ? 'primary' : ''}`} onClick={() => setMode(m)}>{l}</button>)}</Row>
      {mode !== 'discount' && <Field label="Cost price (₹)"><NumberInput min={0} max={1e12} value={cost} onValue={setCost} /></Field>}
      {(mode === 'margin' || mode === 'discount') && <Field label={mode === 'discount' ? 'Original price (₹)' : 'Selling price (₹)'}><NumberInput min={0} max={1e12} value={price} onValue={setPrice} /></Field>}
      {mode !== 'margin' && <Field label={mode === 'price' ? 'Target margin (%)' : mode === 'markup' ? 'Markup (%)' : 'Discount (%)'}><NumberInput min={0} max={mode === 'price' ? 99.99 : mode === 'discount' ? 100 : 100000} step={0.5} value={pct} onValue={setPct} /></Field>}
      {mode === 'discount' && <Field label="Additional discount (%, applied after the first)"><NumberInput min={0} max={100} value={extra} onValue={setExtra} /></Field>}

      <ErrorBox message={mode === 'price' && pct >= 100 ? 'A margin must be below 100% — at 100% the cost would be zero.' : mode === 'discount' && pct > 100 ? 'A discount can’t be more than 100%.' : null} />
      {mode === 'margin' && (
        <div className="stats">
          <Stat label="Profit" value={inr(price - cost, 2)} />
          <Stat label="Margin (profit ÷ price)" value={price ? `${(((price - cost) / price) * 100).toFixed(2)}%` : '—'} />
          <Stat label="Markup (profit ÷ cost)" value={cost ? `${(((price - cost) / cost) * 100).toFixed(2)}%` : '—'} />
        </div>
      )}
      {mode === 'price' && pct < 100 && (() => { const sp = cost / (1 - pct / 100); return (
        <div className="stats">
          <Stat label="Selling price" value={inr(sp, 2)} />
          <Stat label="Profit" value={inr(sp - cost, 2)} />
          <Stat label="Equivalent markup" value={cost ? `${(((sp - cost) / cost) * 100).toFixed(2)}%` : '—'} />
        </div>
      ) })()}
      {mode === 'markup' && (() => { const sp = cost * (1 + pct / 100); return (
        <div className="stats">
          <Stat label="Selling price" value={inr(sp, 2)} />
          <Stat label="Profit" value={inr(sp - cost, 2)} />
          <Stat label="Equivalent margin" value={sp ? `${(((sp - cost) / sp) * 100).toFixed(2)}%` : '—'} />
        </div>
      ) })()}
      {mode === 'discount' && (() => { const final = price * (1 - pct / 100) * (1 - extra / 100); return (
        <div className="stats">
          <Stat label="Final price" value={inr(final, 2)} />
          <Stat label="You save" value={inr(price - final, 2)} />
          <Stat label="Effective discount" value={price ? `${(((price - final) / price) * 100).toFixed(2)}%` : '—'} />
        </div>
      ) })()}
      <div className="muted" style={{ fontSize: 13 }}>Margin is profit as a share of the selling price; markup is profit as a share of the cost. A 50% markup is only a 33.3% margin.</div>
    </>
  )
}
