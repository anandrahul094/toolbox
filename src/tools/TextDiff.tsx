import { useMemo, useState } from 'react'
import { Row } from '../components/ui'
import CodeEditor from '../components/CodeEditor'

type Op = { type: 'same' | 'add' | 'del'; text: string }

function diffLines(a: string[], b: string[]): Op[] {
  const n = a.length, m = b.length
  const dp = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1))
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
  const ops: Op[] = []
  let i = 0, j = 0
  while (i < n && j < m) {
    if (a[i] === b[j]) { ops.push({ type: 'same', text: a[i] }); i++; j++ }
    else if (dp[i + 1][j] >= dp[i][j + 1]) ops.push({ type: 'del', text: a[i++] })
    else ops.push({ type: 'add', text: b[j++] })
  }
  while (i < n) ops.push({ type: 'del', text: a[i++] })
  while (j < m) ops.push({ type: 'add', text: b[j++] })
  return ops
}

export default function TextDiff() {
  const [left, setLeft] = useState('apple\nbanana\ncherry\ndate')
  const [right, setRight] = useState('apple\nblueberry\ncherry\ndate\nelderberry')
  const [ignoreCase, setIgnoreCase] = useState(false)
  const [trim, setTrim] = useState(false)

  const ops = useMemo(() => {
    const norm = (s: string) => {
      let x = trim ? s.trim() : s
      if (ignoreCase) x = x.toLowerCase()
      return x
    }
    const a = left.split(/\r?\n/), b = right.split(/\r?\n/)
    if (a.length * b.length > 25_000_000) return null
    const raw = diffLines(a.map(norm), b.map(norm))
    // map normalized text back to originals for display
    let ai = 0, bi = 0
    return raw.map((op) => {
      if (op.type === 'same') { bi++; return { ...op, text: a[ai++] } }
      if (op.type === 'del') return { ...op, text: a[ai++] }
      return { ...op, text: b[bi++] }
    })
  }, [left, right, ignoreCase, trim])

  const added = ops?.filter((o) => o.type === 'add').length ?? 0
  const removed = ops?.filter((o) => o.type === 'del').length ?? 0

  return (
    <>
      <div className="cols">
        <CodeEditor value={left} onChange={setLeft} placeholder="Original" minHeight={220} ariaLabel="Original text" />
        <CodeEditor value={right} onChange={setRight} placeholder="Changed" minHeight={220} ariaLabel="Changed text" />
      </div>
      <Row>
        <label className="check"><input type="checkbox" checked={ignoreCase} onChange={(e) => setIgnoreCase(e.target.checked)} /> Ignore case</label>
        <label className="check"><input type="checkbox" checked={trim} onChange={(e) => setTrim(e.target.checked)} /> Ignore leading/trailing whitespace</label>
        <span className="muted">+{added} added · −{removed} removed</span>
      </Row>
      {ops ? (
        <div className="output" style={{ padding: 0, overflow: 'auto' }}>
          {ops.map((o, i) => (
            <div key={i} className={o.type === 'add' ? 'diff-add' : o.type === 'del' ? 'diff-del' : ''} style={{ padding: '1px 12px', whiteSpace: 'pre-wrap' }}>
              {o.type === 'add' ? '+ ' : o.type === 'del' ? '− ' : '  '}{o.text || ' '}
            </div>
          ))}
        </div>
      ) : <div className="error">Inputs are too large to diff in the browser.</div>}
    </>
  )
}
