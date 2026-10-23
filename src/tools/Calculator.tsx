import { useState } from 'react'
import { ErrorBox, Row } from '../components/ui'

// Small recursive-descent parser — no eval().
const FUNCS: Record<string, (x: number) => number> = {
  sqrt: Math.sqrt, abs: Math.abs, sin: Math.sin, cos: Math.cos, tan: Math.tan,
  asin: Math.asin, acos: Math.acos, atan: Math.atan, ln: Math.log, log: Math.log10,
  exp: Math.exp, round: Math.round, floor: Math.floor, ceil: Math.ceil,
}
const CONSTS: Record<string, number> = { pi: Math.PI, e: Math.E }

export function evaluate(src: string): number {
  const tokens = src.replace(/×/g, '*').replace(/÷/g, '/').match(/\d*\.?\d+(?:e[+-]?\d+)?|[a-z]+|\*\*|[-+*/^%()!]/gi)
  if (!tokens || tokens.join('') !== src.replace(/\s+/g, '').replace(/×/g, '*').replace(/÷/g, '/')) throw new Error('Unexpected character')
  let i = 0
  const peek = () => tokens[i]
  const next = () => tokens[i++]
  const expect = (t: string) => { if (next() !== t) throw new Error(`Expected "${t}"`) }

  const expr = (): number => {
    let v = term()
    while (peek() === '+' || peek() === '-') v = next() === '+' ? v + term() : v - term()
    return v
  }
  const term = (): number => {
    let v = unary()
    while (peek() === '*' || peek() === '/' || peek() === '%') {
      const op = next(), r = unary()
      v = op === '*' ? v * r : op === '/' ? v / r : v % r
    }
    return v
  }
  const unary = (): number => (peek() === '-' ? (next(), -unary()) : peek() === '+' ? (next(), unary()) : power())
  const power = (): number => {
    const b = postfix()
    if (peek() === '^' || peek() === '**') { next(); return b ** unary() }
    return b
  }
  const postfix = (): number => {
    let v = primary()
    while (peek() === '!') { next(); if (v < 0 || !Number.isInteger(v) || v > 170) throw new Error('Invalid factorial'); let f = 1; for (let k = 2; k <= v; k++) f *= k; v = f }
    return v
  }
  const primary = (): number => {
    const t = next()
    if (t === undefined) throw new Error('Unexpected end of expression')
    if (t === '(') { const v = expr(); expect(')'); return v }
    if (/^\d|^\./.test(t)) return parseFloat(t)
    const name = t.toLowerCase()
    if (name in CONSTS) return CONSTS[name]
    if (name in FUNCS) { expect('('); const v = expr(); expect(')'); return FUNCS[name](v) }
    throw new Error(`Unknown token "${t}"`)
  }

  const v = expr()
  if (i < tokens.length) throw new Error(`Unexpected "${tokens[i]}"`)
  return v
}

const KEYS = ['(', ')', '%', 'C', '7', '8', '9', '÷', '4', '5', '6', '×', '1', '2', '3', '-', '0', '.', '^', '+']

export default function Calculator() {
  const [expr, setExpr] = useState('')
  const [history, setHistory] = useState<[string, string][]>([])
  const [error, setError] = useState<string | null>(null)

  let preview = ''
  try { if (expr.trim()) preview = String(+evaluate(expr).toPrecision(12)) } catch { /* incomplete input */ }

  const run = () => {
    try {
      const r = String(+evaluate(expr).toPrecision(12))
      setHistory([[expr, r] as [string, string], ...history].slice(0, 20))
      setExpr(r); setError(null)
    } catch (e) { setError((e as Error).message) }
  }
  const press = (k: string) => (k === 'C' ? (setExpr(''), setError(null)) : setExpr(expr + k))

  return (
    <div className="cols">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input className="mono" style={{ fontSize: 22, textAlign: 'right' }} aria-label="Expression" value={expr} placeholder="e.g. sqrt(2) * (3 + 4)^2"
          onChange={(e) => { setExpr(e.target.value); setError(null) }} onKeyDown={(e) => e.key === 'Enter' && run()} autoFocus />
        <div className="muted mono" style={{ textAlign: 'right', minHeight: 20 }}>{preview && `= ${preview}`}</div>
        <ErrorBox message={error} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {KEYS.map((k) => <button key={k} className="btn" style={{ padding: 14, fontSize: 18 }} onClick={() => press(k)}>{k}</button>)}
          <button className="btn" style={{ gridColumn: 'span 2' }} onClick={() => setExpr(expr.slice(0, -1))} aria-label="Delete last character">⌫</button>
          <button className="btn primary" style={{ gridColumn: 'span 2', fontSize: 18 }} onClick={run}>=</button>
        </div>
        <Row><span className="muted" style={{ fontSize: 13 }}>Functions: {Object.keys(FUNCS).join(', ')} · constants: pi, e · factorial: 5!</span></Row>
      </div>
      <div>
        <div className="field-label" style={{ marginBottom: 8 }}>History</div>
        {history.length === 0 ? <div className="muted">No calculations yet.</div> : (
          <table><tbody>{history.map(([e, r], i) => (
            <tr key={i} style={{ cursor: 'pointer' }} onClick={() => setExpr(r)}><td className="mono muted">{e}</td><td className="mono" style={{ textAlign: 'right' }}><b>{r}</b></td></tr>
          ))}</tbody></table>
        )}
      </div>
    </div>
  )
}
