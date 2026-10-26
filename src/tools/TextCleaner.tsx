import { useMemo, useState } from 'react'
import { CopyButton, Row } from '../components/ui'
import CodeEditor from '../components/CodeEditor'

const OPTIONS: [string, string, (s: string) => string][] = [
  ['spaces', 'Collapse repeated spaces', (s) => s.replace(/[ \t]{2,}/g, ' ')],
  ['trim', 'Trim each line', (s) => s.split('\n').map((l) => l.trim()).join('\n')],
  ['blank', 'Remove blank lines', (s) => s.split('\n').filter((l) => l.trim()).join('\n')],
  ['extraBlank', 'Keep at most one blank line', (s) => s.replace(/\n\s*\n(\s*\n)+/g, '\n\n')],
  ['joinLines', 'Join lines into paragraphs', (s) => s.split(/\n\s*\n/).map((p) => p.replace(/\s*\n\s*/g, ' ')).join('\n\n')],
  ['html', 'Strip HTML tags', (s) => s.replace(/<[^>]*>/g, '')],
  ['quotes', 'Straighten smart quotes', (s) => s.replace(/[‘’]/g, "'").replace(/[“”]/g, '"')],
  ['dashes', 'Replace long dashes with hyphens', (s) => s.replace(/[–—]/g, '-')],
  ['nonAscii', 'Remove non-ASCII characters', (s) => s.replace(/[^\x00-\x7F]/g, '')],
  ['tabs', 'Convert tabs to spaces', (s) => s.replace(/\t/g, '  ')],
]

export default function TextCleaner() {
  const [text, setText] = useState('  Hello    world!  \n\n\n\n<b>“Smart quotes”</b> — and   extra   spaces.  ')
  const [on, setOn] = useState<Record<string, boolean>>({ spaces: true, trim: true, extraBlank: true, quotes: true })
  const out = useMemo(() => OPTIONS.reduce((s, [k, , fn]) => (on[k] ? fn(s) : s), text).trim(), [text, on])

  return (
    <>
      <Row>
        {OPTIONS.map(([k, label]) => (
          <label key={k} className="check"><input type="checkbox" checked={!!on[k]} onChange={(e) => setOn({ ...on, [k]: e.target.checked })} /> {label}</label>
        ))}
      </Row>
      <div className="cols">
        <CodeEditor value={text} onChange={setText} language="text" placeholder="Paste messy text" minHeight={240} ariaLabel="Input text" />
        <CodeEditor value={out} readOnly language="text" minHeight={240} ariaLabel="Output" />
      </div>
      <Row>
        <CopyButton value={out} />
        <button className="btn" onClick={() => setText(out)}>Use result as input</button>
        <span className="muted">{text.length.toLocaleString()} → {out.length.toLocaleString()} characters</span>
      </Row>
    </>
  )
}
