import { useMemo, useState } from 'react'
import { Stat } from '../components/ui'

const hex = (n: number, pad = 4) => n.toString(16).toUpperCase().padStart(pad, '0')
const INVISIBLE_ALL = new RegExp('^[\\u0000-\\u0008\\u000b-\\u001f\\u007f-\\u009f\\u00ad\\u200b-\\u200f\\u2028-\\u202e\\u2060-\\u2064\\ufeff\\ufe00-\\ufe0f]+$')
// a character is hidden only if nothing in it is visible (emoji sequences contain joiners)
const isHidden = (g: string) => INVISIBLE_ALL.test(g)

export default function UnicodeInspector() {
  const [text, setText] = useState('Café ☕ 👋🏽\u200b!')
  const chars = useMemo(() => {
    const seg = new Intl.Segmenter(undefined, { granularity: 'grapheme' })
    return [...seg.segment(text)].map((s) => s.segment).slice(0, 500)
  }, [text])
  const bytes = new TextEncoder().encode(text).length
  const hidden = chars.filter(isHidden).length

  return (
    <>
      <textarea aria-label="Input text" value={text} onChange={(e) => setText(e.target.value)} style={{ minHeight: 90, fontFamily: 'inherit', fontSize: 16 }} />
      <div className="stats">
        <Stat label="Visible characters" value={chars.length} />
        <Stat label="Code points" value={[...text].length} />
        <Stat label="UTF-16 units (JS length)" value={text.length} />
        <Stat label="UTF-8 bytes" value={bytes} />
        <Stat label="Invisible / control" value={<span style={{ color: hidden ? 'var(--danger)' : undefined }}>{hidden}</span>} />
      </div>
      <table>
        <thead><tr><th>Char</th><th>Code points</th><th>UTF-8 bytes</th><th>HTML</th></tr></thead>
        <tbody>
          {chars.map((g, i) => {
            const cps = [...g].map((c) => c.codePointAt(0)!)
            const invisible = isHidden(g)
            return (
              <tr key={i} style={invisible ? { background: 'var(--danger-soft)' } : undefined}>
                <td style={{ fontSize: 20, width: 60 }}>{invisible || g === ' ' ? <span className="muted" style={{ fontSize: 12 }}>{g === ' ' ? 'space' : 'hidden'}</span> : g}</td>
                <td className="mono">{cps.map((c) => `U+${hex(c)}`).join(' ')}</td>
                <td className="mono">{[...new TextEncoder().encode(g)].map((b) => hex(b, 2)).join(' ')}</td>
                <td className="mono">{cps.map((c) => `&#x${hex(c, 1)};`).join('')}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </>
  )
}
