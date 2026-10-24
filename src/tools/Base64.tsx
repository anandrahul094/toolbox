import { useMemo, useState } from 'react'
import { CopyButton, downloadBlob, ErrorBox, FileDrop, fmtBytes, Row } from '../components/ui'
import * as C from '../lib/codec'

/** UTF-8 text → Base64 (kept for other tools). */
export const toBase64 = (s: string, urlSafe = false) => C.toBase64(C.enc(s), urlSafe)
/** Base64 → UTF-8 text; throws if it isn't valid Base64 or valid UTF-8. */
export const fromBase64 = (s: string) => { const t = C.decStrict(C.fromBase64(s)); if (t === null) throw new Error('not text'); return t }

type Scheme = 'base64' | 'base64url' | 'base32' | 'base58' | 'base85' | 'hex'
const SCHEMES: [Scheme, string][] = [['base64', 'Base64'], ['base64url', 'Base64 URL-safe'], ['base32', 'Base32'], ['base58', 'Base58'], ['base85', 'Base85'], ['hex', 'Hex']]
const encodeWith = (s: Scheme, b: Uint8Array) => ({ base64: () => C.toBase64(b), base64url: () => C.toBase64(b, true), base32: () => C.toBase32(b), base58: () => C.toBase58(b), base85: () => C.toBase85(b), hex: () => C.toHex(b) })[s]()
const decodeWith = (s: Scheme, t: string) => ({ base64: () => C.fromBase64(t), base64url: () => C.fromBase64(t), base32: () => C.fromBase32(t), base58: () => C.fromBase58(t), base85: () => C.fromBase85(t), hex: () => C.fromHex(t) })[s]()

// guess the type of a decoded file so the download gets a useful extension
function sniff(b: Uint8Array): [string, string] {
  const h = C.toHex(b.subarray(0, 12))
  if (h.startsWith('89504e47')) return ['png', 'image/png']
  if (h.startsWith('ffd8ff')) return ['jpg', 'image/jpeg']
  if (h.startsWith('47494638')) return ['gif', 'image/gif']
  if (h.startsWith('52494646') && h.slice(16, 24) === '57454250') return ['webp', 'image/webp']
  if (h.startsWith('25504446')) return ['pdf', 'application/pdf']
  if (h.startsWith('504b0304')) return ['zip', 'application/zip']
  if (h.startsWith('1f8b')) return ['gz', 'application/gzip']
  if (C.decStrict(b.subarray(0, 512))?.trimStart().startsWith('<svg')) return ['svg', 'image/svg+xml']
  return ['bin', 'application/octet-stream']
}

export default function Base64() {
  const [input, setInput] = useState('Hello, Toolbox! 👋')
  const [mode, setMode] = useState<'encode' | 'decode'>('encode')
  const [scheme, setScheme] = useState<Scheme>('base64')
  const [file, setFile] = useState<{ name: string; type: string; bytes: Uint8Array } | null>(null)
  const [dataUri, setDataUri] = useState(false)

  const res = useMemo(() => {
    try {
      if (mode === 'encode') {
        const bytes = file?.bytes ?? C.enc(input)
        let out = encodeWith(scheme, bytes)
        if (file && dataUri && scheme === 'base64') out = `data:${file.type || 'application/octet-stream'};base64,${out}`
        return { out }
      }
      const bytes = decodeWith(scheme, input.trim())
      const text = C.decStrict(bytes)
      return text !== null && !/[\u0000-\u0008\u000e-\u001f]/.test(text) ? { out: text, bytes } : { out: '', bytes, binary: true }
    } catch (e) {
      return { out: '', error: `That isn’t valid ${SCHEMES.find(([s]) => s === scheme)![1]}: ${(e as Error).message}` }
    }
  }, [input, mode, scheme, file, dataUri])

  // pasting a data: URI or obvious Base64 into Encode mode switches to Decode automatically
  const onInput = (v: string) => {
    setInput(v)
    if (mode === 'encode' && !file && /^data:[\w/+.-]+;base64,/.test(v.trim())) { setMode('decode'); setScheme('base64') }
  }

  return (
    <>
      <Row>
        <div className="seg" role="group" aria-label="Direction">
          <button aria-pressed={mode === 'encode'} onClick={() => setMode('encode')}>Encode</button>
          <button aria-pressed={mode === 'decode'} onClick={() => { setMode('decode'); setFile(null) }}>Decode</button>
        </div>
        <select value={scheme} onChange={(e) => setScheme(e.target.value as Scheme)} aria-label="Encoding">{SCHEMES.map(([s, l]) => <option key={s} value={s}>{l}</option>)}</select>
        <button className="btn" onClick={() => { if (!res.out) return; setInput(res.out); setFile(null); setMode(mode === 'encode' ? 'decode' : 'encode') }} disabled={!res.out}>⇄ Swap</button>
        <CopyButton value={res.out} />
      </Row>
      {mode === 'encode' && (file
        ? <div className="output" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ flex: 1 }}>📄 {file.name} · {fmtBytes(file.bytes.length)}</span>
            {scheme === 'base64' && <label className="check"><input type="checkbox" checked={dataUri} onChange={(e) => setDataUri(e.target.checked)} /> As data URI</label>}
            <button className="btn" onClick={() => setFile(null)}>Encode text instead</button>
          </div>
        : <FileDrop onFiles={async (f) => setFile({ name: f[0].name, type: f[0].type, bytes: new Uint8Array(await f[0].arrayBuffer()) })} label="Encode a file (image, PDF, anything)" hint="Converted on your device." />)}
      <div className="cols">
        {!(mode === 'encode' && file) && <textarea aria-label="Input text" value={input} onChange={(e) => onInput(e.target.value)} spellCheck={false} placeholder={mode === 'decode' ? 'Paste encoded text or a data: URI' : 'Type text to encode'} />}
        <textarea aria-label="Output" value={res.binary ? `(binary data, ${fmtBytes(res.bytes!.length)} — download it below)` : res.out} readOnly className="mono" />
      </div>
      <ErrorBox message={res.error} />
      {mode === 'decode' && res.bytes && res.bytes.length > 0 && (
        <Row>
          <button className="btn" onClick={() => { const [ext, type] = sniff(res.bytes!); downloadBlob(`decoded.${ext}`, new Blob([res.bytes as BlobPart], { type })) }}>Download as file</button>
          {res.binary && sniff(res.bytes)[1].startsWith('image/') && <img alt="Decoded" src={`data:${sniff(res.bytes)[1]};base64,${C.toBase64(res.bytes)}`} style={{ maxHeight: 120, border: '1px solid var(--border)', borderRadius: 4 }} />}
        </Row>
      )}
      {mode === 'encode' && <div className="muted" style={{ fontSize: 13 }}>{fmtBytes((file?.bytes ?? C.enc(input)).length)} → {fmtBytes(res.out.length)}</div>}
    </>
  )
}
