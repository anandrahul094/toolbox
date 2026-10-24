import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, XCircle } from 'lucide-react'
import { CopyButton, ErrorBox, Field, Row } from '../components/ui'
import { enc, fromBase64, hmac, toBase64 } from '../lib/codec'
import { fromBase64 as b64Text } from './Base64'

const SAMPLE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkphbmUgRG9lIiwiaWF0IjoxNzAwMDAwMDAwLCJleHAiOjE5MDAwMDAwMDB9.cHuiAN-kROBle91Tyu05tyrX-uSH5hz4iuyPZhFrBgg'
const HS = { HS256: 'SHA-256', HS384: 'SHA-384', HS512: 'SHA-512' } as const
const b64url = (b: Uint8Array) => toBase64(b, true)

async function sign(alg: keyof typeof HS, data: string, secret: string) { return b64url(await hmac(HS[alg], enc(secret), enc(data))) }

function ago(sec: number) {
  const d = Math.round(sec - Date.now() / 1000), a = Math.abs(d)
  const t = a < 90 ? `${a} s` : a < 5400 ? `${Math.round(a / 60)} min` : a < 172800 ? `${Math.round(a / 3600)} h` : `${Math.round(a / 86400)} days`
  return d >= 0 ? `in ${t}` : `${t} ago`
}

export default function JwtDecoder() {
  const [tab, setTab] = useState<'decode' | 'create'>('decode')
  const [token, setToken] = useState(SAMPLE)
  const [secret, setSecret] = useState('')
  const [verified, setVerified] = useState<boolean | null>(null)

  const decoded = useMemo(() => {
    const parts = token.trim().replace(/^Bearer\s+/i, '').split('.')
    if (parts.length < 2) return { error: 'A JWT has three dot-separated parts.' }
    try { return { header: JSON.parse(b64Text(parts[0])), payload: JSON.parse(b64Text(parts[1])), parts } }
    catch { return { error: 'Could not decode token — check that it is a valid JWT.' } }
  }, [token])

  const alg = decoded.header?.alg as string | undefined
  useEffect(() => {
    let cancelled = false
    setVerified(null)
    if (!secret || !decoded.parts || !(alg && alg in HS)) return
    sign(alg as keyof typeof HS, `${decoded.parts[0]}.${decoded.parts[1]}`, secret).then((s) => { if (!cancelled) setVerified(s === decoded.parts![2]) }).catch(() => {})
    return () => { cancelled = true }
  }, [secret, decoded, alg])

  const p = decoded.payload as Record<string, unknown> | undefined
  const num = (k: string) => (typeof p?.[k] === 'number' ? (p[k] as number) : undefined)
  const fmt = (s?: number) => (s === undefined ? '—' : `${new Date(s * 1000).toLocaleString()} (${ago(s)})`)
  const exp = num('exp'), nbf = num('nbf')
  const status = exp === undefined ? 'No expiry' : exp * 1000 < Date.now() ? 'Expired' : nbf && nbf * 1000 > Date.now() ? 'Not valid yet' : 'Valid'

  // create
  const [cAlg, setCAlg] = useState<keyof typeof HS>('HS256')
  const [cPayload, setCPayload] = useState(() => JSON.stringify({ sub: 'user-123', name: 'Jane Doe', role: 'admin', iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 3600 }, null, 2))
  const [cSecret, setCSecret] = useState('change-me')
  const [created, setCreated] = useState<{ token?: string; error?: string }>({})
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const body = JSON.parse(cPayload)
        const head = b64url(enc(JSON.stringify({ alg: cAlg, typ: 'JWT' }))), pay = b64url(enc(JSON.stringify(body)))
        const t = `${head}.${pay}.${await sign(cAlg, `${head}.${pay}`, cSecret)}`
        if (!cancelled) setCreated({ token: t })
      } catch (e) { if (!cancelled) setCreated({ error: `Payload isn’t valid JSON: ${(e as Error).message}` }) }
    })()
    return () => { cancelled = true }
  }, [cAlg, cPayload, cSecret])

  return (
    <>
      <div className="seg" role="group" aria-label="Mode" style={{ alignSelf: 'flex-start' }}>
        <button aria-pressed={tab === 'decode'} onClick={() => setTab('decode')}>Decode & verify</button>
        <button aria-pressed={tab === 'create'} onClick={() => setTab('create')}>Create (HS256)</button>
      </div>
      {tab === 'decode' ? (
        <>
          <Field label="Token" hint="Decoding and verifying happen in your browser. Don’t paste production tokens into sites you don’t trust.">
            <textarea aria-label="Input text" value={token} onChange={(e) => setToken(e.target.value)} style={{ minHeight: 100 }} spellCheck={false} className="mono" />
          </Field>
          <ErrorBox message={decoded.error} />
          {p && (
            <>
              <div className="stats">
                <div className="stat"><div className="stat-value" style={{ fontSize: 15, color: status === 'Valid' ? 'var(--ok)' : status === 'No expiry' ? undefined : 'var(--danger)' }}>{status}</div><div className="stat-label">Status</div></div>
                <div className="stat"><div className="stat-value" style={{ fontSize: 14 }}>{alg ?? '—'}</div><div className="stat-label">Algorithm</div></div>
              </div>
              <table style={{ fontSize: 14 }}><tbody>
                {([['Issued (iat)', num('iat')], ['Not before (nbf)', nbf], ['Expires (exp)', exp]] as const).filter(([, v]) => v !== undefined).map(([k, v]) => <tr key={k}><th style={{ textAlign: 'left', paddingRight: 10 }}>{k}</th><td>{fmt(v)}</td></tr>)}
                {(['iss', 'sub', 'aud'] as const).filter((k) => p[k] !== undefined).map((k) => <tr key={k}><th style={{ textAlign: 'left', paddingRight: 10 }}>{{ iss: 'Issuer (iss)', sub: 'Subject (sub)', aud: 'Audience (aud)' }[k]}</th><td className="mono">{String(p[k])}</td></tr>)}
              </tbody></table>
              <div className="cols">
                <Field label="Header"><pre className="output">{JSON.stringify(decoded.header, null, 2)}</pre></Field>
                <Field label="Payload"><pre className="output">{JSON.stringify(p, null, 2)}</pre></Field>
              </div>
              <Row><CopyButton value={JSON.stringify(p, null, 2)} label="Copy payload" /></Row>
              {alg && alg in HS ? (
                <>
                  <Field label={`Verify signature — ${alg} secret`}><input className="mono" value={secret} onChange={(e) => setSecret(e.target.value)} placeholder="your-256-bit-secret (the sample's secret)" autoComplete="off" spellCheck={false} /></Field>
                  {verified === true && <div className="badge"><CheckCircle2 size={14} aria-hidden="true" />Signature verified</div>}
                  {verified === false && <div className="error"><XCircle size={14} aria-hidden="true" /> Invalid signature for this secret</div>}
                </>
              ) : <p className="muted" style={{ margin: 0, fontSize: 13 }}>Signature checking here covers HS256/384/512 (shared secret). {alg} tokens need the issuer’s public key.</p>}
            </>
          )}
          {decoded.parts && (() => { try { fromBase64(decoded.parts[2] || ''); return null } catch { return <div className="muted" style={{ fontSize: 13 }}>The signature part isn’t valid Base64URL.</div> } })()}
        </>
      ) : (
        <>
          <Row>
            <Field label="Algorithm"><select value={cAlg} onChange={(e) => setCAlg(e.target.value as keyof typeof HS)}>{Object.keys(HS).map((a) => <option key={a}>{a}</option>)}</select></Field>
            <Field label="Secret"><input className="mono" value={cSecret} onChange={(e) => setCSecret(e.target.value)} autoComplete="off" spellCheck={false} /></Field>
          </Row>
          <Field label="Payload (JSON)"><textarea className="mono" value={cPayload} onChange={(e) => setCPayload(e.target.value)} style={{ minHeight: 160 }} spellCheck={false} /></Field>
          <ErrorBox message={created.error} />
          {created.token && <><div className="output mono" style={{ wordBreak: 'break-all' }}>{created.token}</div><Row><CopyButton value={created.token} label="Copy token" /><button className="btn" onClick={() => { setToken(created.token!); setSecret(cSecret); setTab('decode') }}>Open in decoder</button></Row></>}
          <p className="muted" style={{ margin: 0, fontSize: 13 }}>For testing and development. Use a long random secret in real apps.</p>
        </>
      )}
    </>
  )
}
