import { useEffect, useMemo, useRef, useState } from 'react'
import { Plus, Trash2, X } from 'lucide-react'
import { downloadBlob, ErrorBox, Field, FileDrop, loadImage, NumberInput, Row } from '../components/ui'
import { pdfBlob, renderPage } from '../lib/pdf'
import { amountInWords, buildInvoicePdf, GST_RATES, KINDS, money, STATES, stateFromGstin, totals, type Invoice, type Item, type Party } from '../lib/invoice'

const KEY = 'toolbox.invoice.business' // only saved when the person ticks "remember"
const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SAR', 'SGD', 'AUD', 'CAD', 'NPR', 'BDT', 'LKR', 'JPY']
const UNITS = ['', 'pcs', 'nos', 'hrs', 'days', 'kg', 'g', 'ltr', 'm', 'sq ft', 'box', 'set', 'month']
const GSTIN_RE = /^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/

const today = () => new Date().toISOString().slice(0, 10)
const plusDays = (d: string, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10) }
const emptyParty = (): Party => ({ name: '', address: '', gstin: '', phone: '', email: '', state: '' })
let nextId = 1
const newItem = (tax = 18): Item => ({ id: nextId++, desc: '', hsn: '', qty: 1, unit: '', rate: 0, disc: 0, tax })

interface Saved { seller: Party; bank: Invoice['bank']; logo: string | null; sign: string | null; terms: string; currency: string; taxMode: Invoice['taxMode']; lastNumber: string }
function loadSaved(): Saved | null { try { return JSON.parse(localStorage.getItem(KEY) ?? 'null') } catch { return null } }
const bumpNumber = (n: string) => n.replace(/(\d+)(?!.*\d)/, (m) => String(+m + 1).padStart(m.length, '0'))

async function imageToDataUrl(file: File, max = 600) {
  const img = await loadImage(file)
  const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight))
  const c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k)
  c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
  return c.toDataURL('image/png')
}

export default function InvoiceGenerator() {
  const saved = useMemo(loadSaved, [])
  const [remember, setRemember] = useState(!!saved)
  const [inv, setInv] = useState<Invoice>(() => ({
    kind: 'Tax Invoice', number: saved?.lastNumber ? bumpNumber(saved.lastNumber) : 'INV-001', date: today(), due: plusDays(today(), 15),
    currency: saved?.currency ?? 'INR', taxMode: saved?.taxMode ?? 'gst', showHsn: true, showDisc: false,
    seller: saved?.seller ?? emptyParty(), buyer: emptyParty(), shipTo: '',
    items: [newItem()], shipping: 0, roundOff: true, notes: 'Thank you for your business!', terms: saved?.terms ?? '',
    bank: saved?.bank ?? { name: '', account: '', ifsc: '', holder: '', upi: '' }, logo: saved?.logo ?? null, sign: saved?.sign ?? null,
  }))
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const preview = useRef<HTMLCanvasElement>(null)
  const t = totals(inv)
  const set = <K extends keyof Invoice>(k: K, v: Invoice[K]) => setInv((p) => ({ ...p, [k]: v }))
  const setParty = (who: 'seller' | 'buyer', k: keyof Party, v: string) => setInv((p) => ({ ...p, [who]: { ...p[who], [k]: v } }))
  const setItem = (id: number, patch: Partial<Item>) => setInv((p) => ({ ...p, items: p.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) }))

  // UPI payment QR with the amount filled in (India only)
  const upiLink = inv.bank.upi.includes('@') && inv.currency === 'INR'
    ? `upi://pay?pa=${encodeURIComponent(inv.bank.upi.trim())}&pn=${encodeURIComponent(inv.bank.holder || inv.seller.name || 'Payee')}&am=${t.total.toFixed(2)}&cu=INR&tn=${encodeURIComponent(`${inv.kind} ${inv.number}`.slice(0, 50))}`
    : null

  const build = async () => {
    const qr = upiLink ? await (await import('qrcode')).default.toDataURL(upiLink, { margin: 1, width: 300, errorCorrectionLevel: 'M' }) : null
    return buildInvoicePdf(inv, qr)
  }

  // live preview of page 1, a moment after typing stops
  useEffect(() => {
    let cancelled = false
    const timer = setTimeout(async () => {
      try {
        const bytes = await build()
        if (cancelled || !preview.current) return
        const { getPdfjs } = await import('../lib/pdf')
        const pdfjs = await getPdfjs()
        const doc = await pdfjs.getDocument({ data: bytes }).promise
        if (!cancelled && preview.current) await renderPage(doc, 1, 1.4, preview.current)
        doc.destroy()
        setError(null)
      } catch (e) { if (!cancelled) setError(`Preview failed: ${(e as Error).message}`) }
    }, 500)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [inv]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!remember) { try { localStorage.removeItem(KEY) } catch { /* ignore */ } return }
    const s: Saved = { seller: inv.seller, bank: inv.bank, logo: inv.logo, sign: inv.sign, terms: inv.terms, currency: inv.currency, taxMode: inv.taxMode, lastNumber: inv.number }
    try { localStorage.setItem(KEY, JSON.stringify(s)) } catch { setError('Couldn’t save your details — the logo may be too large for this browser’s storage.') }
  }, [remember, inv.seller, inv.bank, inv.logo, inv.sign, inv.terms, inv.currency, inv.taxMode, inv.number])

  const download = async () => {
    setBusy(true)
    try {
      const name = `${inv.kind.replace(/\s+/g, '-')}-${inv.number || 'draft'}${inv.buyer.name ? `-${inv.buyer.name}` : ''}`.replace(/[^\w.-]+/g, '_')
      downloadBlob(`${name}.pdf`, pdfBlob(await build()))
    } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }

  const party = (who: 'seller' | 'buyer', title: string) => {
    const p = inv[who]
    const gstBad = p.gstin.trim() && !GSTIN_RE.test(p.gstin.trim().toUpperCase())
    return (
      <fieldset className="card" style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 12, display: 'flex', flexDirection: 'column', gap: 8, margin: 0, minWidth: 0 }}>
        <legend className="field-label" style={{ padding: '0 4px' }}>{title}</legend>
        <Field label={who === 'seller' ? 'Business name' : 'Customer name'}><input value={p.name} onChange={(e) => setParty(who, 'name', e.target.value)} /></Field>
        <Field label="Address"><textarea value={p.address} onChange={(e) => setParty(who, 'address', e.target.value)} style={{ minHeight: 60, fontFamily: 'inherit' }} /></Field>
        {inv.taxMode === 'gst' && (
          <Row>
            <Field label="GSTIN" hint={gstBad ? 'This doesn’t look like a 15-character GSTIN.' : who === 'buyer' ? 'Leave empty for consumers (B2C).' : undefined}>
              <input value={p.gstin} maxLength={15} onChange={(e) => { const g = e.target.value.toUpperCase(); setParty(who, 'gstin', g); if (!p.state && stateFromGstin(g)) setParty(who, 'state', stateFromGstin(g)) }} style={{ textTransform: 'uppercase' }} aria-invalid={!!gstBad} />
            </Field>
            <Field label="State">
              <select value={p.state} onChange={(e) => setParty(who, 'state', e.target.value)}><option value="">—</option>{STATES.map(([c, s]) => <option key={c} value={s}>{s} ({c})</option>)}</select>
            </Field>
          </Row>
        )}
        <Row>
          <Field label="Phone"><input value={p.phone} onChange={(e) => setParty(who, 'phone', e.target.value)} inputMode="tel" /></Field>
          <Field label="Email"><input value={p.email} onChange={(e) => setParty(who, 'email', e.target.value)} inputMode="email" /></Field>
        </Row>
      </fieldset>
    )
  }

  const imagePicker = (k: 'logo' | 'sign', label: string) => (
    inv[k]
      ? <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span className="field-label">{label}</span><img src={inv[k]!} alt={label} style={{ maxHeight: 40, maxWidth: 120, background: '#fff', border: '1px solid var(--border)', borderRadius: 4 }} /><button className="icon-only" aria-label={`Remove ${label.toLowerCase()}`} onClick={() => set(k, null)}><X size={14} /></button></div>
      : <FileDrop accept="image/png,image/jpeg,image/webp" onFiles={async (f) => { try { set(k, await imageToDataUrl(f[0])) } catch { setError('That image couldn’t be opened.') } }} label={`Add ${label.toLowerCase()} (optional)`} hint="PNG or JPG" />
  )

  return (
    <>
      <Row>
        <Field label="Document"><select value={inv.kind} onChange={(e) => set('kind', e.target.value)}>{KINDS.map((k) => <option key={k}>{k}</option>)}</select></Field>
        <Field label="Number"><input value={inv.number} onChange={(e) => set('number', e.target.value)} /></Field>
        <Field label="Date"><input type="date" value={inv.date} onChange={(e) => set('date', e.target.value)} /></Field>
        <Field label="Due date"><input type="date" value={inv.due} onChange={(e) => set('due', e.target.value)} /></Field>
      </Row>
      <Row>
        <Field label="Tax">
          <select value={inv.taxMode} onChange={(e) => set('taxMode', e.target.value as Invoice['taxMode'])}>
            <option value="gst">GST (CGST + SGST / IGST)</option><option value="simple">Simple tax / VAT %</option><option value="none">No tax</option>
          </select>
        </Field>
        <Field label="Currency"><select value={inv.currency} onChange={(e) => set('currency', e.target.value)}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</select></Field>
        <label className="check" style={{ alignSelf: 'flex-end' }}><input type="checkbox" checked={inv.showHsn} onChange={(e) => set('showHsn', e.target.checked)} /> HSN/SAC column</label>
        <label className="check" style={{ alignSelf: 'flex-end' }}><input type="checkbox" checked={inv.showDisc} onChange={(e) => set('showDisc', e.target.checked)} /> Discount column</label>
      </Row>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
        {party('seller', 'From (your business)')}
        {party('buyer', 'Bill to')}
      </div>
      <Field label="Ship to (optional)"><textarea value={inv.shipTo} onChange={(e) => set('shipTo', e.target.value)} style={{ minHeight: 44, fontFamily: 'inherit' }} placeholder="Only if different from the billing address" /></Field>
      {inv.taxMode === 'gst' && <div className="muted" style={{ fontSize: 13 }}>{t.intra ? 'Same state (or customer state not set): GST is split into CGST + SGST.' : `Different states (${t.sellerState} → ${t.buyerState}): IGST applies.`}</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span className="field-label">Items</span>
        {inv.items.map((it, i) => (
          <div key={it.id} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: 6, alignItems: 'end', padding: 8, border: '1px solid var(--border)', borderRadius: 8 }}>
            <div style={{ gridColumn: 'span 3', minWidth: 0 }}><Field label={`Item ${i + 1}`}><input value={it.desc} onChange={(e) => setItem(it.id, { desc: e.target.value })} placeholder="Description" /></Field></div>
            {inv.showHsn && <Field label="HSN/SAC"><input value={it.hsn} onChange={(e) => setItem(it.id, { hsn: e.target.value })} inputMode="numeric" /></Field>}
            <Field label="Qty"><NumberInput min={0} max={1e9} step={1} value={it.qty} onValue={(v) => setItem(it.id, { qty: v })} /></Field>
            <Field label="Unit"><select value={it.unit} onChange={(e) => setItem(it.id, { unit: e.target.value })}>{UNITS.map((u) => <option key={u} value={u}>{u || '—'}</option>)}</select></Field>
            <Field label="Rate"><NumberInput min={0} max={1e12} step={0.01} value={it.rate} onValue={(v) => setItem(it.id, { rate: v })} /></Field>
            {inv.showDisc && <Field label="Disc. %"><NumberInput min={0} max={100} step={0.5} value={it.disc} onValue={(v) => setItem(it.id, { disc: v })} /></Field>}
            {inv.taxMode === 'gst' && <Field label="GST %"><select value={it.tax} onChange={(e) => setItem(it.id, { tax: +e.target.value })}>{GST_RATES.map((r) => <option key={r} value={r}>{r}%</option>)}</select></Field>}
            {inv.taxMode === 'simple' && <Field label="Tax %"><NumberInput min={0} max={100} step={0.5} value={it.tax} onValue={(v) => setItem(it.id, { tax: v })} /></Field>}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, paddingBottom: 6 }}>
              <strong style={{ fontVariantNumeric: 'tabular-nums' }}>{money(t.lines.find((l) => l.id === it.id)?.amount ?? 0, inv.currency)}</strong>
              <button className="icon-only" aria-label={`Remove item ${i + 1}`} disabled={inv.items.length === 1} onClick={() => setInv((p) => ({ ...p, items: p.items.filter((x) => x.id !== it.id) }))}><Trash2 size={15} /></button>
            </div>
          </div>
        ))}
        <div><button className="btn" onClick={() => setInv((p) => ({ ...p, items: [...p.items, newItem(p.items.at(-1)?.tax ?? 18)] }))}><Plus size={15} aria-hidden="true" />Add item</button></div>
      </div>

      <Row>
        <Field label="Shipping / other charges"><NumberInput min={0} max={1e12} step={1} value={inv.shipping} onValue={(v) => set('shipping', v)} /></Field>
        <label className="check" style={{ alignSelf: 'flex-end' }}><input type="checkbox" checked={inv.roundOff} onChange={(e) => set('roundOff', e.target.checked)} /> Round off the total</label>
      </Row>
      <div className="stats">
        <div className="stat"><div className="stat-value" style={{ fontSize: 18 }}>{money(t.subtotal, inv.currency)}</div><div className="stat-label">Subtotal</div></div>
        <div className="stat"><div className="stat-value" style={{ fontSize: 18 }}>{money(t.tax, inv.currency)}</div><div className="stat-label">{inv.taxMode === 'gst' ? (t.intra ? 'CGST + SGST' : 'IGST') : 'Tax'}</div></div>
        <div className="stat"><div className="stat-value" style={{ fontSize: 18 }}>{money(t.total, inv.currency)}</div><div className="stat-label">Total</div></div>
      </div>
      <div className="muted" style={{ fontSize: 13 }}>{amountInWords(t.total, inv.currency)}</div>

      <details>
        <summary className="field-label" style={{ cursor: 'pointer' }}>Payment details, logo, signature and notes</summary>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
          <Row>
            <Field label="Account holder"><input value={inv.bank.holder} onChange={(e) => set('bank', { ...inv.bank, holder: e.target.value })} /></Field>
            <Field label="Bank name"><input value={inv.bank.name} onChange={(e) => set('bank', { ...inv.bank, name: e.target.value })} /></Field>
          </Row>
          <Row>
            <Field label="Account number"><input value={inv.bank.account} onChange={(e) => set('bank', { ...inv.bank, account: e.target.value })} inputMode="numeric" /></Field>
            <Field label="IFSC"><input value={inv.bank.ifsc} onChange={(e) => set('bank', { ...inv.bank, ifsc: e.target.value.toUpperCase() })} maxLength={11} /></Field>
            <Field label="UPI ID" hint={inv.currency === 'INR' ? 'Adds a “scan to pay” QR with the amount filled in.' : undefined}><input value={inv.bank.upi} onChange={(e) => set('bank', { ...inv.bank, upi: e.target.value.trim() })} placeholder="name@bank" /></Field>
          </Row>
          {imagePicker('logo', 'Logo')}
          {imagePicker('sign', 'Signature or stamp')}
          <Field label="Notes"><textarea value={inv.notes} onChange={(e) => set('notes', e.target.value)} style={{ minHeight: 50, fontFamily: 'inherit' }} /></Field>
          <Field label="Terms & conditions"><textarea value={inv.terms} onChange={(e) => set('terms', e.target.value)} style={{ minHeight: 50, fontFamily: 'inherit' }} placeholder="e.g. Payment due within 15 days. Goods once sold will not be taken back." /></Field>
        </div>
      </details>

      <label className="check"><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /> Remember my business, bank details, logo and next invoice number on this device</label>
      <ErrorBox message={error} />
      <Row>
        <button className="btn primary" disabled={busy} onClick={download}>{busy ? 'Working…' : 'Download PDF'}</button>
        <button className="btn" onClick={() => setInv((p) => ({ ...p, number: bumpNumber(p.number), buyer: emptyParty(), shipTo: '', items: [newItem(p.items[0]?.tax ?? 18)], date: today(), due: plusDays(today(), 15) }))}>New invoice</button>
      </Row>
      <div style={{ background: 'var(--surface-2)', borderRadius: 8, padding: 12, display: 'grid', placeItems: 'center' }}>
        <canvas ref={preview} aria-label="Invoice preview (first page)" style={{ width: '100%', maxWidth: 620, boxShadow: '0 2px 12px rgba(0,0,0,.12)', background: '#fff' }} />
      </div>
      <p className="muted" style={{ margin: 0, fontSize: 13 }}>Made on your device — nothing is uploaded. Check GST rates and invoice rules for your business with your accountant.</p>
    </>
  )
}
