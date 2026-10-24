import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { baseName, downloadBlob, ErrorBox, Field, FileDrop, Row } from '../components/ui'
import { pdfBlob } from '../lib/pdf'
import { isWrongPassword, runQpdf } from '../lib/qpdf'

export default function PdfUnlock() {
  const [file, setFile] = useState<File | null>(null)
  const [pw, setPw] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const run = async () => {
    if (!file) return
    setBusy(true); setError(null); setDone(false)
    try {
      const out = await runQpdf(new Uint8Array(await file.arrayBuffer()), [`--password=${pw}`, '--decrypt'])
      downloadBlob(`${baseName(file.name)}-unlocked.pdf`, pdfBlob(out))
      setDone(true)
    } catch (e) {
      setError(isWrongPassword(e)
        ? (pw ? 'That password is not correct. Check capital letters — for many bank and card statements it is a mix of your name and date of birth.' : 'This PDF needs a password to open. Enter it above.')
        : 'This file could not be unlocked. Make sure it is a valid PDF.')
    } finally { setBusy(false) }
  }

  return (
    <>
      <FileDrop accept="application/pdf,.pdf" disabled={busy} onFiles={(f) => { setFile(f[0]); setError(null); setDone(false) }} label={file ? `📄 ${file.name} (click to change)` : 'Drop a password-protected PDF here, or click to choose'} hint="Unlocked on your device — the file and password never leave it." />
      <Row>
        <Field label="Password" hint="Leave empty if the PDF opens without one and only blocks printing, copying or editing.">
          <input type={show ? 'text' : 'password'} value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="off" onKeyDown={(e) => { if (e.key === 'Enter') run() }} />
        </Field>
        <button className="btn" style={{ alignSelf: 'flex-start', marginTop: 22 }} onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'}>{show ? <EyeOff size={16} /> : <Eye size={16} />}</button>
      </Row>
      <ErrorBox message={error} />
      {done && <div className="badge">Unlocked — the downloaded copy opens without a password and has no restrictions.</div>}
      <div><button className="btn primary" disabled={!file || busy} onClick={run}>{busy ? 'Working…' : 'Unlock and download'}</button></div>
      <p className="muted" style={{ margin: 0, fontSize: 13 }}>Only unlock files you own or are allowed to open. This tool removes a password you know — it does not guess or crack passwords.</p>
    </>
  )
}
