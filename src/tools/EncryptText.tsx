import { useState } from 'react'
import { Eye, EyeOff, Lock, LockOpen } from 'lucide-react'
import { CopyButton, downloadBlob, ErrorBox, Field, FileDrop, fmtBytes, Row } from '../components/ui'
import BatchRunner, { BulkToggle, type BatchProcess } from '../components/Batch'
import { dec, decryptWithPassword, enc, encryptWithPassword, fromBase64, toBase64 } from '../lib/codec'

function BulkEncrypt({ onSingle }: { onSingle: () => void }) {
  const [mode, setMode] = useState<'encrypt' | 'decrypt'>('encrypt')
  const [pw, setPw] = useState('')
  const [show, setShow] = useState(false)

  const process: BatchProcess = async (file) => {
    const bytes = new Uint8Array(await file.arrayBuffer())
    if (mode === 'encrypt') return { name: `${file.name}.enc`, blob: new Blob([await encryptWithPassword(bytes, pw) as BlobPart]) }
    return { name: file.name.replace(/\.enc$/i, '') || 'decrypted', blob: new Blob([await decryptWithPassword(bytes, pw) as BlobPart]) }
  }

  return (
    <>
      <BulkToggle bulk onChange={(b) => { if (!b) onSingle() }} />
      <div className="seg" role="group" aria-label="Mode" style={{ alignSelf: 'flex-start' }}>
        <button aria-pressed={mode === 'encrypt'} onClick={() => setMode('encrypt')}><Lock size={14} aria-hidden="true" /> Encrypt</button>
        <button aria-pressed={mode === 'decrypt'} onClick={() => setMode('decrypt')}><LockOpen size={14} aria-hidden="true" /> Decrypt</button>
      </div>
      <Row>
        <Field label="Password (same for every file)"><input type={show ? 'text' : 'password'} value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="off" /></Field>
        <button className="btn" style={{ alignSelf: 'flex-end' }} onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'}>{show ? <EyeOff size={16} /> : <Eye size={16} />}</button>
      </Row>
      <BatchRunner compare={false} process={process} settingsKey={`${mode}|${pw}`} runLabel={mode === 'encrypt' ? 'Encrypt all' : 'Decrypt all'} zipName={mode === 'encrypt' ? 'encrypted' : 'decrypted'}
        blocked={pw.length < 4 ? 'Enter a password of at least 4 characters.' : null}
        hint={mode === 'encrypt' ? 'Each file becomes <name>.enc — encrypted on your device, never uploaded.' : 'Drop .enc files made with this tool — decrypted on your device.'} />
      <p className="muted" style={{ margin: 0, fontSize: 13 }}>Same AES-256-GCM encryption as single files: every file gets its own random salt. If you forget the password, the files can’t be recovered.</p>
    </>
  )
}

export default function EncryptText() {
  const [mode, setMode] = useState<'encrypt' | 'decrypt'>('encrypt')
  const [text, setText] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [pw, setPw] = useState('')
  const [show, setShow] = useState(false)
  const [out, setOut] = useState('')
  const [outFile, setOutFile] = useState<{ name: string; blob: Blob } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [bulk, setBulk] = useState(false)

  const run = async () => {
    setError(null); setOut(''); setOutFile(null)
    if (pw.length < 4) { setError('Use a password of at least 4 characters (longer is much safer).'); return }
    setBusy(true)
    try {
      if (file) {
        const bytes = new Uint8Array(await file.arrayBuffer())
        if (mode === 'encrypt') setOutFile({ name: `${file.name}.enc`, blob: new Blob([await encryptWithPassword(bytes, pw) as BlobPart]) })
        else setOutFile({ name: file.name.replace(/\.enc$/i, '') || 'decrypted', blob: new Blob([await decryptWithPassword(bytes, pw) as BlobPart]) })
      } else if (mode === 'encrypt') setOut(toBase64(await encryptWithPassword(enc(text), pw)))
      else {
        let bytes: Uint8Array
        try { bytes = fromBase64(text.trim()) } catch { throw new Error('Paste the encrypted text exactly as it was given (it’s Base64).') }
        setOut(dec(await decryptWithPassword(bytes, pw)))
      }
    } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }

  if (bulk) return <BulkEncrypt onSingle={() => setBulk(false)} />
  return (
    <>
      <BulkToggle bulk={false} onChange={setBulk} single="Text or one file" />
      <div className="seg" role="group" aria-label="Mode" style={{ alignSelf: 'flex-start' }}>
        <button aria-pressed={mode === 'encrypt'} onClick={() => { setMode('encrypt'); setOut(''); setError(null) }}><Lock size={14} aria-hidden="true" /> Encrypt</button>
        <button aria-pressed={mode === 'decrypt'} onClick={() => { setMode('decrypt'); setOut(''); setError(null) }}><LockOpen size={14} aria-hidden="true" /> Decrypt</button>
      </div>
      {file
        ? <div className="output" style={{ display: 'flex', gap: 8, alignItems: 'center' }}><span style={{ flex: 1 }}>📄 {file.name} · {fmtBytes(file.size)}</span><button className="btn" onClick={() => setFile(null)}>Use text instead</button></div>
        : <Field label={mode === 'encrypt' ? 'Text to encrypt' : 'Encrypted text'}><textarea value={text} onChange={(e) => setText(e.target.value)} style={{ minHeight: 120, fontFamily: mode === 'decrypt' ? undefined : 'inherit' }} className={mode === 'decrypt' ? 'mono' : undefined} placeholder={mode === 'encrypt' ? 'A note, a password list, an address…' : 'Paste the encrypted text here'} /></Field>}
      {!file && <FileDrop onFiles={(f) => setFile(f[0])} label={mode === 'encrypt' ? '…or drop a file to encrypt' : '…or drop an .enc file to decrypt'} hint="Encrypted on your device — never uploaded." />}
      <Row>
        <Field label="Password"><input type={show ? 'text' : 'password'} value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="off" onKeyDown={(e) => { if (e.key === 'Enter') run() }} /></Field>
        <button className="btn" style={{ alignSelf: 'flex-end' }} onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'}>{show ? <EyeOff size={16} /> : <Eye size={16} />}</button>
      </Row>
      <div><button className="btn primary" disabled={busy || (!file && !text.trim()) || !pw} onClick={run}>{busy ? 'Working…' : mode === 'encrypt' ? 'Encrypt' : 'Decrypt'}</button></div>
      <ErrorBox message={error} />
      {out && (
        <>
          <Field label={mode === 'encrypt' ? 'Encrypted (safe to send)' : 'Decrypted text'}><textarea readOnly value={out} className={mode === 'encrypt' ? 'mono' : undefined} style={{ minHeight: 120 }} /></Field>
          <Row><CopyButton value={out} /></Row>
        </>
      )}
      {outFile && <Row><button className="btn primary" onClick={() => downloadBlob(outFile.name, outFile.blob)}>Download {outFile.name} ({fmtBytes(outFile.blob.size)})</button></Row>}
      <p className="muted" style={{ margin: 0, fontSize: 13 }}>
        Uses AES-256-GCM with a key made from your password (PBKDF2-SHA-256, 250,000 rounds) and a random salt, so the same text gives different output each time. Share the password separately — anyone with it can decrypt, and without it nobody can, including us. Also works in the Data Transformer (“Decrypt with password”).
      </p>
    </>
  )
}
