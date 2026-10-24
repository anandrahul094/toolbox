import { useState } from 'react'
import { CheckCircle2, XCircle } from 'lucide-react'
import { CopyButton, ErrorBox, Field, Row } from '../components/ui'

export default function BcryptTool() {
  const [pw, setPw] = useState('')
  const [rounds, setRounds] = useState(10)
  const [hash, setHash] = useState('')
  const [checkPw, setCheckPw] = useState('')
  const [checkHash, setCheckHash] = useState('')
  const [verdict, setVerdict] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ms, setMs] = useState<number | null>(null)

  const make = async () => {
    setBusy(true); setError(null)
    try {
      const bcrypt = (await import('bcryptjs')).default
      const t = performance.now()
      const h = await bcrypt.hash(pw, rounds)
      setMs(Math.round(performance.now() - t)); setHash(h); setCheckHash(h)
    } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }
  const verify = async () => {
    setError(null); setVerdict(null)
    if (!/^\$2[abxy]?\$\d{2}\$[./A-Za-z0-9]{53}$/.test(checkHash.trim())) { setError('That doesn’t look like a bcrypt hash (it should start with $2a$, $2b$ or $2y$ and be 60 characters).'); return }
    setBusy(true)
    try { const bcrypt = (await import('bcryptjs')).default; setVerdict(await bcrypt.compare(checkPw, checkHash.trim().replace(/^\$2y\$/, '$2a$'))) }
    catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }
  const bytes = new TextEncoder().encode(pw).length

  return (
    <>
      <h3 style={{ margin: 0, fontSize: 16 }}>Generate a hash</h3>
      <Row>
        <Field label="Password or text"><input value={pw} onChange={(e) => setPw(e.target.value)} className="mono" autoComplete="off" spellCheck={false} /></Field>
        <Field label={`Cost (rounds): ${rounds}`} hint="Each +1 doubles the time. 10–12 is typical."><input type="range" min={4} max={15} value={rounds} onChange={(e) => setRounds(+e.target.value)} /></Field>
      </Row>
      {bytes > 72 && <div className="muted" style={{ fontSize: 13, color: 'var(--danger)' }}>bcrypt only uses the first 72 bytes — the rest is ignored.</div>}
      <Row>
        <button className="btn primary" disabled={busy} onClick={make}>{busy ? 'Hashing…' : 'Generate bcrypt hash'}</button>
        {ms !== null && <span className="muted" style={{ fontSize: 13 }}>took {ms} ms</span>}
      </Row>
      {hash && <><div className="output mono" style={{ wordBreak: 'break-all' }}>{hash}</div><Row><CopyButton value={hash} /></Row></>}

      <h3 style={{ margin: '12px 0 0', fontSize: 16 }}>Check a password against a hash</h3>
      <Field label="bcrypt hash"><input value={checkHash} onChange={(e) => { setCheckHash(e.target.value); setVerdict(null) }} className="mono" spellCheck={false} placeholder="$2b$10$…" /></Field>
      <Field label="Password to check"><input value={checkPw} onChange={(e) => { setCheckPw(e.target.value); setVerdict(null) }} className="mono" autoComplete="off" spellCheck={false} /></Field>
      <div><button className="btn" disabled={busy || !checkHash} onClick={verify}>Check</button></div>
      {verdict !== null && (verdict
        ? <div className="badge" aria-live="polite"><CheckCircle2 size={14} aria-hidden="true" />Match — the password is correct for this hash.</div>
        : <div className="error" aria-live="polite"><XCircle size={14} aria-hidden="true" /> No match.</div>)}
      <ErrorBox message={error} />
      <p className="muted" style={{ margin: 0, fontSize: 13 }}>Hashing runs on your device. A new random salt is used each time, so the same password gives a different hash — that’s expected; Check still works.</p>
    </>
  )
}
