import { useRef, useState } from 'react'
import { PDFDocument } from 'pdf-lib'
import { baseName, canvasToBlob, downloadBlob, ErrorBox, FileDrop, fmtBytes, Progress, Stat } from '../components/ui'
import BatchRunner, { BulkToggle, type BatchProcess } from '../components/Batch'
import { isEncryptedError, openPdf, PASSWORD_MESSAGE, pdfBlob, renderPage } from '../lib/pdf'

const LEVELS = { strong: { scale: 1, quality: 0.5, label: 'Smallest file (72 DPI)' }, balanced: { scale: 1.5, quality: 0.65, label: 'Balanced (108 DPI)' }, light: { scale: 2, quality: 0.8, label: 'Better quality (144 DPI)' } }

type Level = keyof typeof LEVELS

/** Re-render every page as a JPEG. Returns null if stopped part-way. */
async function compressPdf(file: File, level: Level, o: { progress?: (page: number, total: number) => void; stop?: () => boolean } = {}) {
  const doc = await openPdf(file)
  try {
    const out = await PDFDocument.create()
    const { scale, quality } = LEVELS[level]
    for (let i = 1; i <= doc.numPages; i++) {
      if (o.stop?.()) return null
      o.progress?.(i, doc.numPages)
      const page = await doc.getPage(i)
      const vp = page.getViewport({ scale: 1 }) // includes the page's rotation
      const jpg = await canvasToBlob(await renderPage(doc, i, scale), 'image/jpeg', quality)
      const img = await out.embedJpg(new Uint8Array(await jpg.arrayBuffer()))
      out.addPage([vp.width, vp.height]).drawImage(img, { x: 0, y: 0, width: vp.width, height: vp.height })
    }
    return pdfBlob(await out.save())
  } finally { doc.destroy() }
}

function BulkCompress({ onSingle }: { onSingle: () => void }) {
  const [level, setLevel] = useState<Level>('balanced')
  const process: BatchProcess = async (file, ctx) => {
    let blob: Blob | null
    try {
      blob = await compressPdf(file, level, { progress: (i, n) => ctx.progress((i - 1) / n), stop: () => ctx.signal.aborted })
    } catch (e) { throw isEncryptedError(e) ? new Error(PASSWORD_MESSAGE) : e }
    if (!blob) throw new Error('Stopped')
    const saved = Math.round((1 - blob.size / file.size) * 100)
    return { name: `${baseName(file.name)}-compressed.pdf`, blob, note: saved > 0 ? `${saved}% smaller` : `${-saved}% bigger — keep the original` }
  }
  return (
    <>
      <BulkToggle bulk onChange={(b) => { if (!b) onSingle() }} />
      <div className="notice">Pages become images: text will no longer be selectable or searchable. Best for scanned documents. Keep your originals.</div>
      <div className="seg" role="group" aria-label="Compression level" style={{ alignSelf: 'flex-start', flexWrap: 'wrap' }}>
        {(Object.keys(LEVELS) as Level[]).map((k) => <button key={k} aria-pressed={level === k} onClick={() => setLevel(k)}>{LEVELS[k].label}</button>)}
      </div>
      <BatchRunner accept="application/pdf,.pdf" process={process} settingsKey={level} runLabel="Compress all" zipName="compressed-pdfs" concurrency={1} />
    </>
  )
}

export default function PdfCompress() {
  const [bulk, setBulk] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [level, setLevel] = useState<keyof typeof LEVELS>('balanced')
  const [result, setResult] = useState<{ blob: Blob; name: string; from: number } | null>(null)
  const [progress, setProgress] = useState<[number, number] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const run = useRef(0)

  const compress = async () => {
    if (!file) return
    const my = ++run.current
    setError(null); setResult(null)
    try {
      const blob = await compressPdf(file, level, { progress: (i, n) => setProgress([i, n]), stop: () => my !== run.current })
      if (blob && my === run.current) setResult({ blob, name: `${baseName(file.name)}-compressed.pdf`, from: file.size })
    } catch (e) {
      if (my === run.current) setError(isEncryptedError(e) ? 'This PDF is password-protected. Remove the password first.' : `Could not compress this PDF: ${(e as Error).message}`)
    } finally {
      if (my === run.current) setProgress(null)
    }
  }

  if (bulk) return <BulkCompress onSingle={() => setBulk(false)} />
  return (
    <>
      <BulkToggle bulk={false} onChange={setBulk} />
      <FileDrop accept="application/pdf,.pdf" disabled={!!progress} onFiles={(f) => { run.current++; setFile(f[0]); setResult(null); setError(null) }} label={file ? `📄 ${file.name} — ${fmtBytes(file.size)} (click to change)` : undefined} />
      <div className="notice">Pages become images: text will no longer be selectable or searchable. Best for scanned documents. Keep your original.</div>
      <div className="seg" role="group" aria-label="Compression level" style={{ alignSelf: 'flex-start', flexWrap: 'wrap' }}>
        {(Object.keys(LEVELS) as (keyof typeof LEVELS)[]).map((k) => <button key={k} aria-pressed={level === k} disabled={!!progress} onClick={() => { setLevel(k); setResult(null) }}>{LEVELS[k].label}</button>)}
      </div>
      <div><button className="btn primary" disabled={!file || !!progress} onClick={compress}>{progress ? 'Compressing…' : 'Compress'}</button></div>
      {progress && <Progress value={progress[0]} max={progress[1]} label="Compressing pages" />}
      <ErrorBox message={error} />
      {result && (
        <>
          <div className="stats">
            <Stat label="Original" value={fmtBytes(result.from)} />
            <Stat label="Compressed" value={fmtBytes(result.blob.size)} />
            <Stat label="Change" value={<span style={{ color: result.blob.size < result.from ? 'var(--ok)' : 'var(--danger)' }}>{result.blob.size < result.from ? '−' : '+'}{Math.abs(Math.round((1 - result.blob.size / result.from) * 100))}%</span>} />
          </div>
          {result.blob.size >= result.from
            ? <div className="muted">This PDF is already efficient — compressing made it bigger. Keep the original.</div>
            : <div><button className="btn primary" onClick={() => downloadBlob(result.name, result.blob)}>Download</button></div>}
        </>
      )}
    </>
  )
}
