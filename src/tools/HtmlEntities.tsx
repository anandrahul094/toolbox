import { useMemo, useState } from 'react'
import { CopyButton, Row } from '../components/ui'

// the u flag keeps emoji as one code point instead of two broken surrogate halves
const encode = (s: string, all: boolean) =>
  s.replace(all ? /[^\x20-\x7e\n\t]|[&<>"']/gu : /[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? `&#${c.codePointAt(0)};`)

const decode = (s: string) => {
  const ta = document.createElement('textarea')
  ta.innerHTML = s
  return ta.value
}

export default function HtmlEntities() {
  const [input, setInput] = useState('<p class="note">Tom & Jerry — “café” ©</p>')
  const [mode, setMode] = useState<'encode' | 'decode'>('encode')
  const [all, setAll] = useState(false)
  const output = useMemo(() => (mode === 'encode' ? encode(input, all) : decode(input)), [input, mode, all])

  return (
    <>
      <Row>
        <button className={`btn ${mode === 'encode' ? 'primary' : ''}`} onClick={() => setMode('encode')}>Encode</button>
        <button className={`btn ${mode === 'decode' ? 'primary' : ''}`} onClick={() => setMode('decode')}>Decode</button>
        {mode === 'encode' && <label className="check"><input type="checkbox" checked={all} onChange={(e) => setAll(e.target.checked)} /> Also encode non-ASCII characters</label>}
        <CopyButton value={output} />
      </Row>
      <div className="cols">
        <textarea aria-label="Input text" value={input} onChange={(e) => setInput(e.target.value)} spellCheck={false} />
        <textarea aria-label="Output" value={output} readOnly />
      </div>
    </>
  )
}
