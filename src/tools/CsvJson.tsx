import { useMemo, useState } from 'react'
import { CopyButton, ErrorBox, Field, Row } from '../components/ui'
import CodeEditor from '../components/CodeEditor'

// RFC 4180-style parser: handles quoted fields, escaped quotes and newlines inside quotes
function parseCsv(text: string, delim: string): string[][] {
  const rows: string[][] = []
  let row: string[] = [], field = '', inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++ }
      else if (c === '"') inQuotes = false
      else field += c
    } else if (c === '"' && field === '') inQuotes = true // a quote mid-field (55" TV) is just a character
    else if (c === delim) { row.push(field); field = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(field); rows.push(row); row = []; field = ''
    } else field += c
  }
  if (field || row.length) { row.push(field); rows.push(row) }
  return rows.filter((r) => r.some((f) => f !== ''))
}

const cell = (v: unknown, delim: string) => {
  const s = v === null || v === undefined ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v)
  return /["\n\r]/.test(s) || s.includes(delim) ? `"${s.replace(/"/g, '""')}"` : s
}

// only plain decimal numbers that survive the round trip: keeps 007, 0x1A, 1e3 and long IDs as text
const coerce = (s: string) => {
  if (s === '') return ''
  if (s === 'true' || s === 'false') return s === 'true'
  if (s === 'null') return null
  if (/^-?(0|[1-9]\d*)(\.\d+)?$/.test(s)) { const n = Number(s); if (String(n) === s) return n }
  return s
}

export default function CsvJson() {
  const [mode, setMode] = useState<'csv2json' | 'json2csv'>('csv2json')
  const [input, setInput] = useState('name,age,city\nAlice,30,"New York, NY"\nBob,25,London')
  const [delim, setDelim] = useState(',')
  const [types, setTypes] = useState(true)

  const result = useMemo(() => {
    try {
      if (mode === 'csv2json') {
        const [header, ...rows] = parseCsv(input, delim)
        if (!header) return { out: '[]' }
        const data = rows.map((r) => Object.fromEntries(header.map((h, i) => [h, types ? coerce(r[i] ?? '') : r[i] ?? ''])))
        return { out: JSON.stringify(data, null, 2), count: data.length }
      }
      const data = JSON.parse(input)
      const arr: Record<string, unknown>[] = Array.isArray(data) ? data : [data]
      const keys = [...new Set(arr.flatMap((o) => Object.keys(o ?? {})))]
      const lines = [keys.map((k) => cell(k, delim)).join(delim), ...arr.map((o) => keys.map((k) => cell(o?.[k], delim)).join(delim))]
      return { out: lines.join('\n'), count: arr.length }
    } catch (e) {
      return { error: (e as Error).message }
    }
  }, [input, mode, delim, types])

  const swap = (m: typeof mode) => { if (m !== mode && result.out) setInput(result.out); setMode(m) }

  return (
    <>
      <Row>
        <button className={`btn ${mode === 'csv2json' ? 'primary' : ''}`} onClick={() => swap('csv2json')}>CSV → JSON</button>
        <button className={`btn ${mode === 'json2csv' ? 'primary' : ''}`} onClick={() => swap('json2csv')}>JSON → CSV</button>
        <Field label="Delimiter">
          <select value={delim} onChange={(e) => setDelim(e.target.value)} style={{ width: 140 }}>
            <option value=",">Comma</option><option value=";">Semicolon</option><option value={'\t'}>Tab</option><option value="|">Pipe</option>
          </select>
        </Field>
        {mode === 'csv2json' && <label className="check"><input type="checkbox" checked={types} onChange={(e) => setTypes(e.target.checked)} /> Detect numbers & booleans</label>}
        <CopyButton value={result.out ?? ''} />
      </Row>
      <div className="cols">
        <CodeEditor value={input} onChange={setInput} language="auto" minHeight={260} ariaLabel="Input" />
        <CodeEditor value={result.out ?? ''} readOnly language="auto" minHeight={260} ariaLabel="Output" />
      </div>
      <ErrorBox message={result.error} />
      {result.count !== undefined && <div className="muted">{result.count} rows</div>}
    </>
  )
}
