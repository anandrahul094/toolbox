import { useEffect, useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { CopyButton, Field, FileDrop, fmtBytes, Row } from '../components/ui'
import { enc, fromBase64, fromHex, hash, HASHES, hmac, HMAC_HASHES, toBase64, toHex, type HashName } from '../lib/codec'

const COMMON: HashName[] = ['MD5', 'SHA-1', 'SHA-256', 'SHA-512']

export default function HashGenerator() {
  const [input, setInput] = useState('hello world')
  const [file, setFile] = useState<File | null>(null)
  const [mode, setMode] = useState<'hash' | 'hmac'>('hash')
  const [key, setKey] = useState('secret')
  const [keyFmt, setKeyFmt] = useState<'UTF-8' | 'Hex' | 'Base64'>('UTF-8')
  const [all, setAll] = useState(false)
  const [fmt, setFmt] = useState<'hex' | 'HEX' | 'base64'>('hex')
  const [expected, setExpected] = useState('')
  const [hashes, setHashes] = useState<Record<string, Uint8Array>>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const names: string[] = mode === 'hmac' ? [...HMAC_HASHES] : all ? [...HASHES] : COMMON

  useEffect(() => {
    let cancelled = false
    setBusy(true)
    const t = setTimeout(async () => {
      try {
        const data = file ? new Uint8Array(await file.arrayBuffer()) : enc(input)
        const k = keyFmt === 'Hex' ? fromHex(key) : keyFmt === 'Base64' ? fromBase64(key) : enc(key)
        const entries = await Promise.all(names.map(async (n) => [n, mode === 'hmac' ? await hmac(n as 'SHA-256', k, data) : await hash(n as HashName, data)] as const))
        if (!cancelled) { setHashes(Object.fromEntries(entries)); setError(null) }
      } catch (e) { if (!cancelled) setError((e as Error).message) } finally { if (!cancelled) setBusy(false) }
    }, 150)
    return () => { cancelled = true; clearTimeout(t) }
  }, [input, file, mode, key, keyFmt, all]) // eslint-disable-line react-hooks/exhaustive-deps

  const show = (b?: Uint8Array) => (!b ? '' : fmt === 'base64' ? toBase64(b) : fmt === 'HEX' ? toHex(b).toUpperCase() : toHex(b))
  const want = expected.trim().toLowerCase().replace(/\s/g, '')
  const matchName = want ? names.find((n) => { const b = hashes[n]; return b && (toHex(b) === want || toBase64(b).toLowerCase() === want) }) : undefined

  return (
    <>
      <div className="seg" role="group" aria-label="Mode" style={{ alignSelf: 'flex-start' }}>
        <button aria-pressed={mode === 'hash'} onClick={() => setMode('hash')}>Hash</button>
        <button aria-pressed={mode === 'hmac'} onClick={() => setMode('hmac')}>HMAC (with key)</button>
      </div>
      {file
        ? <div className="output" style={{ display: 'flex', gap: 8, alignItems: 'center' }}><span style={{ flex: 1 }}>📄 {file.name} · {fmtBytes(file.size)}</span><button className="btn" onClick={() => setFile(null)}>Hash text instead</button></div>
        : <Field label="Text"><textarea aria-label="Input text" value={input} onChange={(e) => setInput(e.target.value)} style={{ minHeight: 100 }} /></Field>}
      {!file && <FileDrop onFiles={(f) => setFile(f[0])} label="…or drop a file to get its checksum" hint="Hashed on your device — handy to verify downloads." />}
      {mode === 'hmac' && (
        <Row>
          <Field label="Secret key"><input className="mono" value={key} onChange={(e) => setKey(e.target.value)} spellCheck={false} autoComplete="off" /></Field>
          <Field label="Key format"><select value={keyFmt} onChange={(e) => setKeyFmt(e.target.value as typeof keyFmt)}><option>UTF-8</option><option>Hex</option><option>Base64</option></select></Field>
        </Row>
      )}
      <Row>
        <div className="seg" role="group" aria-label="Output format">
          {(['hex', 'HEX', 'base64'] as const).map((f) => <button key={f} aria-pressed={fmt === f} onClick={() => setFmt(f)}>{f === 'hex' ? 'hex' : f === 'HEX' ? 'HEX' : 'Base64'}</button>)}
        </div>
        {mode === 'hash' && <label className="check"><input type="checkbox" checked={all} onChange={(e) => setAll(e.target.checked)} /> Show all {HASHES.length} algorithms (SHA-3, BLAKE, RIPEMD, CRC32…)</label>}
        {busy && <span className="muted">Hashing…</span>}
      </Row>
      {error && <div className="error">{error}</div>}
      <table style={{ width: '100%' }}>
        <tbody>
          {names.map((a) => (
            <tr key={a} style={matchName === a ? { background: 'var(--accent-soft, #dcfce7)' } : undefined}>
              <th style={{ width: 110, textAlign: 'left', whiteSpace: 'nowrap' }}>{mode === 'hmac' ? `HMAC-${a}` : a}</th>
              <td className="mono" style={{ wordBreak: 'break-all', fontSize: 13 }}>{show(hashes[a])}</td>
              <td style={{ width: 80 }}><CopyButton value={show(hashes[a])} /></td>
            </tr>
          ))}
        </tbody>
      </table>
      <Field label="Compare with an expected hash" hint="Paste the checksum from the download page to check the file isn’t corrupted or tampered with.">
        <input className="mono" value={expected} onChange={(e) => setExpected(e.target.value)} spellCheck={false} placeholder="e.g. 5eb63bbbe01eeed093cb22bb8f5acdc3" />
      </Field>
      {want && (matchName
        ? <div className="badge"><CheckCircle2 size={14} aria-hidden="true" />Matches {mode === 'hmac' ? `HMAC-${matchName}` : matchName}</div>
        : <div className="error">No match with {all || mode === 'hmac' ? 'any algorithm shown' : 'MD5, SHA-1, SHA-256 or SHA-512 — try “Show all”'}.</div>)}
      <p className="muted" style={{ margin: 0, fontSize: 13 }}>MD5 and SHA-1 are fine for checksums but broken for security. For passwords use the bcrypt tool, not a plain hash.</p>
    </>
  )
}
