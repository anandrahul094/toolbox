import { useMemo, useState } from 'react'
import { CopyButton, Field, Row, Stat } from '../components/ui'
import { formatNumber } from '../lib/mathExpr'

const f = (v: number) => (Number.isFinite(v) ? formatNumber(v, 8) : '—')
const parseList = (s: string) => s.split(/[\s,;\t]+/).filter(Boolean).map(Number).filter((n) => Number.isFinite(n))

// quartile by linear interpolation (same as Excel QUARTILE.INC)
function quantile(sorted: number[], p: number) {
  const pos = (sorted.length - 1) * p, lo = Math.floor(pos), hi = Math.ceil(pos)
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo)
}

function describe(xs: number[]) {
  const n = xs.length
  const s = [...xs].sort((a, b) => a - b)
  const sum = xs.reduce((a, b) => a + b, 0), mean = sum / n
  const ss = xs.reduce((a, x) => a + (x - mean) ** 2, 0)
  const counts = new Map<number, number>(); xs.forEach((x) => counts.set(x, (counts.get(x) ?? 0) + 1))
  const top = Math.max(...counts.values())
  const modes = top > 1 ? [...counts].filter(([, c]) => c === top).map(([v]) => v).sort((a, b) => a - b) : []
  const sdS = Math.sqrt(ss / (n - 1)), sdP = Math.sqrt(ss / n)
  const q1 = quantile(s, 0.25), q3 = quantile(s, 0.75)
  const skew = n > 2 && sdS ? (n / ((n - 1) * (n - 2))) * xs.reduce((a, x) => a + ((x - mean) / sdS) ** 3, 0) : NaN
  return {
    n, sum, mean, median: quantile(s, 0.5), modes, min: s[0], max: s[n - 1], range: s[n - 1] - s[0],
    varS: ss / (n - 1), varP: ss / n, sdS, sdP, se: sdS / Math.sqrt(n), q1, q3, iqr: q3 - q1, skew,
    geo: s[0] > 0 ? Math.exp(xs.reduce((a, x) => a + Math.log(x), 0) / n) : NaN,
    harm: s[0] > 0 ? n / xs.reduce((a, x) => a + 1 / x, 0) : NaN,
    cv: mean ? (sdS / Math.abs(mean)) * 100 : NaN,
    outliers: xs.filter((x) => x < q1 - 1.5 * (q3 - q1) || x > q3 + 1.5 * (q3 - q1)),
  }
}

function regression(xs: number[], ys: number[]) {
  const n = xs.length, mx = xs.reduce((a, b) => a + b, 0) / n, my = ys.reduce((a, b) => a + b, 0) / n
  let sxy = 0, sxx = 0, syy = 0
  for (let i = 0; i < n; i++) { sxy += (xs[i] - mx) * (ys[i] - my); sxx += (xs[i] - mx) ** 2; syy += (ys[i] - my) ** 2 }
  const m = sxy / sxx, b = my - m * mx, r = sxy / Math.sqrt(sxx * syy)
  return { m, b, r, r2: r * r }
}

export default function StatisticsCalculator() {
  const [mode, setMode] = useState<'one' | 'two'>('one')
  const [data, setData] = useState('12, 15, 11, 18, 15, 20, 14, 16, 15, 13')
  const [xs, setXs] = useState('1 2 3 4 5 6')
  const [ys, setYs] = useState('2.1 3.9 6.2 8.1 9.8 12.2')
  const [predict, setPredict] = useState('7')

  const list = useMemo(() => parseList(data), [data])
  const d = list.length ? describe(list) : null
  const X = parseList(xs), Y = parseList(ys)
  const reg = mode === 'two' && X.length >= 2 && X.length === Y.length ? regression(X, Y) : null

  const rows: [string, string][] = d ? [
    ['Count (n)', String(d.n)], ['Sum', f(d.sum)], ['Mean (average)', f(d.mean)], ['Median', f(d.median)], ['Mode', d.modes.length ? d.modes.map(f).join(', ') : 'none (no repeats)'],
    ['Minimum', f(d.min)], ['Maximum', f(d.max)], ['Range', f(d.range)],
    ['Standard deviation (sample, s)', f(d.sdS)], ['Standard deviation (population, σ)', f(d.sdP)], ['Variance (sample, s²)', f(d.varS)], ['Variance (population, σ²)', f(d.varP)],
    ['Standard error of mean', f(d.se)], ['Coefficient of variation', `${f(d.cv)}%`], ['Q1 (25th percentile)', f(d.q1)], ['Q3 (75th percentile)', f(d.q3)], ['Interquartile range', f(d.iqr)],
    ['Skewness', f(d.skew)], ['Geometric mean', f(d.geo)], ['Harmonic mean', f(d.harm)], ['Outliers (1.5 × IQR rule)', d.outliers.length ? d.outliers.map(f).join(', ') : 'none'],
  ] : []

  return (
    <>
      <div className="seg" role="group" aria-label="Data type" style={{ alignSelf: 'flex-start' }}>
        <button aria-pressed={mode === 'one'} onClick={() => setMode('one')}>One list</button>
        <button aria-pressed={mode === 'two'} onClick={() => setMode('two')}>x and y (regression)</button>
      </div>
      {mode === 'one' ? (
        <>
          <Field label="Numbers" hint="Separate with commas, spaces or new lines — or paste a column from Excel."><textarea value={data} onChange={(e) => setData(e.target.value)} style={{ minHeight: 100 }} /></Field>
          {d && (
            <>
              <div className="stats">
                <Stat label="Mean" value={f(d.mean)} /><Stat label="Median" value={f(d.median)} /><Stat label="Std. dev. (s)" value={f(d.sdS)} /><Stat label="Count" value={String(d.n)} />
              </div>
              <table style={{ borderCollapse: 'collapse', fontSize: 14, maxWidth: 560 }}>
                <tbody>{rows.map(([k, v]) => <tr key={k} style={{ borderBottom: '1px solid var(--border)' }}><td style={{ padding: '5px 8px' }}>{k}</td><td className="mono" style={{ padding: '5px 8px', textAlign: 'right' }}>{v}</td></tr>)}</tbody>
              </table>
              <Row><CopyButton value={rows.map(([k, v]) => `${k}\t${v}`).join('\n')} label="Copy all results" /></Row>
              <p className="muted" style={{ margin: 0, fontSize: 13 }}>Use the <b>sample</b> standard deviation (s, divides by n − 1) when your numbers are a sample of a bigger group — the usual case in lab work — and the <b>population</b> one (σ, divides by n) when you have every value.</p>
            </>
          )}
        </>
      ) : (
        <>
          <Row>
            <Field label="x values"><textarea value={xs} onChange={(e) => setXs(e.target.value)} style={{ minHeight: 80 }} /></Field>
            <Field label="y values"><textarea value={ys} onChange={(e) => setYs(e.target.value)} style={{ minHeight: 80 }} /></Field>
          </Row>
          {X.length !== Y.length && <div className="error">x has {X.length} values but y has {Y.length}. They must match.</div>}
          {reg && (
            <>
              <div className="output" style={{ fontSize: 18 }}>y = {f(reg.m)}x {reg.b < 0 ? '−' : '+'} {f(Math.abs(reg.b))}</div>
              <div className="stats">
                <Stat label="Slope (m)" value={f(reg.m)} /><Stat label="Intercept (b)" value={f(reg.b)} /><Stat label="Correlation (r)" value={f(reg.r)} /><Stat label="R²" value={f(reg.r2)} />
              </div>
              <Row>
                <Field label="Predict y at x ="><input className="mono" value={predict} onChange={(e) => setPredict(e.target.value)} style={{ width: 100 }} /></Field>
                <div className="output" style={{ alignSelf: 'flex-end' }}>y ≈ {Number.isFinite(+predict) && predict.trim() ? f(reg.m * +predict + reg.b) : '—'}</div>
              </Row>
              <p className="muted" style={{ margin: 0, fontSize: 13 }}>Least-squares straight line. r close to ±1 means a strong linear relationship; R² is the share of the variation in y the line explains.</p>
            </>
          )}
        </>
      )}
    </>
  )
}
