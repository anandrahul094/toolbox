import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { baseName, downloadBlob, ErrorBox, Field, FileDrop, fmtBytes, Row } from '../components/ui'
import { pdfBlob } from '../lib/pdf'
import { isWrongPassword, runQpdf } from '../lib/qpdf'

const randomOwner = () => Array.from(crypto.getRandomValues(new Uint8Array(18)), (b) => b.toString(36).padStart(2, '0')).join('')

export default function PdfProtect() {
  const [file, setFile] = useState<File | null>(null)
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [show, setShow] = useState(false)
  const [print, setPrint] = useState(true)
  const [copy, setCopy] = useState(true)
  const [edit, setEdit] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)

  const mismatch = pw2.length > 0 && pw !== pw2
  const run = async () => {
    if (!file) return
    if (pw.length < 4) { setError('Use a password of at least 4 characters.'); return }
    if (pw !== pw2) { setError('The passwords don’t match.'); return }
    setBusy(true); setError(null); setDone(null)
    try {
      // AES-256. The owner password (for changing permissions) is random, so only the restrictions you chose apply.
      const out = await runQpdf(new Uint8Array(await file.arrayBuffer()), [
        '--encrypt', pw, randomOwner(), '256',
        `--print=${print ? 'full' : 'none'}`, `--extract=${copy ? 'y' : 'n'}`, `--modify=${edit ? 'all' : 'none'}`, `--annotate=${edit ? 'y' : 'n'}`, '--',
      ])
      downloadBlob(`${baseName(file.name)}-protected.pdf`, pdfBlob(out))
      setDone(`Protected — ${fmtBytes(out.length)}. Keep the password safe: it can’t be recovered.`)
    } catch (e) {
      setError(isWrongPassword(e) ? 'This PDF already has a password. Unlock it first with the Unlock PDF tool.' : 'This file could not be protected. Make sure it is a valid PDF.')
    } finally { setBusy(false) }
  }

  return (
    <>
      <FileDrop accept="application/pdf,.pdf" disabled={busy} onFiles={(f) => { setFile(f[0]); setError(null); setDone(null) }} label={file ? `📄 ${file.name} (click to change)` : 'Drop a PDF here, or click to choose'} hint="Encrypted on your device — the file and password never leave it." />
      <Row>
        <Field label="Password"><input type={show ? 'text' : 'password'} value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" /></Field>
        <Field label="Repeat password"><input type={show ? 'text' : 'password'} value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" aria-invalid={mismatch} /></Field>
        <button className="btn" style={{ alignSelf: 'flex-end' }} onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'}>{show ? <EyeOff size={16} /> : <Eye size={16} />}</button>
      </Row>
      {mismatch && <div className="muted" style={{ fontSize: 13, color: 'var(--danger)' }}>The passwords don’t match.</div>}
      <fieldset style={{ border: 0, padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <legend className="field-label" style={{ marginBottom: 6 }}>After opening, people can:</legend>
        <label className="check"><input type="checkbox" checked={print} onChange={(e) => setPrint(e.target.checked)} /> Print</label>
        <label className="check"><input type="checkbox" checked={copy} onChange={(e) => setCopy(e.target.checked)} /> Copy text and images</label>
        <label className="check"><input type="checkbox" checked={edit} onChange={(e) => setEdit(e.target.checked)} /> Edit, fill forms and comment</label>
      </fieldset>
      <p className="muted" style={{ margin: 0, fontSize: 13 }}>Uses AES-256 encryption. Most PDF apps honour the print/copy/edit limits, but they are not a security guarantee — the password is.</p>
      <ErrorBox message={error} />
      {done && <div className="badge">{done}</div>}
      <div><button className="btn primary" disabled={!file || busy || !pw || mismatch} onClick={run}>{busy ? 'Working…' : 'Protect and download'}</button></div>
    </>
  )
}
