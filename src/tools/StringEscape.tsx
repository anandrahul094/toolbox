import { useMemo, useState } from 'react'
import { CopyButton, ErrorBox, Field, Row } from '../components/ui'

type Fmt = 'json' | 'js' | 'regex' | 'sql' | 'unicode'
const FORMATS: [Fmt, string][] = [['json', 'JSON string'], ['js', 'JavaScript string'], ['regex', 'Regular expression'], ['sql', 'SQL string'], ['unicode', 'Unicode \\uXXXX']]

const escapers: Record<Fmt, [(s: string) => string, (s: string) => string]> = {
  json: [(s) => JSON.stringify(s).slice(1, -1), (s) => JSON.parse(`"${s}"`)],
  js: [
    (s) => s.replace(/[\\'"`\n\r\t\b\f\v\0]/g, (c) => ({ '\n': '\\n', '\r': '\\r', '\t': '\\t', '\b': '\\b', '\f': '\\f', '\v': '\\v', '\0': '\\0' })[c] ?? '\\' + c),
    (s) => s.replace(/\\(u\{[0-9a-f]+\}|u[0-9a-f]{4}|x[0-9a-f]{2}|.)/gi, (_, e: string) =>
      e[0] === 'u' || e[0] === 'x' ? String.fromCodePoint(parseInt(e.replace(/[ux{}]/gi, ''), 16)) : ({ n: '\n', r: '\r', t: '\t', b: '\b', f: '\f', v: '\v', '0': '\0' } as Record<string, string>)[e] ?? e),
  ],
  regex: [(s) => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&'), (s) => s.replace(/\\(.)/g, '$1')],
  sql: [(s) => s.replace(/'/g, "''"), (s) => s.replace(/''/g, "'")],
  unicode: [
    (s) => [...s].map((c) => { const cp = c.codePointAt(0)!; return cp < 128 ? c : cp > 0xffff ? `\\u{${cp.toString(16)}}` : `\\u${cp.toString(16).padStart(4, '0')}` }).join(''),
    (s) => s.replace(/\\u\{([0-9a-f]+)\}|\\u([0-9a-f]{4})/gi, (_, a, b) => String.fromCodePoint(parseInt(a ?? b, 16))),
  ],
}

export default function StringEscape() {
  const [input, setInput] = useState('He said "hello"\nPath: C:\\temp — ✓')
  const [fmt, setFmt] = useState<Fmt>('json')
  const [mode, setMode] = useState<0 | 1>(0)
  const result = useMemo(() => {
    try { return { out: escapers[fmt][mode](input) } } catch (e) { return { error: (e as Error).message } }
  }, [input, fmt, mode])

  return (
    <>
      <Row>
        <Field label="Format">
          <select value={fmt} onChange={(e) => setFmt(e.target.value as Fmt)} style={{ width: 200 }}>
            {FORMATS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </Field>
        <button className={`btn ${mode === 0 ? 'primary' : ''}`} onClick={() => setMode(0)}>Escape</button>
        <button className={`btn ${mode === 1 ? 'primary' : ''}`} onClick={() => setMode(1)}>Unescape</button>
        <CopyButton value={result.out ?? ''} />
      </Row>
      <div className="cols">
        <textarea aria-label="Input text" value={input} onChange={(e) => setInput(e.target.value)} spellCheck={false} />
        <textarea aria-label="Output" value={result.out ?? ''} readOnly />
      </div>
      <ErrorBox message={result.error} />
    </>
  )
}
