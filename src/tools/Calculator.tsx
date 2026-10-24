import { useRef, useState } from 'react'
import { CONSTANTS, evaluate, FUNCTIONS, formatNumber, type Scope } from '../lib/mathExpr'
import { CopyButton, ErrorBox } from '../components/ui'

// [label, text to insert, label with 2nd on, text with 2nd on]
type Key = [string, string, string?, string?]
const SCI: Key[] = [
  ['sin', 'sin(', 'sin⁻¹', 'asin('], ['cos', 'cos(', 'cos⁻¹', 'acos('], ['tan', 'tan(', 'tan⁻¹', 'atan('], ['π', 'π'], ['e', 'e'],
  ['ln', 'ln(', 'eˣ', 'exp('], ['log', 'log(', '10ˣ', '10^('], ['√', 'sqrt(', '∛', 'cbrt('], ['x²', '^2', 'x³', '^3'], ['xʸ', '^', 'ʸ√x', 'root('],
  ['(', '('], [')', ')'], ['x!', '!', 'nCr', 'nCr('], ['1/x', '^(-1)', 'nPr', 'nPr('], ['Ans', 'Ans'],
]
const NUM = ['7', '8', '9', '÷', '4', '5', '6', '×', '1', '2', '3', '−', '0', '.', '%', '+']
const EXAMPLES = ['sqrt(2) * (3 + 4)^2', 'sin(30) + cos(60)', 'log(8, 2)', '5! / (2! * 3!)', 'nCr(10, 3)', '2pi * 6.4e6', '1500 + 18%', '(1 + 0.08/12)^(12*5)']

export default function Calculator() {
  const [expr, setExpr] = useState('')
  const [history, setHistory] = useState<[string, string][]>([])
  const [error, setError] = useState<string | null>(null)
  const [degrees, setDegrees] = useState(true)
  const [second, setSecond] = useState(false)
  const [ans, setAns] = useState<number | null>(null)
  const input = useRef<HTMLInputElement>(null)

  const scope: Scope = { degrees, vars: ans === null ? {} : { ans } }
  let preview = ''
  try { if (expr.trim()) preview = formatNumber(evaluate(expr, scope)) } catch { /* still typing */ }

  // insert at the cursor, not just at the end
  const insert = (text: string) => {
    const el = input.current
    const start = el?.selectionStart ?? expr.length, end = el?.selectionEnd ?? expr.length
    const next = expr.slice(0, start) + text + expr.slice(end)
    setExpr(next); setError(null)
    requestAnimationFrame(() => { if (el) { el.focus(); el.setSelectionRange(start + text.length, start + text.length) } })
  }
  const backspace = () => {
    const el = input.current
    const start = el?.selectionStart ?? expr.length, end = el?.selectionEnd ?? expr.length
    if (start !== end) { setExpr(expr.slice(0, start) + expr.slice(end)); return }
    // remove a whole function name like "sin(" in one go
    const m = expr.slice(0, start).match(/([a-zA-Z]+\(|.)$/)
    const cut = m ? m[0].length : 0
    setExpr(expr.slice(0, start - cut) + expr.slice(start))
    requestAnimationFrame(() => el?.setSelectionRange(start - cut, start - cut))
  }
  const run = () => {
    if (!expr.trim()) return
    try {
      const v = evaluate(expr, scope)
      const r = formatNumber(v)
      setHistory([[expr, r] as [string, string], ...history].slice(0, 30))
      setAns(v); setExpr(r === 'Not a number' || r.includes('∞') ? '' : r); setError(Number.isNaN(v) ? 'The result is not a real number (for example, the square root of a negative number).' : null)
    } catch (e) { setError((e as Error).message) }
  }

  const key = (label: string, onClick: () => void, opts: { primary?: boolean; active?: boolean; span?: number; title?: string } = {}) => (
    <button key={label} className={`btn ${opts.primary ? 'primary' : ''}`} aria-pressed={opts.active} title={opts.title}
      style={{ padding: '12px 4px', fontSize: 16, gridColumn: opts.span ? `span ${opts.span}` : undefined, ...(opts.active ? { background: 'var(--accent-soft, var(--surface-2))', borderColor: 'var(--accent)' } : {}) }} onClick={onClick}>{label}</button>
  )

  return (
    <div className="cols">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
        <input ref={input} className="mono" style={{ fontSize: 22, textAlign: 'right' }} aria-label="Expression" value={expr} placeholder="e.g. sqrt(2) * (3 + 4)^2"
          onChange={(e) => { setExpr(e.target.value); setError(null) }} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); run() } if (e.key === 'Escape') setExpr('') }} autoFocus spellCheck={false} autoCapitalize="off" autoComplete="off" />
        <div className="muted mono" style={{ textAlign: 'right', minHeight: 20 }} aria-live="polite">{preview && `= ${preview}`}</div>
        <ErrorBox message={error} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
          {key('2nd', () => setSecond(!second), { active: second, title: 'Show inverse functions' })}
          {key(degrees ? 'DEG' : 'RAD', () => setDegrees(!degrees), { title: degrees ? 'Angles in degrees — tap for radians' : 'Angles in radians — tap for degrees' })}
          {key('C', () => { setExpr(''); setError(null) }, { title: 'Clear' })}
          {key('⌫', backspace, { title: 'Delete' })}
          {key('=', run, { primary: true })}
          {SCI.map(([l, t, l2, t2]) => key(second && l2 ? l2 : l, () => { insert(second && t2 ? t2 : t); if (second) setSecond(false) }))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
          {NUM.map((k) => key(k, () => insert(k === '−' ? '-' : k)))}
          {key(',', () => insert(', '), { title: 'Separates values in functions like log(8, 2)' })}
          {key('EXP', () => insert('e'), { title: 'Scientific notation, e.g. 6.02e23' })}
          {key('=', run, { primary: true, span: 2 })}
        </div>
        <p className="muted" style={{ margin: 0, fontSize: 13 }}>Angles are in <b>{degrees ? 'degrees' : 'radians'}</b>. Press Enter to calculate; <b>Ans</b> is the last result. You can also type: 2pi, 3(4+5), sin 30, 15% of 2000 as 2000*15%.</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
        <div>
          <div className="field-label" style={{ marginBottom: 8 }}>History</div>
          {history.length === 0 ? <div className="muted">No calculations yet. Click a result to reuse it.</div> : (
            <table style={{ width: '100%' }}><tbody>{history.map(([e, r], i) => (
              <tr key={i} style={{ cursor: 'pointer' }} onClick={() => insert(r)} title="Insert this result"><td className="mono muted" style={{ wordBreak: 'break-all' }}>{e}</td><td className="mono" style={{ textAlign: 'right' }}><b>{r}</b></td></tr>
            ))}</tbody></table>
          )}
          {history.length > 0 && <div style={{ marginTop: 6 }}><CopyButton value={history.map(([e, r]) => `${e} = ${r}`).join('\n')} label="Copy history" /></div>}
        </div>
        <details>
          <summary className="field-label" style={{ cursor: 'pointer' }}>Examples — tap to try</summary>
          <div className="filter-chips" style={{ marginTop: 8 }}>{EXAMPLES.map((x) => <button key={x} className="chip mono" onClick={() => { setExpr(x); setError(null) }}>{x}</button>)}</div>
        </details>
        <details>
          <summary className="field-label" style={{ cursor: 'pointer' }}>All functions</summary>
          <table style={{ fontSize: 13, marginTop: 8 }}><tbody>
            {Object.entries(FUNCTIONS).map(([name, f]) => (
              <tr key={name}><td className="mono" style={{ paddingRight: 10, verticalAlign: 'top' }}><button className="chip mono" onClick={() => insert(`${name}(`)}>{name}()</button></td><td className="muted">{f.help}</td></tr>
            ))}
          </tbody></table>
        </details>
        <details>
          <summary className="field-label" style={{ cursor: 'pointer' }}>Constants (science)</summary>
          <table style={{ fontSize: 13, marginTop: 8 }}><tbody>
            {Object.entries(CONSTANTS).map(([name, [v, help]]) => (
              <tr key={name}><td style={{ paddingRight: 10 }}><button className="chip mono" onClick={() => insert(name)}>{name}</button></td><td className="muted">{help}</td><td className="mono muted" style={{ paddingLeft: 8 }}>{formatNumber(v, 8)}</td></tr>
            ))}
          </tbody></table>
        </details>
      </div>
    </div>
  )
}
