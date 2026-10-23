import { useMemo, useState } from 'react'
import { CopyButton, ErrorBox, Row } from '../components/ui'

export const toBase64 = (s: string, urlSafe = false) => {
  const bytes = new TextEncoder().encode(s)
  let bin = ''
  bytes.forEach((b) => (bin += String.fromCharCode(b)))
  const out = btoa(bin)
  return urlSafe ? out.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') : out
}

export const fromBase64 = (s: string) => {
  let norm = s.trim().replace(/-/g, '+').replace(/_/g, '/').replace(/\s/g, '')
  while (norm.length % 4) norm += '='
  const bin = atob(norm)
  return new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)))
}

export default function Base64() {
  const [input, setInput] = useState('Hello, Toolbox! 👋')
  const [mode, setMode] = useState<'encode' | 'decode'>('encode')
  const [urlSafe, setUrlSafe] = useState(false)

  const { output, error } = useMemo(() => {
    try {
      return { output: mode === 'encode' ? toBase64(input, urlSafe) : fromBase64(input), error: null }
    } catch {
      return { output: '', error: 'Input is not valid Base64.' }
    }
  }, [input, mode, urlSafe])

  return (
    <>
      <Row>
        <button className={`btn ${mode === 'encode' ? 'primary' : ''}`} onClick={() => setMode('encode')}>Encode</button>
        <button className={`btn ${mode === 'decode' ? 'primary' : ''}`} onClick={() => setMode('decode')}>Decode</button>
        {mode === 'encode' && <label className="check"><input type="checkbox" checked={urlSafe} onChange={(e) => setUrlSafe(e.target.checked)} /> URL-safe</label>}
        <button className="btn" onClick={() => { setInput(output); setMode(mode === 'encode' ? 'decode' : 'encode') }} disabled={!output}>⇄ Swap</button>
        <CopyButton value={output} />
      </Row>
      <div className="cols">
        <textarea aria-label="Input text" value={input} onChange={(e) => setInput(e.target.value)} spellCheck={false} />
        <textarea aria-label="Output" value={output} readOnly />
      </div>
      <ErrorBox message={error} />
    </>
  )
}
