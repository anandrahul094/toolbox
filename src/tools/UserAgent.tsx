import { useMemo, useState } from 'react'
import { Field, Row } from '../components/ui'

// Order matters: Edge and Opera include "Chrome", and Chrome includes "Safari"
const BROWSERS: [string, RegExp][] = [
  ['Microsoft Edge', /Edg(?:e|A|iOS)?\/([\d.]+)/], ['Opera', /(?:OPR|Opera)\/([\d.]+)/], ['Samsung Internet', /SamsungBrowser\/([\d.]+)/],
  ['Firefox', /(?:Firefox|FxiOS)\/([\d.]+)/], ['Chrome', /(?:Chrome|CriOS)\/([\d.]+)/], ['Safari', /Version\/([\d.]+).*Safari/],
]
const SYSTEMS: [string, RegExp, ((v: string) => string)?][] = [
  ['Windows', /Windows NT ([\d.]+)/, (v) => ({ '10.0': '10 / 11', '6.3': '8.1', '6.2': '8', '6.1': '7' } as Record<string, string>)[v] ?? v],
  ['iOS', /(?:iPhone|iPad|iPod).*OS ([\d_]+)/, (v) => v.replace(/_/g, '.')],
  ['Android', /Android ([\d.]+)/], ['macOS', /Mac OS X ([\d_.]+)/, (v) => v.replace(/_/g, '.')],
  ['Chrome OS', /CrOS [\w]+ ([\d.]+)/], ['Linux', /Linux/],
]
const ENGINES: [string, RegExp][] = [['Blink', /Chrome\//], ['Gecko', /Gecko\/\d/], ['WebKit', /AppleWebKit\//], ['Trident', /Trident\//]]

function parse(ua: string) {
  const browser = BROWSERS.find(([, re]) => re.test(ua))
  const os = SYSTEMS.find(([, re]) => re.test(ua))
  const osVersion = os ? ua.match(os[1])?.[1] : undefined
  const device = /iPad|Tablet|Tab\b/i.test(ua) ? 'Tablet' : /Mobi|iPhone|Android.*Mobile/i.test(ua) ? 'Mobile' : /bot|crawl|spider|slurp/i.test(ua) ? 'Bot / crawler' : 'Desktop'
  return {
    Browser: browser ? `${browser[0]} ${ua.match(browser[1])?.[1] ?? ''}`.trim() : 'Unknown',
    'Operating system': os ? `${os[0]}${osVersion ? ' ' + (os[2] ? os[2](osVersion) : osVersion) : ''}` : 'Unknown',
    'Rendering engine': ENGINES.find(([, re]) => re.test(ua))?.[0] ?? 'Unknown',
    'Device type': device,
    Bot: /bot|crawl|spider|slurp|facebookexternalhit|preview/i.test(ua) ? 'Yes' : 'No',
  }
}

export default function UserAgent() {
  const [ua, setUa] = useState(navigator.userAgent)
  const info = useMemo(() => parse(ua), [ua])

  return (
    <>
      <Field label="User-agent string" hint="Filled with your browser's user-agent. Paste any other one to analyse it.">
        <textarea aria-label="Input text" value={ua} onChange={(e) => setUa(e.target.value)} style={{ minHeight: 90 }} spellCheck={false} />
      </Field>
      <Row><button className="btn" onClick={() => setUa(navigator.userAgent)}>Use my browser</button></Row>
      <table><tbody>{Object.entries(info).map(([k, v]) => <tr key={k}><th style={{ width: 180, textTransform: 'none' }}>{k}</th><td>{v}</td></tr>)}</tbody></table>
      <div className="muted" style={{ fontSize: 13 }}>User-agent strings can be changed by the browser or user, and many browsers now freeze or reduce them, so treat the result as a hint.</div>
    </>
  )
}
