import { useRef, useState } from 'react'
import { baseName, CopyButton, downloadBlob, ErrorBox, FileDrop, Row } from '../components/ui'
import BatchRunner, { BulkToggle, type BatchProcess } from '../components/Batch'
import { isEncryptedError, openPdf, PASSWORD_MESSAGE } from '../lib/pdf'

interface Item { str: string; hasEOL?: boolean; transform: number[]; width: number }

// join text runs, adding a space where the PDF positions words apart without a space character
function pageText(items: Item[]) {
  let out = ''
  let lastEnd: number | null = null, lastY: number | null = null
  for (const it of items) {
    const x = it.transform[4], y = it.transform[5]
    if (lastEnd !== null && lastY !== null && Math.abs(y - lastY) < 1 && x - lastEnd > 1 && !/\s$/.test(out) && !/^\s/.test(it.str)) out += ' '
    else if (lastY !== null && Math.abs(y - lastY) >= 1 && !out.endsWith('\n') && out && it.str) out += '\n'
    out += it.str
    if (it.hasEOL) out += '\n'
    lastEnd = x + it.width; lastY = y
  }
  return out.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
}

/** Text of each page; null if stopped part-way. */
async function extractPages(file: File, stop?: () => boolean) {
  const doc = await openPdf(file)
  try {
    const out: string[] = []
    for (let i = 1; i <= doc.numPages; i++) {
      if (stop?.()) return null
      const content = await (await doc.getPage(i)).getTextContent()
      out.push(pageText(content.items.filter((it) => 'str' in it) as unknown as Item[]))
    }
    return out
  } finally { doc.destroy() }
}

const joinPages = (pages: string[], markers: boolean) => markers ? pages.map((t, i) => `--- Page ${i + 1} ---\n${t}`).join('\n\n') : pages.join('\n\n')
const textBlob = (text: string) => new Blob([text], { type: 'text/plain;charset=utf-8' })

// the source PDF's name for each result, for the headers in the combined file
const sourceName = new WeakMap<Blob, string>()

function BulkToText({ onSingle }: { onSingle: () => void }) {
  const [pageMarkers, setPageMarkers] = useState(true)
  const process: BatchProcess = async (file, ctx) => {
    let pages: string[] | null
    try { pages = await extractPages(file, () => ctx.signal.aborted) } catch (e) { throw new Error(isEncryptedError(e) ? PASSWORD_MESSAGE : 'Could not read this PDF. It may be damaged.') }
    if (!pages) throw new Error('Stopped')
    const words = pages.join(' ').match(/\S+/g)?.length ?? 0
    const blob = textBlob(words ? joinPages(pages, pageMarkers) : '')
    sourceName.set(blob, file.name)
    return { name: `${baseName(file.name)}.txt`, blob, note: words ? `${words.toLocaleString()} words · ${pages.length} page${pages.length === 1 ? '' : 's'}` : 'No text found — looks scanned (needs OCR)' }
  }
  return (
    <>
      <BulkToggle bulk onChange={(b) => { if (!b) onSingle() }} />
      <label className="check"><input type="checkbox" checked={pageMarkers} onChange={(e) => setPageMarkers(e.target.checked)} /> Mark page breaks</label>
      <BatchRunner compare={false} accept="application/pdf,.pdf" process={process} settingsKey={String(pageMarkers)} runLabel="Extract all" zipName="pdf-text"
        combine={{ label: 'Download all as one .txt', name: 'all-text.txt', make: async (rs) => textBlob((await Promise.all(rs.map(async (r) => `===== ${sourceName.get(r.blob) ?? r.name} =====\n${await r.blob.text()}`))).join('\n\n')) }} />
    </>
  )
}

export default function PdfToText() {
  const [bulk, setBulk] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [pages, setPages] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pageMarkers, setPageMarkers] = useState(true)
  const run = useRef(0)

  const extract = async (f: File) => {
    const my = ++run.current
    setFile(f); setBusy(true); setError(null); setPages([])
    try {
      const out = await extractPages(f, () => my !== run.current)
      if (!out || my !== run.current) return
      setPages(out)
      if (!out.join('').trim()) setError('No text found. This looks like a scanned PDF (pictures of text), which needs OCR.')
    } catch (e) {
      if (my === run.current) setError(isEncryptedError(e) ? 'This PDF is password-protected. Remove the password first.' : 'Could not read this PDF. It may be damaged.')
    } finally {
      if (my === run.current) setBusy(false)
    }
  }

  // toggling page markers only reformats; no need to re-read the file
  const text = joinPages(pages, pageMarkers)
  const words = pages.join(' ').match(/\S+/g)?.length ?? 0
  if (bulk) return <BulkToText onSingle={() => setBulk(false)} />
  return (
    <>
      <BulkToggle bulk={false} onChange={setBulk} />
      <FileDrop accept="application/pdf,.pdf" disabled={busy} onFiles={(f) => extract(f[0])} label={file ? `📄 ${file.name} (click to change)` : undefined} />
      <Row>
        <label className="check"><input type="checkbox" checked={pageMarkers} onChange={(e) => setPageMarkers(e.target.checked)} /> Mark page breaks</label>
        <CopyButton value={words ? text : ''} />
        <button className="btn" disabled={!words} onClick={() => downloadBlob(`${baseName(file!.name)}.txt`, textBlob(text))}>Download .txt</button>
        {words > 0 && <span className="muted">{words.toLocaleString()} words · {pages.length} pages</span>}
      </Row>
      {busy && <div className="muted" role="status">Extracting…</div>}
      <ErrorBox message={error} />
      <textarea value={words ? text : ''} readOnly aria-label="Extracted text" style={{ minHeight: 320 }} placeholder="Extracted text appears here" />
    </>
  )
}
