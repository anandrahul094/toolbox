import { useRef, useState } from 'react'
import { PDFDocument } from 'pdf-lib'
import JSZip from 'jszip'
import { baseName, downloadBlob, ErrorBox, Field, FileDrop, Row } from '../components/ui'
import { isEncryptedError, parseRanges, PASSWORD_MESSAGE, pdfBlob } from '../lib/pdf'

type Mode = 'ranges' | 'every' | 'extract'

export default function PdfSplit() {
  const [file, setFile] = useState<File | null>(null)
  const [doc, setDoc] = useState<PDFDocument | null>(null)
  const [mode, setMode] = useState<Mode>('ranges')
  const [ranges, setRanges] = useState('1-2, 3-')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const token = useRef(0)
  const load = async (f: File) => {
    const my = ++token.current // a slower, earlier file must not replace this one
    setError(null); setFile(f); setDoc(null)
    try { const d = await PDFDocument.load(await f.arrayBuffer()); if (my === token.current) setDoc(d) }
    catch (e) { if (my === token.current) setError(isEncryptedError(e) ? PASSWORD_MESSAGE : 'Could not read this PDF. It may be damaged.') }
  }

  const total = doc?.getPageCount() ?? 0
  let parsed: [number, number][] = []
  let rangeError: string | null = null
  if (doc && mode !== 'every') { try { parsed = parseRanges(ranges, total) } catch (e) { rangeError = (e as Error).message } }
  // the same range listed twice would produce two identical files that overwrite each other in the ZIP
  if (mode === 'ranges') parsed = parsed.filter(([a, b], i) => parsed.findIndex(([c, d]) => c === a && d === b) === i)
  if (mode === 'every') parsed = Array.from({ length: total }, (_, i) => [i + 1, i + 1])

  const run = async () => {
    if (!doc || !file) return
    setBusy(true); setError(null)
    try {
      const build = async (groups: [number, number][]) => {
        const out = await PDFDocument.create()
        const idx = groups.flatMap(([a, b]) => Array.from({ length: b - a + 1 }, (_, k) => a - 1 + k))
        ;(await out.copyPages(doc, idx)).forEach((p) => out.addPage(p))
        return out.save()
      }
      const name = baseName(file.name)
      const label = (r: [number, number]) => (r[0] === r[1] ? `${r[0]}` : `${r[0]}-${r[1]}`)
      if (mode === 'extract' || parsed.length === 1) {
        downloadBlob(`${name}-pages-${parsed.map(label).join('_')}.pdf`, pdfBlob(await build(parsed)))
      } else {
        const zip = new JSZip()
        for (const r of parsed) zip.file(`${name}-${label(r)}.pdf`, await build([r]))
        downloadBlob(`${name}-split.zip`, await zip.generateAsync({ type: 'blob' }))
      }
    } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }

  return (
    <>
      <FileDrop accept="application/pdf,.pdf" disabled={busy} onFiles={(f) => load(f[0])} label={file ? `📄 ${file.name} — ${total} pages (click to change)` : undefined} />
      <ErrorBox message={error} />
      {doc && (
        <>
          <Row>
            <button className={`btn ${mode === 'ranges' ? 'primary' : ''}`} onClick={() => setMode('ranges')}>Split by ranges</button>
            <button className={`btn ${mode === 'extract' ? 'primary' : ''}`} onClick={() => setMode('extract')}>Extract into one PDF</button>
            <button className={`btn ${mode === 'every' ? 'primary' : ''}`} onClick={() => setMode('every')}>Every page separately</button>
          </Row>
          {mode !== 'every' && (
            <Field label="Pages" hint={mode === 'ranges' ? 'Each range becomes its own PDF. Example: 1-3, 4, 5- (to the end)' : 'All listed pages go into a single PDF, in this order.'}>
              <input className="mono" value={ranges} onChange={(e) => setRanges(e.target.value)} />
            </Field>
          )}
          <ErrorBox message={rangeError} />
          <Row>
            <button className="btn primary" disabled={busy || !!rangeError} onClick={run}>
              {busy ? 'Working…' : mode === 'extract' ? 'Extract pages' : `Create ${parsed.length} PDF${parsed.length === 1 ? '' : 's'}`}
            </button>
            {mode !== 'extract' && parsed.length > 1 && <span className="muted">Downloads as a ZIP</span>}
          </Row>
        </>
      )}
    </>
  )
}
