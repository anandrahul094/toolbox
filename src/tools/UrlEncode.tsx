import { useMemo, useState } from 'react'
import { CopyButton, ErrorBox, Row } from '../components/ui'

export default function UrlEncode() {
  const [input, setInput] = useState('https://example.com/search?q=hello world&lang=en')
  const [mode, setMode] = useState<'encode' | 'decode'>('encode')
  const [component, setComponent] = useState(true)

  const { output, error } = useMemo(() => {
    try {
      const out = mode === 'encode'
        ? (component ? encodeURIComponent : encodeURI)(input)
        // '+' means space only in query strings (component mode); in full URLs it's a literal plus
        : component ? decodeURIComponent(input.replace(/\+/g, ' ')) : decodeURI(input)
      return { output: out, error: null }
    } catch {
      return { output: '', error: 'Malformed percent-encoding.' }
    }
  }, [input, mode, component])

  const params = useMemo(() => {
    try {
      const u = new URL(mode === 'decode' ? output : input)
      return [...u.searchParams.entries()]
    } catch {
      return []
    }
  }, [input, output, mode])

  return (
    <>
      <Row>
        <button className={`btn ${mode === 'encode' ? 'primary' : ''}`} onClick={() => setMode('encode')}>Encode</button>
        <button className={`btn ${mode === 'decode' ? 'primary' : ''}`} onClick={() => setMode('decode')}>Decode</button>
        <label className="check"><input type="checkbox" checked={component} onChange={(e) => setComponent(e.target.checked)} /> Encode everything (component)</label>
        <CopyButton value={output} />
      </Row>
      <div className="cols">
        <textarea aria-label="Input text" value={input} onChange={(e) => setInput(e.target.value)} spellCheck={false} />
        <textarea aria-label="Output" value={output} readOnly />
      </div>
      <ErrorBox message={error} />
      {params.length > 0 && (
        <table>
          <thead><tr><th>Query parameter</th><th>Value</th></tr></thead>
          <tbody>{params.map(([k, v], i) => <tr key={i}><td className="mono">{k}</td><td className="mono">{v}</td></tr>)}</tbody>
        </table>
      )}
    </>
  )
}
