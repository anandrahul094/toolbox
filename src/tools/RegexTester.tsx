import { useMemo, useState, type ReactNode } from 'react'
import { CopyButton, ErrorBox, Field, Row } from '../components/ui'
import { useRegex } from '../lib/safeRegex'

export default function RegexTester() {
  const [pattern, setPattern] = useState('(\\w+)@(\\w+)\\.com')
  const [flags, setFlags] = useState('g')
  const [text, setText] = useState('Contact alice@example.com or bob@test.com for details.')
  const [doReplace, setDoReplace] = useState(false)
  const [replace, setReplace] = useState('$1 at $2')

  const result = useRegex(pattern ? { pattern, flags, text, replace: doReplace ? replace : null } : null)

  const highlighted = useMemo(() => {
    const out: ReactNode[] = []
    let last = 0
    result.matches.forEach((m, i) => {
      if (m.text === '' || m.index < last) return
      out.push(text.slice(last, m.index), <mark key={i}>{m.text}</mark>)
      last = m.index + m.text.length
    })
    out.push(text.slice(last))
    return out
  }, [result.matches, text])

  return (
    <>
      <Row>
        <Field label="Pattern"><input className="mono" value={pattern} onChange={(e) => setPattern(e.target.value)} spellCheck={false} /></Field>
        <Field label="Flags" hint="g i m s u y d"><input className="mono" value={flags} onChange={(e) => setFlags([...new Set(e.target.value.replace(/[^dgimsuy]/g, ''))].join(''))} style={{ width: 100 }} /></Field>
      </Row>
      <ErrorBox message={result.error} />
      <Field label="Test string"><textarea aria-label="Input text" value={text} onChange={(e) => setText(e.target.value)} style={{ minHeight: 120 }} /></Field>
      <Field label={result.running ? 'Matching…' : `Highlighted — ${result.total} match${result.total === 1 ? '' : 'es'}${result.total > 1000 ? ' (first 1000 shown)' : ''}`}>
        <div className="output" style={{ wordBreak: 'break-word' }}>{highlighted}</div>
      </Field>
      {result.matches.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead><tr><th>#</th><th>Match</th><th>Index</th><th>Groups</th></tr></thead>
            <tbody>
              {result.matches.slice(0, 50).map((m, i) => (
                <tr key={i}><td>{i + 1}</td><td className="mono">{m.text || <span className="muted">(empty)</span>}</td><td>{m.index}</td><td className="mono">{m.groups.map((g) => g ?? '∅').join(' · ')}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <label className="check"><input type="checkbox" checked={doReplace} onChange={(e) => setDoReplace(e.target.checked)} /> Test a replacement (replaces every match)</label>
      {doReplace && (
        <>
          <Field label="Replace with" hint="Use $1, $2 for groups, $& for the whole match. Leave empty to delete matches.">
            <input className="mono" value={replace} onChange={(e) => setReplace(e.target.value)} />
          </Field>
          {result.replaced != null && <><pre className="output">{result.replaced}</pre><div><CopyButton value={result.replaced} label="Copy result" /></div></>}
        </>
      )}
    </>
  )
}
