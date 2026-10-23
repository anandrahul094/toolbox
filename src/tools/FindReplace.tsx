import { useState } from 'react'
import { CopyButton, ErrorBox, Field, Row } from '../components/ui'
import { useRegex } from '../lib/safeRegex'

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export default function FindReplace() {
  const [text, setText] = useState('The cat sat on the mat. The Cat was happy.')
  const [find, setFind] = useState('cat')
  const [replace, setReplace] = useState('dog')
  const [matchCase, setMatchCase] = useState(false)
  const [wholeWord, setWholeWord] = useState(false)
  const [regex, setRegex] = useState(false)

  let src = regex ? find : escapeRe(find)
  // group the pattern so "cat|dog" with whole words becomes \b(?:cat|dog)\b, not \bcat|dog\b
  if (wholeWord && find) src = `\\b(?:${src})\\b`
  const r = useRegex(find ? { pattern: src, flags: matchCase ? 'g' : 'gi', text, replace: regex ? replace : replace.replace(/\$/g, '$$$$') } : null)
  const result = { out: find ? r.replaced ?? text : text, count: r.total, error: r.error }

  return (
    <>
      <Row>
        <Field label="Find"><input value={find} onChange={(e) => setFind(e.target.value)} className={regex ? 'mono' : ''} /></Field>
        <Field label="Replace with"><input value={replace} onChange={(e) => setReplace(e.target.value)} /></Field>
      </Row>
      <Row>
        <label className="check"><input type="checkbox" checked={matchCase} onChange={(e) => setMatchCase(e.target.checked)} /> Match case</label>
        <label className="check"><input type="checkbox" checked={wholeWord} onChange={(e) => setWholeWord(e.target.checked)} /> Whole words</label>
        <label className="check"><input type="checkbox" checked={regex} onChange={(e) => setRegex(e.target.checked)} /> Regular expression ($1 for groups)</label>
        <span className="muted">{result.count} match{result.count === 1 ? '' : 'es'}</span>
      </Row>
      <ErrorBox message={result.error} />
      <div className="cols">
        <textarea aria-label="Input text" value={text} onChange={(e) => setText(e.target.value)} style={{ fontFamily: 'inherit' }} />
        <textarea aria-label="Output" value={result.out} readOnly style={{ fontFamily: 'inherit' }} />
      </div>
      <Row>
        <CopyButton value={result.out} />
        <button className="btn" onClick={() => setText(result.out)}>Apply to input</button>
      </Row>
    </>
  )
}
