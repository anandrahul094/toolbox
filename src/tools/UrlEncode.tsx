import { useMemo, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { CopyButton, ErrorBox, Field, Row } from '../components/ui'
import { defang, refang, urlEncodeAll } from '../lib/codec'

type Tab = 'encode' | 'parse' | 'defang'

export default function UrlEncode() {
  const [tab, setTab] = useState<Tab>('encode')
  const [input, setInput] = useState('https://example.com/search?q=hello world&lang=en')
  const [mode, setMode] = useState<'encode' | 'decode'>('encode')
  const [how, setHow] = useState<'component' | 'uri' | 'all'>('component')

  const { output, error } = useMemo(() => {
    try {
      const out = mode === 'encode'
        ? how === 'all' ? urlEncodeAll(input) : (how === 'component' ? encodeURIComponent : encodeURI)(input)
        // '+' means space only in query strings (component mode); in full URLs it's a literal plus
        : how !== 'uri' ? decodeURIComponent(input.replace(/\+/g, ' ')) : decodeURI(input)
      return { output: out, error: null }
    } catch {
      return { output: '', error: 'Malformed percent-encoding.' }
    }
  }, [input, mode, how])

  // URL parser with an editable query string
  const [url, setUrl] = useState('https://user@shop.example.com:8080/products/list?category=books&sort=price&page=2#reviews')
  const parsed = useMemo(() => { try { return new URL(url.trim()) } catch { return null } }, [url])
  const params = parsed ? [...parsed.searchParams.entries()] : []
  const setParams = (list: [string, string][]) => {
    if (!parsed) return
    const u = new URL(parsed.toString())
    u.search = new URLSearchParams(list).toString()
    setUrl(u.toString())
  }

  const [fang, setFang] = useState('Phishing link: https://login.example-bank.com/verify?id=1 from 203.0.113.7, reply to alerts@example.com')
  const [fangMode, setFangMode] = useState<'defang' | 'refang'>('defang')

  return (
    <>
      <div className="seg" role="group" aria-label="Tool" style={{ alignSelf: 'flex-start' }}>
        <button aria-pressed={tab === 'encode'} onClick={() => setTab('encode')}>Encode / decode</button>
        <button aria-pressed={tab === 'parse'} onClick={() => setTab('parse')}>Parse & edit URL</button>
        <button aria-pressed={tab === 'defang'} onClick={() => setTab('defang')}>Defang links</button>
      </div>

      {tab === 'encode' && (
        <>
          <Row>
            <div className="seg" role="group" aria-label="Direction">
              <button aria-pressed={mode === 'encode'} onClick={() => setMode('encode')}>Encode</button>
              <button aria-pressed={mode === 'decode'} onClick={() => setMode('decode')}>Decode</button>
            </div>
            <select value={how} onChange={(e) => setHow(e.target.value as typeof how)} aria-label="What to encode">
              <option value="component">Query value / path part (encodeURIComponent)</option>
              <option value="uri">Whole URL — keep :/?&= (encodeURI)</option>
              {mode === 'encode' && <option value="all">Every character (%XX)</option>}
            </select>
            <button className="btn" onClick={() => { setInput(output); setMode(mode === 'encode' ? 'decode' : 'encode') }} disabled={!output}>⇄ Swap</button>
            <CopyButton value={output} />
          </Row>
          <div className="cols">
            <textarea aria-label="Input text" value={input} onChange={(e) => setInput(e.target.value)} spellCheck={false} />
            <textarea aria-label="Output" value={output} readOnly className="mono" />
          </div>
          <ErrorBox message={error} />
        </>
      )}

      {tab === 'parse' && (
        <>
          <Field label="URL"><input className="mono" value={url} onChange={(e) => setUrl(e.target.value)} spellCheck={false} /></Field>
          <ErrorBox message={url.trim() && !parsed ? 'That isn’t a full URL — include https://' : null} />
          {parsed && (
            <>
              <table style={{ borderCollapse: 'collapse', fontSize: 14 }}>
                <tbody>
                  {([['Protocol', parsed.protocol], ['Username', parsed.username], ['Host', parsed.hostname], ['Port', parsed.port || `(default)`], ['Path', decodeURIComponent(parsed.pathname)], ['Fragment', parsed.hash], ['Origin', parsed.origin]] as const).filter(([, v]) => v).map(([k, v]) => (
                    <tr key={k} style={{ borderBottom: '1px solid var(--border)' }}><th style={{ textAlign: 'left', padding: '4px 10px 4px 0' }}>{k}</th><td className="mono" style={{ wordBreak: 'break-all' }}>{v}</td></tr>
                  ))}
                </tbody>
              </table>
              <div className="field-label">Query parameters</div>
              {params.map(([k, v], i) => (
                <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input className="mono" value={k} onChange={(e) => setParams(params.map((p, j) => (j === i ? [e.target.value, p[1]] : p)))} aria-label={`Parameter ${i + 1} name`} style={{ width: '35%' }} />
                  <span>=</span>
                  <input className="mono" value={v} onChange={(e) => setParams(params.map((p, j) => (j === i ? [p[0], e.target.value] : p)))} aria-label={`Parameter ${i + 1} value`} style={{ flex: 1 }} />
                  <button className="icon-only" aria-label={`Remove ${k}`} onClick={() => setParams(params.filter((_, j) => j !== i))}><X size={14} /></button>
                </div>
              ))}
              <Row>
                <button className="btn" onClick={() => setParams([...params, ['key', 'value']])}><Plus size={14} aria-hidden="true" />Add parameter</button>
                <button className="btn" onClick={() => setParams(params.filter(([k]) => !/^(utm_|fbclid|gclid|mc_|igshid|si$)/i.test(k)))}>Remove tracking (utm_, fbclid…)</button>
                <CopyButton value={parsed.toString()} label="Copy URL" />
              </Row>
            </>
          )}
        </>
      )}

      {tab === 'defang' && (
        <>
          <div className="seg" role="group" aria-label="Direction" style={{ alignSelf: 'flex-start' }}>
            <button aria-pressed={fangMode === 'defang'} onClick={() => setFangMode('defang')}>Defang</button>
            <button aria-pressed={fangMode === 'refang'} onClick={() => setFangMode('refang')}>Refang</button>
          </div>
          <div className="cols">
            <textarea aria-label="Input text" value={fang} onChange={(e) => setFang(e.target.value)} spellCheck={false} />
            <textarea aria-label="Output" value={fangMode === 'defang' ? defang(fang) : refang(fang)} readOnly className="mono" />
          </div>
          <Row><CopyButton value={fangMode === 'defang' ? defang(fang) : refang(fang)} /></Row>
          <p className="muted" style={{ margin: 0, fontSize: 13 }}>Defanging (hxxps[://]example[.]com) makes suspicious links and IPs unclickable, so they’re safe to paste into reports, tickets and chats.</p>
        </>
      )}
    </>
  )
}
