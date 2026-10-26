import { useMemo, useState } from 'react'
import { CopyButton, Row } from '../components/ui'
import CodeEditor from '../components/CodeEditor'

const PATTERNS: Record<string, [string, RegExp]> = {
  emails: ['Email addresses', /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi],
  urls: ['Links (URLs)', /\bhttps?:\/\/[^\s<>"')\]]+/gi],
  phones: ['Phone numbers', /(?:\+\d{1,3}[\s-]?)?(?:\(?\d{2,5}\)?[\s-]?)?\d{3,5}[\s-]?\d{4,5}\b/g],
  hashtags: ['Hashtags', /#[\p{L}\p{N}_]+/gu],
  mentions: ['@mentions', /(?<![\w.])@[A-Za-z0-9_]{2,}/g],
  numbers: ['Numbers', /-?\d+(?:[.,]\d+)*/g],
}

export default function TextExtractor() {
  const [text, setText] = useState('Contact sales@example.com or support@example.org.\nCall +91 98765 43210 or visit https://example.com/pricing #deals @toolbox')
  const [kind, setKind] = useState('emails')
  const [dedupe, setDedupe] = useState(true)
  const [sort, setSort] = useState(false)

  const items = useMemo(() => {
    // very long pasted blobs (e.g. HTML with base64 images) can make the email pattern slow; scan the first 500k characters
    let found = (text.slice(0, 500_000).match(PATTERNS[kind][1]) ?? []).map((s) => s.trim().replace(/[.,;]$/, ''))
    if (dedupe) found = [...new Set(kind === 'emails' ? found.map((e) => e.toLowerCase()) : found)]
    if (sort) found = [...found].sort((a, b) => a.localeCompare(b))
    return found
  }, [text, kind, dedupe, sort])

  const out = items.join('\n')
  return (
    <>
      <CodeEditor value={text} onChange={setText} language="text" placeholder="Paste any text, HTML or document content" minHeight={200} ariaLabel="Input text" />
      <Row>{Object.entries(PATTERNS).map(([k, [label]]) => <button key={k} className={`chip ${kind === k ? 'active' : ''}`} onClick={() => setKind(k)}>{label}</button>)}</Row>
      <Row>
        <label className="check"><input type="checkbox" checked={dedupe} onChange={(e) => setDedupe(e.target.checked)} /> Remove duplicates</label>
        <label className="check"><input type="checkbox" checked={sort} onChange={(e) => setSort(e.target.checked)} /> Sort A→Z</label>
        <span className="muted">{items.length} found</span>
        <CopyButton value={out} label="Copy list" />
        <CopyButton value={items.join(', ')} label="Copy comma-separated" />
      </Row>
      <CodeEditor value={out} readOnly language="text" placeholder="Nothing found yet" minHeight={160} ariaLabel="Output" />
    </>
  )
}
