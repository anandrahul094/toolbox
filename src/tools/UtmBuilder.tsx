import { useMemo, useState } from 'react'
import { CopyButton, ErrorBox, Field, Row } from '../components/ui'

const FIELDS: [string, string, string, boolean][] = [
  ['utm_source', 'Campaign source', 'e.g. google, newsletter, facebook', true],
  ['utm_medium', 'Campaign medium', 'e.g. cpc, email, social', true],
  ['utm_campaign', 'Campaign name', 'e.g. diwali_sale', true],
  ['utm_term', 'Campaign term', 'Paid keywords (optional)', false],
  ['utm_content', 'Campaign content', 'Differentiates ads or links (optional)', false],
  ['utm_id', 'Campaign ID', 'Optional', false],
]
const PRESETS: Record<string, [string, string]> = { Google: ['google', 'cpc'], Facebook: ['facebook', 'social'], Instagram: ['instagram', 'social'], LinkedIn: ['linkedin', 'social'], Newsletter: ['newsletter', 'email'], WhatsApp: ['whatsapp', 'social'] }

export default function UtmBuilder() {
  const [url, setUrl] = useState('https://example.com/landing')
  const [params, setParams] = useState<Record<string, string>>({ utm_source: 'newsletter', utm_medium: 'email', utm_campaign: 'spring_launch' })
  const [lower, setLower] = useState(true)

  const result = useMemo(() => {
    try {
      const u = new URL(url.trim())
      for (const [k] of FIELDS) {
        let v = (params[k] ?? '').trim()
        if (lower) v = v.toLowerCase()
        v = v.replace(/\s+/g, '_')
        if (v) u.searchParams.set(k, v); else u.searchParams.delete(k)
      }
      return { link: u.toString() }
    } catch {
      return { error: 'Enter a full URL starting with https://' }
    }
  }, [url, params, lower])

  const missing = FIELDS.filter(([k, , , req]) => req && !params[k]?.trim()).map(([, l]) => l)

  return (
    <>
      <Field label="Website URL"><input value={url} onChange={(e) => setUrl(e.target.value)} /></Field>
      <Row>
        <span className="muted" style={{ fontSize: 13 }}>Quick fill:</span>
        {Object.entries(PRESETS).map(([name, [s, m]]) => <button key={name} className="chip" onClick={() => setParams({ ...params, utm_source: s, utm_medium: m })}>{name}</button>)}
      </Row>
      <div className="cols">
        {FIELDS.map(([k, label, hint, req]) => (
          <Field key={k} label={`${label}${req ? ' *' : ''}`} hint={<span className="mono">{k}</span>}>
            <input value={params[k] ?? ''} placeholder={hint} onChange={(e) => setParams({ ...params, [k]: e.target.value })} />
          </Field>
        ))}
      </div>
      <label className="check"><input type="checkbox" checked={lower} onChange={(e) => setLower(e.target.checked)} /> Convert to lowercase and replace spaces with _ (keeps reports consistent)</label>
      <ErrorBox message={result.error} />
      {missing.length > 0 && !result.error && <div className="muted" style={{ fontSize: 13 }}>Recommended: fill in {missing.join(', ')}.</div>}
      {result.link && (
        <>
          <pre className="output">{result.link}</pre>
          <Row><CopyButton value={result.link} label="Copy link" /></Row>
        </>
      )}
    </>
  )
}
