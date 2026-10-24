import { useMemo, useState } from 'react'
import { CopyButton, ErrorBox, Field, NumberInput, Row, Stat } from '../components/ui'

const SUP: Record<string, string> = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' }
const sup = (n: number) => String(n).split('').map((c) => SUP[c] ?? c).join('')

// count significant figures from the number as written (trailing zeros matter after a decimal point)
function analyse(raw: string) {
  const s = raw.trim().replace(/,/g, '').replace(/[×x]\s*10\^?/i, 'e')
  const m = s.match(/^([+-]?)(\d*)(\.?)(\d*)(?:e([+-]?\d+))?$/i)
  if (!m || (!m[2] && !m[4])) return null
  const [, sign, int, dot, frac, exp] = m
  const digits = (int + frac).replace(/^0+/, '')
  let sig: number, ambiguous = false
  if (!digits.replace(/0/g, '')) sig = Math.max(1, (dot ? frac.length : 0) || 1) // 0, 0.00
  else if (dot) sig = digits.length // all after the first non-zero digit count
  else { const trimmed = digits.replace(/0+$/, ''); sig = trimmed.length; ambiguous = trimmed.length !== digits.length } // 1500: trailing zeros are ambiguous
  // mark which written digits are significant
  const written = (int || '') + (dot ? '.' : '') + (frac || '')
  const firstNz = written.search(/[1-9]/)
  let count = 0
  const marks = written.split('').map((ch, i) => {
    if (ch === '.' || i < firstNz || firstNz < 0) return { ch, sig: false }
    if (count >= sig) return { ch, sig: false }
    count++; return { ch, sig: true }
  })
  const value = parseFloat(sign + (int || '0') + '.' + (frac || '0')) * 10 ** (exp ? +exp : 0)
  return { sig, ambiguous, marks, value, sign, exp, dp: dot ? frac.length : 0 }
}

function round(v: number, n: number) { return v === 0 ? 0 : +v.toPrecision(n) }
function sci(v: number, n: number) {
  if (v === 0) return { text: '0', e: 0, m: '0' }
  const e = Math.floor(Math.log10(Math.abs(v))), m = (v / 10 ** e).toFixed(Math.max(0, n - 1))
  // rounding can push 9.99 to 10.0
  return +m >= 10 ? { m: (v / 10 ** (e + 1)).toFixed(Math.max(0, n - 1)), e: e + 1 } : { m, e }
}
function eng(v: number, n: number) {
  if (v === 0) return '0'
  const e = Math.floor(Math.log10(Math.abs(v)) / 3) * 3
  return `${+(v / 10 ** e).toPrecision(n)} × 10${sup(e)}`
}

export default function SigFigs() {
  const [input, setInput] = useState('0.0045600')
  const [n, setN] = useState(3)
  const a = useMemo(() => analyse(input), [input])
  const s = a ? sci(a.value, n) : null
  const sciText = s ? `${s.m} × 10${sup(s.e as number)}` : ''

  return (
    <>
      <Field label="Number" hint="e.g. 0.0045600, 1500, 6.022e23, 3.00 × 10^8"><input className="mono" value={input} onChange={(e) => setInput(e.target.value)} style={{ fontSize: 20 }} spellCheck={false} /></Field>
      <ErrorBox message={input.trim() && !a ? 'That doesn’t look like a number.' : null} />
      {a && (
        <>
          <div className="output" style={{ fontSize: 26, letterSpacing: '0.04em' }} aria-label={`${a.sig} significant figures`}>
            {a.sign}{a.marks.map((m, i) => <span key={i} style={m.sig ? { color: 'var(--ok)', fontWeight: 700, textDecoration: 'underline' } : { opacity: 0.45 }}>{m.ch}</span>)}{a.exp ? <span style={{ opacity: 0.6 }}> × 10{sup(+a.exp)}</span> : null}
          </div>
          <div className="stats"><Stat label="Significant figures" value={`${a.sig}${a.ambiguous ? '*' : ''}`} /><Stat label="Decimal places" value={String(a.dp)} /></div>
          {a.ambiguous && <p className="muted" style={{ margin: 0, fontSize: 13 }}>* Trailing zeros in a whole number without a decimal point (like 1500) are ambiguous — they may or may not be significant. Write 1500. or 1.50 × 10³ to make it clear.</p>}
          <Row>
            <Field label="Round to significant figures"><NumberInput min={1} max={15} step={1} value={n} onValue={(v) => setN(Math.round(v))} /></Field>
          </Row>
          <table style={{ borderCollapse: 'collapse', fontSize: 15, maxWidth: 520 }}>
            <tbody>
              {[['Rounded', String(round(a.value, n))], ['Scientific notation', sciText], ['E notation', `${s!.m}e${s!.e}`], ['Engineering notation', eng(a.value, n)], ['Plain decimal', a.value.toLocaleString('en-US', { maximumSignificantDigits: Math.max(n, 1), useGrouping: false })]].map(([k, v]) => (
                <tr key={k} style={{ borderBottom: '1px solid var(--border)' }}><td style={{ padding: '6px 8px' }}>{k}</td><td className="mono" style={{ padding: '6px 8px' }}>{v}</td><td><CopyButton value={v} /></td></tr>
              ))}
            </tbody>
          </table>
          <details>
            <summary className="field-label" style={{ cursor: 'pointer' }}>Rules for significant figures</summary>
            <ul className="muted" style={{ fontSize: 14, marginTop: 8 }}>
              <li>Non-zero digits are always significant.</li>
              <li>Zeros between non-zero digits are significant (1005 → 4).</li>
              <li>Leading zeros are never significant (0.0045 → 2).</li>
              <li>Trailing zeros after a decimal point are significant (4.500 → 4).</li>
              <li>Multiplying or dividing: keep the fewest significant figures of the inputs. Adding or subtracting: keep the fewest decimal places.</li>
            </ul>
          </details>
        </>
      )}
    </>
  )
}
