import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { baseName, downloadBlob, ErrorBox, Field, FileDrop, Row } from '../components/ui'
import BatchRunner, { BulkToggle, type BatchProcess } from '../components/Batch'
import { pdfBlob } from '../lib/pdf'
import { isWrongPassword, runQpdf } from '../lib/qpdf'

const unlockPdf = async (file: File, pw: string) => runQpdf(new Uint8Array(await file.arrayBuffer()), [`--password=${pw}`, '--decrypt'])

const NOTE = <p className="muted" style={{ margin: 0, fontSize: 13 }}>Only unlock files you own or are allowed to open. This tool removes a password you know — it does not guess or crack passwords.</p>

function PasswordField({ pw, setPw, onEnter, hint }: { pw: string; setPw: (v: string) => void; onEnter?: () => void; hint: string }) {
  const [show, setShow] = useState(false)
  return (
    <Row>
      <Field label="Password" hint={hint}>
        <input type={show ? 'text' : 'password'} value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="off" onKeyDown={(e) => { if (e.key === 'Enter') onEnter?.() }} />
      </Field>
      <button className="btn" style={{ alignSelf: 'flex-start', marginTop: 22 }} onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'}>{show ? <EyeOff size={16} /> : <Eye size={16} />}</button>
    </Row>
  )
}

function BulkUnlock({ onSingle }: { onSingle: () => void }) {
  const [pw, setPw] = useState('')
  const process: BatchProcess = async (file) => {
    try {
      return { name: `${baseName(file.name)}-unlocked.pdf`, blob: pdfBlob(await unlockPdf(file, pw)) }
    } catch (e) {
      throw new Error(isWrongPassword(e) ? (pw ? 'Wrong password.' : 'Needs a password — enter it above.') : 'Could not be unlocked. Make sure it is a valid PDF.')
    }
  }
  return (
    <>
      <BulkToggle bulk onChange={(b) => { if (!b) onSingle() }} />
      <PasswordField pw={pw} setPw={setPw} hint="Tried on every file. Leave empty for files that open without one and only block printing, copying or editing." />
      {/* one at a time: runQpdf swaps console.log while it starts, which isn't safe to overlap */}
      <BatchRunner accept="application/pdf,.pdf" process={process} settingsKey={pw} runLabel="Unlock all" zipName="unlocked-pdfs" concurrency={1}
        hint="Unlocked on your device — the files and password never leave it. Files with a different password are marked; change the password and run again." />
      {NOTE}
    </>
  )
}

export default function PdfUnlock() {
  const [bulk, setBulk] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [pw, setPw] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const run = async () => {
    if (!file) return
    setBusy(true); setError(null); setDone(false)
    try {
      downloadBlob(`${baseName(file.name)}-unlocked.pdf`, pdfBlob(await unlockPdf(file, pw)))
      setDone(true)
    } catch (e) {
      setError(isWrongPassword(e)
        ? (pw ? 'That password is not correct. Check capital letters — for many bank and card statements it is a mix of your name and date of birth.' : 'This PDF needs a password to open. Enter it above.')
        : 'This file could not be unlocked. Make sure it is a valid PDF.')
    } finally { setBusy(false) }
  }

  if (bulk) return <BulkUnlock onSingle={() => setBulk(false)} />
  return (
    <>
      <BulkToggle bulk={false} onChange={setBulk} />
      <FileDrop accept="application/pdf,.pdf" disabled={busy} onFiles={(f) => { setFile(f[0]); setError(null); setDone(false) }} label={file ? `📄 ${file.name} (click to change)` : 'Drop a password-protected PDF here, or click to choose'} hint="Unlocked on your device — the file and password never leave it." />
      <PasswordField pw={pw} setPw={setPw} onEnter={run} hint="Leave empty if the PDF opens without one and only blocks printing, copying or editing." />
      <ErrorBox message={error} />
      {done && <div className="badge">Unlocked — the downloaded copy opens without a password and has no restrictions.</div>}
      <div><button className="btn primary" disabled={!file || busy} onClick={run}>{busy ? 'Working…' : 'Unlock and download'}</button></div>
      {NOTE}
    </>
  )
}
