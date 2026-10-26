import { useMemo, useState } from 'react'
import { CopyButton, Field, Row } from '../components/ui'

export default function Slugify() {
  const [text, setText] = useState('10 Useful Tools — For Developers & Designers!')
  const [sep, setSep] = useState('-')
  const [lower, setLower] = useState(true)
  const slug = useMemo(() => {
    let s = text.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/&/g, ' and ')
    s = s.replace(/[^A-Za-z0-9]+/g, sep).replace(new RegExp(`^\\${sep}+|\\${sep}+$`, 'g'), '')
    return lower ? s.toLowerCase() : s
  }, [text, sep, lower])

  return (
    <>
      <Field label="Text"><input value={text} onChange={(e) => setText(e.target.value)} /></Field>
      <Row>
        <Field label="Separator">
          <select value={sep} onChange={(e) => setSep(e.target.value)} style={{ width: 160 }}>
            <option value="-">Hyphen (-)</option><option value="_">Underscore (_)</option><option value=".">Dot (.)</option>
          </select>
        </Field>
        <label className="check"><input type="checkbox" checked={lower} onChange={(e) => setLower(e.target.checked)} /> Lowercase</label>
      </Row>
      <Row><pre className="output" style={{ flex: 1, fontSize: 16 }}>{slug}</pre><CopyButton value={slug} /></Row>
    </>
  )
}
