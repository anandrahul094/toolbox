import { useState } from 'react'
import { CopyButton, ErrorBox, Field, NumberInput, Row } from '../components/ui'

const MAX_RANGE = 2 ** 32 // one 32-bit draw; larger ranges would make the rejection loop endless

const randInt = (min: number, max: number) => {
  const range = max - min + 1
  const buf = new Uint32Array(1)
  const limit = Math.floor(0x100000000 / range) * range
  do crypto.getRandomValues(buf); while (buf[0] >= limit)
  return min + (buf[0] % range)
}

export default function RandomPicker() {
  const [min, setMin] = useState(1)
  const [max, setMax] = useState(100)
  const [count, setCount] = useState(1)
  const [unique, setUnique] = useState(true)
  const [nums, setNums] = useState<number[]>([])
  const [list, setList] = useState('Alice\nBob\nCharlie\nDiana')
  const [picked, setPicked] = useState('')
  const [coin, setCoin] = useState('')

  const genNums = () => {
    const lo = Math.ceil(Math.min(min, max)), hi = Math.floor(Math.max(min, max))
    if (hi < lo) return setNums([])
    if (hi - lo + 1 > MAX_RANGE) return
    const n = unique ? Math.min(count, hi - lo + 1) : count
    const out = new Set<number>(), arr: number[] = []
    while ((unique ? out.size : arr.length) < n) { const v = randInt(lo, hi); unique ? out.add(v) : arr.push(v) }
    setNums(unique ? [...out] : arr)
  }
  const items = list.split('\n').map((s) => s.trim()).filter(Boolean)

  return (
    <>
      <h3 style={{ margin: 0 }}>Random numbers</h3>
      <Row>
        <Field label="Min"><NumberInput step={1} min={-1e15} max={1e15} value={min} onValue={(v) => setMin(Math.round(v))} /></Field>
        <Field label="Max"><NumberInput step={1} min={-1e15} max={1e15} value={max} onValue={(v) => setMax(Math.round(v))} /></Field>
        <Field label="How many"><NumberInput min={1} max={1000} step={1} value={count} onValue={(v) => setCount(Math.round(v))} /></Field>
        <label className="check"><input type="checkbox" checked={unique} onChange={(e) => setUnique(e.target.checked)} /> No repeats</label>
        <button className="btn primary" onClick={genNums} disabled={Math.abs(max - min) + 1 > MAX_RANGE}>Generate</button>
      </Row>
      <ErrorBox message={Math.abs(max - min) + 1 > MAX_RANGE ? 'The range is too large — keep max minus min under about 4.29 billion.' : null} />
      {nums.length > 0 && <Row><div className="output" style={{ flex: 1, fontSize: nums.length === 1 ? 36 : 15, wordBreak: 'normal' }}>{nums.join(', ')}</div><CopyButton value={nums.join(', ')} /></Row>}

      <h3 style={{ margin: 0 }}>Pick from a list</h3>
      <textarea aria-label="Input text" value={list} onChange={(e) => setList(e.target.value)} style={{ minHeight: 110, fontFamily: 'inherit' }} placeholder="One item per line" />
      <Row>
        <button className="btn primary" disabled={!items.length} onClick={() => setPicked(items[randInt(0, items.length - 1)])}>Pick a winner</button>
        <button className="btn" disabled={!items.length} onClick={() => { const a = [...items]; for (let i = a.length - 1; i > 0; i--) { const j = randInt(0, i); [a[i], a[j]] = [a[j], a[i]] } setList(a.join('\n')); setPicked('') }}>Shuffle list</button>
        {picked && <b style={{ fontSize: 22 }}>🎉 {picked}</b>}
      </Row>

      <h3 style={{ margin: 0 }}>Coin & dice</h3>
      <Row>
        <button className="btn" onClick={() => setCoin(randInt(0, 1) ? 'Heads' : 'Tails')}>Flip a coin</button>
        <button className="btn" onClick={() => setCoin('🎲 ' + randInt(1, 6))}>Roll a die</button>
        {coin && <b style={{ fontSize: 22 }}>{coin}</b>}
      </Row>
    </>
  )
}
