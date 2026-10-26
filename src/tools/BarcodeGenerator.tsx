import { useEffect, useRef, useState } from 'react'
import { canvasToBlob, download, downloadBlob, ErrorBox, Field, FileDrop, loadImage, Progress, Row, uniqueNames } from '../components/ui'
import { BulkToggle } from '../components/Batch'

const FORMATS: [string, string, string][] = [
  ['CODE128', 'Code 128 (any text — most common)', 'Toolbox-2026'],
  ['EAN13', 'EAN-13 (retail products, 12–13 digits)', '890123456789'],
  ['EAN8', 'EAN-8 (small packages, 7–8 digits)', '9638507'],
  ['UPC', 'UPC-A (US retail, 11–12 digits)', '03600029145'],
  ['CODE39', 'Code 39 (A–Z, 0–9, - . $ / + %)', 'ITEM-42'],
  ['ITF14', 'ITF-14 (shipping cartons, 13–14 digits)', '1540014128876'],
]

interface Style { format: string; height: number; barWidth: number; showText: boolean; color: string }
const formatHint = (format: string) => FORMATS.find((f) => f[0] === format)![1].split('(')[1]?.replace(')', '') ?? ''

function StyleControls({ style, onChange }: { style: Style; onChange: (s: Style) => void }) {
  const { height, barWidth, color, showText } = style
  return (
    <Row>
      <Field label={`Height: ${height}px`}><input type="range" min={30} max={200} value={height} onChange={(e) => onChange({ ...style, height: +e.target.value })} /></Field>
      <Field label={`Bar width: ${barWidth}`}><input type="range" min={1} max={4} step={0.5} value={barWidth} onChange={(e) => onChange({ ...style, barWidth: +e.target.value })} /></Field>
      <Field label="Colour"><input type="color" value={color} onChange={(e) => onChange({ ...style, color: e.target.value })} /></Field>
      <label className="check"><input type="checkbox" checked={showText} onChange={(e) => onChange({ ...style, showText: e.target.checked })} /> Show text</label>
    </Row>
  )
}

// ── bulk: one barcode per line ──
const MAX_ROWS = 1000
interface Entry { line: number; value: string; name: string; svg: string | null; w: number; h: number; error?: string }
type JsB = typeof import('jsbarcode')

const slug = (s: string) => s.replace(/[^\w.-]+/g, '_').replace(/^[_.]+|[_.]+$/g, '').slice(0, 60)
const tick = () => new Promise((r) => setTimeout(r, 0))

/** Draw one barcode into a detached <svg>; null when the value isn't valid for the format. */
function renderSvg(JsBarcode: JsB, value: string, s: Style) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  let valid = true
  try {
    JsBarcode(el, value, { format: s.format, height: s.height, width: s.barWidth, displayValue: s.showText, lineColor: s.color, background: '#ffffff', margin: 12, valid: (v: boolean) => { valid = v } })
  } catch { return null }
  if (!valid) return null
  return { svg: new XMLSerializer().serializeToString(el), w: parseFloat(el.getAttribute('width') ?? '0'), h: parseFloat(el.getAttribute('height') ?? '0') }
}

async function svgToPng(e: Entry, k = 3) {
  const img = await loadImage('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(e.svg!))
  const c = document.createElement('canvas'); c.width = Math.ceil(e.w * k); c.height = Math.ceil(e.h * k)
  const ctx = c.getContext('2d')!; ctx.scale(k, k); ctx.drawImage(img, 0, 0, e.w, e.h)
  return canvasToBlob(c, 'image/png')
}

function BulkBarcodes({ style, setStyle, onSingle }: { style: Style; setStyle: (s: Style) => void; onSingle: () => void }) {
  const [text, setText] = useState('ITEM-001\nITEM-002\nITEM-003')
  const [entries, setEntries] = useState<Entry[]>([])
  const [total, setTotal] = useState(0)
  const [kind, setKind] = useState<'png' | 'svg' | 'both'>('png')
  const [perRow, setPerRow] = useState(3)
  const [busy, setBusy] = useState<{ what: string; done: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    // debounce so typing in the list doesn't redraw every barcode on each keystroke
    const t = setTimeout(async () => {
      const { default: JsBarcode } = await import('jsbarcode')
      const lines = text.split(/\r?\n/).map((l, i) => ({ value: l.trim(), line: i + 1 })).filter((l) => l.value)
      const rows = lines.slice(0, MAX_ROWS)
      const names = uniqueNames(rows.map((r, k) => `${String(k + 1).padStart(Math.max(3, String(rows.length).length), '0')}-${slug(r.value) || 'barcode'}`))
      const out = rows.map((r, k): Entry => {
        const got = renderSvg(JsBarcode, r.value, style)
        return got ? { ...r, name: names[k], ...got } : { ...r, name: names[k], svg: null, w: 0, h: 0, error: `Not valid for ${style.format}` }
      })
      if (!cancelled) { setEntries(out); setTotal(lines.length) }
    }, 200)
    return () => { cancelled = true; clearTimeout(t) }
  }, [text, style.format, style.height, style.barWidth, style.showText, style.color]) // eslint-disable-line react-hooks/exhaustive-deps

  const load = async (f: File) => {
    const t = await f.text()
    // from a CSV take the first column; a plain list is used as is
    setText(/\.(csv|tsv)$/i.test(f.name) || f.type === 'text/csv'
      ? t.split(/\r?\n/).map((l) => (l.match(/^\s*"((?:[^"]|"")*)"/)?.[1].replace(/""/g, '"') ?? l.split(/[,;\t]/)[0]).trim()).join('\n')
      : t)
  }

  const good = entries.filter((e) => e.svg)
  const bad = entries.filter((e) => !e.svg)

  const run = async (what: string, job: () => Promise<void>) => {
    setBusy({ what, done: 0 }); setError(null)
    try { await job() } catch (e) { setError((e as Error).message || 'Something went wrong.') }
    setBusy(null)
  }

  const zip = () => run('Creating barcodes', async () => {
    const JSZip = (await import('jszip')).default
    const z = new JSZip()
    for (let i = 0; i < good.length; i++) {
      const e = good[i]
      if (kind !== 'svg') z.file(`${e.name}.png`, await svgToPng(e))
      if (kind !== 'png') z.file(`${e.name}.svg`, e.svg!)
      if (i % 20 === 19) { setBusy({ what: 'Creating barcodes', done: i + 1 }); await tick() }
    }
    downloadBlob('barcodes.zip', await z.generateAsync({ type: 'blob', compression: 'STORE' }))
  })

  const sheet = () => run('Laying out the sheet', async () => {
    const { PDFDocument } = await import('pdf-lib')
    const pdf = await PDFDocument.create()
    // A4 in points; barcodes are drawn at their natural size (96 dpi) unless too wide for a cell
    const W = 595.28, H = 841.89, M = 28, PX = 0.75
    const cellW = (W - 2 * M) / perRow
    const fit = (e: Entry) => Math.min(PX, (cellW - 10) / e.w)
    const cellH = Math.max(...good.map((e) => e.h * fit(e))) + 12
    const perPage = perRow * Math.max(1, Math.floor((H - 2 * M) / cellH))
    let page = pdf.addPage([W, H])
    for (let i = 0; i < good.length; i++) {
      const e = good[i], k = fit(e)
      if (i && i % perPage === 0) page = pdf.addPage([W, H])
      const col = i % perRow, row = Math.floor((i % perPage) / perRow)
      const png = await pdf.embedPng(new Uint8Array(await (await svgToPng(e)).arrayBuffer()))
      page.drawImage(png, { x: M + col * cellW + (cellW - e.w * k) / 2, y: H - M - row * cellH - e.h * k, width: e.w * k, height: e.h * k })
      if (i % 20 === 19) { setBusy({ what: 'Laying out the sheet', done: i + 1 }); await tick() }
    }
    downloadBlob('barcode-sheet.pdf', new Blob([await pdf.save() as BlobPart], { type: 'application/pdf' }))
  })

  return (
    <>
      <BulkToggle bulk onChange={(b) => { if (!b) onSingle() }} single="One barcode" many="Many (bulk list)" />
      <Field label="Barcode type">
        <select value={style.format} onChange={(e) => setStyle({ ...style, format: e.target.value })}>
          {FORMATS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </Field>
      <Field label="One value per line" hint={`Up to ${MAX_ROWS.toLocaleString()} rows. Empty lines are skipped.`}>
        <textarea aria-label="List of values" className="mono" value={text} onChange={(e) => setText(e.target.value)} style={{ minHeight: 140 }} spellCheck={false} />
      </Field>
      <FileDrop accept=".csv,.txt,.tsv,text/csv,text/plain" onFiles={(f) => load(f[0])} label="…or drop a CSV or TXT file (first column is used)" hint="Read on your device — nothing is uploaded." />
      <StyleControls style={style} onChange={setStyle} />
      <div className="muted" style={{ fontSize: 13 }} aria-live="polite">
        {good.length.toLocaleString()} barcode{good.length === 1 ? '' : 's'}{bad.length ? ` · ${bad.length} invalid` : ''}{total > MAX_ROWS ? ` — only the first ${MAX_ROWS.toLocaleString()} of ${total.toLocaleString()} rows are used` : ''}
      </div>
      {bad.length > 0 && (
        <div className="notice">
          <span>
            {bad.length} row{bad.length === 1 ? ' isn’t' : 's aren’t'} valid for {style.format} ({formatHint(style.format)}) and will be skipped:{' '}
            {bad.slice(0, 20).map((e) => `line ${e.line} “${e.value.slice(0, 24)}”`).join(', ')}{bad.length > 20 ? '…' : ''}
          </span>
        </div>
      )}
      {good.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
          {good.slice(0, 24).map((e) => (
            <div key={e.line} style={{ background: '#fff', borderRadius: 6, border: '1px solid var(--border)', padding: 4, display: 'grid', placeItems: 'center' }}>
              <img src={'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(e.svg!)} alt={`Barcode for ${e.value}`} style={{ maxWidth: '100%', maxHeight: 90 }} />
            </div>
          ))}
        </div>
      )}
      {good.length > 24 && <div className="muted" style={{ fontSize: 13 }}>Showing the first 24.</div>}
      <Row>
        <Field label="Files in the ZIP"><select value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}><option value="png">PNG</option><option value="svg">SVG</option><option value="both">PNG + SVG</option></select></Field>
        <Field label="Label sheet: per row"><select value={perRow} onChange={(e) => setPerRow(+e.target.value)}>{[2, 3, 4, 5].map((n) => <option key={n} value={n}>{n} across</option>)}</select></Field>
      </Row>
      <Row>
        <button className="btn primary" disabled={!good.length || !!busy} onClick={zip}>Download all as ZIP ({good.length})</button>
        <button className="btn" disabled={!good.length || !!busy} onClick={sheet}>Label sheet (A4 PDF)</button>
      </Row>
      {busy && <Progress value={busy.done} max={good.length} label={busy.what} />}
      <ErrorBox message={error} />
    </>
  )
}

export default function BarcodeGenerator() {
  const [format, setFormat] = useState('CODE128')
  const [value, setValue] = useState(FORMATS[0][2])
  const [height, setHeight] = useState(80)
  const [barWidth, setBarWidth] = useState(2)
  const [showText, setShowText] = useState(true)
  const [color, setColor] = useState('#000000')
  const [error, setError] = useState<string | null>(null)
  const [bulk, setBulk] = useState(false)
  const svg = useRef<SVGSVGElement>(null)

  useEffect(() => {
    let cancelled = false
    import('jsbarcode').then(({ default: JsBarcode }) => {
      if (cancelled || !svg.current) return
      try {
        if (!value.trim()) throw new Error('Enter a value to encode.')
        let valid = true
        JsBarcode(svg.current, value, { format, height, width: barWidth, displayValue: showText, lineColor: color, background: '#ffffff', margin: 12, valid: (v: boolean) => { valid = v } })
        setError(valid ? null : `“${value}” isn’t valid for ${format}. ${formatHint(format)}`)
      } catch (e) { setError((e as Error).message || 'Invalid value for this barcode type.') }
    })
    return () => { cancelled = true }
  }, [format, value, height, barWidth, showText, color])

  const svgText = () => new XMLSerializer().serializeToString(svg.current!)
  const png = () => {
    const s = svg.current!, w = s.width.baseVal.value, h = s.height.baseVal.value
    const img = new Image()
    img.onload = () => {
      const c = document.createElement('canvas'); c.width = w * 3; c.height = h * 3
      const ctx = c.getContext('2d')!; ctx.scale(3, 3); ctx.drawImage(img, 0, 0)
      download(`barcode-${value.replace(/[^\w-]+/g, '_')}.png`, c.toDataURL('image/png'))
    }
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgText())
  }

  const style: Style = { format, height, barWidth, showText, color }
  const setStyle = (s: Style) => {
    if (s.format !== format) { setFormat(s.format); setValue(FORMATS.find((f) => f[0] === s.format)![2]) }
    setHeight(s.height); setBarWidth(s.barWidth); setShowText(s.showText); setColor(s.color)
  }

  if (bulk) return <BulkBarcodes style={style} setStyle={setStyle} onSingle={() => setBulk(false)} />
  return (
    <>
      <BulkToggle bulk={false} onChange={setBulk} single="One barcode" many="Many (bulk list)" />
      <Row>
        <Field label="Barcode type">
          <select value={format} onChange={(e) => { const f = FORMATS.find((x) => x[0] === e.target.value)!; setFormat(f[0]); setValue(f[2]) }}>
            {FORMATS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </Field>
        <Field label="Value"><input className="mono" value={value} onChange={(e) => setValue(e.target.value)} maxLength={80} /></Field>
      </Row>
      <StyleControls style={style} onChange={setStyle} />
      <ErrorBox message={error} />
      <div style={{ display: error ? 'none' : 'grid', placeItems: 'center', background: '#fff', borderRadius: 8, padding: 12, overflowX: 'auto', border: '1px solid var(--border)' }}>
        <svg ref={svg} role="img" aria-label={`Barcode for ${value}`} />
      </div>
      <Row>
        <button className="btn primary" disabled={!!error} onClick={png}>Download PNG</button>
        <button className="btn" disabled={!!error} onClick={() => download(`barcode-${value.replace(/[^\w-]+/g, '_')}.svg`, 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgText()))}>Download SVG</button>
      </Row>
      <p className="muted" style={{ margin: 0, fontSize: 13 }}>For products sold in shops, EAN/UPC numbers must be registered with GS1 — generating a barcode doesn’t register it.</p>
    </>
  )
}
