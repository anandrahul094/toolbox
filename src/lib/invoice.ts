import { PDFDocument, rgb, type PDFFont, type PDFImage, type PDFPage } from 'pdf-lib'
import { wordsIndian, wordsInternational } from './money'

export interface Party { name: string; address: string; gstin: string; phone: string; email: string; state: string }
export interface Item { id: number; desc: string; hsn: string; qty: number; unit: string; rate: number; disc: number; tax: number }
export interface Invoice {
  kind: string; number: string; date: string; due: string; currency: string
  taxMode: 'gst' | 'simple' | 'none'; showHsn: boolean; showDisc: boolean
  seller: Party; buyer: Party; shipTo: string
  items: Item[]; shipping: number; roundOff: boolean
  notes: string; terms: string
  bank: { name: string; account: string; ifsc: string; holder: string; upi: string }
  logo: string | null; sign: string | null
}

export const GST_RATES = [0, 0.25, 3, 5, 12, 18, 28]
export const KINDS = ['Tax Invoice', 'Invoice', 'Bill of Supply', 'Proforma Invoice', 'Quotation', 'Estimate', 'Receipt', 'Cash Memo']

export const STATES = [
  ['01', 'Jammu and Kashmir'], ['02', 'Himachal Pradesh'], ['03', 'Punjab'], ['04', 'Chandigarh'], ['05', 'Uttarakhand'], ['06', 'Haryana'], ['07', 'Delhi'],
  ['08', 'Rajasthan'], ['09', 'Uttar Pradesh'], ['10', 'Bihar'], ['11', 'Sikkim'], ['12', 'Arunachal Pradesh'], ['13', 'Nagaland'], ['14', 'Manipur'], ['15', 'Mizoram'],
  ['16', 'Tripura'], ['17', 'Meghalaya'], ['18', 'Assam'], ['19', 'West Bengal'], ['20', 'Jharkhand'], ['21', 'Odisha'], ['22', 'Chhattisgarh'], ['23', 'Madhya Pradesh'],
  ['24', 'Gujarat'], ['26', 'Dadra and Nagar Haveli and Daman and Diu'], ['27', 'Maharashtra'], ['29', 'Karnataka'], ['30', 'Goa'], ['31', 'Lakshadweep'], ['32', 'Kerala'],
  ['33', 'Tamil Nadu'], ['34', 'Puducherry'], ['35', 'Andaman and Nicobar Islands'], ['36', 'Telangana'], ['37', 'Andhra Pradesh'], ['38', 'Ladakh'], ['97', 'Other Territory'],
]
/** "Assam (18)" from a GSTIN's first two digits, when the state field is empty */
export const stateFromGstin = (g: string) => STATES.find(([c]) => c === g.trim().slice(0, 2))?.[1] ?? ''

export function money(n: number, currency: string) {
  try { return new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n) } catch { return `${currency} ${n.toFixed(2)}` }
}
export const fmtDate = (d: string) => (d ? new Date(d + 'T00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '')
const r2 = (n: number) => Math.round(n * 100) / 100

export function totals(inv: Invoice) {
  const lines = inv.items.filter((i) => i.desc.trim() || i.rate).map((i) => {
    const gross = i.qty * i.rate
    const amount = r2(gross * (1 - (inv.showDisc ? i.disc : 0) / 100))
    const tax = inv.taxMode === 'none' ? 0 : r2((amount * i.tax) / 100)
    return { ...i, amount, taxAmt: tax }
  })
  const sellerState = inv.seller.state || stateFromGstin(inv.seller.gstin)
  const buyerState = inv.buyer.state || stateFromGstin(inv.buyer.gstin)
  // GST: same state → CGST + SGST; different states → IGST
  const intra = !buyerState || !sellerState || buyerState === sellerState
  const byRate = new Map<number, { taxable: number; tax: number }>()
  for (const l of lines) { if (!l.tax || inv.taxMode === 'none') continue; const e = byRate.get(l.tax) ?? { taxable: 0, tax: 0 }; e.taxable += l.amount; e.tax += l.taxAmt; byRate.set(l.tax, e) }
  const subtotal = r2(lines.reduce((s, l) => s + l.amount, 0))
  const tax = r2(lines.reduce((s, l) => s + l.taxAmt, 0))
  const raw = subtotal + tax + (inv.shipping || 0)
  const total = inv.roundOff ? Math.round(raw) : r2(raw)
  return { lines, subtotal, tax, byRate: [...byRate.entries()].sort((a, b) => a[0] - b[0]), intra, round: r2(total - raw), total, buyerState, sellerState }
}

export function amountInWords(n: number, currency: string) {
  const whole = Math.floor(n + 1e-9), cents = Math.round((n - whole) * 100)
  if (currency === 'INR') return `Rupees ${wordsIndian(whole)}${cents ? ` and ${wordsIndian(cents)} Paise` : ''} Only`
  let name = currency
  try { name = new Intl.DisplayNames(['en'], { type: 'currency' }).of(currency) ?? currency } catch { /* keep code */ }
  return `${name} ${wordsInternational(whole)}${cents ? ` and ${wordsInternational(cents)} Cents` : ''} Only`
}

// ── PDF ──
let fontCache: Promise<[ArrayBuffer, ArrayBuffer]> | null = null
const fonts = () => (fontCache ??= Promise.all(['/fonts/NotoSans-Regular.ttf', '/fonts/NotoSans-Bold.ttf'].map((u) => fetch(u).then((r) => { if (!r.ok) throw new Error('Font failed to load'); return r.arrayBuffer() }))) as Promise<[ArrayBuffer, ArrayBuffer]>)

const INK = rgb(0.11, 0.12, 0.14), MUTED = rgb(0.42, 0.44, 0.48), LINE = rgb(0.85, 0.86, 0.88), SHADE = rgb(0.95, 0.95, 0.96)

function wrap(text: string, font: PDFFont, size: number, width: number) {
  const out: string[] = []
  for (const para of text.split('\n')) {
    let line = ''
    for (const word of para.split(/\s+/)) {
      const t = line ? `${line} ${word}` : word
      if (font.widthOfTextAtSize(t, size) <= width) { line = t; continue }
      if (line) out.push(line)
      // words longer than the width are broken by character
      let w = word
      while (font.widthOfTextAtSize(w, size) > width && w.length > 1) {
        let k = w.length - 1
        while (k > 1 && font.widthOfTextAtSize(w.slice(0, k), size) > width) k--
        out.push(w.slice(0, k)); w = w.slice(k)
      }
      line = w
    }
    out.push(line)
  }
  return out
}

async function embedImage(pdf: PDFDocument, dataUrl: string | null): Promise<PDFImage | null> {
  if (!dataUrl) return null
  try { return dataUrl.startsWith('data:image/png') ? await pdf.embedPng(dataUrl) : await pdf.embedJpg(dataUrl) } catch { return null }
}

export async function buildInvoicePdf(inv: Invoice, upiQr: string | null): Promise<Uint8Array> {
  const fontkit = (await import('@pdf-lib/fontkit')).default
  const [reg, bold] = await fonts()
  const pdf = await PDFDocument.create()
  pdf.registerFontkit(fontkit)
  const F = await pdf.embedFont(reg, { subset: true }), B = await pdf.embedFont(bold, { subset: true })
  pdf.setTitle(`${inv.kind} ${inv.number}`.trim()); pdf.setProducer('The Toolbox'); pdf.setCreator('The Toolbox — thetoolbox.site')
  const [logo, sign, qr] = await Promise.all([embedImage(pdf, inv.logo), embedImage(pdf, inv.sign), embedImage(pdf, upiQr)])
  const t = totals(inv)
  const cur = (n: number) => money(n, inv.currency)
  const W = 595.28, H = 841.89, M = 40, CW = W - 2 * M

  let page: PDFPage = pdf.addPage([W, H])
  let y = H - M
  const text = (s: string, x: number, yy: number, o: { size?: number; font?: PDFFont; color?: ReturnType<typeof rgb>; align?: 'left' | 'right' | 'center'; width?: number } = {}) => {
    const size = o.size ?? 9, font = o.font ?? F
    let xx = x
    if (o.align === 'right') xx = x - font.widthOfTextAtSize(s, size)
    if (o.align === 'center' && o.width !== undefined) xx = x + (o.width - font.widthOfTextAtSize(s, size)) / 2
    page.drawText(s, { x: xx, y: yy, size, font, color: o.color ?? INK })
  }
  const block = (lines: string[], x: number, yy: number, size = 9, font = F, color = INK, lh = size * 1.35) => { lines.forEach((l, i) => text(l, x, yy - i * lh, { size, font, color })); return lines.length * lh }

  // header: logo + seller on the left, title and numbers on the right
  let leftY = y
  if (logo) {
    const s = Math.min(150 / logo.width, 56 / logo.height)
    page.drawImage(logo, { x: M, y: y - logo.height * s, width: logo.width * s, height: logo.height * s })
    leftY = y - logo.height * s - 10
  }
  if (inv.seller.name) { text(inv.seller.name, M, leftY - 11, { size: 13, font: B }); leftY -= 18 }
  const sellerLines = [
    ...wrap(inv.seller.address, F, 9, CW * 0.5),
    ...(t.sellerState ? [`State: ${t.sellerState}`] : []),
    ...(inv.seller.gstin ? [`GSTIN: ${inv.seller.gstin.toUpperCase()}`] : []),
    ...[inv.seller.phone, inv.seller.email].filter(Boolean).length ? [[inv.seller.phone, inv.seller.email].filter(Boolean).join('  ·  ')] : [],
  ]
  leftY -= block(sellerLines, M, leftY - 9, 9, F, MUTED)

  text(inv.kind.toUpperCase(), W - M, y - 18, { size: 18, font: B, align: 'right' })
  let ry = y - 38
  for (const [k, v] of [['No.', inv.number], ['Date', fmtDate(inv.date)], ['Due date', fmtDate(inv.due)]] as const) {
    if (!v) continue
    text(k, W - M - 150, ry, { size: 9, color: MUTED }); text(v, W - M, ry, { size: 9, font: B, align: 'right' }); ry -= 13
  }
  y = Math.min(leftY, ry) - 14
  page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.8, color: LINE })
  y -= 16

  // bill to / ship to
  const colW = CW / 2 - 10
  text('BILL TO', M, y, { size: 8, font: B, color: MUTED })
  if (inv.shipTo.trim()) text('SHIP TO', M + CW / 2 + 10, y, { size: 8, font: B, color: MUTED })
  y -= 14
  let by = y
  if (inv.buyer.name) { text(inv.buyer.name, M, by, { size: 11, font: B }); by -= 15 }
  by -= block([
    ...wrap(inv.buyer.address, F, 9, colW),
    ...(t.buyerState ? [`State: ${t.buyerState}${inv.taxMode === 'gst' ? `  ·  Place of supply: ${t.buyerState}` : ''}`] : []),
    ...(inv.buyer.gstin ? [`GSTIN: ${inv.buyer.gstin.toUpperCase()}`] : []),
    ...[inv.buyer.phone, inv.buyer.email].filter(Boolean).length ? [[inv.buyer.phone, inv.buyer.email].filter(Boolean).join('  ·  ')] : [],
  ], M, by, 9, F, MUTED)
  let sy = y
  if (inv.shipTo.trim()) sy -= block(wrap(inv.shipTo, F, 9, colW), M + CW / 2 + 10, sy, 9, F, MUTED)
  y = Math.min(by, sy) - 14

  // items table
  const showTax = inv.taxMode !== 'none'
  type Col = { key: string; label: string; w: number; align: 'left' | 'right' }
  const cols: Col[] = [
    { key: 'n', label: '#', w: 20, align: 'left' },
    { key: 'desc', label: 'Item', w: 0, align: 'left' },
    ...(inv.showHsn ? [{ key: 'hsn', label: 'HSN/SAC', w: 52, align: 'left' as const }] : []),
    { key: 'qty', label: 'Qty', w: 48, align: 'right' },
    { key: 'rate', label: 'Rate', w: 70, align: 'right' },
    ...(inv.showDisc ? [{ key: 'disc', label: 'Disc.', w: 36, align: 'right' as const }] : []),
    ...(showTax ? [{ key: 'tax', label: inv.taxMode === 'gst' ? 'GST' : 'Tax', w: 36, align: 'right' as const }] : []),
    { key: 'amount', label: 'Amount', w: 80, align: 'right' },
  ]
  cols[1].w = CW - cols.reduce((s, c) => s + c.w, 0)
  const head = () => {
    page.drawRectangle({ x: M, y: y - 6, width: CW, height: 20, color: SHADE })
    let x = M
    for (const c of cols) { text(c.label, c.align === 'right' ? x + c.w - 6 : x + 6, y, { size: 8.5, font: B, align: c.align }); x += c.w }
    y -= 22
  }
  const newPage = () => { page = pdf.addPage([W, H]); y = H - M }
  head()
  t.lines.forEach((l, i) => {
    const desc = wrap(l.desc || '—', F, 9, cols[1].w - 12)
    const rowH = Math.max(1, desc.length) * 12 + 8
    if (y - rowH < M + 40) { newPage(); head() }
    const cell: Record<string, string> = {
      n: String(i + 1), hsn: l.hsn, qty: `${+l.qty.toFixed(3)}${l.unit ? ` ${l.unit}` : ''}`, rate: cur(l.rate).replace(/\s/g, ' '),
      disc: l.disc ? `${l.disc}%` : '—', tax: `${l.tax}%`, amount: cur(l.amount),
    }
    let x = M
    for (const c of cols) {
      if (c.key === 'desc') block(desc, x + 6, y, 9, F, INK, 12)
      else text(cell[c.key] ?? '', c.align === 'right' ? x + c.w - 6 : x + 6, y, { size: 9, align: c.align })
      x += c.w
    }
    y -= rowH
    page.drawLine({ start: { x: M, y: y + 10 }, end: { x: W - M, y: y + 10 }, thickness: 0.5, color: LINE })
  })

  // totals on the right, amount in words on the left
  const rows: [string, string, boolean?][] = [['Subtotal', cur(t.subtotal)]]
  if (inv.taxMode === 'gst') {
    for (const [rate, v] of t.byRate) {
      if (t.intra) { rows.push([`CGST @ ${rate / 2}%`, cur(v.tax / 2)]); rows.push([`SGST @ ${rate / 2}%`, cur(v.tax / 2)]) }
      else rows.push([`IGST @ ${rate}%`, cur(v.tax)])
    }
  } else if (inv.taxMode === 'simple') for (const [rate, v] of t.byRate) rows.push([`Tax @ ${rate}%`, cur(v.tax)])
  if (inv.shipping) rows.push(['Shipping / other charges', cur(inv.shipping)])
  if (inv.roundOff && t.round) rows.push(['Round off', `${t.round > 0 ? '+' : ''}${cur(t.round)}`])
  rows.push(['Total', cur(t.total), true])
  const need = rows.length * 15 + 40
  if (y - need < M) newPage()
  y -= 4
  const tx = W - M - 220
  let ty = y
  for (const [k, v, strong] of rows) {
    if (strong) { page.drawRectangle({ x: tx - 6, y: ty - 7, width: 226, height: 22, color: SHADE }); ty -= 2 }
    text(k, tx, ty, { size: strong ? 11 : 9, font: strong ? B : F, color: strong ? INK : MUTED })
    text(v, W - M - 6, ty, { size: strong ? 11 : 9, font: strong ? B : F, align: 'right' })
    ty -= strong ? 22 : 15
  }
  text('Amount in words', M, y, { size: 8, font: B, color: MUTED })
  const words = wrap(amountInWords(t.total, inv.currency), F, 9, CW - 250)
  const wy = y - 13 - block(words, M, y - 13, 9)
  y = Math.min(ty, wy) - 12

  // bank details + UPI QR, signature
  const bankLines = [
    inv.bank.holder && `Account name: ${inv.bank.holder}`, inv.bank.name && `Bank: ${inv.bank.name}`,
    inv.bank.account && `A/c no.: ${inv.bank.account}`, inv.bank.ifsc && `IFSC: ${inv.bank.ifsc.toUpperCase()}`, inv.bank.upi && `UPI: ${inv.bank.upi}`,
  ].filter(Boolean) as string[]
  const footH = Math.max(bankLines.length ? bankLines.length * 12 + 18 : 0, qr ? 86 : 0, 70)
  if (y - footH < M) newPage()
  let fy = y
  if (bankLines.length) { text('PAYMENT DETAILS', M, fy, { size: 8, font: B, color: MUTED }); block(bankLines, M, fy - 14, 9) }
  if (qr) { const s = 72; page.drawImage(qr, { x: M + 210, y: fy - s - 4, width: s, height: s }); text('Scan to pay (UPI)', M + 210, fy - s - 14, { size: 7.5, color: MUTED }) }
  const sx = W - M - 160
  if (sign) { const s = Math.min(150 / sign.width, 44 / sign.height); page.drawImage(sign, { x: W - M - sign.width * s, y: fy - 50, width: sign.width * s, height: sign.height * s }) }
  if (inv.seller.name) text(`For ${inv.seller.name}`, W - M, fy, { size: 9, font: B, align: 'right' })
  page.drawLine({ start: { x: sx, y: fy - 56 }, end: { x: W - M, y: fy - 56 }, thickness: 0.5, color: LINE })
  text('Authorised signatory', W - M, fy - 67, { size: 8, color: MUTED, align: 'right' })
  y = fy - footH - 6

  for (const [label, body] of [['Notes', inv.notes], ['Terms & conditions', inv.terms]] as const) {
    if (!body.trim()) continue
    const lines = wrap(body, F, 8.5, CW)
    if (y - lines.length * 11 - 16 < M) newPage()
    text(label.toUpperCase(), M, y, { size: 8, font: B, color: MUTED })
    y -= 13 + block(lines, M, y - 13, 8.5, F, MUTED, 11) + 6
  }
  if (inv.kind === 'Tax Invoice' && inv.taxMode === 'gst') {
    if (y < M + 14) newPage()
    text('This is a computer-generated invoice.', W / 2, M - 14, { size: 7.5, color: MUTED, align: 'center', width: 0 })
  }
  // page numbers when there is more than one page
  const pages = pdf.getPages()
  if (pages.length > 1) pages.forEach((p, i) => p.drawText(`Page ${i + 1} of ${pages.length}`, { x: W - M - F.widthOfTextAtSize(`Page ${i + 1} of ${pages.length}`, 7.5), y: 22, size: 7.5, font: F, color: MUTED }))
  return pdf.save()
}
