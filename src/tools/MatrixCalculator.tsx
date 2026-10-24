import { useMemo, useState } from 'react'
import { CopyButton, ErrorBox, Field, Row } from '../components/ui'
import { evaluate, formatNumber } from '../lib/mathExpr'

type M = number[][]
const make = (r: number, c: number, f: (i: number, j: number) => number = () => 0): M => Array.from({ length: r }, (_, i) => Array.from({ length: c }, (_, j) => f(i, j)))
const EPS = 1e-10

const mul = (A: M, B: M) => { if (A[0].length !== B.length) throw new Error(`Can’t multiply: A has ${A[0].length} columns but B has ${B.length} rows.`); return make(A.length, B[0].length, (i, j) => A[i].reduce((s, _, k) => s + A[i][k] * B[k][j], 0)) }
const add = (A: M, B: M, s = 1) => { if (A.length !== B.length || A[0].length !== B[0].length) throw new Error('A and B must be the same size.'); return make(A.length, A[0].length, (i, j) => A[i][j] + s * B[i][j]) }
const transpose = (A: M) => make(A[0].length, A.length, (i, j) => A[j][i])
const square = (A: M) => { if (A.length !== A[0].length) throw new Error('This needs a square matrix.') }

// reduced row echelon form; also returns the determinant factor and rank
function rref(A: M) {
  const R = A.map((r) => [...r]), rows = R.length, cols = R[0].length
  let lead = 0, det = 1, rank = 0
  for (let r = 0; r < rows && lead < cols; r++) {
    let i = r
    while (Math.abs(R[i][lead]) < EPS) { i++; if (i === rows) { i = r; lead++; if (lead === cols) return { R, det: 0, rank } } }
    if (i !== r) { [R[i], R[r]] = [R[r], R[i]]; det = -det }
    const p = R[r][lead]; det *= p
    R[r] = R[r].map((v) => v / p)
    for (let k = 0; k < rows; k++) if (k !== r) { const f = R[k][lead]; R[k] = R[k].map((v, j) => v - f * R[r][j]) }
    lead++; rank++
  }
  return { R, det: rank === rows ? det : 0, rank }
}
const det = (A: M) => { square(A); return rref(A).det }
function inverse(A: M) {
  square(A)
  const n = A.length, { R, rank } = rref(A.map((r, i) => [...r, ...make(1, n, (_, j) => (i === j ? 1 : 0))[0]]))
  if (rank < n || R.some((r, i) => Math.abs(r[i] - 1) > 1e-9)) throw new Error('This matrix has no inverse (its determinant is 0).')
  return R.map((r) => r.slice(n))
}
function power(A: M, n: number) {
  square(A)
  if (!Number.isInteger(n)) throw new Error('The power must be a whole number.')
  let base = n < 0 ? inverse(A) : A, e = Math.abs(n), out = make(A.length, A.length, (i, j) => (i === j ? 1 : 0))
  while (e) { if (e & 1) out = mul(out, base); base = mul(base, base); e >>= 1 }
  return out
}

// 0.3333333 → 1/3, for students checking hand-worked answers
function frac(x: number) {
  if (Number.isInteger(x) || !Number.isFinite(x)) return formatNumber(x)
  let h1 = 1, h0 = 0, k1 = 0, k0 = 1, b = x
  for (let i = 0; i < 20; i++) {
    const a = Math.floor(b);[h1, h0] = [a * h1 + h0, h1];[k1, k0] = [a * k1 + k0, k1]
    if (Math.abs(x - h1 / k1) < 1e-9 || k1 > 10000) break
    b = 1 / (b - a)
  }
  if (k1 > 10000 || Math.abs(x - h1 / k1) >= 1e-9) return formatNumber(x, 8)
  return k1 === 1 ? String(h1) : `${h1}/${k1}`
}

const OPS = [
  ['det', 'det(A)'], ['inv', 'A⁻¹'], ['tr', 'Aᵀ'], ['rref', 'RREF(A)'], ['rank', 'rank(A)'], ['pow', 'Aⁿ'], ['scale', 'k·A'],
  ['add', 'A + B'], ['sub', 'A − B'], ['mul', 'A × B'], ['bmul', 'B × A'],
] as const
type Op = (typeof OPS)[number][0]

function Grid({ name, cells, setCells }: { name: string; cells: string[][]; setCells: (c: string[][]) => void }) {
  const r = cells.length, c = cells[0].length
  const resize = (nr: number, nc: number) => setCells(Array.from({ length: nr }, (_, i) => Array.from({ length: nc }, (_, j) => cells[i]?.[j] ?? '0')))
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
      <Row>
        <strong style={{ fontSize: 18 }}>{name}</strong>
        <Field label="Rows"><select value={r} onChange={(e) => resize(+e.target.value, c)}>{[1, 2, 3, 4, 5, 6].map((n) => <option key={n}>{n}</option>)}</select></Field>
        <Field label="Columns"><select value={c} onChange={(e) => resize(r, +e.target.value)}>{[1, 2, 3, 4, 5, 6].map((n) => <option key={n}>{n}</option>)}</select></Field>
      </Row>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${c}, minmax(44px, 70px))`, gap: 4, overflowX: 'auto' }}>
        {cells.map((row, i) => row.map((v, j) => (
          <input key={`${i}-${j}`} className="mono" value={v} inputMode="decimal" aria-label={`${name} row ${i + 1} column ${j + 1}`} style={{ textAlign: 'center', padding: '6px 4px' }}
            onFocus={(e) => e.target.select()} onChange={(e) => setCells(cells.map((rr, a) => (a === i ? rr.map((x, b) => (b === j ? e.target.value : x)) : rr)))} />
        )))}
      </div>
      <Row>
        <button className="btn" onClick={() => setCells(cells.map((rr, i) => rr.map((_, j) => (i === j ? '1' : '0'))))}>Identity</button>
        <button className="btn" onClick={() => setCells(cells.map((rr) => rr.map(() => '0')))}>Zeros</button>
        <button className="btn" onClick={() => setCells(cells.map((rr) => rr.map(() => String(Math.floor(Math.random() * 19) - 9))))}>Random</button>
      </Row>
    </div>
  )
}

export default function MatrixCalculator() {
  const [A, setA] = useState([['2', '1', '1'], ['1', '3', '2'], ['1', '0', '0']])
  const [B, setB] = useState([['1', '0', '2'], ['0', '1', '1'], ['1', '1', '0']])
  const [op, setOp] = useState<Op>('det')
  const [k, setK] = useState('2')
  const [fractions, setFractions] = useState(true)

  const result = useMemo((): { m?: M; n?: number; error?: string } => {
    const parse = (cells: string[][]) => cells.map((r) => r.map((s) => { const v = evaluate(s.trim() || '0'); if (!Number.isFinite(v)) throw new Error(`“${s}” is not a number`); return v }))
    try {
      const a = parse(A), b = () => parse(B), kv = () => evaluate(k || '0')
      switch (op) {
        case 'det': return { n: det(a) }
        case 'inv': return { m: inverse(a) }
        case 'tr': return { m: transpose(a) }
        case 'rref': return { m: rref(a).R }
        case 'rank': return { n: rref(a).rank }
        case 'pow': return { m: power(a, kv()) }
        case 'scale': return { m: a.map((r) => r.map((v) => v * kv())) }
        case 'add': return { m: add(a, b()) }
        case 'sub': return { m: add(a, b(), -1) }
        case 'mul': return { m: mul(a, b()) }
        case 'bmul': return { m: mul(b(), a) }
      }
    } catch (e) { return { error: (e as Error).message } }
  }, [A, B, op, k])

  const show = (v: number) => { const x = Math.abs(v) < EPS ? 0 : v; return fractions ? frac(x) : formatNumber(x, 8) }
  const usesB = ['add', 'sub', 'mul', 'bmul'].includes(op)

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
        <Grid name="A" cells={A} setCells={setA} />
        <Grid name="B" cells={B} setCells={setB} />
      </div>
      <div className="filter-chips" role="group" aria-label="Operation">
        {OPS.map(([id, l]) => <button key={id} className={`chip mono ${op === id ? 'active' : ''}`} aria-pressed={op === id} onClick={() => setOp(id)}>{l}</button>)}
      </div>
      <Row>
        {(op === 'pow' || op === 'scale') && <Field label={op === 'pow' ? 'n' : 'k'}><input className="mono" value={k} onChange={(e) => setK(e.target.value)} style={{ width: 80 }} /></Field>}
        <label className="check" style={{ alignSelf: 'flex-end' }}><input type="checkbox" checked={fractions} onChange={(e) => setFractions(e.target.checked)} /> Show fractions</label>
        {usesB && <span className="muted" style={{ alignSelf: 'flex-end', fontSize: 13 }}>Uses A and B</span>}
      </Row>
      <ErrorBox message={result.error} />
      {result.n !== undefined && <div className="output" style={{ fontSize: 22 }}>{OPS.find(([id]) => id === op)![1]} = {show(result.n)}</div>}
      {result.m && (
        <>
          <div style={{ display: 'inline-grid', gridTemplateColumns: `repeat(${result.m[0].length}, auto)`, gap: '6px 18px', padding: '10px 16px', borderLeft: '2px solid var(--text)', borderRight: '2px solid var(--text)', borderRadius: 6, alignSelf: 'flex-start', fontSize: 16 }} className="mono" aria-live="polite">
            {result.m.flatMap((r, i) => r.map((v, j) => <span key={`${i}-${j}`} style={{ textAlign: 'right' }}>{show(v)}</span>))}
          </div>
          <Row>
            <CopyButton value={result.m.map((r) => r.map(show).join('\t')).join('\n')} label="Copy (tab-separated)" />
            <button className="btn" onClick={() => setA(result.m!.map((r) => r.map((v) => (Math.abs(v) < EPS ? '0' : String(+v.toPrecision(12))))))}>Use result as A</button>
          </Row>
        </>
      )}
      <p className="muted" style={{ margin: 0, fontSize: 13 }}>Cells accept expressions like 1/2, sqrt(3) or -pi. Fractions are shown when a value is close to a simple fraction.</p>
    </>
  )
}
