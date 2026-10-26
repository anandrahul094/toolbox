import { useEffect, useMemo, useState } from 'react'
import QRCode from 'qrcode'
import { CopyButton, download, downloadBlob, ErrorBox, Field, FileDrop, Progress, Row, uniqueNames } from '../components/ui'
import { BulkToggle } from '../components/Batch'

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

type Ecl = 'L' | 'M' | 'Q' | 'H'
interface Look { size: number; ecl: Ecl; fg: string; bg: string }

function LookControls({ look, onChange }: { look: Look; onChange: (l: Look) => void }) {
  const { size, ecl, fg, bg } = look
  return (
    <Row>
      <Field label={`Size: ${size}px`}><input type="range" min={128} max={1024} step={16} value={size} onChange={(e) => onChange({ ...look, size: +e.target.value })} /></Field>
      <Field label="Error correction">
        <select value={ecl} onChange={(e) => onChange({ ...look, ecl: e.target.value as Ecl })}>
          <option value="L">Low (7%)</option><option value="M">Medium (15%)</option><option value="Q">Quartile (25%)</option><option value="H">High (30%)</option>
        </select>
      </Field>
      <Field label="Foreground"><input type="color" value={fg} onChange={(e) => onChange({ ...look, fg: e.target.value })} /></Field>
      <Field label="Background"><input type="color" value={bg} onChange={(e) => onChange({ ...look, bg: e.target.value })} /></Field>
    </Row>
  )
}

// ── bulk: one QR per line ──
const MAX_ROWS = 1000
type Layout = 'lines' | 'pairs' | 'csv'
interface Entry { line: number; value: string; label: string; name: string }

function splitCsv(line: string, sep: string) {
  const out: string[] = []
  let cur = '', quoted = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (quoted) { if (c !== '"') cur += c; else if (line[i + 1] === '"') { cur += '"'; i++ } else quoted = false }
    else if (c === '"' && !cur.trim()) { quoted = true; cur = '' }
    else if (c === sep) { out.push(cur.trim()); cur = '' }
    else cur += c
  }
  out.push(cur.trim())
  return out
}
const guessSep = (header: string) => (header.includes('\t') ? '\t' : (header.match(/;/g)?.length ?? 0) > (header.match(/,/g)?.length ?? 0) ? ';' : ',')
const slug = (s: string) => s.replace(/^[a-z]+:\/\//i, '').replace(/\.(png|svg)$/i, '').replace(/[^\w.-]+/g, '_').replace(/^[_.]+|[_.]+$/g, '').slice(0, 60)
const dataUrlBytes = (u: string) => Uint8Array.from(atob(u.slice(u.indexOf(',') + 1)), (c) => c.charCodeAt(0))
// the PDF's built-in font only covers Latin-1
const latin1 = (s: string) => s.replace(/[^\x20-\x7e\xa0-\xff]/g, '?')
const tick = () => new Promise((r) => setTimeout(r, 0))

function parseRows(text: string, layout: Layout, valueCol: number, nameCol: number) {
  let lines = text.split(/\r?\n/).map((l, i) => ({ l, i: i + 1 }))
  let header: string[] = []
  const sep = guessSep(lines[0]?.l ?? '')
  if (layout === 'csv') { header = splitCsv(lines[0]?.l ?? '', sep); lines = lines.slice(1) }
  const all: Entry[] = []
  for (const { l, i } of lines) {
    if (!l.trim()) continue
    let value = l.trim(), name = ''
    if (layout === 'pairs') {
      // split at the last comma/tab, since URLs and text may contain commas themselves
      const at = Math.max(l.lastIndexOf(','), l.lastIndexOf('\t'))
      if (at > 0) { value = l.slice(0, at).trim(); name = l.slice(at + 1).trim() }
    } else if (layout === 'csv') {
      const cells = splitCsv(l, sep)
      value = cells[valueCol] ?? ''; name = nameCol >= 0 ? cells[nameCol] ?? '' : ''
      if (!value) continue
    }
    all.push({ line: i, value, label: name || value, name: '' })
  }
  const pad = String(Math.min(all.length, MAX_ROWS)).length
  const rows = all.slice(0, MAX_ROWS).map((e, k) => ({ ...e, name: slug(e.label === e.value ? '' : e.label) || `${String(k + 1).padStart(Math.max(3, pad), '0')}-${slug(e.value) || 'qr'}` }))
  const names = uniqueNames(rows.map((r) => r.name))
  return { header, total: all.length, rows: rows.map((r, k) => ({ ...r, name: names[k] })) }
}

function BulkQr({ look, setLook, onSingle }: { look: Look; setLook: (l: Look) => void; onSingle: () => void }) {
  const [text, setText] = useState('https://example.com/item/1\nhttps://example.com/item/2\nhttps://example.com/item/3')
  const [layout, setLayout] = useState<Layout>('lines')
  const [valueCol, setValueCol] = useState(0)
  const [nameCol, setNameCol] = useState(-1)
  const [format, setFormat] = useState<'png' | 'svg' | 'both'>('png')
  const [perRow, setPerRow] = useState(4)
  const [caption, setCaption] = useState<'value' | 'name' | 'none'>('value')
  const [previews, setPreviews] = useState<(string | null)[]>([])
  const [busy, setBusy] = useState<{ what: string; done: number } | null>(null)
  const [failed, setFailed] = useState<Entry[]>([])
  const [error, setError] = useState<string | null>(null)

  const { header, total, rows } = useMemo(() => parseRows(text, layout, valueCol, nameCol), [text, layout, valueCol, nameCol])
  const opts = { margin: 2, errorCorrectionLevel: look.ecl, color: { dark: look.fg, light: look.bg } }

  useEffect(() => {
    let cancelled = false
    // debounce so typing in the list doesn't redraw the grid on every keystroke
    const t = setTimeout(async () => {
      const out = await Promise.all(rows.slice(0, 24).map((r) => QRCode.toDataURL(r.value, { ...opts, width: 128 }).catch(() => null)))
      if (!cancelled) setPreviews(out)
    }, 200)
    return () => { cancelled = true; clearTimeout(t) }
  }, [rows, look.ecl, look.fg, look.bg]) // eslint-disable-line react-hooks/exhaustive-deps

  const load = async (f: File) => {
    const t = await f.text()
    setText(t); setValueCol(0); setNameCol(-1)
    setLayout(/\.csv$/i.test(f.name) || f.type === 'text/csv' ? 'csv' : 'lines')
  }

  const run = async (what: string, job: (bad: Entry[]) => Promise<void>) => {
    setBusy({ what, done: 0 }); setError(null)
    const bad: Entry[] = []
    try { await job(bad) } catch (e) { setError((e as Error).message || 'Something went wrong.') }
    setFailed(bad); setBusy(null)
  }

  const zip = () => run('Creating QR codes', async (bad) => {
    const JSZip = (await import('jszip')).default
    const z = new JSZip()
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i]
      try {
        if (format !== 'svg') z.file(`${r.name}.png`, dataUrlBytes(await QRCode.toDataURL(r.value, { ...opts, width: look.size })))
        if (format !== 'png') z.file(`${r.name}.svg`, await QRCode.toString(r.value, { ...opts, width: look.size, type: 'svg' }))
      } catch { bad.push(r) }
      if (i % 20 === 19) { setBusy({ what: 'Creating QR codes', done: i + 1 }); await tick() }
    }
    if (bad.length === rows.length) throw new Error('None of the rows could be turned into a QR code.')
    downloadBlob('qr-codes.zip', await z.generateAsync({ type: 'blob', compression: 'STORE' }))
  })

  const sheet = () => run('Laying out the sheet', async (bad) => {
    const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib')
    const pdf = await PDFDocument.create()
    const font = await pdf.embedFont(StandardFonts.Helvetica)
    // A4 in points, with a margin that most printers can reach
    const W = 595.28, H = 841.89, M = 28, FS = perRow > 4 ? 6 : 7
    const cellW = (W - 2 * M) / perRow, qr = cellW - 12, cellH = qr + (caption === 'none' ? 8 : 16)
    const perPage = perRow * Math.floor((H - 2 * M) / cellH)
    let page = pdf.addPage([W, H]), n = 0
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i]
      let png
      try { png = await pdf.embedPng(dataUrlBytes(await QRCode.toDataURL(r.value, { ...opts, width: 400 }))) } catch { bad.push(r); continue }
      if (n && n % perPage === 0) page = pdf.addPage([W, H])
      const col = n % perRow, row = Math.floor((n % perPage) / perRow), x = M + col * cellW, top = H - M - row * cellH
      page.drawImage(png, { x: x + (cellW - qr) / 2, y: top - qr, width: qr, height: qr })
      if (caption !== 'none') {
        let t = latin1(caption === 'name' ? r.name : r.value)
        while (t.length > 1 && font.widthOfTextAtSize(t, FS) > cellW - 4) t = t.slice(0, -2) + '…'
        page.drawText(t, { x: x + (cellW - font.widthOfTextAtSize(t, FS)) / 2, y: top - qr - FS - 2, size: FS, font, color: rgb(0.1, 0.1, 0.1) })
      }
      n++
      if (i % 20 === 19) { setBusy({ what: 'Laying out the sheet', done: i + 1 }); await tick() }
    }
    if (!n) throw new Error('None of the rows could be turned into a QR code.')
    downloadBlob('qr-sheet.pdf', new Blob([await pdf.save() as BlobPart], { type: 'application/pdf' }))
  })

  return (
    <>
      <BulkToggle bulk onChange={(b) => { if (!b) onSingle() }} single="One QR code" many="Many (bulk list)" />
      <div className="seg" role="group" aria-label="List format" style={{ alignSelf: 'flex-start' }}>
        <button aria-pressed={layout === 'lines'} onClick={() => setLayout('lines')}>One value per line</button>
        <button aria-pressed={layout === 'pairs'} onClick={() => setLayout('pairs')}>value,filename</button>
        <button aria-pressed={layout === 'csv'} onClick={() => { setLayout('csv'); setValueCol(0); setNameCol(-1) }}>CSV with header</button>
      </div>
      <Field label={layout === 'csv' ? 'CSV (first line is the header)' : layout === 'pairs' ? 'One “value,filename” per line' : 'One link, text or ID per line'} hint={`Up to ${MAX_ROWS.toLocaleString()} rows. Empty lines are skipped.`}>
        <textarea aria-label="List of values" className="mono" value={text} onChange={(e) => setText(e.target.value)} style={{ minHeight: 140 }} spellCheck={false} />
      </Field>
      <FileDrop accept=".csv,.txt,.tsv,text/csv,text/plain" onFiles={(f) => load(f[0])} label="…or drop a CSV or TXT file" hint="Read on your device — nothing is uploaded." />
      {layout === 'csv' && header.length > 0 && (
        <Row>
          <Field label="Value column"><select value={valueCol} onChange={(e) => setValueCol(+e.target.value)}>{header.map((h, i) => <option key={i} value={i}>{h || `Column ${i + 1}`}</option>)}</select></Field>
          <Field label="Filename column"><select value={nameCol} onChange={(e) => setNameCol(+e.target.value)}><option value={-1}>None (number + value)</option>{header.map((h, i) => <option key={i} value={i}>{h || `Column ${i + 1}`}</option>)}</select></Field>
        </Row>
      )}
      <LookControls look={look} onChange={setLook} />
      <div className="muted" style={{ fontSize: 13 }} aria-live="polite">
        {rows.length.toLocaleString()} QR code{rows.length === 1 ? '' : 's'}{total > MAX_ROWS ? ` — only the first ${MAX_ROWS.toLocaleString()} of ${total.toLocaleString()} rows are used` : ''}
      </div>
      {previews.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))', gap: 10 }}>
          {rows.slice(0, 24).map((r, i) => (
            <figure key={i} style={{ margin: 0, textAlign: 'center', minWidth: 0 }}>
              {previews[i] ? <img src={previews[i]!} alt={`QR code for ${r.value}`} style={{ width: '100%', borderRadius: 4 }} /> : previews[i] === null ? <div className="error" style={{ fontSize: 12 }}>Too long</div> : <div style={{ aspectRatio: '1' }} />}
              <figcaption className="muted" style={{ fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.name}>{r.name}</figcaption>
            </figure>
          ))}
        </div>
      )}
      {rows.length > 24 && <div className="muted" style={{ fontSize: 13 }}>Showing the first 24.</div>}
      <Row>
        <Field label="Files in the ZIP"><select value={format} onChange={(e) => setFormat(e.target.value as typeof format)}><option value="png">PNG</option><option value="svg">SVG</option><option value="both">PNG + SVG</option></select></Field>
        <Field label="Print sheet: per row"><select value={perRow} onChange={(e) => setPerRow(+e.target.value)}>{[3, 4, 5, 6].map((n) => <option key={n} value={n}>{n} across</option>)}</select></Field>
        <Field label="Text under each"><select value={caption} onChange={(e) => setCaption(e.target.value as typeof caption)}><option value="value">Value</option><option value="name">Filename</option><option value="none">Nothing</option></select></Field>
      </Row>
      <Row>
        <button className="btn primary" disabled={!rows.length || !!busy} onClick={zip}>Download all as ZIP ({rows.length})</button>
        <button className="btn" disabled={!rows.length || !!busy} onClick={sheet}>Print sheet (A4 PDF)</button>
      </Row>
      {busy && <Progress value={busy.done} max={rows.length} label={busy.what} />}
      <ErrorBox message={error} />
      {failed.length > 0 && <div className="notice"><span>{failed.length} row{failed.length === 1 ? '' : 's'} had too much data for a QR code and {failed.length === 1 ? 'was' : 'were'} skipped: {failed.slice(0, 20).map((r) => `line ${r.line}`).join(', ')}{failed.length > 20 ? '…' : ''}</span></div>}
    </>
  )
}

export default function QrCode({ preset = 'text' }: { preset?: string }) {
  const [kind, setKind] = useState<Kind>((KINDS.find(([k]) => k === preset)?.[0]) ?? 'text')
  const [forms, setForms] = useState(DEFAULTS)
  const [size, setSize] = useState(320)
  const [fg, setFg] = useState('#000000')
  const [bg, setBg] = useState('#ffffff')
  const [ecl, setEcl] = useState<Ecl>('M')
  const [bulk, setBulk] = useState(false)
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

  // bulk lists only make sense for plain links/text, so landing pages for Wi-Fi, UPI… stay single
  const canBulk = preset === 'text' && kind === 'text'
  const look: Look = { size, ecl, fg, bg }
  const setLook = (l: Look) => { setSize(l.size); setEcl(l.ecl); setFg(l.fg); setBg(l.bg) }

  if (bulk && canBulk) return <BulkQr look={look} setLook={setLook} onSingle={() => setBulk(false)} />
  return (
    <>
      <Row>{KINDS.map(([k, l]) => <button key={k} className={`chip ${kind === k ? 'active' : ''}`} onClick={() => setKind(k)}>{l}</button>)}</Row>
      {canBulk && <BulkToggle bulk={false} onChange={setBulk} single="One QR code" many="Many (bulk list)" />}
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
      <LookControls look={look} onChange={setLook} />
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
