import { useState } from 'react'
import { CopyButton, Field, Row } from '../components/ui'

const WHO = ['Owner', 'Group', 'Others']
const PERMS: [string, number][] = [['Read', 4], ['Write', 2], ['Execute', 1]]

export default function Chmod() {
  const [bits, setBits] = useState([7, 5, 5])
  const [draft, setDraft] = useState<string | null>(null)
  const octal = bits.join('')
  const symbolic = bits.map((b) => (b & 4 ? 'r' : '-') + (b & 2 ? 'w' : '-') + (b & 1 ? 'x' : '-')).join('')
  const toggle = (w: number, p: number) => setBits(bits.map((b, i) => (i === w ? b ^ p : b)))

  return (
    <>
      <table>
        <thead><tr><th />{PERMS.map(([n]) => <th key={n}>{n}</th>)}</tr></thead>
        <tbody>
          {WHO.map((w, i) => (
            <tr key={w}><th>{w}</th>{PERMS.map(([n, v]) => <td key={n}><input type="checkbox" aria-label={`${w} ${n.toLowerCase()}`} checked={!!(bits[i] & v)} onChange={() => { toggle(i, v); setDraft(null) }} /></td>)}</tr>
          ))}
        </tbody>
      </table>
      <Row>
        <Field label="Octal">
          <input className="mono" style={{ fontSize: 20, width: 120 }} value={draft ?? octal} maxLength={3} inputMode="numeric" aria-label="Octal permissions"
            onChange={(e) => { const v = e.target.value.replace(/[^0-7]/g, ''); setDraft(v); if (v.length === 3) setBits([...v].map(Number)) }}
            onBlur={() => setDraft(null)} />
        </Field>
        <Field label="Symbolic"><div className="output" style={{ fontSize: 20 }}>-{symbolic}</div></Field>
      </Row>
      <Row>
        <pre className="output" style={{ flex: 1 }}>chmod {octal} filename</pre>
        <CopyButton value={`chmod ${octal} `} />
      </Row>
      <Row>
        {['755', '644', '600', '700', '777', '400'].map((p) => <button key={p} className="chip" onClick={() => { setBits([...p].map(Number)); setDraft(null) }}>{p}</button>)}
      </Row>
    </>
  )
}
