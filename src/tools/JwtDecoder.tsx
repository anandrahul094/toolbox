import { useMemo, useState } from 'react'
import { CopyButton, ErrorBox, Field } from '../components/ui'
import { fromBase64 } from './Base64'

const SAMPLE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkphbmUgRG9lIiwiaWF0IjoxNzAwMDAwMDAwLCJleHAiOjE5MDAwMDAwMDB9.signature'

export default function JwtDecoder() {
  const [token, setToken] = useState(SAMPLE)

  const decoded = useMemo(() => {
    const parts = token.trim().split('.')
    if (parts.length < 2) return { error: 'A JWT has three dot-separated parts.' }
    try {
      const header = JSON.parse(fromBase64(parts[0]))
      const payload = JSON.parse(fromBase64(parts[1]))
      return { header, payload }
    } catch {
      return { error: 'Could not decode token — check that it is a valid JWT.' }
    }
  }, [token])

  const p = decoded.payload as Record<string, number> | undefined
  const fmt = (s?: number) => (typeof s === 'number' ? new Date(s * 1000).toLocaleString() : '—')
  const expired = p?.exp ? p.exp * 1000 < Date.now() : null

  return (
    <>
      <Field label="Token" hint="Decoding happens locally. The signature is not verified.">
        <textarea aria-label="Input text" value={token} onChange={(e) => setToken(e.target.value)} style={{ minHeight: 100 }} spellCheck={false} />
      </Field>
      <ErrorBox message={decoded.error} />
      {p && (
        <>
          <div className="stats">
            <div className="stat"><div className="stat-value" style={{ fontSize: 15 }}>{fmt(p.iat)}</div><div className="stat-label">Issued at (iat)</div></div>
            <div className="stat"><div className="stat-value" style={{ fontSize: 15 }}>{fmt(p.exp)}</div><div className="stat-label">Expires (exp)</div></div>
            <div className="stat"><div className="stat-value" style={{ fontSize: 15, color: expired ? 'var(--danger)' : undefined }}>{expired === null ? 'No expiry' : expired ? 'Expired' : 'Valid'}</div><div className="stat-label">Status</div></div>
          </div>
          <div className="cols">
            <Field label="Header"><pre className="output">{JSON.stringify(decoded.header, null, 2)}</pre></Field>
            <Field label="Payload"><pre className="output">{JSON.stringify(p, null, 2)}</pre></Field>
          </div>
          <div><CopyButton value={JSON.stringify(p, null, 2)} label="Copy payload" /></div>
        </>
      )}
    </>
  )
}
