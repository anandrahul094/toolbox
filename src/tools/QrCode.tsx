import { useEffect, useMemo, useState } from 'react'
import QRCode from 'qrcode'
import { CopyButton, download, ErrorBox, Field, Row } from '../components/ui'

type Kind = 'text' | 'wifi' | 'vcard' | 'upi' | 'whatsapp' | 'email' | 'phone'
const KINDS: [Kind, string][] = [['text', '🔗 Link / text'], ['wifi', '📶 Wi-Fi'], ['vcard', '👤 Contact'], ['upi', '₹ UPI payment'], ['whatsapp', '💬 WhatsApp'], ['email', '✉️ Email'], ['phone', '📞 Phone / SMS']]

const esc = (s: string) => s.replace(/([\\;,:"])/g, '\\$1') // Wi-Fi QR escaping (incl. backslash)

type Form = Record<string, string>
const DEFAULTS: Record<Kind, Form> = {
  text: { text: 'https://example.com' },
  wifi: { ssid: 'MyHomeWiFi', password: '', security: 'WPA', hidden: '' },
  vcard: { first: 'Asha', last: 'Verma', org: '', title: '', phone: '+91 98765 43210', email: '', url: '', address: '' },
  upi: { vpa: '', name: '', amount: '', note: '' },
  whatsapp: { phone: '', message: 'Hi! I found you through your website.' },
  email: { to: '', subject: '', body: '' },
  phone: { number: '', mode: 'call', message: '' },
}

function payload(kind: Kind, f: Form): { data: string; error?: string } {
  switch (kind) {
    case 'text': return { data: f.text }
    case 'wifi':
      if (!f.ssid) return { data: '', error: 'Enter the network name (SSID).' }
      return { data: `WIFI:T:${f.security === 'nopass' ? 'nopass' : f.security};S:${esc(f.ssid)};${f.security === 'nopass' ? '' : `P:${esc(f.password)};`}${f.hidden ? 'H:true;' : ''};` }
    case 'vcard': {
      const lines = ['BEGIN:VCARD', 'VERSION:3.0', `N:${f.last};${f.first};;;`, `FN:${[f.first, f.last].filter(Boolean).join(' ')}`]
      if (f.org) lines.push(`ORG:${f.org}`)
      if (f.title) lines.push(`TITLE:${f.title}`)
      if (f.phone) lines.push(`TEL;TYPE=CELL:${f.phone}`)
      if (f.email) lines.push(`EMAIL:${f.email}`)
      if (f.url) lines.push(`URL:${f.url}`)
      if (f.address) lines.push(`ADR:;;${f.address.replace(/\n/g, ', ')};;;;`)
      lines.push('END:VCARD')
      return { data: lines.join('\n') }
    }
    case 'upi': {
      if (!f.vpa.trim()) return { data: '' }
      if (!/^[\w.-]{2,256}@[a-zA-Z][\w]{1,63}$/.test(f.vpa.trim())) return { data: '', error: 'Enter a valid UPI ID, e.g. name@okbank.' }
      if (f.amount && !(+f.amount > 0)) return { data: '', error: 'Amount must be a positive number.' }
      const q = new URLSearchParams({ pa: f.vpa.trim(), pn: f.name || f.vpa.trim(), cu: 'INR' })
      if (f.amount) q.set('am', (+f.amount).toFixed(2))
      if (f.note) q.set('tn', f.note)
      return { data: `upi://pay?${q.toString().replace(/\+/g, '%20')}` }
    }
    case 'whatsapp': {
      if (!f.phone.trim()) return { data: '' }
      const digits = f.phone.replace(/\D/g, '')
      if (digits.length < 8) return { data: '', error: 'Enter the phone number with country code, e.g. 91 98765 43210.' }
      return { data: `https://wa.me/${digits}${f.message ? `?text=${encodeURIComponent(f.message)}` : ''}` }
    }
    case 'email': {
      if (!f.to.trim()) return { data: '' }
      if (!/^\S+@\S+\.\S+$/.test(f.to)) return { data: '', error: 'Enter a valid email address.' }
      const q = [f.subject && `subject=${encodeURIComponent(f.subject)}`, f.body && `body=${encodeURIComponent(f.body)}`].filter(Boolean).join('&')
      return { data: `mailto:${f.to}${q ? '?' + q : ''}` }
    }
    case 'phone': {
      if (!f.number.trim()) return { data: '' }
      const num = f.number.replace(/[^\d+]/g, '')
      if (num.replace('+', '').length < 3) return { data: '', error: 'Enter a phone number.' }
      return { data: f.mode === 'sms' ? `SMSTO:${num}:${f.message}` : `tel:${num}` }
    }
  }
}

export default function QrCode({ preset = 'text' }: { preset?: string }) {
  const [kind, setKind] = useState<Kind>((KINDS.find(([k]) => k === preset)?.[0]) ?? 'text')
  const [forms, setForms] = useState(DEFAULTS)
  const [size, setSize] = useState(320)
  const [fg, setFg] = useState('#000000')
  const [bg, setBg] = useState('#ffffff')
  const [ecl, setEcl] = useState<'L' | 'M' | 'Q' | 'H'>('M')
  const [png, setPng] = useState('')
  const [svg, setSvg] = useState('')
  const [tooLong, setTooLong] = useState(false)

  useEffect(() => setKind((KINDS.find(([k]) => k === preset)?.[0]) ?? 'text'), [preset])

  const f = forms[kind]
  const set = (key: string, value: string) => setForms({ ...forms, [kind]: { ...f, [key]: value } })
  const { data, error } = useMemo(() => payload(kind, f), [kind, f])

  useEffect(() => {
    setTooLong(false)
    if (!data) { setPng(''); setSvg(''); return }
    let cancelled = false
    const opts = { width: size, margin: 2, errorCorrectionLevel: ecl, color: { dark: fg, light: bg } }
    QRCode.toDataURL(data, opts).then((u) => { if (!cancelled) setPng(u) }).catch(() => { if (!cancelled) { setPng(''); setTooLong(true) } })
    QRCode.toString(data, { ...opts, type: 'svg' }).then((u) => { if (!cancelled) setSvg(u) }).catch(() => { if (!cancelled) setSvg('') })
    return () => { cancelled = true }
  }, [data, size, fg, bg, ecl])

  const input = (key: string, label: string, props: Record<string, unknown> = {}) => (
    <Field label={label}><input value={f[key]} onChange={(e) => set(key, e.target.value)} {...props} /></Field>
  )

  return (
    <>
      <Row>{KINDS.map(([k, l]) => <button key={k} className={`chip ${kind === k ? 'active' : ''}`} onClick={() => setKind(k)}>{l}</button>)}</Row>
      {kind === 'text' && <Field label="Link or text"><textarea aria-label="Input text" value={f.text} onChange={(e) => set('text', e.target.value)} style={{ minHeight: 80, fontFamily: 'inherit' }} /></Field>}
      {kind === 'wifi' && (
        <>
          <Row>{input('ssid', 'Network name (SSID)')}{f.security !== 'nopass' && input('password', 'Password', { type: 'text', autoComplete: 'off' })}</Row>
          <Row>
            <Field label="Security"><select value={f.security} onChange={(e) => set('security', e.target.value)}><option value="WPA">WPA / WPA2 / WPA3</option><option value="WEP">WEP</option><option value="nopass">None (open)</option></select></Field>
            <label className="check"><input type="checkbox" checked={!!f.hidden} onChange={(e) => set('hidden', e.target.checked ? '1' : '')} /> Hidden network</label>
          </Row>
        </>
      )}
      {kind === 'vcard' && (
        <>
          <Row>{input('first', 'First name')}{input('last', 'Last name')}</Row>
          <Row>{input('org', 'Company')}{input('title', 'Job title')}</Row>
          <Row>{input('phone', 'Phone', { type: 'tel' })}{input('email', 'Email', { type: 'email' })}</Row>
          <Row>{input('url', 'Website')}{input('address', 'Address')}</Row>
        </>
      )}
      {kind === 'upi' && (
        <>
          <Row>{input('vpa', 'UPI ID (VPA)', { placeholder: 'yourname@okhdfcbank' })}{input('name', 'Payee name')}</Row>
          <Row>{input('amount', 'Amount in ₹ (optional — leave blank to let the payer choose)', { type: 'number', min: 0 })}{input('note', 'Note (optional)')}</Row>
        </>
      )}
      {kind === 'whatsapp' && <>{input('phone', 'WhatsApp number with country code', { placeholder: '91 98765 43210', type: 'tel' })}<Field label="Pre-filled message"><textarea aria-label="Input text" value={f.message} onChange={(e) => set('message', e.target.value)} style={{ minHeight: 70, fontFamily: 'inherit' }} /></Field></>}
      {kind === 'email' && <>{input('to', 'To', { type: 'email' })}{input('subject', 'Subject')}<Field label="Body"><textarea aria-label="Input text" value={f.body} onChange={(e) => set('body', e.target.value)} style={{ minHeight: 70, fontFamily: 'inherit' }} /></Field></>}
      {kind === 'phone' && (
        <>
          <Row>
            {input('number', 'Phone number', { type: 'tel', placeholder: '+91 98765 43210' })}
            <Field label="When scanned"><select value={f.mode} onChange={(e) => set('mode', e.target.value)}><option value="call">Call this number</option><option value="sms">Send an SMS</option></select></Field>
          </Row>
          {f.mode === 'sms' && <Field label="SMS text"><input value={f.message} onChange={(e) => set('message', e.target.value)} /></Field>}
        </>
      )}
      <ErrorBox message={error ?? (tooLong ? `Too much data for a QR code (${new TextEncoder().encode(data).length.toLocaleString()} bytes). Shorten it, or lower the error correction level.` : null)} />
      <Row>
        <Field label={`Size: ${size}px`}><input type="range" min={128} max={1024} step={16} value={size} onChange={(e) => setSize(+e.target.value)} /></Field>
        <Field label="Error correction">
          <select value={ecl} onChange={(e) => setEcl(e.target.value as typeof ecl)}>
            <option value="L">Low (7%)</option><option value="M">Medium (15%)</option><option value="Q">Quartile (25%)</option><option value="H">High (30%)</option>
          </select>
        </Field>
        <Field label="Foreground"><input type="color" value={fg} onChange={(e) => setFg(e.target.value)} /></Field>
        <Field label="Background"><input type="color" value={bg} onChange={(e) => setBg(e.target.value)} /></Field>
      </Row>
      {png && (
        <>
          <div className="center"><img src={png} alt="QR code" style={{ maxWidth: '100%', width: Math.min(size, 320), borderRadius: 8 }} /></div>
          <Row>
            <button className="btn primary" onClick={() => download(`qr-${kind}.png`, png)}>Download PNG</button>
            <button className="btn" onClick={() => download(`qr-${kind}.svg`, 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg))}>Download SVG</button>
            <CopyButton value={data} label="Copy encoded data" />
          </Row>
          <details className="faq"><summary>Encoded data</summary><pre className="output" style={{ marginTop: 8 }}>{data}</pre></details>
        </>
      )}
    </>
  )
}
