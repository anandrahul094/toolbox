import { useMemo, useState } from 'react'
import { CopyButton, Field, Row, NumberInput } from '../components/ui'

const WORDS = 'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua enim ad minim veniam quis nostrud exercitation ullamco laboris nisi aliquip ex ea commodo consequat duis aute irure in reprehenderit voluptate velit esse cillum fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt culpa qui officia deserunt mollit anim id est laborum'.split(' ')

const rand = (n: number) => Math.floor(Math.random() * n)
const word = () => WORDS[rand(WORDS.length)]
const sentence = () => {
  const s = Array.from({ length: 8 + rand(10) }, word).join(' ')
  return s.charAt(0).toUpperCase() + s.slice(1) + '.'
}
const paragraph = () => Array.from({ length: 4 + rand(4) }, sentence).join(' ')

export default function LoremIpsum() {
  const [count, setCount] = useState(3)
  const [unit, setUnit] = useState<'paragraphs' | 'sentences' | 'words'>('paragraphs')
  const [classic, setClassic] = useState(true)
  const [seed, setSeed] = useState(0)

  const text = useMemo(() => {
    let out =
      unit === 'paragraphs' ? Array.from({ length: count }, paragraph).join('\n\n')
      : unit === 'sentences' ? Array.from({ length: count }, sentence).join(' ')
      : Array.from({ length: count }, word).join(' ')
    if (classic) out = 'Lorem ipsum dolor sit amet, ' + out.charAt(0).toLowerCase() + out.slice(1)
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, unit, classic, seed])

  return (
    <>
      <Row>
        <Field label="Amount"><NumberInput min={1} max={500} step={1} value={count} onValue={(v) => setCount(Math.round(v))} style={{ width: 100 }} /></Field>
        <Field label="Unit">
          <select value={unit} onChange={(e) => setUnit(e.target.value as typeof unit)} style={{ width: 160 }}>
            <option value="paragraphs">Paragraphs</option><option value="sentences">Sentences</option><option value="words">Words</option>
          </select>
        </Field>
        <label className="check"><input type="checkbox" checked={classic} onChange={(e) => setClassic(e.target.checked)} /> Start with “Lorem ipsum…”</label>
        <button className="btn primary" onClick={() => setSeed(seed + 1)}>Regenerate</button>
        <CopyButton value={text} />
      </Row>
      <div className="output" style={{ fontFamily: 'inherit', fontSize: 15, wordBreak: 'normal' }}>{text}</div>
    </>
  )
}
