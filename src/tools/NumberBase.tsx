import { useState } from 'react'
import { CopyButton, ErrorBox, Field, NumberInput } from '../components/ui'

const BASES: [string, number, string][] = [['Binary', 2, '0b'], ['Octal', 8, '0o'], ['Decimal', 10, ''], ['Hexadecimal', 16, '0x']]

function parse(s: string, base: number): bigint {
  const prefix = ({ 2: /^(-?)0b/, 8: /^(-?)0o/, 16: /^(-?)0x/ } as Record<number, RegExp>)[base]
  // strip only the prefix that belongs to this base (0b1f is a valid hex number)
  let clean = s.trim().toLowerCase().replace(/[_\s]/g, '')
  if (prefix) clean = clean.replace(prefix, '$1')
  const neg = clean.startsWith('-')
  const digits = neg ? clean.slice(1) : clean
  if (!digits) throw new Error('Enter a number')
  let n = 0n
  for (const ch of digits) {
    const d = parseInt(ch, 36)
    if (Number.isNaN(d) || d >= base) throw new Error(`"${ch}" is not a valid base-${base} digit`)
    n = n * BigInt(base) + BigInt(d)
  }
  return neg ? -n : n
}

export default function NumberBase() {
  const [value, setValue] = useState('255')
  const [base, setBase] = useState(10)
  const [custom, setCustom] = useState(36)

  let n: bigint | null = null, error: string | null = null
  try { n = parse(value, base) } catch (e) { error = (e as Error).message }

  const rows: [string, string][] = n === null ? [] : [
    ...BASES.map(([name, b]) => [name, n!.toString(b)] as [string, string]),
    [`Base ${custom}`, n.toString(custom)],
  ]

  return (
    <>
      <div className="row">
        <Field label="Number (supports very large integers)"><input className="mono" value={value} onChange={(e) => setValue(e.target.value)} /></Field>
        <Field label="Input base">
          <select value={base} onChange={(e) => setBase(+e.target.value)} style={{ width: 160 }}>
            {BASES.map(([name, b]) => <option key={b} value={b}>{name} ({b})</option>)}
          </select>
        </Field>
        <Field label="Custom base"><NumberInput min={2} max={36} step={1} value={custom} onValue={(v) => setCustom(Math.round(v))} style={{ width: 100 }} /></Field>
      </div>
      <ErrorBox message={error} />
      {rows.length > 0 && (
        <table><tbody>
          {rows.map(([name, v]) => (
            <tr key={name}><th style={{ width: 130 }}>{name}</th><td className="mono" style={{ wordBreak: 'break-all' }}>{v}</td><td style={{ width: 80 }}><CopyButton value={v} /></td></tr>
          ))}
          {n !== null && n >= 0n && <tr><th>Bits</th><td>{n.toString(2).length}</td><td /></tr>}
        </tbody></table>
      )}
    </>
  )
}
