import { useMemo, useState } from 'react'
import { CopyButton, ErrorBox, Row } from '../components/ui'

export default function JsonFormatter() {
  const [input, setInput] = useState('{"name":"Toolbox","tools":["json","base64"],"free":true}')
  const [indent, setIndent] = useState('2')
  const [sortKeys, setSortKeys] = useState(false)
  const [minify, setMinify] = useState(false)

  const { output, error, warning } = useMemo((): { output: string; error: string | null; warning?: string | null } => {
    if (!input.trim()) return { output: '', error: null }
    try {
      let parsed = JSON.parse(input)
      if (sortKeys) parsed = sortDeep(parsed)
      const space = minify ? undefined : indent === 'tab' ? '\t' : Number(indent)
      // JavaScript numbers lose precision past 2^53; warn instead of silently changing IDs
      const big = /(?<![\w."])-?\d{16,}(?![\w."])/.test(input.replace(/"(?:[^"\\]|\\.)*"/g, '""'))
      return { output: JSON.stringify(parsed, null, space), error: null, warning: big ? 'Some numbers have more than 15 digits and may have been rounded. Store long IDs as strings.' : null }
    } catch (e) {
      return { output: '', error: (e as Error).message }
    }
  }, [input, indent, sortKeys, minify])

  return (
    <>
      <Row>
        <select aria-label="Indentation" value={indent} onChange={(e) => setIndent(e.target.value)} style={{ width: 140 }} disabled={minify}>
          <option value="2">2 spaces</option>
          <option value="4">4 spaces</option>
          <option value="tab">Tabs</option>
        </select>
        <label className="check"><input type="checkbox" checked={minify} onChange={(e) => setMinify(e.target.checked)} /> Minify</label>
        <label className="check"><input type="checkbox" checked={sortKeys} onChange={(e) => setSortKeys(e.target.checked)} /> Sort keys</label>
        <CopyButton value={output} />
      </Row>
      <div className="cols">
        <textarea aria-label="Input text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Paste JSON here" spellCheck={false} />
        <textarea aria-label="Output" value={output} readOnly placeholder="Formatted output" />
      </div>
      <ErrorBox message={error && `Invalid JSON: ${error}`} />
      {warning && <div className="notice">{warning}</div>}
      {!error && output && <div className="muted">✓ Valid JSON</div>}
    </>
  )
}

function sortDeep(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sortDeep)
  if (v && typeof v === 'object') {
    return Object.fromEntries(Object.keys(v).sort().map((k) => [k, sortDeep((v as Record<string, unknown>)[k])]))
  }
  return v
}
