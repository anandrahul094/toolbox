import { useRef, useState } from 'react'
import { baseName, CopyButton, downloadBlob, ErrorBox, FileDrop, Row } from '../components/ui'
import { isEncryptedError, openPdf } from '../lib/pdf'

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

export default function PdfToText() {
  const [file, setFile] = useState<File | null>(null)
  const [pages, setPages] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pageMarkers, setPageMarkers] = useState(true)
  const run = useRef(0)

  const extract = async (f: File) => {
    const my = ++run.current
    setFile(f); setBusy(true); setError(null); setPages([])
    let doc: Awaited<ReturnType<typeof openPdf>> | null = null
    try {
      doc = await openPdf(f)
      const out: string[] = []
      for (let i = 1; i <= doc.numPages; i++) {
        if (my !== run.current) return
        const content = await (await doc.getPage(i)).getTextContent()
        out.push(pageText(content.items.filter((it) => 'str' in it) as unknown as Item[]))
      }
      if (my !== run.current) return
      setPages(out)
      if (!out.join('').trim()) setError('No text found. This looks like a scanned PDF (pictures of text), which needs OCR.')
    } catch (e) {
      if (my === run.current) setError(isEncryptedError(e) ? 'This PDF is password-protected. Remove the password first.' : 'Could not read this PDF. It may be damaged.')
    } finally {
      doc?.destroy()
      if (my === run.current) setBusy(false)
    }
  }

  // toggling page markers only reformats; no need to re-read the file
  const text = pageMarkers ? pages.map((t, i) => `--- Page ${i + 1} ---\n${t}`).join('\n\n') : pages.join('\n\n')
  const words = pages.join(' ').match(/\S+/g)?.length ?? 0
  return (
    <>
      <FileDrop accept="application/pdf,.pdf" disabled={busy} onFiles={(f) => extract(f[0])} label={file ? `📄 ${file.name} (click to change)` : undefined} />
      <Row>
        <label className="check"><input type="checkbox" checked={pageMarkers} onChange={(e) => setPageMarkers(e.target.checked)} /> Mark page breaks</label>
        <CopyButton value={words ? text : ''} />
        <button className="btn" disabled={!words} onClick={() => downloadBlob(`${baseName(file!.name)}.txt`, new Blob([text], { type: 'text/plain;charset=utf-8' }))}>Download .txt</button>
        {words > 0 && <span className="muted">{words.toLocaleString()} words · {pages.length} pages</span>}
      </Row>
      {busy && <div className="muted" role="status">Extracting…</div>}
      <ErrorBox message={error} />
      <textarea value={words ? text : ''} readOnly aria-label="Extracted text" style={{ minHeight: 320 }} placeholder="Extracted text appears here" />
    </>
  )
}
