import { useMemo, useState } from 'react'
import { ErrorBox, Field, Row } from '../components/ui'
import { compile, evaluate, formatNumber } from '../lib/mathExpr'

type Mode = 'quadratic' | 'cubic' | 'linear2' | 'linear3' | 'any'
const fmt = (v: number) => formatNumber(Math.abs(v) < 1e-12 ? 0 : v, 10)
const cfmt = (re: number, im: number) => (Math.abs(im) < 1e-12 ? fmt(re) : `${Math.abs(re) < 1e-12 ? '' : fmt(re)}${im < 0 ? ' − ' : Math.abs(re) < 1e-12 ? '' : ' + '}${fmt(Math.abs(im))}i`)

// number fields accept expressions too: 1/3, sqrt(2), -pi
function num(s: string) { try { const v = evaluate(s || '0'); return Number.isFinite(v) ? v : NaN } catch { return NaN } }

function solveQuadratic(a: number, b: number, c: number) {
  if (a === 0) return b === 0 ? { text: c === 0 ? 'Every x is a solution.' : 'No solution.' } : { roots: [cfmt(-c / b, 0)], steps: [`Linear: x = −c / b = ${fmt(-c / b)}`] }
  const D = b * b - 4 * a * c
  const steps = [`Discriminant D = b² − 4ac = ${fmt(b * b)} − ${fmt(4 * a * c)} = ${fmt(D)}`]
  if (D > 0) { const s = Math.sqrt(D); steps.push('D > 0 → two real roots: x = (−b ± √D) / 2a'); return { roots: [cfmt((-b + s) / (2 * a), 0), cfmt((-b - s) / (2 * a), 0)], steps, vertex: [-b / (2 * a), c - (b * b) / (4 * a)] } }
  if (D === 0) { steps.push('D = 0 → one repeated root: x = −b / 2a'); return { roots: [cfmt(-b / (2 * a), 0)], steps, vertex: [-b / (2 * a), c - (b * b) / (4 * a)] } }
  const re = -b / (2 * a), im = Math.sqrt(-D) / (2 * a)
  steps.push('D < 0 → two complex roots: x = (−b ± i√−D) / 2a')
  return { roots: [cfmt(re, im), cfmt(re, -im)], steps, vertex: [re, c - (b * b) / (4 * a)] }
}

// Cardano / trigonometric method for ax³ + bx² + cx + d
function solveCubic(a: number, b: number, c: number, d: number) {
  if (a === 0) return solveQuadratic(b, c, d)
  b /= a; c /= a; d /= a
  const p = c - (b * b) / 3, q = (2 * b * b * b) / 27 - (b * c) / 3 + d
  const D = (q * q) / 4 + (p * p * p) / 27, shift = -b / 3
  if (Math.abs(D) < 1e-14) {
    const u = Math.cbrt(-q / 2)
    return { roots: [...new Set([cfmt(2 * u + shift, 0), cfmt(-u + shift, 0)])], steps: ['Repeated roots'] }
  }
  if (D > 0) {
    const u = Math.cbrt(-q / 2 + Math.sqrt(D)), v = Math.cbrt(-q / 2 - Math.sqrt(D))
    const re = -(u + v) / 2 + shift, im = (Math.sqrt(3) / 2) * (u - v)
    return { roots: [cfmt(u + v + shift, 0), cfmt(re, im), cfmt(re, -im)], steps: ['One real root and two complex roots'] }
  }
  const r = Math.sqrt(-p / 3), phi = Math.acos(Math.max(-1, Math.min(1, (3 * q) / (2 * p * r))))
  return { roots: [0, 1, 2].map((k) => cfmt(2 * r * Math.cos(phi / 3 - (2 * Math.PI * k) / 3) + shift, 0)), steps: ['Three real roots'] }
}

// Gaussian elimination with partial pivoting
function solveLinear(A: number[][], B: number[]) {
  const n = B.length, M = A.map((r, i) => [...r, B[i]])
  for (let col = 0; col < n; col++) {
    let piv = col
    for (let r = col + 1; r < n; r++) if (Math.abs(M[r][col]) > Math.abs(M[piv][col])) piv = r
    if (Math.abs(M[piv][col]) < 1e-12) return null
    ;[M[col], M[piv]] = [M[piv], M[col]]
    for (let r = 0; r < n; r++) if (r !== col) { const f = M[r][col] / M[col][col]; for (let k = col; k <= n; k++) M[r][k] -= f * M[col][k] }
  }
  return M.map((r, i) => r[n] / r[i])
}

// numeric roots of any f(x) = 0: scan for sign changes, then bisect
function solveAny(src: string, lo: number, hi: number) {
  const [l, r] = src.includes('=') ? src.split('=') : [src, '0']
  const f = compile(`(${l}) - (${r})`, ['x'])
  const g = (x: number) => { try { return f({ x }) } catch { return NaN } }
  const roots: number[] = [], N = 4000
  let px = lo, py = g(lo)
  for (let i = 1; i <= N; i++) {
    const x = lo + ((hi - lo) * i) / N, y = g(x)
    if (Number.isFinite(py) && Number.isFinite(y)) {
      if (py === 0) roots.push(px)
      else if (py * y < 0) {
        let a = px, b = x, fa = py
        for (let k = 0; k < 80; k++) { const m = (a + b) / 2, fm = g(m); if (fa * fm <= 0) b = m; else { a = m; fa = fm } }
        const root = (a + b) / 2
        if (Math.abs(g(root)) < 1e-6 * Math.max(1, Math.abs(py), Math.abs(y))) roots.push(root) // skip jumps like tan(x)
      }
    }
    px = x; py = y
  }
  return [...new Set(roots.map((x) => fmt(x)))]
}

export default function EquationSolver() {
  const [mode, setMode] = useState<Mode>('quadratic')
  const [q, setQ] = useState(['1', '-3', '2'])
  const [cu, setCu] = useState(['1', '-6', '11', '-6'])
  const [l2, setL2] = useState([['2', '3', '8'], ['1', '-1', '-1']])
  const [l3, setL3] = useState([['1', '1', '1', '6'], ['0', '2', '5', '-4'], ['2', '5', '-1', '27']])
  const [anyEq, setAnyEq] = useState('x^3 = 2x + 5')
  const [range, setRange] = useState(['-100', '100'])

  const result = useMemo((): { roots?: string[]; text?: string; steps?: string[]; vertex?: number[]; error?: string } => {
    try {
      if (mode === 'quadratic') { const [a, b, c] = q.map(num); if ([a, b, c].some(Number.isNaN)) return { error: 'Enter numbers for a, b and c.' }; return solveQuadratic(a, b, c) }
      if (mode === 'cubic') { const v = cu.map(num); if (v.some(Number.isNaN)) return { error: 'Enter numbers for all coefficients.' }; return solveCubic(v[0], v[1], v[2], v[3]) }
      if (mode === 'linear2' || mode === 'linear3') {
        const rows = (mode === 'linear2' ? l2 : l3).map((r) => r.map(num))
        if (rows.flat().some(Number.isNaN)) return { error: 'Enter numbers in every box.' }
        const n = rows.length, sol = solveLinear(rows.map((r) => r.slice(0, n)), rows.map((r) => r[n]))
        if (!sol) return { text: 'No unique solution — the equations are dependent (infinitely many solutions) or inconsistent (none).' }
        return { roots: sol.map((v, i) => `${'xyz'[i]} = ${fmt(v)}`) }
      }
      const lo = num(range[0]), hi = num(range[1])
      if (!(hi > lo)) return { error: 'The search range must go from a smaller to a larger number.' }
      const roots = solveAny(anyEq, lo, hi)
      return roots.length ? { roots: roots.map((r) => `x = ${r}`), steps: [`Found by scanning ${fmt(lo)} to ${fmt(hi)} for sign changes and narrowing each one down.`] } : { text: 'No real roots found in this range. Try a wider range.' }
    } catch (e) { return { error: (e as Error).message } }
  }, [mode, q, cu, l2, l3, anyEq, range])

  const coef = (vals: string[], set: (v: string[]) => void, labels: string[]) => (
    <Row>{labels.map((l, i) => <Field key={l} label={l}><input className="mono" value={vals[i]} onChange={(e) => set(vals.map((x, j) => (j === i ? e.target.value : x)))} inputMode="decimal" style={{ width: 90 }} /></Field>)}</Row>
  )
  const system = (rows: string[][], set: (v: string[][]) => void) => {
    const n = rows.length, vars = 'xyz'.slice(0, n)
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {rows.map((r, i) => (
          <div key={i} className="mono" style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            {r.map((v, j) => (
              <span key={j} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                {j === n ? '=' : j > 0 ? '+' : ''}
                <input className="mono" value={v} onChange={(e) => set(rows.map((row, a) => (a === i ? row.map((x, b) => (b === j ? e.target.value : x)) : row)))} style={{ width: 64 }} aria-label={j === n ? `Equation ${i + 1} right side` : `Equation ${i + 1} coefficient of ${vars[j]}`} inputMode="decimal" />
                {j < n && vars[j]}
              </span>
            ))}
          </div>
        ))}
      </div>
    )
  }

  return (
    <>
      <div className="seg" role="group" aria-label="Equation type" style={{ alignSelf: 'flex-start', flexWrap: 'wrap' }}>
        {([['quadratic', 'Quadratic'], ['cubic', 'Cubic'], ['linear2', '2 equations'], ['linear3', '3 equations'], ['any', 'Any equation']] as const).map(([id, l]) => <button key={id} aria-pressed={mode === id} onClick={() => setMode(id)}>{l}</button>)}
      </div>
      {mode === 'quadratic' && <><div className="mono muted">ax² + bx + c = 0</div>{coef(q, setQ, ['a', 'b', 'c'])}</>}
      {mode === 'cubic' && <><div className="mono muted">ax³ + bx² + cx + d = 0</div>{coef(cu, setCu, ['a', 'b', 'c', 'd'])}</>}
      {mode === 'linear2' && system(l2, setL2)}
      {mode === 'linear3' && system(l3, setL3)}
      {mode === 'any' && (
        <Row>
          <Field label="Equation in x" hint="e.g. cos(x) = x, e^x = 3x, x^5 - x - 1"><input className="mono" value={anyEq} onChange={(e) => setAnyEq(e.target.value)} spellCheck={false} style={{ minWidth: 240 }} /></Field>
          <Field label="From"><input className="mono" value={range[0]} onChange={(e) => setRange([e.target.value, range[1]])} style={{ width: 80 }} /></Field>
          <Field label="To"><input className="mono" value={range[1]} onChange={(e) => setRange([range[0], e.target.value])} style={{ width: 80 }} /></Field>
        </Row>
      )}
      <p className="muted" style={{ margin: 0, fontSize: 13 }}>Boxes accept expressions too, like 1/3, sqrt(2) or -pi.{mode === 'any' ? ' Trig functions use radians here.' : ''}</p>
      <ErrorBox message={result.error} />
      {result.text && <div className="output" style={{ fontFamily: 'inherit' }}>{result.text}</div>}
      {result.roots && (
        <div className="output" style={{ fontSize: 18, display: 'flex', flexDirection: 'column', gap: 4 }} aria-live="polite">
          {result.roots.map((r, i) => <div key={i}>{mode === 'quadratic' || mode === 'cubic' ? `x${result.roots!.length > 1 ? toSub(i + 1) : ''} = ${r}` : r}</div>)}
        </div>
      )}
      {result.steps && <ul className="muted" style={{ margin: 0, paddingLeft: 18, fontSize: 14 }}>{result.steps.map((s, i) => <li key={i}>{s}</li>)}{result.vertex && <li>Vertex of the parabola: ({fmt(result.vertex[0])}, {fmt(result.vertex[1])})</li>}</ul>}
    </>
  )
}
const toSub = (n: number) => String(n).replace(/\d/g, (d) => '₀₁₂₃₄₅₆₇₈₉'[+d])
