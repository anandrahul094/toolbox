import { useMemo, useState } from 'react'
import { Stat } from '../components/ui'

export default function WordCounter() {
  const [text, setText] = useState('')
  const s = useMemo(() => {
    const words = text.match(/[\p{L}\p{N}'’-]+/gu) ?? []
    const freq = new Map<string, number>()
    words.forEach((w) => { const k = w.toLowerCase(); if (k.length > 3) freq.set(k, (freq.get(k) ?? 0) + 1) })
    return {
      words: words.length,
      chars: [...text].length,
      noSpaces: [...text.replace(/\s/g, '')].length,
      sentences: (text.match(/[^.!?]+[.!?]+(\s|$)/g) ?? []).length + (/[^.!?\s]\s*$/.test(text) ? 1 : 0),
      paragraphs: text.split(/\n\s*\n/).filter((p) => p.trim()).length,
      lines: text ? text.split('\n').length : 0,
      reading: Math.ceil(words.length / 230),
      speaking: Math.ceil(words.length / 140),
      top: [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8),
    }
  }, [text])

  return (
    <>
      <textarea aria-label="Input text" value={text} onChange={(e) => setText(e.target.value)} placeholder="Start typing or paste your text…" style={{ minHeight: 240, fontFamily: 'inherit', fontSize: 15 }} />
      <div className="stats">
        <Stat label="Words" value={s.words.toLocaleString()} />
        <Stat label="Characters" value={s.chars.toLocaleString()} />
        <Stat label="Without spaces" value={s.noSpaces.toLocaleString()} />
        <Stat label="Sentences" value={s.sentences} />
        <Stat label="Paragraphs" value={s.paragraphs} />
        <Stat label="Lines" value={s.lines} />
        <Stat label="Reading time" value={`${s.reading} min`} />
        <Stat label="Speaking time" value={`${s.speaking} min`} />
      </div>
      {s.top.length > 0 && <div className="muted">Top words: {s.top.map(([w, c]) => `${w} (${c})`).join(', ')}</div>}
    </>
  )
}
