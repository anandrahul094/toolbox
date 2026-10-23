import { useState } from 'react'
import { CopyButton, Row } from '../components/ui'

const OPS: [string, (l: string[]) => string[]][] = [
  ['Sort A→Z', (l) => [...l].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))],
  ['Sort Z→A', (l) => [...l].sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))],
  ['Sort by length', (l) => [...l].sort((a, b) => a.length - b.length)],
  ['Remove duplicates', (l) => [...new Set(l)]],
  ['Remove empty lines', (l) => l.filter((x) => x.trim())],
  ['Trim whitespace', (l) => l.map((x) => x.trim())],
  ['Reverse order', (l) => [...l].reverse()],
  ['Shuffle', (l) => { const a = [...l]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] } return a }],
  ['Number lines', (l) => l.map((x, i) => `${i + 1}. ${x}`)],
]

export default function LineTools() {
  const [text, setText] = useState('banana\napple\ncherry\napple\n\n  date  \nbanana')
  const lines = text.split('\n')
  return (
    <>
      <Row>
        {OPS.map(([name, fn]) => <button key={name} className="btn" onClick={() => setText(fn(text.split('\n')).join('\n'))}>{name}</button>)}
        <CopyButton value={text} />
      </Row>
      <textarea aria-label="Input text" value={text} onChange={(e) => setText(e.target.value)} style={{ minHeight: 300 }} />
      <div className="muted">{lines.length} lines · {new Set(lines).size} unique</div>
    </>
  )
}
